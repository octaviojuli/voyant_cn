import type { ActionLedgerRequestContextValues } from "@voyant-travel/action-ledger"
import type { BookingPiiService, bookingsService } from "@voyant-travel/bookings"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"

import type { ContractLifecycleHook } from "./lifecycle.js"
import type { ContractDocumentGenerator } from "./service-documents.js"

/**
 * Event shape emitted by `@voyant-travel/bookings` on confirm. Duplicated here so
 * legal doesn't have to import the bookings service just for the interface —
 * the concrete `bookingsService` lookup happens inside the handler.
 */
export interface BookingConfirmedLikeEvent {
  bookingId: string
  bookingNumber: string
  actorId: string | null
}

/**
 * Variables passed to the contract template at render time. Consumers can
 * augment via `resolveVariables`; the built-in resolver supplies the fields
 * the default contract template expects.
 *
 * Mirrors the canonical Voyant contract surface so the same template body
 * renders identically at storefront preview time and at post-confirm
 * auto-generation time. Anything we can't fill from the persisted booking
 * row (acceptance fingerprint, operator info, line items breakdown,
 * vertical-specific schedule details) is emitted as an empty default — the
 * operator starter's `resolveVariables` callback overrides them.
 */
export interface OperatorContextVariables {
  name: string
  legalName: string
  vatId: string
  registrationNumber: string
  address: string
  phone: string
  email: string
  website: string
  iban: string
  bank: string
  license: string
  licenseAuthority: string
  /** Human whose name appears on the operator-side signature line. */
  signatoryName: string
  /** Their role / title (e.g. "Managing Director"). */
  signatoryRole: string
}

export interface AcceptanceContextVariables {
  ipAddress: string
  userAgent: string
  acceptedAt: string
  marketingConsent: boolean
  templateSlug: string
  templateId: string
}

export interface ContractTravelerVariable {
  id: string
  index: number
  band: string
  participantType: string
  isLead: boolean
  isPrimary: boolean
  firstName: string
  lastName: string
  fullName: string
  email: string
  phone: string
  dateOfBirth: string
  document: {
    type: string
    number: string
    country: string
    issuingAuthority: string
    issueDate: string
    expiryDate: string
  }
}

export interface ContractItemVariable {
  index: number
  kind: string
  description: string
  quantity: number
  unitAmountCents: number
  totalAmountCents: number
  currency: string
  taxIncluded: boolean
}

export interface DefaultContractVariables {
  // Top-level clocks
  today: string
  currentDate: string
  currentDateTime: string
  currentTime: string

  contract: {
    contractNumber: string
    /** Alias used by older templates: `{{ contract.number }}`. */
    number: string
    contractDate: string
    /** Alias used by templates that read `{{ contract.date }}`. */
    date: string
    issuedAt: string
    signedAt: string
    isManual: boolean
    series: string
    channel: string
    source: string
    status: string
    /**
     * The document's own language tag (`options.language` -> the template's
     * language -> `"en"`). Exposed so `resolveVariables` extenders — and
     * templates — can format on the *document's* locale instead of whatever
     * locale the operator's admin session happens to be in.
     */
    language: string
  }

