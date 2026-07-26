// agent-quality: file-size exception -- owner: bookings-react; existing UI surface stays co-located until a dedicated split preserves behavior and tests.
"use client"

/**
 * `<BookingJourney />` — the unified booking journey shell.
 *
 * Per `docs/architecture/booking-journey-architecture.md` §3 + §8.1.
 *
 * Composes:
 *   - draft state (held at this root, mutated by step components)
 *   - quote orchestration (debounced re-quote on every meaningful change)
 *   - server-side draft persistence (PUT on every step transition)
 *   - commit (Review step's Confirm button)
 *
 * Surface differences (CRM picker for operators vs. inline contact for
 * customers, B2B billing default vs. B2C, payment provider hookup) live
 * in injectable slots passed via props — same shell on every surface.
 */

import type { BookingDraftShape } from "@voyant-travel/catalog-contracts/booking-engine/draft-shape"
import {
  useBookingCommit,
  useBookingDraft,
  useBookingDraftShape,
  useBookingHold,
  useBookingQuote,
} from "@voyant-travel/catalog-react/booking-engine"
import { Button } from "@voyant-travel/ui/components/button"
import { useEffect, useMemo, useRef, useState } from "react"
import { formatMessage, useBookingsUiMessagesOrDefault } from "../../i18n/index.js"
import { describeCommitError } from "../lib/commit-error.js"
import { type Draft, emptyDraft, totalPax } from "../lib/draft-state.js"
import { findPaidScheduleRowsMissingPaymentDate } from "../lib/payment-schedule.js"
import {
  type BookingJourneyProps,
  type ContractAcceptanceEvent,
  JOURNEY_STEP_ORDER,
  type JourneyStep,
} from "../types.js"
import {
  buildCommitParty,
  buildCommitPaymentIntent,
  canAdvanceFromStep,
  defaultMinimalShape,
  isStepVisible,
  makeHoldSignature,
  resolveInitialStatus,
  stackedStepComplete,
  validationErrorsForStep,
  warningsForStep,
} from "./booking-journey-rules.js"
import { ConfigureStepSkeleton } from "./configure-step-skeleton.js"
import { ContractPreviewDialog } from "./contract-preview-dialog.js"
import {
  AccommodationStep,
  AddonsStep,
  BillingStep,
  DepartureStep,
  DocumentsStep,
  deriveDefaultPhoneCountry,
  FinalizeControls,
  OptionsStep,
  PaymentStep,
  ReviewStep,
  TravelersStep,
} from "./journey-steps.js"
import { PriceSidePanel } from "./side-panel.js"
import { StackedJourney } from "./stacked-journey.js"
import { StepHeader } from "./step-header.js"

