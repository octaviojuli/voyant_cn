/**
 * Contract template variable bindings, owned by the legal module.
 *
 * A deployment that auto-generates customer contracts needs a
 * `resolveVariables` callback (see `AutoGenerateContractOptions`) that folds
 * booking / finance / relationships data on top of the default variable bag.
 * That folding is *framework* (legal) domain logic — it knows the canonical
 * contract variable surface — so it lives here rather than in every
 * deployment.
 *
 * `buildContractVariableBindings(options)` returns a `ResolveContractVariablesFn`
 * that:
 *   - promotes the storefront's acceptance marker (saved into
 *     `booking.internalNotes`) into the `acceptance.*` variables,
 *   - loads the booking's gross payment schedule from finance,
 *   - derives an accommodation `roomsSummary` from the booking items,
 *   - hydrates the `customer.*` block from the linked relationships person /
 *     organization when the booking snapshot columns are blank,
 *   - maps the booking source type to a contract source, and
 *   - reads `DOCUMENTS_BASE_URL` (falling back to `APP_URL`) for templates that
 *     compose absolute resource URLs.
 *
 * The *only* genuinely deployment-specific inputs are injected via `options`:
 *   - the operator profile + payment instructions (live in deployment-owned
 *     settings tables legal can't see), and
 *   - the payment-policy-source resolver (the deployment's policy cascade).
 *
 * legal already depends on `@voyant-travel/bookings`, `@voyant-travel/finance`,
 * and `@voyant-travel/relationships` (none of which depend back on legal — no
 * cycle), so those reads are imported directly.
 */
import { bookingItems } from "@voyant-travel/bookings/schema"
import { bookingPaymentSchedules } from "@voyant-travel/finance/schema"
import { formatPersonName } from "@voyant-travel/i18n/package-formatters"
import { relationshipsService } from "@voyant-travel/relationships"
import { asc, eq } from "drizzle-orm"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"

import {
  type PaymentScheduleSummary,
  summarizeBookingPaymentScheduleRows,
} from "./payment-schedule-variables.js"
import type { ResolveContractVariablesFn } from "./service-auto-generate-types.js"

/**
 * Resolved operator profile fields used to fill the contract's `operator.*`
 * block. Mirrors the operator-settings shape but stays structural so legal
 * doesn't import the deployment's settings types.
 */
export interface ContractOperatorProfile {
  name?: string | null
  legalName?: string | null
  vatId?: string | null
  registrationNumber?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  license?: string | null
  licenseAuthority?: string | null
  signatoryName?: string | null
  signatoryRole?: string | null
}

/** Resolved operator payment instructions (bank details) for `operator.*`. */
export interface ContractOperatorPaymentInstructions {
  iban?: string | null
  bank?: string | null
}

/**
 * Deployment-supplied dependencies for the contract variable bindings. The
 * operator profile / payment instructions live in deployment-owned settings
 * tables, and the payment-policy source comes from the deployment's policy
 * cascade — both are injected here so legal stays free of those concerns.
 */
export interface ContractVariableBindingsOptions {
  /** Resolve the operator profile from the request db (or `null`). */
  resolveOperatorProfile(
    db: PostgresJsDatabase,
  ): Promise<ContractOperatorProfile | null> | ContractOperatorProfile | null
  /** Resolve the operator payment instructions from the request db (or `null`). */
  resolveOperatorPaymentInstructions(
    db: PostgresJsDatabase,
  ):
    | Promise<ContractOperatorPaymentInstructions | null>
    | ContractOperatorPaymentInstructions
    | null
  /**
   * Resolve the active payment-policy source label from the booking's
   * internal notes (e.g. "operator_default" | "supplier" | "category" |
   * "listing" | "booking"). Optional — defaults to "operator_default".
   */
  resolvePaymentPolicySource?(internalNotes: string): string | null | undefined
}

/**
 * Build the `resolveVariables` callback for `AutoGenerateContractOptions`.
 * Folds booking / finance / relationships data (and the injected
 * deployment-specific operator + policy reads) on top of the default
 * variable bag.
 */
