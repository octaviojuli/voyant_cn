"use client"

/**
 * Storefront-flavored wrapper around `<BookingJourney />` —
 * customer-facing, no CRM picker, B2C billing default, post-commit
 * navigation to a confirmation page.
 *
 * Uses `surface="public"` so the engine hits `/v1/public/catalog/*`.
 * Per booking-journey-architecture §8.1 + §10 Phase B.
 *
 * Package-owned so Node starters and dedicated storefronts share the same
 * checkout behavior while route trees remain application-owned.
 */

import { useQuery } from "@tanstack/react-query"
import {
  computePaymentSchedule,
  noDepositPolicy,
  type PaymentPolicy,
  type PaymentPolicySource,
} from "@voyant-travel/finance/payment-policy"
import { useVoyantReactContext, type VoyantFetcher } from "@voyant-travel/react"

import {
  type BookingEntitySummary,
  BookingJourney,
  type BookingJourneyCheckoutContext,
  type BookingJourneyProps,
  type ContractAcceptanceEvent,
} from "../journey/index.js"
import {
  type ContractSourceContext,
  type OperatorInfoVariables,
  resolveContractVariables,
} from "./resolve-contract-variables.js"
import {
  buildStorefrontBookFailureMessage,
  type StorefrontBookErrorBody,
} from "./storefront-booking-errors.js"
import {
  buildStorefrontBookBody,
  buildStorefrontCheckoutStartBody,
} from "./storefront-checkout-bodies.js"

export {
  buildStorefrontBookBody,
  buildStorefrontCheckoutStartBody,
  buildStorefrontCommitParty,
} from "./storefront-checkout-bodies.js"

/**
 * Marker for checkout failures we've already turned into a localized,
 * customer-facing message. Native errors (a `fetch` network drop, a
 * `Response.json()` parse of an HTML 502) are NOT this type, so the outer catch
 * can wrap them in the generic message instead of showing raw browser/parser
 * text to the shopper (voyant#2638).
 */
class CheckoutError extends Error {}

interface PublicOperatorProfile extends OperatorInfoVariables {
  customerPaymentPolicy?: PaymentPolicy | null
}

export interface StorefrontBookingJourneyMessages {
  checkoutFailed: string
  requestReference: string
  reserveFailed: string
}

export interface StorefrontBookingJourneyScope {
  marketId?: string
  locale?: string
  currency?: string
}

export type StorefrontCheckoutConfirmationKind =
  | "bank_transfer"
  | "card_pending"
  | "hold"
  | "inquiry"

const defaultMessages: StorefrontBookingJourneyMessages = {
  checkoutFailed: "We couldn't complete your booking. Please review your selection or try again.",
  requestReference: "Reference: {requestId}",
  reserveFailed: "This selection is no longer available. Adjust it and try again.",
}