export function BookingJourney(props: BookingJourneyProps): React.ReactElement {
  const messages = useBookingsUiMessagesOrDefault()
  // Default phone country: the explicit prop, else the scope locale's region
  // (storefronts thread the shopper locale here even when the bookings-ui i18n
  // provider isn't mounted). `PhoneField` fills in the i18n locale + GB fallback
  // when this is undefined.
  const defaultPhoneCountry = deriveDefaultPhoneCountry(
    props.defaultPhoneCountry,
    props.scope?.locale,
  )
  const surface = props.surface ?? "admin"
  // Admin books on a single stacked page (nothing hidden); the storefront
  // keeps the guided one-step-at-a-time wizard. Two deliberately separate
  // flows — see BookingJourneyProps.layout.
  const layout = props.layout ?? (surface === "admin" ? "stacked" : "wizard")

  const [draft, setDraft] = useState<Draft>(() => {
    const base = emptyDraft(
      {
        module: props.entityModule,
        id: props.entityId,
        // Empty when storefront — the public engine route resolves
        // it server-side from (entityModule, entityId).
        sourceKind: props.sourceKind ?? "",
        sourceConnectionId: props.sourceConnectionId,
        sourceRef: props.sourceRef,
      },
      // B2C by default on every surface. A leisure operator books individuals
      // far more often than companies, and defaulting to B2B silently demands
      // an organization (an extra required step) on every single booking.
      // Deployments that really are B2B-first pass `defaultBuyerType`.
      { buyerType: props.defaultBuyerType ?? "B2C" },
    )
    // Seed Configure when the caller passed pre-locked state —
    // detail page picks departure + pax, booking flow only handles
    // travelers + addons + payment.
    if (props.initialConfigure) {
      const seed = props.initialConfigure as Record<string, unknown>
      const seedPax = seed.pax as Record<string, number> | undefined
      base.configure = Object.assign({}, base.configure, seed, {
        pax: { ...base.configure.pax, ...(seedPax ?? {}) },
      }) as typeof base.configure
    }
    if (props.initialAccommodation) {
      const seed = props.initialAccommodation as Record<string, unknown>
      base.accommodation = Object.assign(
        { rooms: [], travelerAssignments: {} },
        base.accommodation ?? {},
        seed,
      ) as typeof base.accommodation
    }
    return base
  })

  const fallbackShape: BookingDraftShape = useMemo(
    () => props.fallbackShape ?? defaultMinimalShape(),
    [props.fallbackShape],
  )

  // Server-side draft sync — PUT on each step transition. The shell
  // doesn't read from the server in Phase B (drafts are recovery
  // surface, not source of truth) but the wire is in place.
  const draftSync = useBookingDraft({
    surface,
    draftId: props.draftId,
    enableLoad: false,
  })

  // Live quote — debounced 250ms.
  const quote = useBookingQuote({
    surface,
    draft,
    scope: props.scope,
  })

  const shape = useBookingDraftShape({
    surface,
    quote: quote.data,
    fallback: fallbackShape,
  })

  // Step navigation — only show steps the descriptor says are relevant.
  const hideConfigure = props.hideConfigure === true
  const steps = useMemo<ReadonlyArray<JourneyStep>>(
    () =>
      JOURNEY_STEP_ORDER.filter((s) => {
        // `hideConfigure` skips the configure phase — now split across the
        // Departure + Options steps.
        if (hideConfigure && (s === "departure" || s === "options")) return false
        // Internal notes + document generation are operator-only.
        if (s === "documents" && surface !== "admin") return false
        return isStepVisible(s, shape)
      }),
    [shape, hideConfigure, surface],
  )

  // The stacked admin layout drops the Review block — the side panel shows the
  // live summary + Confirm at all times, so a separate review section is
  // redundant.
  const stackedSteps = useMemo<ReadonlyArray<JourneyStep>>(
    () => steps.filter((s) => s !== "review"),
    [steps],
  )

  const [currentStep, setCurrentStep] = useState<JourneyStep>(() => steps[0] ?? "departure")
  const [visited, setVisited] = useState<Set<JourneyStep>>(() => new Set([steps[0] ?? "departure"]))

  // If the descriptor changes and removes the current step, reset to
  // the first available step. (Edge case: shape goes from
  // owned→sourced and the relevant step set narrows.)
  useEffect(() => {
    if (!steps.includes(currentStep)) {
      setCurrentStep(steps[0] ?? "departure")
    }
  }, [steps, currentStep])

  // PUT the draft to the server to keep the recovery surface fresh
  // without saving on every keystroke. Wizard saves on each step
  // transition; the stacked admin page has no steps, so it saves on
  // each settled quote (a natural, debounced cadence). The mutation
  // reads the latest draft + quote from the closure on each fire.
  const saveTrigger = layout === "wizard" ? currentStep : (quote.data?.quoteId ?? "")
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional — fires on save trigger only
  useEffect(() => {
    draftSync.save.mutate({
      draft: { ...draft, quoteId: quote.data?.quoteId },
      currentStep,
      currentQuoteId: quote.data?.quoteId,
    })
  }, [saveTrigger])

  // Commit
  const commit = useBookingCommit({
    surface,
    draftId: props.draftId,
    onCommitted: props.onCommitted,
  })

  // Inventory hold — fired when the user advances past Configure
  // with a slot + pax picked. Failures are non-blocking (the engine
  // re-validates capacity at commit time anyway); we just don't
  // want to silently let two shoppers race past Configure with one
  // capacity unit between them.
  const holdApi = useBookingHold({ surface })
  const holdState = useRef<{
    holdToken?: string
    signature?: string
    transition: Promise<void>
  }>({ transition: Promise.resolve() })
  const holdSignature = makeHoldSignature(draft, props.entityModule, props.entityId)

  // biome-ignore lint/correctness/useExhaustiveDependencies: signature change is the only trigger; refs + closure read latest values -- owner: bookings-react; existing suppression is intentional pending typed cleanup.
  useEffect(() => {
    // Wizard: don't hold while still on the configure steps. Stacked:
    // everything's on one page, so the signature (slot + pax present)
    // is the trigger.
    if (layout === "wizard" && (currentStep === "departure" || currentStep === "options")) return
    if (!holdSignature) return
    if (holdState.current.signature === holdSignature) return
    // Inquiry mode is the lead-form path — capture the lead without
    // burning capacity. The operator follows up before any inventory
    // is touched.
    if (draft.payment.intent === "inquiry") return
    holdState.current.signature = holdSignature
    holdState.current.transition = holdState.current.transition.then(async () => {
      // A newer selection can arrive while this transition is queued. Skip
      // stale work before it reaches inventory.
      if (holdState.current.signature !== holdSignature) return

      const previousToken = holdState.current.holdToken
      if (previousToken) {
        holdState.current.holdToken = undefined
        await holdApi
          .release({ entityModule: props.entityModule, holdToken: previousToken })
          .catch(() => {})
      }

      // Re-check after the release: a newer transition may now be waiting.
      if (holdState.current.signature !== holdSignature) return

      try {
        const result = await holdApi.place({
          entityModule: props.entityModule,
          entityId: props.entityId,
          draftId: props.draftId,
          parameters: {
            slotId: draft.configure.departureSlotId,
            paxCount: totalPax(draft),
            productId: props.entityId,
          },
        })
        if (holdState.current.signature === holdSignature) {
          holdState.current.holdToken = result.holdToken
          return
        }

        // The placement completed after the selection changed. Release it
        // before the queued replacement starts so token-wide release cannot
        // delete that replacement.
        await holdApi
          .release({ entityModule: props.entityModule, holdToken: result.holdToken })
          .catch(() => {})
      } catch {
        // Non-blocking — see comment above.
      }
    })
  }, [holdSignature, currentStep])

  const available = quote.data?.available !== false
  // A failed quote (e.g. the connector adapter 500s) leaves `quote.data` null,
  // which makes `available` read as true and lets a stale/absent price slip
  // through to Review where Confirm would silently no-op. Treat a quote error
  // as a hard block: gate Next/Confirm and surface a recoverable banner + retry.
  const hasQuoteError = quote.error != null
  // A settled quote (no thrown error, a real `quoteId`) can still be
  // un-committable: the owned accommodation handler returns `available: true`
  // with `invalidReason: "rates_missing"` and no pricing when the selected stay
  // has no applicable rate plan. Committing that yields a 502 RESERVE_FAILED at
  // /book (#2638). Treat any settled quote that is explicitly unavailable or
  // carries an `invalidReason` as un-priceable and block contract acceptance /
  // Confirm against it.
  const quoteUnpriceable =
    quote.data != null &&
    (quote.data.available === false ||
      (quote.data.invalidReason != null && quote.data.invalidReason !== ""))
  const quoteBlocked = hasQuoteError || quoteUnpriceable
  const quoteReady = Boolean(quote.data?.quoteId)
  // Step navigation only hard-blocks on a thrown quote error (a transient fetch
  // failure that a retry fixes). An un-priceable quote (e.g. `rates_missing`
  // from a preselected room) is *corrected by navigating* — often the room/rate
  // editor is a later step — so Next must stay enabled; commit is still gated on
  // `quoteBlocked` below so an unpriced booking can never be submitted.
  const canAdvance = canAdvanceFromStep(currentStep, draft, shape, available) && !hasQuoteError
  const warnings = warningsForStep(currentStep, draft, shape, messages)

  // Stacked layout: there's no "current" step, but the section nav still
  // nudges toward the first thing that isn't done yet, and the final
  // Confirm is gated until every section passes its check.
  const firstIncomplete = useMemo<JourneyStep>(
    () =>
      stackedSteps.find((s) => !stackedStepComplete(s, draft, shape, available)) ??
      stackedSteps[stackedSteps.length - 1] ??
      stackedSteps[0] ??
      "departure",
    [stackedSteps, draft, shape, available],
  )
  const canCommit = useMemo(
    () =>
      stackedSteps.every((s) => canAdvanceFromStep(s, draft, shape, available)) &&
      quoteReady &&
      !quoteBlocked,
    [stackedSteps, draft, shape, available, quoteReady, quoteBlocked],
  )
  const [isAdvanceGuardPending, setIsAdvanceGuardPending] = useState(false)
  const [advanceGuardError, setAdvanceGuardError] = useState<string | null>(null)
  // Set when Confirm can't proceed because there's no valid quote — makes the
  // click a visible, explained block instead of a silent no-op.
  const [confirmError, setConfirmError] = useState<string | null>(null)
  // Clear the "no valid quote" block as soon as a fresh quote settles (via
  // retry or an auto re-quote), so the message doesn't linger once resolved.
  useEffect(() => {
    if (quote.data?.quoteId) setConfirmError(null)
  }, [quote.data?.quoteId])

  const idx = steps.indexOf(currentStep)
  const next = steps[idx + 1]
  const prev = steps[idx - 1]

  const advance = async () => {
    if (!next || !canAdvance || isAdvanceGuardPending) return
    setAdvanceGuardError(null)

    if (props.onBeforeStepAdvance) {
      setIsAdvanceGuardPending(true)
      try {
        const guardResult = await props.onBeforeStepAdvance({
          currentStep,
          nextStep: next,
          draft,
          pricing: quote.data?.pricing ?? null,
          quoteId: quote.data?.quoteId,
          surface,
        })
        if (
          guardResult &&
          typeof guardResult === "object" &&
          "draft" in guardResult &&
          guardResult.draft
        ) {
          setDraft(guardResult.draft)
        }

        if (guardResult === false) {
          setAdvanceGuardError(messages.bookingJourney.validation.completeStepBeforeContinuing)
          return
        }
        if (
          guardResult &&
          typeof guardResult === "object" &&
          "allow" in guardResult &&
          guardResult.allow === false
        ) {
          setAdvanceGuardError(
            guardResult.message ?? messages.bookingJourney.validation.completeStepBeforeContinuing,
          )
          return
        }
      } catch (error) {
        setAdvanceGuardError(
          error instanceof Error
            ? error.message
            : messages.bookingJourney.validation.unableToContinue,
        )
        return
      } finally {
        setIsAdvanceGuardPending(false)
      }
    }

    setCurrentStep(next)
    setVisited((s) => new Set(s).add(next))
  }

  const goBack = () => {
    if (!prev) return
    setCurrentStep(prev)
  }

  const jumpTo = (step: JourneyStep) => {
    if (!visited.has(step) && step !== currentStep) return
    setCurrentStep(step)
  }

  const [contractDialogOpen, setContractDialogOpen] = useState(false)
  // Tracks the multi-step storefront checkout flow (book →
  // checkout-start → redirect). The legacy in-process commit has
  // its own `commit.isPending` so the Confirm button merges both
  // when deciding whether to show a spinner.
  const [isHandlingCheckout, setIsHandlingCheckout] = useState(false)
  const contractConfig = props.contract
  const contractVariables = useMemo(() => {
    if (!contractConfig) return {}
    return contractConfig.resolveVariables({ draft, pricing: quote.data?.pricing ?? null })
  }, [contractConfig, draft, quote.data?.pricing])

  const commitDraft = async () => {
    if (!quote.data?.quoteId || quoteBlocked) {
      setConfirmError(
        quoteUnpriceable
          ? messages.bookingJourney.validation.pricingUnavailable
          : messages.bookingJourney.validation.quoteUnavailable,
      )
      return
    }
    await commit.mutateAsync({
      draft: { ...draft, quoteId: quote.data.quoteId },
      quoteId: quote.data.quoteId,
      // The owned commit reads the buyer + travelers off `party`, not the
      // draft — without this the create rejects with "no billing person/org".
      party: buildCommitParty(draft),
      initialStatus: resolveInitialStatus(draft),
      paymentIntent: buildCommitPaymentIntent(draft),
    })
  }

  const handleAccepted = async (acceptance: ContractAcceptanceEvent | null) => {
    if (!props.onContractAccepted) {
      await commitDraft()
      return
    }
    setIsHandlingCheckout(true)
    setConfirmError(null)
    try {
      await props.onContractAccepted(acceptance, {
        draft,
        pricing: quote.data?.pricing ?? null,
        quoteId: quote.data?.quoteId,
      })
    } catch (error) {
      // The storefront checkout handler drives /book + /checkout/start and can
      // fail (e.g. 502 RESERVE_FAILED with reason "rates_missing"). Surface it
      // in the checkout UI instead of dropping the customer back on Review with
      // only a console log (#2638).
      setConfirmError(
        error instanceof Error && error.message
          ? error.message
          : messages.bookingJourney.validation.checkoutFailed,
      )
    } finally {
      setIsHandlingCheckout(false)
    }
  }

  const onConfirm = async () => {
    // No valid quote (never priced, or the last re-quote 500'd) → Confirm must
    // NOT be a silent no-op. `useBookingQuote` keeps the prior quote as
    // placeholder data on a failed refetch, so a stale `quoteId` can still be
    // present while `quote.error` is set; block on `hasQuoteError` too so the
    // wizard Review Confirm can never submit against a stale price. Surface a
    // recoverable message pointing at the retry banner instead of swallowing.
    if (!quote.data?.quoteId || quoteBlocked) {
      setConfirmError(
        quoteUnpriceable
          ? messages.bookingJourney.validation.pricingUnavailable
          : messages.bookingJourney.validation.quoteUnavailable,
      )
      return
    }
    if (findPaidScheduleRowsMissingPaymentDate(draft.paymentSchedules) !== null) {
      setConfirmError(messages.bookingJourney.validation.paidPaymentDateRequired)
      return
    }
    setConfirmError(null)
    // 1. Contract is wired → open the dialog. Acceptance triggers
    //    onContractAccepted (the storefront's checkout-start path).
    // 2. No contract but onContractAccepted is wired → call it
    //    directly without an acceptance payload. The storefront uses
    //    this to drive the /book + /checkout/start handoff so card
    //    intents redirect to the PSP. Skipping the dialog when no
    //    template is configured is intentional — the dialog is an
    //    optional gate, not a required step.
    // 3. Neither wired → in-process commit (the operator dashboard's
    //    legacy path).
    if (contractConfig) {
      setContractDialogOpen(true)
      return
    }
    await handleAccepted(null)
  }

  const onContractAccept = async (acceptance: ContractAcceptanceEvent) => {
    setContractDialogOpen(false)
    await handleAccepted(acceptance)
  }

  // Bind the picked lead + departure into the billing-extras slot so the
  // template can run lead-aware checks (e.g. duplicate-departure warning).
  const billingExtrasSlot = props.renderBillingExtras
    ? () =>
        props.renderBillingExtras?.({
          buyerType: draft.billing.buyerType,
          personId: draft.billing.contact.personId,
          organizationId:
            draft.billing.buyerType === "B2B" ? draft.billing.organizationId : undefined,
          productId: props.entityId,
          departureSlotId: draft.configure.departureSlotId,
          departureDate: draft.configure.departureDate,
        })
    : undefined

  // Recoverable quote-failure banner — rendered in both layouts whenever the
  // live quote is erroring. The manual retry re-runs the query (clearing its
  // error on success), which re-enables Next/Confirm.
  const retryQuote = () => {
    setConfirmError(null)
    void quote.refetch()
  }
  const quoteErrorBanner = quoteBlocked ? (
    <div
      role="alert"
      aria-live="polite"
      className="flex flex-col items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-destructive text-sm"
    >
      <span>
        {hasQuoteError
          ? messages.bookingJourney.validation.quoteFailed
          : messages.bookingJourney.validation.pricingUnavailable}
      </span>
      {hasQuoteError ? (
        // Retry only helps a transient fetch failure — an `invalidReason`
        // (e.g. rates_missing) re-quotes to the same result, so we ask the
        // buyer to adjust their selection instead.
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={retryQuote}
          disabled={quote.isQuoting}
        >
          {messages.bookingJourney.validation.retryQuote}
        </Button>
      ) : null}
    </div>
  ) : null

  // Renders one step's content. Shared by both layouts — the wizard shows
  // exactly one at a time; the stacked page renders them all in sections.
  const renderStep = (step: JourneyStep): React.ReactNode => {
    switch (step) {
      case "departure":
        // First load: the descriptor arrives with the first quote. Show a
        // skeleton rather than the generic fallback, which would flash and
        // then shift into the real layout.
        return !quote.data && quote.isQuoting ? (
          <ConfigureStepSkeleton />
        ) : (
          <DepartureStep
            draft={draft}
            setDraft={setDraft}
            shape={shape}
            productId={props.entityId}
            renderDeparturePicker={props.renderDeparturePicker}
          />
        )
      case "options":
        return (
          <OptionsStep
            draft={draft}
            setDraft={setDraft}
            shape={shape}
            productId={props.entityId}
            renderUnitsPicker={props.renderUnitsPicker}
          />
        )
      case "billing":
        return (
          <BillingStep
            draft={draft}
            setDraft={setDraft}
            shape={shape}
            defaultPhoneCountry={defaultPhoneCountry}
            renderLeadContactPicker={props.renderLeadContactPicker}
            renderExtras={billingExtrasSlot}
            errors={validationErrorsForStep("billing", draft, messages)}
            warnings={warningsForStep("billing", draft, shape, messages)}
          />
        )
      case "travelers":
        return (
          <TravelersStep
            draft={draft}
            setDraft={setDraft}
            shape={shape}
            defaultPhoneCountry={defaultPhoneCountry}
            renderTravelerContactPicker={props.renderTravelerContactPicker}
            errors={validationErrorsForStep("travelers", draft, messages)}
            warnings={warningsForStep("travelers", draft, shape, messages)}
          />
        )
      case "accommodation":
        return <AccommodationStep draft={draft} setDraft={setDraft} shape={shape} />
      case "addons":
        return <AddonsStep draft={draft} setDraft={setDraft} shape={shape} />
      case "payment":
        return (
          <PaymentStep
            draft={draft}
            setDraft={setDraft}
            shape={shape}
            capabilities={
              props.paymentCapabilities ?? {
                acceptsCard: false,
                acceptsHold: true,
                acceptsTicketOnCredit: false,
              }
            }
            renderProviderStep={props.renderPaymentProviderStep}
            surface={surface}
            pricing={quote.data?.pricing ?? null}
          />
        )
      case "documents":
        return <DocumentsStep draft={draft} setDraft={setDraft} />
      case "review":
        return (
          <ReviewStep
            draft={draft}
            setDraft={setDraft}
            isCommitting={commit.isPending || isHandlingCheckout}
            onConfirm={onConfirm}
            // Stacked has no per-step gates, so the Confirm button enforces
            // the whole-booking validity itself.
            canConfirm={layout === "stacked" ? canCommit : undefined}
            renderExtras={props.renderReviewExtras}
            surface={surface}
            pricing={quote.data?.pricing ?? null}
            warnings={warningsForStep("review", draft, shape, messages)}
          />
        )
    }
  }

  if (layout === "stacked") {
    return (
      <StackedJourney
        className={props.className}
        steps={stackedSteps}
        renderStep={renderStep}
        isStepComplete={(s) => stackedStepComplete(s, draft, shape, available)}
        // Surface both the in-process commit error and the "no valid quote"
        // Confirm block so a failed confirm is never silent.
        commitError={
          commit.error ? commitErrorMessage(commit.error, messages) : (confirmError ?? null)
        }
        onCancel={props.onCancelled}
        onConfirm={onConfirm}
        isCommitting={commit.isPending || isHandlingCheckout}
        canConfirm={canCommit}
        banner={quoteErrorBanner}
        sidePanel={
          <PriceSidePanel
            pricing={quote.data?.pricing ?? null}
            isQuoting={quote.isQuoting}
            invalidReason={quote.data?.invalidReason}
            entitySummary={props.entitySummary}
            currentStep={firstIncomplete}
            steps={stackedSteps}
            shape={shape}
            draft={draft}
            className={props.sidePanelClassName}
            // Price override and Travel Credit live with the pricing, not in Payment.
            pricingExtras={
              <FinalizeControls
                draft={draft}
                setDraft={setDraft}
                pricing={quote.data?.pricing ?? null}
                renderTravelCreditPicker={props.renderTravelCreditPicker}
              />
            }
          />
        }
        contractDialog={
          contractConfig ? (
            <ContractPreviewDialog
              open={contractDialogOpen}
              onOpenChange={setContractDialogOpen}
              previewUrl={contractConfig.previewUrl}
              acceptLanguage={contractConfig.acceptLanguage}
              variables={contractVariables}
              marketingLabel={contractConfig.marketingLabel as string | undefined}
              termsLabel={contractConfig.termsLabel}
              onAccept={onContractAccept}
            />
          ) : null
        }
      />
    )
  }

  return (
    <div className={props.className}>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-8 md:items-start">
        <div className="space-y-6 md:col-span-5">
          <StepHeader
            current={currentStep}
            visited={[...visited]}
            steps={steps}
            shape={shape}
            onJumpTo={jumpTo}
          />

          {quoteErrorBanner}

          {currentStep === "departure" ? (
            // First load: the descriptor arrives with the first quote. Show a
            // skeleton rather than the generic fallback, which would flash
            // and then shift into the real layout.
            !quote.data && quote.isQuoting ? (
              <ConfigureStepSkeleton />
            ) : (
              <DepartureStep
                draft={draft}
                setDraft={setDraft}
                shape={shape}
                productId={props.entityId}
                renderDeparturePicker={props.renderDeparturePicker}
              />
            )
          ) : null}
          {currentStep === "options" ? (
            <OptionsStep
              draft={draft}
              setDraft={setDraft}
              shape={shape}
              productId={props.entityId}
              renderUnitsPicker={props.renderUnitsPicker}
            />
          ) : null}
          {currentStep === "billing" ? (
            <BillingStep
              draft={draft}
              setDraft={setDraft}
              shape={shape}
              defaultPhoneCountry={defaultPhoneCountry}
              renderLeadContactPicker={props.renderLeadContactPicker}
              renderExtras={billingExtrasSlot}
            />
          ) : null}
          {currentStep === "travelers" ? (
            <TravelersStep
              draft={draft}
              setDraft={setDraft}
              shape={shape}
              defaultPhoneCountry={defaultPhoneCountry}
              renderTravelerContactPicker={props.renderTravelerContactPicker}
            />
          ) : null}
          {currentStep === "accommodation" ? (
            <AccommodationStep draft={draft} setDraft={setDraft} shape={shape} />
          ) : null}
          {currentStep === "addons" ? (
            <AddonsStep draft={draft} setDraft={setDraft} shape={shape} />
          ) : null}
          {currentStep === "payment" ? (
            <PaymentStep
              draft={draft}
              setDraft={setDraft}
              shape={shape}
              capabilities={
                props.paymentCapabilities ?? {
                  acceptsCard: false,
                  acceptsHold: true,
                  acceptsTicketOnCredit: false,
                }
              }
              renderProviderStep={props.renderPaymentProviderStep}
              surface={surface}
              pricing={quote.data?.pricing ?? null}
            />
          ) : null}
          {currentStep === "review" ? (
            <ReviewStep
              draft={draft}
              setDraft={setDraft}
              isCommitting={commit.isPending || isHandlingCheckout}
              onConfirm={onConfirm}
              // Disable Confirm when the live quote can't be priced (error or
              // rates_missing) so contract acceptance / commit never fires
              // against an unpriced booking (#2638).
              canConfirm={quoteReady && !quoteBlocked}
              renderExtras={props.renderReviewExtras}
              surface={surface}
              pricing={quote.data?.pricing ?? null}
            />
          ) : null}

          {warnings.length > 0 ? (
            <ul className="space-y-1 rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900 text-sm dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
              {warnings.map((w) => (
                <li key={w}>⚠ {w}</li>
              ))}
            </ul>
          ) : null}

          <div className="flex items-center gap-2">
            {/* Back doubles as "exit the journey" on the first step
                — when there's no previous step the button navigates
                via `onCancelled` (back to the storefront / detail
                page); on inner steps it just walks the wizard. One
                button to keep the bottom rail uncluttered. */}
            <Button
              type="button"
              variant="outline"
              disabled={isAdvanceGuardPending}
              onClick={() => {
                if (prev) goBack()
                else props.onCancelled?.()
              }}
            >
              {messages.bookingJourney.navigation.back}
            </Button>
            {next ? (
              <Button
                type="button"
                onClick={() => void advance()}
                disabled={!canAdvance || isAdvanceGuardPending}
                className="ml-auto"
              >
                {isAdvanceGuardPending
                  ? messages.bookingJourney.navigation.checking
                  : messages.bookingJourney.navigation.next}
              </Button>
            ) : null}
          </div>

          {advanceGuardError ? (
            <p className="text-destructive text-sm" role="alert" aria-live="polite">
              {advanceGuardError}
            </p>
          ) : null}

          {confirmError ? (
            <p className="text-destructive text-sm" role="alert" aria-live="polite">
              {confirmError}
            </p>
          ) : null}

          {commit.error ? (
            <p className="text-destructive text-sm" role="alert" aria-live="polite">
              {commitErrorMessage(commit.error, messages)}
            </p>
          ) : null}
        </div>

        <aside className="md:sticky md:top-4 md:col-span-3">
          <PriceSidePanel
            pricing={quote.data?.pricing ?? null}
            isQuoting={quote.isQuoting}
            invalidReason={quote.data?.invalidReason}
            entitySummary={props.entitySummary}
            currentStep={currentStep}
            steps={steps}
            shape={shape}
            draft={draft}
            className={props.sidePanelClassName}
          />
        </aside>
      </div>

      {contractConfig ? (
        <ContractPreviewDialog
          open={contractDialogOpen}
          onOpenChange={setContractDialogOpen}
          previewUrl={contractConfig.previewUrl}
          acceptLanguage={contractConfig.acceptLanguage}
          variables={contractVariables}
          marketingLabel={contractConfig.marketingLabel as string | undefined}
          termsLabel={contractConfig.termsLabel}
          onAccept={onContractAccept}
        />
      ) : null}
    </div>
  )
}

/**
 * Localized copy for a failed commit. The engine surfaces the server's raw
 * English `Error.message` (a capacity clash used to render as a bare
 * `Internal Server Error` under the form); classify it instead and render
 * something the operator can act on — the remaining seats when the server
 * tells us, an actionable sold-out line when it doesn't, and a generic
 * localized fallback for everything else.
 */
function commitErrorMessage(
  error: unknown,
  messages: ReturnType<typeof useBookingsUiMessagesOrDefault>,
): string {
  const copy = messages.bookingJourney.commitErrors
  const info = describeCommitError(error)
  if (info.kind !== "no_availability") return copy.fallback
  return info.remainingPax == null
    ? copy.noAvailabilityUnknown
    : formatMessage(copy.noAvailability, { count: info.remainingPax })
}
