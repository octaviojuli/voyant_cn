// agent-quality: file-size exception -- owner: finance; existing service module stays co-located until a dedicated split preserves behavior and tests.
import { appendActionLedgerMutation } from "@voyant-travel/action-ledger"
import { bookingItems, bookings } from "@voyant-travel/bookings/schema"
import { formatPersonName } from "@voyant-travel/i18n/package-formatters"
import { and, asc, eq, inArray, ne, sql } from "drizzle-orm"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"

import { resolveBookingSellTaxRate } from "./booking-tax.js"
import { resolveInvoiceFxContext } from "./invoice-fx.js"
import { isInvoiceNumberUniqueConstraintError } from "./invoice-number-errors.js"
import {
  bookingItemTaxLines,
  bookingPaymentSchedules,
  invoiceLineItems,
  invoiceNumberSeries,
  invoices,
  payments,
} from "./schema.js"
import {
  buildInvoiceIssuedActionLedgerInput,
  type CreateInvoiceFromBookingInput,
  type FinanceServiceRuntime,
  financeService,
  type InvoiceFromBookingData,
  InvoiceNumberConflictError,
  touchLinkedBookingUpdatedAt,
} from "./service.js"

/**
 * Issue / proforma orchestration helpers that wrap the bare invoice
 * creators with EventBus emissions so subscribers (SmartBill plugin,
 * checkout-finalize workflow) can react.
 *
 * `createInvoice*` services in `service.ts` stay pure DB writers —
 * the workflow / route layer chooses when to mark them as "issued"
 * (a status change that's also a system signal).
 */

export interface InvoiceIssueRuntime extends FinanceServiceRuntime {}

export type InvoiceFromBookingCommandOutcome =
  | { status: "issued"; invoice: typeof invoices.$inferSelect }
  | { status: "booking_not_found" }
  | { status: "payment_schedule_not_found" }

interface ExistingConvertedInvoicePointer {
  id: string
  invoiceNumber: string
}

export interface InvoiceIssuedEvent {
  invoiceId: string
  invoiceNumber: string
  invoiceType: "invoice" | "proforma" | "credit_note"
  bookingId: string | null
  totalCents: number
  currency: string
  /** Operator accounting/reporting currency when different from `currency`. */
  baseCurrency?: string
  /** Rate set used to resolve `currency` -> `baseCurrency`, when available. */
  fxRateSetId?: string
  /** Spot rate for `currency` → `baseCurrency`. */
  fxRate?: number
  /** Provider or reference source for `fxRate`, for example `bnr`. */
  fxRateSource?: string
  /** Provider timestamp for the quoted spot rate. */
  fxRateQuotedAt?: string
  /** Provider timestamp after which the quoted spot rate is stale. */
  fxRateValidUntil?: string
  /** Operator FX commission added on top of the spot rate. */
  fxCommissionBps?: number
  /** `fxRate` after commission. Invoice providers should prefer this rate. */
  effectiveRate?: number
  /** Optional invoice mention appended by providers when commission is non-zero. */
  fxCommissionInvoiceMention?: string
  /** Linkage when this invoice replaced a proforma. */
  convertedFromInvoiceId?: string | null
  clientName?: string
  clientEmail?: string | null
  clientPhone?: string | null
  clientAddress?: string | null
  clientCity?: string | null
  clientCounty?: string | null
  clientCountry?: string | null
  clientVatCode?: string | null
  clientRegCom?: string | null
  lineItems?: InvoiceIssuedLineItem[]
  bookingNumber?: string | null
  issueDate?: string
  dueDate?: string
  externalAllocationRequired?: boolean
  externalProvider?: string | null
  externalConfigKey?: string | null
  externalSeriesId?: string | null
  externalPlaceholderNumber?: string | null
  /**
   * Per-issuance opt-out flag. When `true`, e-invoicing plugins
   * (SmartBill etc.) ignore this event instead of pushing the document
   * upstream. Origin: `invoiceFromBookingSchema.skipExternalSync`.
   */
  skipExternalSync?: boolean
}