export interface StorefrontBookingJourneyProps {
  entityModule: string
  entityId: string
  /**
   * Source provenance — optional on the storefront. When absent,
   * the public engine route resolves it from
   * `(entityModule, entityId)` via the catalog plane's
   * sourced-entry lookup. Admin surfaces still pass it explicitly
   * via the packaged `<BookingJourneyHost />`
   * (`@voyant-travel/bookings-react/admin/booking-journey-host`).
   */
  sourceKind?: string
  sourceConnectionId?: string
  sourceRef?: string
  draftId: string
  /** Pre-locked configure inputs (departure / sailing / cabin /
   *  date-range / pax) collected on the detail page. */
  initialConfigure: Record<string, unknown>
  /** Pre-locked accommodation slice (room/rate for accommodations). */
  initialAccommodation?: Record<string, unknown>
  /** Optional summary of the entity being booked — surfaces in the
   *  side panel so the customer keeps context while filling out the
   *  journey. */
  entitySummary?: BookingEntitySummary
  /**
   * Resolved source provenance for the booked entity — kind /
   * connection / ref + supplier. The `/book` route reads it off the
   * public content endpoint's `provenance` and passes it here so the
   * contract preview's `booking.source` block reflects sourced
   * inventory instead of defaulting to owned/blank (voyant#2619).
   */
  entitySource?: ContractSourceContext
  /**
   * Per-product override for the contract template. When unset (the
   * default), the storefront resolves the active customer-scope
   * template via /v1/public/legal/contracts/templates/default —
   * whichever one the operator has marked as the customer default
   * in the legal admin. Set this when a specific product/cruise/
   * hotel needs a non-default contract.
   */
  contractTemplateSlug?: string
  /** Optional marketing-opt-in label — when set, an extra checkbox
   *  is rendered in the contract dialog. */
  contractMarketingLabel?: string
  /** Fired after the user accepts the contract (or, when no
   *  template is configured, when they click Confirm on Review).
   *  The route handles the actual checkout-start dispatch + redirect
   *  to Netopia / bank-transfer instructions. */
  onContractAccepted?: (
    acceptance: ContractAcceptanceEvent | null,
    context: BookingJourneyCheckoutContext,
  ) => void | Promise<void>
  messages?: StorefrontBookingJourneyMessages
  scope?: StorefrontBookingJourneyScope
  onNavigateToShop: () => void
  onNavigateToConfirmation: (bookingId: string, kind?: StorefrontCheckoutConfirmationKind) => void
  onRedirectToPayment?: (url: string) => void
  className?: string
}