  booking: {
    bookingId: string
    bookingNumber: string
    /** Alias used by templates that read `{{ booking.number }}`. */
    number: string
    /** Alias used by templates that read `{{ booking.id }}`. */
    id: string
    status: string

    // Entity context
    entityModule: string
    entityId: string
    vertical: string
    productName: string
    productSubtitle: string
    destination: string

    // Pax — bands map keeps Voyant's flexible band model intact
    pax: number | null
    paxTotal: number
    paxAdult: number
    paxChild: number
    paxInfant: number
    paxBands: Record<string, number>

    // Trip dates (vertical-agnostic)
    travelDates: {
      start: string
      end: string
      durationNights: number
    }
    startDate: string | null
    endDate: string | null

    // Money — Voyant's sell vs cost split
    sellCurrency: string
    sellAmountCents: number | null
    sellSubtotalCents: number
    sellTaxAmountCents: number
    sellDiscountAmountCents: number
    costCurrency: string
    costAmountCents: number
    baseCurrency: string
    baseSellAmountCents: number
    marginPercent: number

    // Aliases used by older templates (`booking.currency`,
    // `booking.totalAmountCents`)
    currency: string
    totalAmountCents: number | null
    subtotalAmountCents: number
    taxAmountCents: number
    discountAmountCents: number

    // Settlement
    paidAmountCents: number
    /** Current remaining amount owed after completed payments / invoice balance. */
    amountDueCents: number
    balanceDueCents: number
    isPaidInFull: boolean

    // Gross scheduled installments from booking_payment_schedules. These are
    // payment-plan amounts, not net remaining balances; use amountDueCents /
    // balanceDueCents / isPaidInFull for current settlement state.
    depositAmountCents: number
    depositDueDate: string
    balanceAmountCents: number
    balanceDueDate: string

    // Trace of which cascade layer the active policy came from
    // ("operator_default" | "supplier" | "category" | "listing" |
    // "booking"). Useful for audit copy in the contract footer.
    paymentPolicy: {
      source: string
    }

    // Free-form summary of accommodation lines, e.g. "1× Double room".
    // Operators with structured cabin/room contracts can override via
    // `resolveVariables`.
    roomsSummary: string

    // Source provenance
    source: {
      kind: string
      type: string
      connectionId: string
      ref: string
      externalRef: string
      supplier: {
        id: string
        name: string
      }
    }

    // Notes
    internalNotes: string
    customerNotes: string
  }

  customer: {
    type: string
    firstName: string
    lastName: string
    fullName: string
    email: string
    phone: string
    dateOfBirth: string
    companyName: string
    vatId: string
    registrationNumber: string
    address: {
      line1: string
      line2: string
      city: string
      region: string
      postal: string
      country: string
    }
    document: {
      type: string
      number: string
      country: string
      issuingAuthority: string
      issueDate: string
      expiryDate: string
    }
  }

  leadTraveler: {
    id: string
    firstName: string
    lastName: string
    fullName: string
    email: string
    phone: string
  } | null

  travelers: ContractTravelerVariable[]
  /** Alias used by templates that read `{{ passengers }}`. */
  passengers: ContractTravelerVariable[]

  items: ContractItemVariable[]
  addons: ContractItemVariable[]

  product: {
    title: string
    subtitle: string
    destination: string
    module: string
    id: string
    vertical: string
    heroImageUrl: string
  }

  departureSlot: {
    slotId: string
    startAt: string
    endAt: string
    durationDays: number
    departureCity: string
  }
  sailing: {
    sailingId: string
    ship: string
    embarkationPort: string
    disembarkationPort: string
    airArrangement: string
    startDate: string
    endDate: string
    cabinCategoryId: string
    cabinNumberId: string
  }
  stay: {
    checkIn: string
    checkOut: string
    nights: number
    rooms: Array<{ optionUnitId: string; quantity: number; ratePlanId: string }>
    destination: string
  }

  payment: {
    intent: string
    method: string
    amountCents: number
    currency: string
    schedule: Array<{
      index: number
      type: string
      amountCents: number
      currency: string
      dueDate: string
      status: string
    }>
    capturedAt: string
    /** Alias for `capturedAt`, exposed for templates that prefer the
     *  `created_at` naming. */
    createdAt: string
    latestCompleted?: {
      method: string
      methodLabel: string
      date: string
    }
  }

  operator: OperatorContextVariables
  acceptance: AcceptanceContextVariables
}

/**
 * Hook point so consumers can extend (or replace) the template variables.
 * Receives the default payload plus the raw booking/travelers so the
 * consumer can fold in product/person/etc. lookups without re-fetching.
 */