export interface InvoiceIssuedLineItem {
  description: string
  quantity: number
  unitPrice: number
  currency: string
  bookingPaymentScheduleId?: string
  scheduleType?: (typeof bookingPaymentSchedules.$inferSelect)["scheduleType"]
  schedulePercent?: number
  taxPercentage?: number
  taxName?: string | null
  taxRegimeCode?: TaxRegimeCode | null
  isService?: boolean
}

export type TaxRegimeCode =
  | "standard"
  | "reduced"
  | "exempt"
  | "reverse_charge"
  | "margin_scheme_art311"
  | "zero_rated"
  | "out_of_scope"
  | "other"

type InvoiceLineTaxMetadata = {
  taxPercentage?: number
  taxName?: string | null
  taxRegimeCode?: TaxRegimeCode | null
}

const TAX_REGIME_CODES = new Set<TaxRegimeCode>([
  "standard",
  "reduced",
  "exempt",
  "reverse_charge",
  "margin_scheme_art311",
  "zero_rated",
  "out_of_scope",
  "other",
])

const ISSUED_EVENT = "invoice.issued"
const PROFORMA_ISSUED_EVENT = "invoice.proforma.issued"
const PROFORMA_CONVERTED_EVENT = "invoice.proforma.converted"

export interface InvoiceProformaConvertedEvent extends InvoiceIssuedEvent {
  id: string
  proformaId: string
  proformaInvoiceNumber: string
}

/**
 * Package-owned invoice-from-booking composer shared by HTTP routes and Tools.
 * It owns the cross-module projection read so transport adapters never reach
 * into booking or finance tables themselves.
 */
export async function issueInvoiceFromBookingCommand(
  db: PostgresJsDatabase,
  input: CreateInvoiceFromBookingInput,
  runtime: InvoiceIssueRuntime = {},
): Promise<InvoiceFromBookingCommandOutcome> {
  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, input.bookingId))
    .limit(1)
  if (!booking) return { status: "booking_not_found" }

  const items = await db
    .select()
    .from(bookingItems)
    .where(eq(bookingItems.bookingId, booking.id))
    .orderBy(asc(bookingItems.createdAt), asc(bookingItems.id))
  const [paymentSchedule] = input.bookingPaymentScheduleId
    ? await db
        .select()
        .from(bookingPaymentSchedules)
        .where(
          and(
            eq(bookingPaymentSchedules.id, input.bookingPaymentScheduleId),
            eq(bookingPaymentSchedules.bookingId, booking.id),
          ),
        )
        .limit(1)
    : []
  if (input.bookingPaymentScheduleId && !paymentSchedule) {
    return { status: "payment_schedule_not_found" }
  }

  const bookingData: InvoiceFromBookingData = {
    booking: {
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      personId: booking.personId,
      organizationId: booking.organizationId,
      startDate: booking.startDate,
      endDate: booking.endDate,
      sellCurrency: booking.sellCurrency,
      baseCurrency: booking.baseCurrency,
      fxRateSetId: booking.fxRateSetId,
      sellAmountCents: booking.sellAmountCents,
      baseSellAmountCents: booking.baseSellAmountCents,
    },
    paymentSchedule: paymentSchedule
      ? {
          id: paymentSchedule.id,
          bookingId: paymentSchedule.bookingId,
          bookingItemId: paymentSchedule.bookingItemId,
          scheduleType: paymentSchedule.scheduleType,
          dueDate: paymentSchedule.dueDate,
          currency: paymentSchedule.currency,
          amountCents: paymentSchedule.amountCents,
        }
      : null,
    items: items.map((item) => ({
      id: item.id,
      title: item.title,
      productId: item.productId,
      productName: item.productNameSnapshot,
      productNameSnapshot: item.productNameSnapshot,
      optionNameSnapshot: item.optionNameSnapshot,
      unitNameSnapshot: item.unitNameSnapshot,
      departureLabelSnapshot: item.departureLabelSnapshot,
      startDate: item.serviceDate ?? item.startsAt,
      serviceDate: item.serviceDate,
      startsAt: item.startsAt,
      endDate: item.endsAt ?? item.serviceDate,
      endsAt: item.endsAt,
      quantity: item.quantity,
      unitSellAmountCents: item.unitSellAmountCents,
      totalSellAmountCents: item.totalSellAmountCents,
    })),
  }
  const issuer =
    input.invoiceType === "proforma" ? issueProformaFromBooking : issueInvoiceFromBooking
  const invoice = await issuer(db, input, bookingData, runtime)
  if (!invoice) return { status: "booking_not_found" }
  return { status: "issued", invoice }
}