export function StorefrontBookingJourney({
  entityModule,
  entityId,
  sourceKind,
  sourceConnectionId,
  sourceRef,
  draftId,
  initialConfigure,
  initialAccommodation,
  entitySummary,
  entitySource,
  contractTemplateSlug,
  contractMarketingLabel,
  onContractAccepted,
  messages = defaultMessages,
  scope = {},
  onNavigateToShop,
  onNavigateToConfirmation,
  onRedirectToPayment = (url) => window.location.assign(url),
  className,
}: StorefrontBookingJourneyProps): React.ReactElement {
  const { baseUrl, fetcher } = useVoyantReactContext()
  // Carry the shopper's selected market/currency/locale (voyant#2643) into the
  // journey's live quote so checkout prices in the same scope as browse/detail,
  // not the default. The `(storefront)` layout provides the scope; unselected
  // fields stay undefined and the quote falls back to the surface default.
  // Resolve the contract template the journey will preview. The
  // per-product override wins when set; otherwise we fetch
  // whatever the operator marked as the active customer-scope
  // template in `legal/contract_templates`. A 404 means no template
  // has been seeded — the journey skips the preview dialog and
  // commits without a contract.
  const resolvedSlug = useResolvedContractSlug(contractTemplateSlug, baseUrl, fetcher)
  const operatorProfile = usePublicOperatorProfile(baseUrl, fetcher)
  const resolvedPolicy = useResolvedPaymentPolicy(entityModule, entityId, baseUrl, fetcher)

  // Storefront-specific slot wiring. NO CRM picker — customers fill
  // an inline contact form, which is the BookingJourney's default
  // when `renderLeadContactPicker` is absent. Operators who later
  // sign in could swap to the CRM picker mid-journey via an
  // upgrade-path hook (Phase E follow-up).
  const slots: Pick<BookingJourneyProps, "onCommitted" | "onCancelled"> = {
    onCommitted(result) {
      onNavigateToConfirmation(result.bookingId)
    },
    onCancelled() {
      onNavigateToShop()
    },
  }

  // Default checkout-start handler — when the caller doesn't supply
  // its own `onContractAccepted`, we run the standard storefront
  // checkout flow:
  //
  //   1. POST /v1/public/catalog/book with the draft id → bookingId
  //   2. POST /v1/public/catalog/checkout/start with the bookingId,
  //      the payment intent, and the captured acceptance.
  //   3. Route the customer based on the response: card → 302 to
  //      Netopia; bank_transfer → instructions page; inquiry →
  //      thanks page.
  //
  const defaultCheckoutHandler = async (
    acceptance: ContractAcceptanceEvent | null,
    context: BookingJourneyCheckoutContext,
  ) => {
    try {
      // Step 1 — book the entity. Send the live scoped quote id explicitly
      // (the server prefers `quoteId` over resolving the draft's stored
      // `currentQuoteId`), so a market/currency change made mid-journey books
      // the price the shopper is actually looking at rather than a stale one
      // (voyant#2643). Falls back to draft resolution when no live quote yet.
      const bookRes = await fetcher(apiPath(baseUrl, "/v1/public/catalog/book"), {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          buildStorefrontBookBody({
            draftId,
            quoteId: context.quoteId,
            draft: context.draft,
            acceptedAt: acceptance?.acceptedAt,
          }),
        ),
      })
      if (!bookRes.ok) {
        const errBody = (await bookRes.json().catch(() => ({}))) as StorefrontBookErrorBody
        console.error("[storefront] /book failed", errBody)
        // Reserve failures (e.g. 502 RESERVE_FAILED with reason
        // "rates_missing") must reach the customer — throw so the journey
        // surfaces a visible error instead of silently dropping back to
        // Review (voyant#2638). A missing-rate / availability reason gets the
        // "adjust your selection" copy; everything else the generic message.
        // The engine error serializer nests the upstream payload under
        // `context.upstreamPayload` (ReserveFailedError), not at top level.
        const reason =
          typeof errBody.context?.upstreamPayload?.reason === "string"
            ? errBody.context.upstreamPayload.reason
            : undefined
        throw new CheckoutError(
          reason === "rates_missing"
            ? messages.reserveFailed
            : buildStorefrontBookFailureMessage(
                errBody,
                bookRes.headers.get("x-request-id"),
                messages.checkoutFailed,
                messages.requestReference,
              ),
        )
      }
      const bookJson = (await bookRes.json()) as { bookingId?: string }
      const bookingId = bookJson.bookingId
      if (!bookingId) {
        console.error("[storefront] /book returned no bookingId", bookJson)
        throw new CheckoutError(messages.checkoutFailed)
      }

      // Step 2 — start checkout with the payment method selected in
      // the journey's Payment step. Card goes to the PSP; bank
      // transfer returns IBAN/reference instructions; inquiry skips
      // inventory/payment.
      const startRes = await fetcher(apiPath(baseUrl, "/v1/public/catalog/checkout/start"), {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          buildStorefrontCheckoutStartBody({
            bookingId,
            draft: context.draft,
            acceptance,
            returnOrigin: window.location.origin,
          }),
        ),
      })
      type CheckoutStartResponse =
        | { kind: "card_redirect"; bookingId: string; redirectUrl: string | null }
        | {
            kind: "bank_transfer_instructions"
            bookingId: string
            proformaNumber: string | null
            instructions: {
              beneficiary: string
              iban: string
              bankName: string
              reference: string
              amountCents: number
              currency: string
              dueAt: string
            }
          }
        | { kind: "inquiry_received"; bookingId: string; inquiryId: string }
        | { kind: "hold_placed"; bookingId: string }
        | { error: string }

      const json = (await startRes.json()) as CheckoutStartResponse

      if ("error" in json) {
        console.error("[storefront] /checkout/start error", json)
        throw new CheckoutError(messages.checkoutFailed)
      }

      switch (json.kind) {
        case "card_redirect":
          if (json.redirectUrl) {
            onRedirectToPayment(json.redirectUrl)
          } else {
            onNavigateToConfirmation(json.bookingId, "card_pending")
          }
          break
        case "bank_transfer_instructions":
          // Hand the instructions to the confirmation page so the
          // customer leaves with the IBAN + reference visible. Stored
          // in sessionStorage to keep the URL clean — refreshing the
          // page replays the same instructions.
          if (typeof sessionStorage !== "undefined") {
            sessionStorage.setItem(`voyant.checkout.${json.bookingId}`, JSON.stringify(json))
          }
          onNavigateToConfirmation(json.bookingId, "bank_transfer")
          break
        case "inquiry_received":
          onNavigateToConfirmation(json.bookingId, "inquiry")
          break
        case "hold_placed":
          onNavigateToConfirmation(json.bookingId, "hold")
          break
      }
    } catch (err) {
      console.error("[storefront] checkout flow failed", err)
      // Re-throw so <BookingJourney /> can render a visible checkout error
      // (voyant#2638). Preserve our own localized CheckoutError messages; wrap
      // anything else (native fetch/network error, JSON parse of an HTML 502)
      // in the generic message so raw browser/parser text never reaches the UI.
      throw err instanceof CheckoutError ? err : new Error(messages.checkoutFailed)
    }
  }

  return (
    <BookingJourney
      surface="public"
      scope={{ market: scope.marketId, locale: scope.locale, currency: scope.currency }}
      entityModule={entityModule}
      entityId={entityId}
      sourceKind={sourceKind}
      sourceConnectionId={sourceConnectionId}
      sourceRef={sourceRef}
      draftId={draftId}
      defaultBuyerType="B2C"
      hideConfigure
      initialConfigure={initialConfigure}
      initialAccommodation={initialAccommodation}
      entitySummary={entitySummary}
      contract={
        resolvedSlug
          ? {
              templateSlug: resolvedSlug,
              previewUrl: apiPath(
                baseUrl,
                `/v1/public/legal/contracts/templates/by-slug/${encodeURIComponent(resolvedSlug)}/preview`,
              ),
              acceptLanguage: typeof navigator !== "undefined" ? navigator.language : undefined,
              resolveVariables: ({ draft, pricing }) => {
                // Use the server-resolved cascade when the public
                // /v1/public/payment-policy/resolve endpoint has
                // come back; while the request is in flight, fall
                // back to the operator default so the customer sees
                // a sensible preview rather than an empty schedule.
                const policy =
                  resolvedPolicy?.policy ??
                  operatorProfile?.customerPaymentPolicy ??
                  noDepositPolicy
                const source: PaymentPolicySource = resolvedPolicy?.source ?? "operator_default"
                const schedule = pricing
                  ? computePaymentSchedule(
                      {
                        totalCents: pricing.total,
                        currency: pricing.currency,
                        departureDate: entitySummary?.startDate ?? null,
                      },
                      policy,
                    )
                  : []
                return resolveContractVariables(draft, {
                  entityModule,
                  entityId,
                  locale: scope.locale,
                  entitySummary,
                  pricing,
                  operatorInfo: operatorProfile,
                  paymentSchedule: schedule,
                  paymentPolicySource: source,
                  source: entitySource,
                })
              },
              ...(contractMarketingLabel ? { marketingLabel: contractMarketingLabel } : {}),
            }
          : undefined
      }
      onContractAccepted={onContractAccepted ?? defaultCheckoutHandler}
      paymentCapabilities={{
        // Storefront defaults — covers the three customer-facing
        // payment paths a typical tour operator wants. The deployment
        // can override per-product (e.g. high-ticket cruises that
        // should always go through inquiry first).
        //
        //  - acceptsCard: real-time card via the configured PSP
        //    (renderPaymentProviderStep supplies the widget — when
        //    absent we fall back to a "we'll email a link" message).
        //  - acceptsBankTransfer: lock inventory, send bank details
        //    out of band, reconcile on receipt of funds.
        //  - acceptsInquiry: lead-only path. No inventory hold, no
        //    charge — operator follows up manually. Useful for
        //    custom itineraries / availability-on-request products.
        acceptsCard: true,
        acceptsBankTransfer: true,
        acceptsHold: false,
        acceptsTicketOnCredit: false,
        acceptsInquiry: true,
      }}
      className={className}
      {...slots}
    />
  )
}