export function buildContractVariableBindings(
  options: ContractVariableBindingsOptions,
): ResolveContractVariablesFn {
  const { resolveOperatorProfile, resolveOperatorPaymentInstructions, resolvePaymentPolicySource } =
    options

  return async ({ db, booking, defaults, bindings }) => {
    const acceptance = parseAcceptanceMarker(booking.internalNotes ?? "")
    const schedule = await loadBookingPaymentSchedule(db, booking.id)
    const roomsSummary = await deriveRoomsSummary(db, booking.id)
    const [operatorProfile, paymentInstructions] = await Promise.all([
      resolveOperatorProfile(db),
      resolveOperatorPaymentInstructions(db),
    ])

    // Hydrate the customer block from the linked relationships person /
    // identity record when the booking's snapshot columns are empty.
    // Bookings created before snapshot-at-create landed still have
    // `contact_*` nulls; without this fallback the contract template renders
    // blank customer info even though the data lives on the linked person.
    const customerOverride = await resolveCustomerVariables(
      db,
      booking.personId,
      booking.organizationId,
      // The document's own language, not the operator's UI locale — this
      // artifact is read by the customer.
      defaults.contract.language,
    )

    // Public base URL for any external resources templates load when CF
    // Browser Rendering pulls the HTML to a PDF. In dev this falls back to
    // APP_URL (localhost) so existing template authoring workflows keep
    // working; in prod this MUST be set to a publicly-reachable URL.
    const documentsBaseUrl =
      readStringBinding(bindings, "DOCUMENTS_BASE_URL") || readStringBinding(bindings, "APP_URL")

    const policySource =
      resolvePaymentPolicySource?.(booking.internalNotes ?? "") ?? "operator_default"

    return {
      ...defaults,
      documents: {
        baseUrl: documentsBaseUrl,
        base_url: documentsBaseUrl,
      },
      booking: {
        ...defaults.booking,
        depositAmountCents: schedule.depositAmountCents,
        depositDueDate: schedule.depositDueDate,
        balanceAmountCents: schedule.balanceAmountCents,
        balanceDueDate: schedule.balanceDueDate,
        paymentPolicy: {
          source: policySource,
        },
        roomsSummary,
      },
      payment: {
        ...defaults.payment,
        schedule: schedule.entries,
      },
      operator: {
        ...defaults.operator,
        name: operatorProfile?.name ?? "",
        legalName: operatorProfile?.legalName ?? operatorProfile?.name ?? "",
        vatId: operatorProfile?.vatId ?? "",
        registrationNumber: operatorProfile?.registrationNumber ?? "",
        address: operatorProfile?.address ?? "",
        phone: operatorProfile?.phone ?? "",
        email: operatorProfile?.email ?? "",
        website: operatorProfile?.website ?? "",
        iban: paymentInstructions?.iban ?? "",
        bank: paymentInstructions?.bank ?? "",
        license: operatorProfile?.license ?? "",
        licenseAuthority: operatorProfile?.licenseAuthority ?? "",
        signatoryName: operatorProfile?.signatoryName ?? "",
        signatoryRole: operatorProfile?.signatoryRole ?? "",
      },
      acceptance: {
        ...defaults.acceptance,
        ipAddress: acceptance?.clientIp ?? "",
        userAgent: acceptance?.userAgent ?? "",
        acceptedAt: acceptance?.acceptedAt ?? "",
        marketingConsent: acceptance?.acceptedMarketing ?? false,
        templateSlug: acceptance?.templateSlug ?? defaults.acceptance.templateSlug,
        templateId: acceptance?.templateId ?? defaults.acceptance.templateId,
      },
      contract: {
        ...defaults.contract,
        signedAt: acceptance?.acceptedAt ?? defaults.contract.signedAt,
        source: bookingSourceTypeToContractSource(booking.sourceType),
      },
      customer: customerOverride
        ? {
            ...defaults.customer,
            firstName: defaults.customer.firstName || customerOverride.firstName,
            lastName: defaults.customer.lastName || customerOverride.lastName,
            fullName: defaults.customer.fullName || customerOverride.fullName,
            email: defaults.customer.email || customerOverride.email,
            phone: defaults.customer.phone || customerOverride.phone,
            dateOfBirth: defaults.customer.dateOfBirth || customerOverride.dateOfBirth,
            companyName: defaults.customer.companyName || customerOverride.companyName,
            address: {
              ...defaults.customer.address,
              line1: defaults.customer.address.line1 || customerOverride.address.line1,
              city: defaults.customer.address.city || customerOverride.address.city,
              region: defaults.customer.address.region || customerOverride.address.region,
              postal: defaults.customer.address.postal || customerOverride.address.postal,
              country: defaults.customer.address.country || customerOverride.address.country,
            },
          }
        : defaults.customer,
    }
  }
}