/**
 * Create + emit an invoice from a booking. Returns the persisted row
 * after flipping the status from `draft` to `issued`. Drafts shouldn't
 * trigger SmartBill sync.
 */
export async function issueInvoiceFromBooking(
  db: PostgresJsDatabase,
  input: CreateInvoiceFromBookingInput,
  bookingData: InvoiceFromBookingData,
  runtime: InvoiceIssueRuntime = {},
) {
  const draft = await financeService.createInvoiceFromBooking(db, input, bookingData, runtime)
  if (!draft) return null
  const status = draft.status === "pending_external_allocation" ? draft.status : "issued"

  const updateIssuedInvoice = (writer: PostgresJsDatabase) =>
    writer
      .update(invoices)
      .set({ status, updatedAt: new Date() })
      .where(eq(invoices.id, draft.id))
      .returning()

  const actionLedgerContext = runtime.actionLedgerContext
  const issued = actionLedgerContext
    ? await db.transaction(async (tx) => {
        const [row] = await updateIssuedInvoice(tx)

        if (row) {
          await touchLinkedBookingUpdatedAt(tx, row.bookingId)
          await appendActionLedgerMutation(
            tx,
            await buildInvoiceIssuedActionLedgerInput(
              actionLedgerContext,
              { invoice: row },
              invoiceIssueLedgerOptions(runtime),
            ),
          )
        }

        return row
      })
    : (await updateIssuedInvoice(db))[0]

  const row = issued ?? draft
  if (!actionLedgerContext) {
    await touchLinkedBookingUpdatedAt(db, row.bookingId)
  }
  await emitIssued(db, runtime, ISSUED_EVENT, row, { skipExternalSync: input.skipExternalSync })
  return row
}

/**
 * Create + emit a proforma from a booking. Same shape as
 * `issueInvoiceFromBooking` but marks the row as `invoiceType:
 * 'proforma'` and emits the proforma-specific event so the
 * SmartBill plugin can route to its proforma endpoint.
 */
export async function issueProformaFromBooking(
  db: PostgresJsDatabase,
  input: CreateInvoiceFromBookingInput,
  bookingData: InvoiceFromBookingData,
  runtime: InvoiceIssueRuntime = {},
) {
  const draft = await financeService.createInvoiceFromBooking(db, input, bookingData, runtime)
  if (!draft) return null
  const status = draft.status === "pending_external_allocation" ? draft.status : "issued"

  const updateIssuedInvoice = (writer: PostgresJsDatabase) =>
    writer
      .update(invoices)
      .set({ invoiceType: "proforma", status, updatedAt: new Date() })
      .where(eq(invoices.id, draft.id))
      .returning()

  const actionLedgerContext = runtime.actionLedgerContext
  const issued = actionLedgerContext
    ? await db.transaction(async (tx) => {
        const [row] = await updateIssuedInvoice(tx)

        if (row) {
          await touchLinkedBookingUpdatedAt(tx, row.bookingId)
          await appendActionLedgerMutation(
            tx,
            await buildInvoiceIssuedActionLedgerInput(
              actionLedgerContext,
              { invoice: row },
              invoiceIssueLedgerOptions(runtime),
            ),
          )
        }

        return row
      })
    : (await updateIssuedInvoice(db))[0]

  const row = issued ?? draft
  if (!actionLedgerContext) {
    await touchLinkedBookingUpdatedAt(db, row.bookingId)
  }
  await emitIssued(db, runtime, PROFORMA_ISSUED_EVENT, row, {
    skipExternalSync: input.skipExternalSync,
  })
  return row
}