/**
 * Resolve which contract template to preview at the Review step.
 *
 * Order:
 *   1. The per-product `contractTemplateSlug` override the caller
 *      passed in (skips the network call).
 *   2. The active customer-scope template returned by
 *      `GET /v1/public/legal/contracts/templates/default?scope=customer`.
 *
 * Returns `undefined` while the request is in flight or when the
 * deployment hasn't seeded a customer template — the journey then
 * skips the dialog and routes Confirm straight to the
 * checkout-start handler.
 */
function useResolvedContractSlug(
  override: string | undefined,
  baseUrl: string,
  fetcher: VoyantFetcher,
): string | undefined {
  const language = typeof navigator !== "undefined" ? navigator.language?.split("-")[0] : undefined
  const { data } = useQuery({
    queryKey: ["public-legal-default-template", "customer", language ?? "en"],
    queryFn: async (): Promise<string | null> => {
      const params = new URLSearchParams({ scope: "customer" })
      if (language) params.set("language", language)
      const res = await fetcher(
        apiPath(baseUrl, `/v1/public/legal/contracts/templates/default?${params.toString()}`),
        { credentials: "include" },
      )
      if (!res.ok) return null
      const json = (await res.json()) as { data?: { slug?: string } }
      return json.data?.slug ?? null
    },
    enabled: !override,
    staleTime: 5 * 60 * 1000,
  })
  if (override) return override
  return data ?? undefined
}