interface StoredContractAcceptance {
  templateId?: string
  templateSlug?: string
  acceptedAt?: string
  acceptedMarketing?: boolean
  clientIp?: string
  userAgent?: string
  renderedHtmlLength?: number
}

const ACCEPTANCE_MARKER_PREFIX = "__contract_acceptance__:"

function readStringBinding(
  bindings: Record<string, unknown> | null | undefined,
  key: string,
): string {
  const value = bindings?.[key]
  return typeof value === "string" ? value.trim() : ""
}

function parseAcceptanceMarker(internalNotes: string): StoredContractAcceptance | null {
  for (const line of internalNotes.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (trimmed.startsWith(ACCEPTANCE_MARKER_PREFIX)) {
      try {
        return JSON.parse(trimmed.slice(ACCEPTANCE_MARKER_PREFIX.length))
      } catch {
        return null
      }
    }
  }
  return null
}

function bookingSourceTypeToContractSource(sourceType: string | null | undefined): string {
  switch (sourceType) {
    case "manual":
    case "internal":
      return "staff_issued"
    case "direct":
      return "self_service"
    case "affiliate":
    case "ota":
    case "reseller":
    case "api_partner":
      return "agent"
    default:
      return "self_service"
  }
}

async function resolveCustomerVariables(
  db: PostgresJsDatabase,
  personId: string | null,
  organizationId: string | null,
  language: string,
): Promise<{
  firstName: string
  lastName: string
  fullName: string
  email: string
  phone: string
  dateOfBirth: string
  companyName: string
  address: { line1: string; city: string; region: string; postal: string; country: string }
} | null> {
  if (personId) {
    const person = await relationshipsService.getPersonById(db, personId)
    if (!person) return null
    const addresses = await relationshipsService
      .listAddresses(db, "person", person.id)
      .catch(() => [])
    const primary = addresses.find((a) => a.isPrimary) ?? addresses[0] ?? null
    const fullName = formatPersonName(language, {
      firstName: person.firstName,
      lastName: person.lastName,
    })
    return {
      firstName: person.firstName ?? "",
      lastName: person.lastName ?? "",
      fullName,
      email: person.email ?? "",
      phone: person.phone ?? "",
      dateOfBirth: person.dateOfBirth ?? "",
      companyName: "",
      address: {
        line1: primary?.line1 ?? "",
        city: primary?.city ?? "",
        region: primary?.region ?? "",
        postal: primary?.postalCode ?? "",
        country: primary?.country ?? "",
      },
    }
  }
  if (organizationId) {
    const org = await relationshipsService.getOrganizationById(db, organizationId)
    if (!org) return null
    const addresses = await relationshipsService
      .listAddresses(db, "organization", org.id)
      .catch(() => [])
    const primary = addresses.find((a) => a.isPrimary) ?? addresses[0] ?? null
    return {
      firstName: "",
      lastName: "",
      fullName: org.name ?? "",
      email: "",
      phone: "",
      dateOfBirth: "",
      companyName: org.name ?? "",
      address: {
        line1: primary?.line1 ?? "",
        city: primary?.city ?? "",
        region: primary?.region ?? "",
        postal: primary?.postalCode ?? "",
        country: primary?.country ?? "",
      },
    }
  }
  return null
}

async function loadBookingPaymentSchedule(
  db: PostgresJsDatabase,
  bookingId: string,
): Promise<PaymentScheduleSummary> {
  const rows = await db
    .select()
    .from(bookingPaymentSchedules)
    .where(eq(bookingPaymentSchedules.bookingId, bookingId))
    .orderBy(asc(bookingPaymentSchedules.dueDate), asc(bookingPaymentSchedules.createdAt))

  return summarizeBookingPaymentScheduleRows(rows)
}

async function deriveRoomsSummary(db: PostgresJsDatabase, bookingId: string): Promise<string> {
  const rows = await db
    .select({
      title: bookingItems.title,
      quantity: bookingItems.quantity,
      itemType: bookingItems.itemType,
    })
    .from(bookingItems)
    .where(eq(bookingItems.bookingId, bookingId))

  const accommodationLines = rows.filter((r) => r.itemType === "accommodation")
  return accommodationLines.map((r) => `${r.quantity}× ${r.title}`).join(", ")
}