function invoiceIssueLedgerOptions(runtime: InvoiceIssueRuntime) {
  return {
    authorizationSource: runtime.actionLedgerAuthorizationSource,
    actionName: runtime.actionLedgerActionName,
    routeOrToolName: runtime.actionLedgerRouteOrToolName,
    capabilityId: runtime.actionLedgerCapabilityId,
    capabilityVersion: runtime.actionLedgerCapabilityVersion,
    evaluatedRisk: runtime.actionLedgerEvaluatedRisk,
    causationActionId: runtime.actionLedgerCausationActionId,
    approvalId: runtime.actionLedgerApprovalId,
    idempotencyScope: runtime.actionLedgerIdempotencyScope,
    idempotencyKey: runtime.actionLedgerIdempotencyKey,
    idempotencyFingerprint: runtime.actionLedgerIdempotencyFingerprint,
  }
}

async function emitIssued(
  db: PostgresJsDatabase,
  runtime: InvoiceIssueRuntime,
  eventName: typeof ISSUED_EVENT | typeof PROFORMA_ISSUED_EVENT,
  invoice: typeof invoices.$inferSelect,
  options: { skipExternalSync?: boolean } = {},
): Promise<void> {
  if (!runtime.eventBus) return
  const payload = await buildInvoiceIssuedEvent(db, invoice, runtime)
  if (options.skipExternalSync) payload.skipExternalSync = true
  await runtime.eventBus.emit(eventName, payload)
}

async function emitProformaConverted(
  db: PostgresJsDatabase,
  runtime: InvoiceIssueRuntime,
  invoice: typeof invoices.$inferSelect,
  proforma: typeof invoices.$inferSelect,
): Promise<void> {
  if (!runtime.eventBus) return
  const issuedEvent = await buildInvoiceIssuedEvent(db, invoice, runtime)
  const payload: InvoiceProformaConvertedEvent = {
    ...issuedEvent,
    id: issuedEvent.invoiceId,
    proformaId: proforma.id,
    proformaInvoiceNumber: proforma.invoiceNumber,
  }
  await runtime.eventBus.emit(ISSUED_EVENT, issuedEvent)
  await runtime.eventBus.emit(PROFORMA_CONVERTED_EVENT, payload)
}