/**
 * Fetch the operator profile (name / legal name / address / license /
 * default customer payment policy) from the public settings endpoint.
 * The result is cached for 5 minutes — operator
 * details rarely change, and stale-while-revalidate is fine for the
 * contract preview UI.
 *
 * Returns `undefined` while the request is in flight or when the
 * operator hasn't filled in Settings -> Operator profile yet — the contract
 * preview then renders the operator block with `-` placeholders (the
 * template renderer's missing-value substitution kicks in).
 */
function usePublicOperatorProfile(
  baseUrl: string,
  fetcher: VoyantFetcher,
): PublicOperatorProfile | undefined {
  const { data } = useQuery({
    queryKey: ["public-operator-profile"],
    queryFn: async (): Promise<PublicOperatorProfile | null> => {
      const res = await fetcher(apiPath(baseUrl, "/v1/public/operator-profile"), {
        credentials: "include",
      })
      if (!res.ok) return null
      const json = (await res.json()) as { data?: PublicOperatorProfile | null }
      return json.data ?? null
    },
    staleTime: 5 * 60 * 1000,
  })
  return data ?? undefined
}

/**
 * Server-side cascade resolution for the storefront preview.
 *
 * Calls `POST /v1/public/payment-policy/resolve` with the entity
 * coordinates and returns the resolved policy + which cascade layer
 * supplied it (operator_default | supplier | category | listing).
 *
 * Resolves at entity granularity only — the journey's later
 * sailing / cabin / rate-plan selections refine the cascade
 * server-side at booking-confirmed time. Storefront preview shows
 * the entity-level result, which is correct for the common case
 * (single sailing per cruise, single rate plan picked at booking
 * time, etc.) and gracefully degrades to a less-specific layer when
 * the journey hasn't picked yet.
 */
function useResolvedPaymentPolicy(
  entityModule: string,
  entityId: string,
  baseUrl: string,
  fetcher: VoyantFetcher,
): { policy: PaymentPolicy; source: PaymentPolicySource } | undefined {
  const { data } = useQuery({
    queryKey: ["public-payment-policy", entityModule, entityId],
    queryFn: async (): Promise<{ policy: PaymentPolicy; source: PaymentPolicySource } | null> => {
      const res = await fetcher(apiPath(baseUrl, "/v1/public/payment-policy/resolve"), {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entityModule, entityId }),
      })
      if (!res.ok) return null
      const json = (await res.json()) as {
        data?: { policy: PaymentPolicy; source: PaymentPolicySource } | null
      }
      return json.data ?? null
    },
    staleTime: 5 * 60 * 1000,
  })
  return data ?? undefined
}

function apiPath(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, "")}${path}`
}