export type ResolveContractVariablesFn = (context: {
  db: PostgresJsDatabase
  booking: NonNullable<Awaited<ReturnType<typeof bookingsService.getBookingById>>>
  travelers: Awaited<ReturnType<typeof bookingsService.listTravelers>>
  defaults: DefaultContractVariables
  /**
   * Runtime bindings (Cloudflare Worker `env` or Node `process.env`)
   * passed through from the auto-generate runtime. Use this to read
   * deploy-specific env vars like `DOCUMENTS_BASE_URL` for templates
   * that compose absolute resource URLs (logos, hosted fonts).
   *
   * `null` when the runtime didn't supply bindings — usually only in
   * tests; production code paths always pass them.
   */
  bindings?: Record<string, unknown> | null
}) => Promise<Record<string, unknown>> | Record<string, unknown>

export interface AutoGenerateContractOptions {
  enabled?: boolean
  /**
   * Slug of the contract template to use. The contract is created against
   * that template's `currentVersionId`. If the template has no current
   * version, the handler logs + bails.
   */
  templateSlug: string
  /**
   * Scope the contract defaults to when creating. Matches
   * `contractScopeEnum`; the default `"customer"` is right for the common
   * operator-issues-to-traveler case.
   */
  scope?: "customer" | "supplier" | "partner" | "channel" | "other"
  /**
   * When set, resolves the active series via the `(prefix, scope)`
   * partial unique index. Without it, the contract issues unnumbered.
   */
  seriesPrefixScope?: ContractSeriesIdentity
  /**
   * Language code written onto the contract row. Used by the PDF
   * renderer to pick the right locale for date/currency filters.
   */
  language?: string
  /**
   * When `true` (the default) and the booking states a document language,
   * the active default template for that language wins over `templateSlug`
   * and `language` — those are deployment-wide defaults, and a customer
   * should get their contract in their own language when the operator has
   * seeded one.
   *
   * Set to `false` when the caller already resolved a template deliberately
   * (e.g. the admin "generate from defaults" route, which takes an explicit
   * `language`), so an operator's explicit pick is never second-guessed.
   */
  preferBookingLanguage?: boolean
  /**
   * Optional variable extender — see `ResolveContractVariablesFn`.
   */
  resolveVariables?: ResolveContractVariablesFn
  /**
   * Dry-run mode used by the operator dashboard's "Add contract"
   * preview. Runs the same template lookup + variable build + render
   * pipeline as a full generate, but returns the rendered HTML without
   * persisting a contract row, allocating a series number, or asking
   * the PDF generator for bytes. Idempotency check is skipped so the
   * preview always reflects the current template + booking state.
   */
  previewMode?: boolean
  /**
   * When an issued booking contract already has a document attachment,
   * recompute variables from the current booking state and replace the
   * document instead of returning the existing attachment.
   */
  forceRecompute?: boolean
}

export interface ContractSeriesIdentity {
  prefix: string
  scope: "customer" | "supplier" | "partner" | "channel" | "other"
}

export interface AutoGenerateContractRuntime {
  generator: ContractDocumentGenerator
  eventBus?: import("@voyant-travel/core").EventBus
  lifecycleHooks?: readonly ContractLifecycleHook[]
  /**
   * Optional sensitive booking-traveler reader. When supplied, the default
   * resolver can include traveler DOB/document snapshots in the template bag.
   * When absent, those fields keep their empty-string fallbacks.
   */
  bookingPiiService?: BookingPiiService | null
  actionLedgerContext?: ActionLedgerRequestContextValues | null
  /**
   * Runtime bindings forwarded into `resolveVariables` so consumers
   * can read deploy-specific env vars (e.g. `DOCUMENTS_BASE_URL`)
   * without restructuring every auto-generate call site to know
   * about them.
   */
  bindings?: Record<string, unknown> | null
}

export type AutoGenerateContractResult =
  | { status: "ok"; contractId: string; attachmentId: string }
  | { status: "template_not_found" }
  | { status: "template_version_missing" }
  | { status: "booking_not_found" }
  | { status: "contract_create_failed" }
  | { status: "document_failed"; reason: string }
  | {
      status: "preview"
      html: string
      templateName: string
      templateLanguage: string
    }

export type GenerateContractForBookingResult =
  | AutoGenerateContractResult
  | { status: "series_not_found" }
  | { status: "series_ambiguous" }