export async function buildInvoiceIssuedEvent(
  db: PostgresJsDatabase,
  invoice: typeof invoices.$inferSelect,
  runtime: InvoiceIssueRuntime = {},
): Promise<InvoiceIssuedEvent> {
  const [booking] = invoice.bookingId
    ? await db.select().from(bookings).where(eq(bookings.id, invoice.bookingId)).limit(1)
    : []
  const [series] =
    invoice.seriesId && invoice.status === "pending_external_allocation"
      ? await db
          .select()
          .from(invoiceNumberSeries)
          .where(eq(invoiceNumberSeries.id, invoice.seriesId))
          .limit(1)
      : []
  const lines = await db
    .select()
    .from(invoiceLineItems)
    .where(eq(invoiceLineItems.invoiceId, invoice.id))
    .orderBy(asc(invoiceLineItems.sortOrder))
  const taxMetadataByBookingItemId = await loadLineTaxMetadata(db, lines)
  const scheduleMetadataById = await loadLineScheduleMetadata(db, lines)
  const payload: InvoiceIssuedEvent = {
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    invoiceType: invoice.invoiceType,
    bookingId: invoice.bookingId,
    totalCents: invoice.totalCents,
    currency: invoice.currency,
    convertedFromInvoiceId: invoice.convertedFromInvoiceId,
    clientName: buildClientName(booking),
    clientEmail: booking?.contactEmail ?? null,
    clientPhone: booking?.contactPhone ?? null,
    clientAddress:
      [booking?.contactAddressLine1, booking?.contactAddressLine2].filter(Boolean).join("\n") ||
      null,
    clientCity: booking?.contactCity ?? null,
    clientCounty: booking?.contactRegion ?? null,
    clientCountry: booking?.contactCountry ?? null,
    clientVatCode: null,
    clientRegCom: null,
    lineItems: lines.map((line) => {
      const taxMetadata =
        line.bookingItemId == null ? undefined : taxMetadataByBookingItemId.get(line.bookingItemId)
      const taxPercentage = line.taxRate ?? taxMetadata?.taxPercentage
      const schedule =
        line.bookingPaymentScheduleId == null
          ? undefined
          : scheduleMetadataById.get(line.bookingPaymentScheduleId)
      const schedulePercent =
        schedule && booking?.sellAmountCents && booking.sellAmountCents > 0
          ? Math.round((schedule.amountCents / booking.sellAmountCents) * 100)
          : undefined

      return {
        description: line.description,
        quantity: line.quantity,
        unitPrice: centsToMajor(line.unitPriceCents),
        currency: invoice.currency,
        ...(line.bookingPaymentScheduleId == null
          ? {}
          : { bookingPaymentScheduleId: line.bookingPaymentScheduleId }),
        ...(schedule?.scheduleType == null ? {} : { scheduleType: schedule.scheduleType }),
        ...(schedulePercent == null ? {} : { schedulePercent }),
        ...(taxPercentage == null ? {} : { taxPercentage }),
        ...(taxMetadata?.taxName == null ? {} : { taxName: taxMetadata.taxName }),
        ...(taxMetadata?.taxRegimeCode == null ? {} : { taxRegimeCode: taxMetadata.taxRegimeCode }),
        isService: true,
      }
    }),
    bookingNumber: booking?.bookingNumber ?? null,
    issueDate: toDateString(invoice.issueDate),
    dueDate: toDateString(invoice.dueDate),
  }
  if (series?.externalProvider) {
    payload.externalAllocationRequired = true
    payload.externalProvider = series.externalProvider
    payload.externalConfigKey = series.externalConfigKey
    payload.externalSeriesId = series.id
    payload.externalPlaceholderNumber = invoice.invoiceNumber
  }
  const fx = await resolveInvoiceFxContext(db, invoice, runtime)
  if (fx) Object.assign(payload, fx)
  return payload
}

async function loadLineTaxMetadata(
  db: PostgresJsDatabase,
  lines: Array<typeof invoiceLineItems.$inferSelect>,
): Promise<Map<string, InvoiceLineTaxMetadata>> {
  const bookingItemIds = [
    ...new Set(lines.map((line) => line.bookingItemId).filter((id): id is string => Boolean(id))),
  ]
  if (bookingItemIds.length === 0) return new Map()

  const taxLines = await db
    .select({
      bookingItemId: bookingItemTaxLines.bookingItemId,
      name: bookingItemTaxLines.name,
      code: bookingItemTaxLines.code,
      scope: bookingItemTaxLines.scope,
      rateBasisPoints: bookingItemTaxLines.rateBasisPoints,
    })
    .from(bookingItemTaxLines)
    .where(inArray(bookingItemTaxLines.bookingItemId, bookingItemIds))
    .orderBy(
      asc(bookingItemTaxLines.bookingItemId),
      asc(bookingItemTaxLines.sortOrder),
      asc(bookingItemTaxLines.createdAt),
    )

  const taxLinesByBookingItemId = new Map<string, typeof taxLines>()
  for (const taxLine of taxLines) {
    const existing = taxLinesByBookingItemId.get(taxLine.bookingItemId) ?? []
    existing.push(taxLine)
    taxLinesByBookingItemId.set(taxLine.bookingItemId, existing)
  }

  const metadataByBookingItemId = new Map<string, InvoiceLineTaxMetadata>()
  for (const bookingItemId of bookingItemIds) {
    const taxLine = selectEventTaxLine(taxLinesByBookingItemId.get(bookingItemId) ?? [])
    if (!taxLine) continue

    metadataByBookingItemId.set(bookingItemId, {
      ...(taxLine.rateBasisPoints == null
        ? {}
        : { taxPercentage: Math.round(taxLine.rateBasisPoints / 100) }),
      taxName: taxLine.name,
      taxRegimeCode: parseTaxRegimeCode(taxLine.code),
    })
  }

  await backfillMissingLineTaxMetadata(db, bookingItemIds, metadataByBookingItemId)
  return metadataByBookingItemId
}

