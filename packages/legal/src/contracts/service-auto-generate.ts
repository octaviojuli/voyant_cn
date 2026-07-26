import { bookingsService } from "@voyant-travel/bookings"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"
import type {
  AutoGenerateContractOptions,
  AutoGenerateContractResult,
  AutoGenerateContractRuntime,
  BookingConfirmedLikeEvent,
  GenerateContractForBookingResult,
} from "./service-auto-generate-types.js"
import { resolveContractGenerationVariables } from "./service-auto-generate-variables.js"
import { contractRecordsService } from "./service-contracts.js"
import { contractDocumentsService } from "./service-documents.js"
import { ContractSeriesAmbiguousError, contractSeriesService } from "./service-series.js"
import { renderTemplate } from "./service-shared.js"
import { contractTemplatesService } from "./service-templates.js"
import type { GenerateContractForBookingInput } from "./validation.js"

export type {
  AutoGenerateContractOptions,
  AutoGenerateContractResult,
  AutoGenerateContractRuntime,
  BookingConfirmedLikeEvent,
  ContractSeriesIdentity,
  DefaultContractVariables,
  GenerateContractForBookingResult,
  ResolveContractVariablesFn,
} from "./service-auto-generate-types.js"

/**
 * One-click admin path for a specific booking. It resolves the deployment's
 * default active template for the requested scope/channel/language and, by
 * default, requires a default active number series for that scope before
 * issuing the document. Deployments with only one active series keep the
 * legacy implicit-default behavior.
 */
export async function generateContractForBookingFromDefaults(
  db: PostgresJsDatabase,
  bookingId: string,
  input: GenerateContractForBookingInput,
  runtime: AutoGenerateContractRuntime,
  actorId: string | null = null,
): Promise<GenerateContractForBookingResult> {
  const template = await contractTemplatesService.getDefaultTemplate(db, {
    scope: input.scope,
    language: input.language,
    channelId: input.channelId ?? undefined,
    fallbackLanguages: input.fallbackLanguages,
  })
  if (!template) {
    return { status: "template_not_found" }
  }
  if (!template.currentVersionId) {
    return { status: "template_version_missing" }
  }

  const options: AutoGenerateContractOptions = {
    enabled: true,
    templateSlug: template.slug,
    scope: input.scope,
    language: input.language ?? template.language,
    // The template was just resolved from the caller's explicit
    // scope/language/channel request — don't let the booking's language
    // override an operator's deliberate pick.
    preferBookingLanguage: false,
    forceRecompute: input.forceRecompute,
  }

  if (input.requireNumberSeries) {
    try {
      const series = await contractSeriesService.findDefaultActiveByScope(db, input.scope)
      if (!series) {
        return { status: "series_not_found" }
      }
      options.seriesPrefixScope = {
        prefix: series.prefix,
        scope: series.scope,
      }
    } catch (error) {
      if (error instanceof ContractSeriesAmbiguousError) {
        return { status: "series_ambiguous" }
      }
      throw error
    }
  }

  return autoGenerateContractForBooking(
    db,
    { bookingId, bookingNumber: "", actorId },
    options,
    runtime,
  )
}

/**
 * Core auto-generate handler. Fire this from a `booking.confirmed` subscriber.
 * On success, the booking now has an issued contract with an attachment
 * (the PDF / storage object produced by the configured generator) and a
 * `contract.document.generated` event has been emitted post-commit.
 *
 * Failure modes (all surfaced via the returned status):
 *  - `template_not_found`       — no active template matches the slug
 *  - `template_version_missing` — template exists but has no published version
 *  - `booking_not_found`        — booking disappeared between confirm + fire
 *  - `contract_create_failed`   — insert returned null
 *  - `document_<…>`             — pass-through of generateContractDocument statuses
 *
 * Callers (the subscriber wrapper) log these and move on — per the EventBus
 * contract, handler throws are swallowed anyway; returning a discriminated
 * status keeps tests honest.
 */