async function loadLineScheduleMetadata(
  db: PostgresJsDatabase,
  lines: Array<typeof invoiceLineItems.$inferSelect>,
) {
  const scheduleIds = [
    ...new Set(
      lines.map((line) => line.bookingPaymentScheduleId).filter((id): id is string => Boolean(id)),
    ),
  ]
  if (scheduleIds.length === 0)
    return new Map<string, typeof bookingPaymentSchedules.$inferSelect>()

  const scheduleRows = await db
    .select()
    .from(bookingPaymentSchedules)
    .where(inArray(bookingPaymentSchedules.id, scheduleIds))

  return new Map(scheduleRows.map((schedule) => [schedule.id, schedule]))
}

function selectEventTaxLine<T extends { scope: string; rateBasisPoints: number | null }>(
  taxLines: T[],
): T | null {
  return (
    taxLines.find((taxLine) => taxLine.scope !== "withheld" && taxLine.rateBasisPoints != null) ??
    taxLines.find((taxLine) => taxLine.scope !== "withheld") ??
    null
  )
}

async function backfillMissingLineTaxMetadata(
  db: PostgresJsDatabase,
  bookingItemIds: string[],
  metadataByBookingItemId: Map<string, InvoiceLineTaxMetadata>,
): Promise<void> {
  const missingBookingItemIds = bookingItemIds.filter((id) => !metadataByBookingItemId.has(id))
  if (missingBookingItemIds.length === 0) return

  const productRows = await db
    .select({
      id: bookingItems.id,
      productId: bookingItems.productId,
    })
    .from(bookingItems)
    .where(inArray(bookingItems.id, missingBookingItemIds))

  for (const row of productRows) {
    if (!row.productId) continue
    const taxRate = await resolveBookingSellTaxRate(db, { productId: row.productId })
    if (!taxRate) continue

    metadataByBookingItemId.set(row.id, {
      taxPercentage: Math.round(taxRate.rate * 100),
      taxName: taxRate.label,
      taxRegimeCode: parseTaxRegimeCode(taxRate.code),
    })
  }
}

function parseTaxRegimeCode(code: string | null | undefined): TaxRegimeCode | null {
  const value = code?.split("/").at(-1)
  return value && TAX_REGIME_CODES.has(value as TaxRegimeCode) ? (value as TaxRegimeCode) : null
}

/**
 * Convert an issued proforma into a final invoice. Copies the proforma's
 * line items verbatim (totals + taxes already match the booking the
 * customer accepted) and voids the proforma so it stops counting against
 * outstanding balances. The new invoice carries `convertedFromInvoiceId`
 * so the audit chain is preserved; downstream subscribers see the linkage
 * on both the generic issued event and the conversion-specific event.
 *
 * Number derivation: `PRO-` prefix → `INV-`; otherwise the original
 * number is suffixed with `-INV`. Callers can override via the optional
 * `invoiceNumber` argument when they want a series-derived number.
 */
export async function convertProformaToInvoice(
  db: PostgresJsDatabase,
  proformaId: string,
  options: {
    invoiceNumber?: string
    issueDate?: string
    dueDate?: string
  } = {},
  runtime: InvoiceIssueRuntime = {},
): Promise<
  | { status: "ok"; invoice: typeof invoices.$inferSelect }
  | { status: "not_found" }
  | { status: "not_proforma" }
  | { status: "already_converted"; invoice: ExistingConvertedInvoicePointer | null }
  | { status: "duplicate_fiscal_invoice"; invoice: ExistingConvertedInvoicePointer }