export async function autoGenerateContractForBooking(
  db: PostgresJsDatabase,
  event: BookingConfirmedLikeEvent,
  options: AutoGenerateContractOptions,
  runtime: AutoGenerateContractRuntime,
): Promise<AutoGenerateContractResult> {
  // Idempotency + storefront pre-create flow: if any contract for
  // this booking already exists, REUSE it.
  //
  //   - **Storefront pre-create**: at /checkout/start, the operator
  //     template creates a draft contract holding the acceptance
  //     metadata in `metadata.acceptance` (no rendered body yet —
  //     variables aren't fully resolved until booking.confirmed).
  //     This branch picks it up, fills in the variables we now know,
  //     and issues + generates the PDF — replacing the older
  //     "marker stashed in bookings.internal_notes" pattern.
  //
  //   - **Race**: two callers (subscriber + workflow step) collide on
  //     a confirmed booking. Whichever reaches generation first wins;
  //     the other sees the document already attached and returns ok.
  //
  //   - **Retry after failure**: PDF generation flaked, contract row
  //     still draft with no document. Re-attempt on the same row
  //     instead of creating duplicates.
  //
  // A booking should have at most one active contract per scope;
  // operators wanting a fresh one use the regenerate admin route.
  const scope = options.scope ?? "customer"
  const isPreview = options.previewMode === true
  const forceRecompute = options.forceRecompute === true
  // Preview always reflects the current template + booking state, so
  // skip the "existing contract → return its attachment" idempotency
  // branch. We still walk the rest of the pipeline (template lookup,
  // variable build, render).
  const existingContracts = isPreview
    ? { data: [] as Awaited<ReturnType<typeof contractRecordsService.listContracts>>["data"] }
    : await contractRecordsService.listContracts(db, {
        bookingId: event.bookingId,
        scope,
        limit: 1,
        offset: 0,
      })
  const existing = existingContracts.data[0]
  if (existing) {
    const attachments = await contractRecordsService.listAttachments(db, existing.id)
    const documentAttachment = attachments.find((a) => a.kind === "document")
    if (documentAttachment && !forceRecompute) {
      return {
        status: "ok",
        contractId: existing.id,
        attachmentId: documentAttachment.id,
      }
    }
    // Existing contract, no document. Fall through to build full
    // variables + update the contract row + generate the PDF. We
    // keep the draft's metadata.acceptance intact (don't overwrite)
    // so the storefront's acceptance fingerprint survives until the
    // signature row materializes.
  }

  const booking = await bookingsService.getBookingById(db, event.bookingId)
  if (!booking) {
    return { status: "booking_not_found" }
  }

  // Resolve the template + its current version. Consumers configure the slug
  // once at module bootstrap; we look up on every fire so template body
  // edits are picked up without restart. When the booking states a language
  // and the deployment ships an active default template for it, that wins
  // over the configured slug — otherwise a zh-CN operator's customers get the
  // English boilerplate even though the Chinese template is seeded and set as
  // the default for its (scope, language) pair.
  const localizedTemplate =
    options.preferBookingLanguage === false
      ? null
      : await findLocalizedTemplateForBooking(db, booking, scope)
  const template =
    localizedTemplate ??
    (await contractTemplatesService.findTemplateBySlug(db, options.templateSlug))
  if (!template) {
    return { status: "template_not_found" }
  }
  if (!template.currentVersionId) {
    return { status: "template_version_missing" }
  }

  // `options.language` is a deployment-wide default and normally wins over the
  // template's own language. When we picked a template *because* of its
  // language, that pin has to yield — otherwise the Chinese body renders with
  // English dates and currency.
  const effectiveOptions: AutoGenerateContractOptions = localizedTemplate
    ? { ...options, language: localizedTemplate.language }
    : options

  // Prefix + scope is the persisted natural identity for an active series.
  // A missing series remains non-fatal because some operators number
  // contracts externally.
  const series = options.seriesPrefixScope
    ? await contractSeriesService.findActiveByPrefixScope(
        db,
        options.seriesPrefixScope.prefix,
        options.seriesPrefixScope.scope,
      )
    : null

  const variables = await resolveContractGenerationVariables(
    db,
    booking,
    event,
    effectiveOptions,
    runtime,
    {
      id: template.id,
      language: template.language,
      seriesLabel: series?.name ?? null,
    },
  )

  // Preview branch: render the template body with the freshly-resolved
  // variables and return the HTML. We assume `html` format (matches the
  // contract templates the operator ships). No row gets created, no
  // series number is allocated, no PDF bytes are produced.
  if (isPreview) {
    const previewVersion = await contractTemplatesService.getTemplateVersionById(
      db,
      template.currentVersionId,
    )
    if (!previewVersion) {
      return { status: "template_version_missing" }
    }
    const html = renderTemplate(previewVersion.body, "html", variables)
    return {
      status: "preview",
      html,
      templateName: template.name,
      templateLanguage: effectiveOptions.language ?? template.language ?? "en",
    }
  }

  const seriesId = series?.id ?? null

  // Branch on whether the storefront pre-created a draft contract
  // at /checkout/start time (carrying the acceptance metadata on
  // `metadata.acceptance`) vs. a confirmed-without-storefront flow
  // where this is the first time we touch the contract.
  let contractRecord: NonNullable<
    Awaited<ReturnType<typeof contractRecordsService.createContract>>
  > | null = null
  if (existing) {
    // Pre-existing draft (or storefront pre-create): UPDATE it with
    // the freshly-resolved variables + templateVersionId before
    // issuing. We preserve `metadata.acceptance` from the draft if
    // present — the storefront stored the acceptance fingerprint
    // there and we need it for the signature row downstream.
    const preservedMetadata = (existing.metadata as Record<string, unknown> | null) ?? {}
    const updated = await contractRecordsService.updateContract(db, existing.id, {
      templateVersionId: template.currentVersionId,
      seriesId: existing.seriesId ?? seriesId,
      personId: existing.personId ?? booking.personId ?? null,
      organizationId: existing.organizationId ?? booking.organizationId ?? null,
      title: existing.title || `${template.name} — ${booking.bookingNumber}`,
      language: existing.language || effectiveOptions.language || template.language || "en",
      variables,
      metadata: {
        ...preservedMetadata,
        autoGenerated: true,
        trigger: "booking.confirmed",
        triggerActorId: event.actorId,
      },
    })
    contractRecord = updated ?? existing
  } else {
    contractRecord = await contractRecordsService.createContract(db, {
      scope: options.scope ?? "customer",
      status: "draft",
      title: `${template.name} — ${booking.bookingNumber}`,
      templateVersionId: template.currentVersionId,
      seriesId,
      bookingId: event.bookingId,
      personId: booking.personId ?? null,
      organizationId: booking.organizationId ?? null,
      language: effectiveOptions.language ?? template.language ?? "en",
      variables,
      metadata: {
        autoGenerated: true,
        trigger: "booking.confirmed",
        triggerActorId: event.actorId,
      },
    })
  }
  if (!contractRecord) {
    return { status: "contract_create_failed" }
  }

  const result = await contractDocumentsService.generateContractDocument(
    db,
    contractRecord.id,
    {
      issueIfDraft: true,
      replaceExisting: true,
      kind: "document",
      publicDelivery: false,
    },
    {
      generator: runtime.generator,
      eventBus: runtime.eventBus,
      lifecycleHooks: runtime.lifecycleHooks,
    },
    { regenerated: forceRecompute, forceRerender: forceRecompute },
  )

  if (result.status === "generated") {
    return { status: "ok", contractId: contractRecord.id, attachmentId: result.attachment.id }
  }

  return { status: "document_failed", reason: result.status }
}

/**
 * The language a booking's customer-facing documents should be produced in:
 * the contact's stated preference first, then the booking-level communication
 * language. `null` when the booking says nothing — the caller then keeps the
 * deployment's configured template/language.
 */
export function resolveBookingDocumentLanguage(
  booking: Pick<
    NonNullable<Awaited<ReturnType<typeof bookingsService.getBookingById>>>,
    "contactPreferredLanguage" | "communicationLanguage"
  >,
): string | null {
  const candidate = booking.contactPreferredLanguage ?? booking.communicationLanguage
  return candidate?.trim() || null
}

/**
 * Active default template matching the booking's document language, or `null`
 * when the booking states no language or no template ships for it.
 */
async function findLocalizedTemplateForBooking(
  db: PostgresJsDatabase,
  booking: NonNullable<Awaited<ReturnType<typeof bookingsService.getBookingById>>>,
  scope: NonNullable<AutoGenerateContractOptions["scope"]>,
) {
  const language = resolveBookingDocumentLanguage(booking)
  if (!language) return null

  const template = await contractTemplatesService.findDefaultTemplateByLanguage(db, {
    scope,
    language,
  })
  return template?.currentVersionId ? template : null
}