> {
  const [proforma] = await db.select().from(invoices).where(eq(invoices.id, proformaId)).limit(1)
  if (!proforma) return { status: "not_found" }
  if (proforma.invoiceType !== "proforma") return { status: "not_proforma" }

  const newInvoiceNumber =
    options.invoiceNumber ?? deriveInvoiceNumberFromProforma(proforma.invoiceNumber)
  const todayIso = new Date().toISOString().slice(0, 10)
  const issueDate = options.issueDate ?? todayIso
  const dueDate = options.dueDate ?? toDateString(proforma.dueDate)

  const now = new Date()
  const result = await db
    .transaction(async (tx) => {
      const guardKey = `finance:invoice:convert:${proforma.bookingId}`
      // agent-quality: raw-sql reviewed -- owner: finance; dynamic SQL interpolation uses Drizzle parameter binding or vetted SQL identifiers.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${guardKey}, 0))`)

      const [lockedProforma] = await tx
        .select()
        .from(invoices)
        .where(eq(invoices.id, proformaId))
        .limit(1)
      if (!lockedProforma) return { status: "not_found" as const }
      if (lockedProforma.invoiceType !== "proforma") return { status: "not_proforma" as const }

      const [existing] = await tx
        .select({ id: invoices.id, invoiceNumber: invoices.invoiceNumber })
        .from(invoices)
        .where(eq(invoices.convertedFromInvoiceId, proformaId))
        .limit(1)
      if (existing) return { status: "already_converted" as const, invoice: existing }
      if (lockedProforma.status === "void") {
        return { status: "already_converted" as const, invoice: null }
      }

      const [duplicateFiscalInvoice] = await tx
        .select({ id: invoices.id, invoiceNumber: invoices.invoiceNumber })
        .from(invoices)
        .where(
          and(
            eq(invoices.bookingId, lockedProforma.bookingId),
            eq(invoices.invoiceType, "invoice"),
            ne(invoices.status, "void"),
            eq(invoices.totalCents, lockedProforma.totalCents),
            eq(invoices.currency, lockedProforma.currency),
          ),
        )
        .limit(1)
      if (duplicateFiscalInvoice) {
        return { status: "duplicate_fiscal_invoice" as const, invoice: duplicateFiscalInvoice }
      }

      const lineItems = await tx
        .select()
        .from(invoiceLineItems)
        .where(eq(invoiceLineItems.invoiceId, proformaId))
        .orderBy(asc(invoiceLineItems.sortOrder))

      const [inserted] = await tx
        .insert(invoices)
        .values({
          invoiceNumber: newInvoiceNumber,
          invoiceType: "invoice",
          convertedFromInvoiceId: lockedProforma.id,
          seriesId: lockedProforma.seriesId,
          templateId: lockedProforma.templateId,
          taxRegimeId: lockedProforma.taxRegimeId,
          language: lockedProforma.language,
          bookingId: lockedProforma.bookingId,
          personId: lockedProforma.personId,
          organizationId: lockedProforma.organizationId,
          status:
            lockedProforma.paidCents >= lockedProforma.totalCents
              ? "paid"
              : lockedProforma.paidCents > 0
                ? "partially_paid"
                : "issued",
          currency: lockedProforma.currency,
          baseCurrency: lockedProforma.baseCurrency,
          fxRateSetId: lockedProforma.fxRateSetId,
          subtotalCents: lockedProforma.subtotalCents,
          baseSubtotalCents: lockedProforma.baseSubtotalCents,
          taxCents: lockedProforma.taxCents,
          baseTaxCents: lockedProforma.baseTaxCents,
          totalCents: lockedProforma.totalCents,
          baseTotalCents: lockedProforma.baseTotalCents,
          // Carry the proforma's settled amounts forward — a partially
          // (or fully) paid proforma must convert to an invoice that
          // reflects those payments, otherwise the new invoice shows the
          // full total as outstanding and the payment rows reassigned
          // below would orphan the balance.
          paidCents: lockedProforma.paidCents,
          basePaidCents: lockedProforma.basePaidCents,
          balanceDueCents: lockedProforma.totalCents - lockedProforma.paidCents,
          baseBalanceDueCents:
            lockedProforma.baseTotalCents !== null && lockedProforma.basePaidCents !== null
              ? lockedProforma.baseTotalCents - lockedProforma.basePaidCents
              : lockedProforma.baseTotalCents,
          commissionPercent: lockedProforma.commissionPercent,
          commissionAmountCents: lockedProforma.commissionAmountCents,
          issueDate,
          dueDate,
          notes: null,
        })
        .returning()

      if (!inserted) return { status: "not_found" as const }

      if (lineItems.length > 0) {
        await tx.insert(invoiceLineItems).values(
          lineItems.map((line) => ({
            invoiceId: inserted.id,
            bookingItemId: line.bookingItemId,
            description: line.description,
            quantity: line.quantity,
            unitPriceCents: line.unitPriceCents,
            totalCents: line.totalCents,
            taxRate: line.taxRate,
            sortOrder: line.sortOrder,
          })),
        )
      }

      // Reassign payments off the proforma so they don't sit attached to
      // a void document. The proforma's payment rows become the final
      // invoice's payment history.
      await tx
        .update(payments)
        .set({ invoiceId: inserted.id, updatedAt: now })
        .where(eq(payments.invoiceId, lockedProforma.id))

      await tx
        .update(invoices)
        .set({
          status: "void",
          paidCents: 0,
          basePaidCents: lockedProforma.basePaidCents == null ? null : 0,
          balanceDueCents: 0,
          baseBalanceDueCents: lockedProforma.baseBalanceDueCents == null ? null : 0,
          voidedAt: now,
          voidReason: `Converted to invoice ${inserted.invoiceNumber}`,
          updatedAt: now,
        })
        .where(eq(invoices.id, lockedProforma.id))

      await touchLinkedBookingUpdatedAt(tx, inserted.bookingId, now)

      return { status: "ok" as const, invoice: inserted, proforma: lockedProforma }
    })
    .catch((error: unknown) => {
      if (isInvoiceNumberUniqueConstraintError(error)) {
        throw new InvoiceNumberConflictError(newInvoiceNumber)
      }
      throw error
    })

  if (result.status !== "ok") return result

  await emitProformaConverted(db, runtime, result.invoice, result.proforma)
  return { status: "ok", invoice: result.invoice }
}

function deriveInvoiceNumberFromProforma(proformaNumber: string): string {
  if (/^PRO-/i.test(proformaNumber)) {
    return proformaNumber.replace(/^PRO-/i, "INV-")
  }
  return `${proformaNumber}-INV`
}

/**
 * Client name for the issued-invoice event payload (and everything downstream
 * that renders it — accounting exports, invoice documents).
 *
 * Rendered in the *booking's* language rather than the operator's UI locale:
 * this string lands on a customer-facing artifact, and in CJK the family name
 * leads (张伟, not 伟 张). `contactPreferredLanguage` is the customer's own
 * stated preference so it wins over the booking-level communication language.
 */
function buildClientName(booking: typeof bookings.$inferSelect | undefined): string {
  const locale = booking?.contactPreferredLanguage ?? booking?.communicationLanguage ?? "en"
  const name = formatPersonName(locale, {
    firstName: booking?.contactFirstName,
    lastName: booking?.contactLastName,
  })
  return name || "Client"
}

function centsToMajor(cents: number): number {
  return cents / 100
}

function toDateString(value: string | Date): string {
  return typeof value === "string" ? value : value.toISOString().slice(0, 10)
}
