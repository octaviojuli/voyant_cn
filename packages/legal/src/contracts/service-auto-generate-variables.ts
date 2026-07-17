// agent-quality: file-size exception -- owner: legal; #1730 moved the default variable assembly out of service-auto-generate, with a follow-up split by traveler/item/settlement context still warranted.
import {
  type ActionLedgerRequestContextValues,
  ledgerSensitiveRead,
} from "@voyant-travel/action-ledger"
import {
  BOOKING_PII_READ_CAPABILITY,
  type BookingPiiService,
  bookingsService,
} from "@voyant-travel/bookings"
import { bookingPiiAccessLog } from "@voyant-travel/bookings/schema"
import { bookingPaymentSchedules, invoices, payments } from "@voyant-travel/finance/schema"
import { and, asc, desc, eq, ne, sql } from "drizzle-orm"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"

import {
  type PaymentScheduleSummary,
  summarizeBookingPaymentScheduleRows,
} from "./payment-schedule-variables.js"
import type {
  AutoGenerateContractOptions,
  AutoGenerateContractRuntime,
  BookingConfirmedLikeEvent,
  ContractItemVariable,
  ContractTravelerVariable,
  DefaultContractVariables,
} from "./service-auto-generate-types.js"

type BookingRow = NonNullable<Awaited<ReturnType<typeof bookingsService.getBookingById>>>

export async function resolveContractGenerationVariables(
  db: PostgresJsDatabase,
  booking: BookingRow,
  event: BookingConfirmedLikeEvent,
  options: AutoGenerateContractOptions,
  runtime: AutoGenerateContractRuntime,
  template: { id: string; language?: string | null; seriesLabel?: string | null },
): Promise<Record<string, unknown>> {
  const travelers = await bookingsService.listTravelers(db, event.bookingId)
  const travelerTravelDetails = await resolveTravelerTravelDetails(
    db,
    booking.id,
    travelers,
    runtime.bookingPiiService,
    event.actorId,
    runtime.actionLedgerContext,
  )
  const leadTraveler =
    travelers.find((t) => travelerTravelDetails.get(t.id)?.isLeadTraveler) ??
    travelers.find((t) => t.isPrimary) ??
    travelers.find((t) => t.participantType === "traveler") ??
    travelers[0] ??
    null
  const leadTravelerDetails = leadTraveler ? travelerTravelDetails.get(leadTraveler.id) : null
  const bookingItemContext = await resolveBookingItemContext(db, booking.id)

  const now = new Date()
  const todayIso = now.toISOString().slice(0, 10)
  const todayIsoDateTime = now.toISOString()
  const todayTime = todayIsoDateTime.slice(11, 19)

  const sellCurrency = booking.sellCurrency ?? ""
  const totalCents = booking.sellAmountCents ?? 0
  const startDate = booking.startDate ?? ""
  const endDate = booking.endDate ?? ""
  const durationNights = computeNights(startDate, endDate)
  const contractLanguage = options.language ?? template.language ?? "en"
  const settlement = await resolveBookingSettlementVariables(
    db,
    booking.id,
    sellCurrency,
    contractLanguage,
  )
  const amountDueCents = computeAmountDueCents(settlement, totalCents)
  const isPaidInFull =
    amountDueCents <= 0 ||
    (settlement.balanceDueCents == null &&
      totalCents > 0 &&
      settlement.paidAmountCents >= totalCents)
  const paymentSchedule = await resolveBookingPaymentScheduleVariables(db, booking.id)
  const roomsSummary = deriveRoomsSummary(
    bookingItemContext.rawItems,
    bookingItemContext.roomOptionUnitIds,
  )

  const mappedTravelers: ContractTravelerVariable[] = travelers.map((t, i) => {
    const fullName = [t.firstName, t.lastName].filter(Boolean).join(" ").trim()
    const travelDetails = travelerTravelDetails.get(t.id)
    return {
      id: t.id,
      index: i + 1,
      band: t.participantType,
      participantType: t.participantType,
      isLead: leadTraveler?.id === t.id,
      isPrimary: t.isPrimary,
      firstName: t.firstName,
      lastName: t.lastName,
      fullName,
      email: t.email ?? "",
      phone: t.phone ?? "",
      dateOfBirth: travelDetails?.dateOfBirth ?? "",
      document: {
        type: travelDetails?.documentType ?? "",
        number: travelDetails?.documentNumber ?? "",
        country: travelDetails?.documentIssuingCountry ?? "",
        issuingAuthority: travelDetails?.documentIssuingAuthority ?? "",
        issueDate: "",
        expiryDate: travelDetails?.documentExpiry ?? "",
      },
    }
  })

  const customerFullName =
    [booking.contactFirstName, booking.contactLastName].filter(Boolean).join(" ").trim() ||
    (leadTraveler ? `${leadTraveler.firstName} ${leadTraveler.lastName}`.trim() : "")

  const defaults: DefaultContractVariables = {
    today: todayIso,
    currentDate: todayIso,
    currentDateTime: todayIsoDateTime,
    currentTime: todayTime,

    contract: {
      contractNumber: "",
      number: "",
      contractDate: todayIso,
      date: todayIso,
      issuedAt: todayIsoDateTime,
      signedAt: "",
      isManual: false,
      series: template.seriesLabel ?? "",
      channel: "",
      source: "",
      status: "draft",
    },

    booking: {
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      number: booking.bookingNumber,
      id: booking.id,
      status: booking.status,

      entityModule: bookingItemContext.entityModule,
      entityId: bookingItemContext.entityId,
      vertical: bookingItemContext.vertical,
      productName: bookingItemContext.productTitle,
      productSubtitle: bookingItemContext.productSubtitle,
      destination: bookingItemContext.destination,

      pax: booking.pax,
      paxTotal: booking.pax ?? 0,
      paxAdult: 0,
      paxChild: 0,
      paxInfant: 0,
      paxBands: {},

      travelDates: {
        start: startDate,
        end: endDate,
        durationNights,
      },
      startDate: booking.startDate,
      endDate: booking.endDate,

      sellCurrency,
      sellAmountCents: booking.sellAmountCents ?? null,
      sellSubtotalCents: booking.sellAmountCents ?? 0,
      sellTaxAmountCents: 0,
      sellDiscountAmountCents: 0,
      costCurrency: "",
      costAmountCents: booking.costAmountCents ?? 0,
      baseCurrency: booking.baseCurrency ?? "",
      baseSellAmountCents: booking.baseSellAmountCents ?? 0,
      marginPercent: booking.marginPercent ?? 0,

      currency: sellCurrency,
      totalAmountCents: booking.sellAmountCents ?? null,
      subtotalAmountCents: booking.sellAmountCents ?? 0,
      taxAmountCents: 0,
      discountAmountCents: 0,

      paidAmountCents: settlement.paidAmountCents,
      amountDueCents,
      balanceDueCents: amountDueCents,
      isPaidInFull,

      depositAmountCents: paymentSchedule.depositAmountCents,
      depositDueDate: paymentSchedule.depositDueDate,
      balanceAmountCents: paymentSchedule.balanceAmountCents,
      balanceDueDate: paymentSchedule.balanceDueDate,
      paymentPolicy: {
        source: "operator_default",
      },

      roomsSummary,

      source: {
        kind: booking.sourceType ?? "",
        type: booking.sourceType ?? "",
        connectionId: "",
        ref: booking.externalBookingRef ?? "",
        externalRef: booking.externalBookingRef ?? "",
        supplier: { id: "", name: "" },
      },

      internalNotes: booking.internalNotes ?? "",
      customerNotes: "",
    },

    customer: {
      type: "B2C",
      firstName: booking.contactFirstName ?? "",
      lastName: booking.contactLastName ?? "",
      fullName: customerFullName,
      email: booking.contactEmail ?? "",
      phone: booking.contactPhone ?? "",
      dateOfBirth: leadTravelerDetails?.dateOfBirth ?? "",
      companyName: "",
      vatId: "",
      registrationNumber: "",
      address: {
        line1: booking.contactAddressLine1 ?? "",
        line2: booking.contactAddressLine2 ?? "",
        city: booking.contactCity ?? "",
        region: booking.contactRegion ?? "",
        postal: booking.contactPostalCode ?? "",
        country: booking.contactCountry ?? "",
      },
      document: {
        type: leadTravelerDetails?.documentType ?? "",
        number: leadTravelerDetails?.documentNumber ?? "",
        country: leadTravelerDetails?.documentIssuingCountry ?? "",
        issuingAuthority: leadTravelerDetails?.documentIssuingAuthority ?? "",
        issueDate: "",
        expiryDate: leadTravelerDetails?.documentExpiry ?? "",
      },
    },

    leadTraveler: leadTraveler
      ? {
          id: leadTraveler.id,
          firstName: leadTraveler.firstName,
          lastName: leadTraveler.lastName,
          fullName: [leadTraveler.firstName, leadTraveler.lastName]
            .filter(Boolean)
            .join(" ")
            .trim(),
          email: leadTraveler.email ?? "",
          phone: leadTraveler.phone ?? "",
        }
      : null,

    travelers: mappedTravelers,
    passengers: mappedTravelers,

    items: bookingItemContext.items,
    addons: [],

    product: {
      title: bookingItemContext.productTitle,
      subtitle: bookingItemContext.productSubtitle,
      destination: bookingItemContext.destination,
      module: bookingItemContext.entityModule,
      id: bookingItemContext.entityId,
      vertical: bookingItemContext.vertical,
      heroImageUrl: "",
    },

    departureSlot: {
      slotId: bookingItemContext.departureSlot.slotId,
      startAt: bookingItemContext.departureSlot.startAt || startDate,
      endAt: bookingItemContext.departureSlot.endAt || endDate,
      durationDays: bookingItemContext.departureSlot.durationDays ?? durationNights,
      departureCity: bookingItemContext.departureSlot.departureCity,
    },
    sailing: {
      sailingId: "",
      ship: "",
      embarkationPort: "",
      disembarkationPort: "",
      airArrangement: "",
      startDate: "",
      endDate: "",
      cabinCategoryId: "",
      cabinNumberId: "",
    },
    stay: {
      checkIn: "",
      checkOut: "",
      nights: durationNights,
      rooms: [],
      destination: "",
    },

    payment: {
      intent: "",
      method: settlement.latestCompleted?.methodLabel ?? "",
      amountCents: totalCents,
      currency: sellCurrency,
      schedule: paymentSchedule.entries,
      capturedAt: settlement.latestCompleted?.date ?? "",
      createdAt: settlement.latestCompleted?.date ?? "",
      latestCompleted: settlement.latestCompleted,
    },

    operator: {
      name: "",
      legalName: "",
      vatId: "",
      registrationNumber: "",
      address: "",
      phone: "",
      email: "",
      website: "",
      iban: "",
      bank: "",
      license: "",
      licenseAuthority: "",
      signatoryName: "",
      signatoryRole: "",
    },

    acceptance: {
      ipAddress: "",
      userAgent: "",
      acceptedAt: "",
      marketingConsent: false,
      templateSlug: options.templateSlug,
      templateId: template.id,
    },
  }

  const variables = options.resolveVariables
    ? await options.resolveVariables({
        db,
        booking,
        travelers,
        defaults,
        bindings: runtime.bindings ?? null,
      })
    : defaultVariablesToRecord(defaults)

  return variables
}

function defaultVariablesToRecord(defaults: DefaultContractVariables): Record<string, unknown> {
  return { ...defaults }
}

type BookingItemRow = Awaited<ReturnType<typeof bookingsService.listItems>>[number]
type BookingTravelerRow = Awaited<ReturnType<typeof bookingsService.listTravelers>>[number]
type BookingTravelerTravelDetails = NonNullable<
  Awaited<ReturnType<BookingPiiService["getTravelerTravelDetails"]>>
>

interface BookingItemContext {
  entityModule: string
  entityId: string
  vertical: string
  productTitle: string
  productSubtitle: string
  destination: string
  departureSlot: {
    slotId: string
    startAt: string
    endAt: string
    durationDays: number | null
    departureCity: string
  }
  items: ContractItemVariable[]
  rawItems: BookingItemRow[]
  roomOptionUnitIds: ReadonlySet<string>
}

async function resolveTravelerTravelDetails(
  db: PostgresJsDatabase,
  bookingId: string,
  travelers: BookingTravelerRow[],
  pii: BookingPiiService | null | undefined,
  actorId: string | null,
  actionLedgerContext: ActionLedgerRequestContextValues | null | undefined,
): Promise<Map<string, BookingTravelerTravelDetails>> {
  const detailsByTraveler = new Map<string, BookingTravelerTravelDetails>()
  if (!pii || travelers.length === 0) return detailsByTraveler

  await Promise.all(
    travelers.map(async (traveler) => {
      const details = await ledgerSensitiveRead(
        db,
        {
          context: actionLedgerContext ?? {
            userId: actorId,
            actor: actorId ? "staff" : "system",
            callerType: actorId ? "staff" : "internal",
            isInternalRequest: actorId == null,
          },
          actionName: "booking.pii.read",
          actionVersion: "v1",
          targetType: "booking_traveler",
          targetId: traveler.id,
          routeOrToolName: "legal.contracts.bookings.generate-document",
          capabilityId: BOOKING_PII_READ_CAPABILITY.id,
          capabilityVersion: BOOKING_PII_READ_CAPABILITY.version,
          authorizationSource: "legal.contract.auto_generate",
          reasonCode: "contract_variable_resolution",
          disclosedFieldSet: ["dateOfBirth", "document"],
          disclosureSummary: "Contract variable traveler identity snapshot",
          decisionPolicy: "bookings-pii-scope-or-staff-v1",
          fallbackPrincipalId: actorId ?? "legal_contract_auto_generate",
        },
        () => pii.getTravelerTravelDetails(db, traveler.id, actorId),
      )
      await logBookingPiiContractRead(db, {
        bookingId,
        travelerId: traveler.id,
        actorId,
        actionLedgerContext,
      })
      if (details) {
        detailsByTraveler.set(traveler.id, details)
      }
    }),
  )

  return detailsByTraveler
}

async function logBookingPiiContractRead(
  db: PostgresJsDatabase,
  input: {
    bookingId: string
    travelerId: string
    actorId: string | null
    actionLedgerContext: ActionLedgerRequestContextValues | null | undefined
  },
) {
  await db.insert(bookingPiiAccessLog).values({
    bookingId: input.bookingId,
    travelerId: input.travelerId,
    actorId: input.actionLedgerContext?.userId ?? input.actorId,
    actorType: input.actionLedgerContext?.actor ?? (input.actorId ? "staff" : "system"),
    callerType: input.actionLedgerContext?.callerType ?? (input.actorId ? "staff" : "internal"),
    action: "read",
    outcome: "allowed",
    reason: "contract_variable_resolution",
    metadata: {
      routeOrToolName: "legal.contracts.bookings.generate-document",
      capabilityId: BOOKING_PII_READ_CAPABILITY.id,
      capabilityVersion: BOOKING_PII_READ_CAPABILITY.version,
    },
  })
}

async function resolveBookingItemContext(
  db: PostgresJsDatabase,
  bookingId: string,
): Promise<BookingItemContext> {
  const items = await bookingsService.listItems(db, bookingId)
  const primaryItem =
    items.find((item) => item.productNameSnapshot || item.productId || item.availabilitySlotId) ??
    items[0] ??
    null

  if (!primaryItem) {
    return emptyBookingItemContext()
  }

  const metadata = recordValue(primaryItem.metadata)
  const productId = primaryItem.productId ?? ""
  const linkedProductTitle =
    productId && !primaryItem.productNameSnapshot
      ? await resolveLinkedProductTitle(db, productId)
      : ""
  const destination = firstString(
    pickString(metadata, [
      "destination",
      "destinationName",
      "destination_name",
      "productDestination",
      "product_destination",
    ]),
    productId ? await resolveLinkedProductDestination(db, productId) : "",
  )

  const entityModule = firstString(
    pickString(metadata, ["entityModule", "entity_module", "module"]),
    productId ? "products" : "",
  )
  const entityId = firstString(pickString(metadata, ["entityId", "entity_id"]), productId)
  const vertical = firstString(
    pickString(metadata, ["vertical", "entityVertical", "entity_vertical", "productType"]),
    entityModule,
  )
  const productTitle = firstString(
    primaryItem.productNameSnapshot,
    linkedProductTitle,
    primaryItem.title,
  )
  const productSubtitle = firstString(
    primaryItem.optionNameSnapshot,
    primaryItem.unitNameSnapshot,
    primaryItem.description,
  )
  const departureSlot = await resolveDepartureSlotContext(db, primaryItem)
  const roomOptionUnitIds = await resolveRoomOptionUnitIds(db, items)

  return {
    entityModule,
    entityId,
    vertical,
    productTitle,
    productSubtitle,
    destination,
    departureSlot,
    items: items.map(mapBookingItemToContractItem),
    rawItems: items,
    roomOptionUnitIds,
  }
}

function emptyBookingItemContext(): BookingItemContext {
  return {
    entityModule: "",
    entityId: "",
    vertical: "",
    productTitle: "",
    productSubtitle: "",
    destination: "",
    departureSlot: {
      slotId: "",
      startAt: "",
      endAt: "",
      durationDays: null,
      departureCity: "",
    },
    items: [],
    rawItems: [],
    roomOptionUnitIds: new Set(),
  }
}

async function resolveBookingPaymentScheduleVariables(
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

function deriveRoomsSummary(
  items: BookingItemRow[],
  roomOptionUnitIds: ReadonlySet<string>,
): string {
  const lines = items
    .filter((item) => isAccommodationLikeItem(item, roomOptionUnitIds))
    .map((item) => {
      const label = firstString(item.unitNameSnapshot, item.optionNameSnapshot, item.title)
      if (!label) return ""
      return `${item.quantity ?? 1}× ${label}`
    })
    .filter(Boolean)

  return lines.join(", ")
}

function isAccommodationLikeItem(
  item: BookingItemRow,
  roomOptionUnitIds: ReadonlySet<string>,
): boolean {
  if (item.itemType === "accommodation") return true
  if (item.optionUnitId && roomOptionUnitIds.has(item.optionUnitId)) return true

  const metadata = recordValue(item.metadata)
  const unitType = pickString(metadata, [
    "unitType",
    "unit_type",
    "optionUnitType",
    "option_unit_type",
  ]).toLowerCase()

  return unitType === "room" || unitType === "accommodation"
}

async function resolveRoomOptionUnitIds(
  db: PostgresJsDatabase,
  items: BookingItemRow[],
): Promise<Set<string>> {
  const optionUnitIds = [
    ...new Set(
      items
        .map((item) => item.optionUnitId)
        .filter((id): id is string => typeof id === "string" && id.trim().length > 0),
    ),
  ]
  if (optionUnitIds.length === 0) return new Set()

  try {
    // `unit_type` is cast to text before comparing against the literals on
    // purpose: `accommodation` is not a member of the `option_unit_type` enum
    // on every deployment (the enum ships as person/group/room/vehicle/service/
    // other). Comparing the raw enum column against an unknown literal makes
    // Postgres reject the statement with "invalid input value for enum" before
    // it runs, which would take down ALL contract generation on a lagging
    // deployment. Casting to text compares plain strings, so a not-yet-present
    // value simply never matches instead of throwing.
    const result = await db.execute(sql`
      SELECT id
      FROM option_units
      WHERE id IN (${sql.join(
        // agent-quality: raw-sql reviewed -- owner: legal; dynamic SQL interpolation uses Drizzle parameter binding or vetted SQL identifiers.
        optionUnitIds.map((id) => sql`${id}`),
        sql`, `,
      )})
        AND unit_type::text IN ('room', 'accommodation')
    `)
    return new Set(toRows<{ id: string }>(result).map((row) => row.id))
  } catch (error) {
    if (isUndefinedTableError(error)) return new Set()
    throw error
  }
}

function mapBookingItemToContractItem(item: BookingItemRow, index: number): ContractItemVariable {
  const quantity = item.quantity ?? 1
  const unitAmountCents =
    item.unitSellAmountCents ??
    (item.totalSellAmountCents != null && quantity > 0
      ? Math.round(item.totalSellAmountCents / quantity)
      : 0)

  return {
    index: index + 1,
    kind: item.itemType,
    description: firstString(item.productNameSnapshot, item.title, item.description),
    quantity,
    unitAmountCents,
    totalAmountCents: item.totalSellAmountCents ?? unitAmountCents * quantity,
    currency: item.sellCurrency,
    taxIncluded: false,
  }
}

async function resolveDepartureSlotContext(
  db: PostgresJsDatabase,
  item: BookingItemRow,
): Promise<BookingItemContext["departureSlot"]> {
  const slotId = item.availabilitySlotId ?? ""
  const linkedSlot = slotId ? await resolveLinkedAvailabilitySlot(db, slotId) : null
  const startAt = normalizeDateTime(linkedSlot?.starts_at ?? item.startsAt)
  const endAt = normalizeDateTime(linkedSlot?.ends_at ?? item.endsAt)
  const durationDays =
    numberValue(linkedSlot?.days) ??
    (startAt && endAt
      ? Math.max(1, computeNights(startAt.slice(0, 10), endAt.slice(0, 10)) + 1)
      : null)

  return {
    slotId,
    startAt,
    endAt,
    durationDays,
    departureCity: extractDepartureCity(item.departureLabelSnapshot),
  }
}

async function resolveLinkedProductTitle(
  db: PostgresJsDatabase,
  productId: string,
): Promise<string> {
  try {
    const result = await db.execute<{ name: string | null }>(
      // agent-quality: raw-sql reviewed -- owner: legal; dynamic SQL interpolation uses Drizzle parameter binding or vetted SQL identifiers.
      sql`select name from products where id = ${productId} limit 1`,
    )
    return toRows<{ name: string | null }>(result)[0]?.name ?? ""
  } catch (error) {
    if (isUndefinedTableError(error)) return ""
    throw error
  }
}

async function resolveLinkedProductDestination(
  db: PostgresJsDatabase,
  productId: string,
): Promise<string> {
  try {
    const result = await db.execute<{ destination: string | null }>(sql`
      select coalesce(dt.name, d.slug) as destination
      from product_destinations pd
      inner join destinations d on d.id = pd.destination_id
      left join destination_translations dt on dt.destination_id = d.id
      where pd.product_id = ${productId}
      order by
        pd.sort_order asc,
        case when dt.language_tag = 'en' then 0 else 1 end,
        dt.language_tag asc nulls last,
        d.slug asc
      limit 1
    `)
    return toRows<{ destination: string | null }>(result)[0]?.destination ?? ""
  } catch (error) {
    if (isUndefinedTableError(error)) return ""
    throw error
  }
}

async function resolveLinkedAvailabilitySlot(
  db: PostgresJsDatabase,
  slotId: string,
): Promise<{
  starts_at: Date | string | null
  ends_at: Date | string | null
  days: number | null
} | null> {
  try {
    const result = await db.execute<{
      starts_at: Date | string | null
      ends_at: Date | string | null
      days: number | null
    }>(sql`
      select starts_at, ends_at, days
      from availability_slots
      where id = ${slotId}
      limit 1
    `)
    return (
      toRows<{
        starts_at: Date | string | null
        ends_at: Date | string | null
        days: number | null
      }>(result)[0] ?? null
    )
  } catch (error) {
    if (isUndefinedTableError(error)) return null
    throw error
  }
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function pickString(record: Record<string, unknown>, keys: readonly string[]): string {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return ""
}

function firstString(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return ""
}

function normalizeDateTime(value: Date | string | null | undefined): string {
  if (!value) return ""
  return value instanceof Date ? value.toISOString() : value
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function extractDepartureCity(label: string | null | undefined): string {
  const normalized = firstString(label)
  if (!normalized) return ""
  const separator = normalized.includes("—") ? "—" : normalized.includes("-") ? "-" : ""
  if (!separator) return ""
  const parts = normalized
    .split(separator)
    .map((part) => part.trim())
    .filter(Boolean)
  return parts.length > 1 ? (parts[parts.length - 1] ?? "") : ""
}

function toRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[]
  if (result && typeof result === "object" && "rows" in result) {
    const rows = (result as { rows: unknown }).rows
    return Array.isArray(rows) ? (rows as T[]) : []
  }
  return []
}

function isUndefinedTableError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "42P01"
  )
}

type SettlementInvoiceRow = Pick<
  typeof invoices.$inferSelect,
  "currency" | "baseCurrency" | "balanceDueCents" | "baseBalanceDueCents"
>

type SettlementPaymentRow = Pick<
  typeof payments.$inferSelect,
  "amountCents" | "currency" | "baseCurrency" | "baseAmountCents" | "paymentMethod" | "paymentDate"
>

async function resolveBookingSettlementVariables(
  db: PostgresJsDatabase,
  bookingId: string,
  bookingCurrency: string,
  language: string,
): Promise<{
  paidAmountCents: number
  balanceDueCents: number | null
  latestCompleted?: DefaultContractVariables["payment"]["latestCompleted"]
}> {
  const invoiceRows = await db
    .select({
      currency: invoices.currency,
      baseCurrency: invoices.baseCurrency,
      balanceDueCents: invoices.balanceDueCents,
      baseBalanceDueCents: invoices.baseBalanceDueCents,
    })
    .from(invoices)
    .where(and(eq(invoices.bookingId, bookingId), ne(invoices.status, "void")))

  const currency = bookingCurrency || invoiceRows[0]?.currency || ""

  const completedPaymentRows = await db
    .select({
      amountCents: payments.amountCents,
      currency: payments.currency,
      baseCurrency: payments.baseCurrency,
      baseAmountCents: payments.baseAmountCents,
      paymentMethod: payments.paymentMethod,
      paymentDate: payments.paymentDate,
    })
    .from(payments)
    .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
    .where(
      and(
        eq(invoices.bookingId, bookingId),
        ne(invoices.status, "void"),
        eq(payments.status, "completed"),
      ),
    )
    .orderBy(desc(payments.paymentDate), desc(payments.createdAt))

  const paidAmountCents = completedPaymentRows.reduce(
    (sum, payment) => sum + amountInCurrency(payment, currency),
    0,
  )
  const balanceDueCents =
    invoiceRows.length > 0
      ? invoiceRows.reduce((sum, invoice) => sum + invoiceBalanceInCurrency(invoice, currency), 0)
      : null
  const latestPayment = completedPaymentRows[0]

  return {
    paidAmountCents,
    balanceDueCents,
    latestCompleted: latestPayment
      ? {
          method: latestPayment.paymentMethod,
          methodLabel: formatPaymentMethodLabel(latestPayment.paymentMethod, language),
          date: latestPayment.paymentDate,
        }
      : undefined,
  }
}

function computeAmountDueCents(
  settlement: { paidAmountCents: number; balanceDueCents: number | null },
  totalCents: number,
): number {
  if (settlement.balanceDueCents != null) return Math.max(0, settlement.balanceDueCents)
  return Math.max(0, totalCents - settlement.paidAmountCents)
}

function amountInCurrency(payment: SettlementPaymentRow, currency: string): number {
  if (!currency || payment.currency === currency) return payment.amountCents
  if (payment.baseCurrency === currency) return payment.baseAmountCents ?? 0
  return 0
}

function invoiceBalanceInCurrency(invoice: SettlementInvoiceRow, currency: string): number {
  if (!currency || invoice.currency === currency) return invoice.balanceDueCents
  if (invoice.baseCurrency === currency) return invoice.baseBalanceDueCents ?? 0
  return 0
}

const paymentMethodLabelsByLanguage: Record<string, Record<string, string>> = {
  en: {
    bank_transfer: "Bank Transfer",
    credit_card: "Credit Card",
    debit_card: "Debit Card",
    cash: "Cash",
    cheque: "Cheque",
    wallet: "Wallet",
    direct_bill: "Direct Bill",
    voucher: "Voucher",
    other: "Other",
  },
  ro: {
    bank_transfer: "Transfer bancar",
    credit_card: "Card de credit",
    debit_card: "Card de debit",
    cash: "Numerar",
    cheque: "Cec",
    wallet: "Portofel",
    direct_bill: "Facturare directa",
    voucher: "Voucher",
    other: "Alta",
  },
  zh: {
    bank_transfer: "银行转账",
    credit_card: "信用卡",
    debit_card: "借记卡",
    cash: "现金",
    cheque: "支票",
    wallet: "钱包",
    direct_bill: "挂账",
    voucher: "凭证",
    other: "其他",
  },
}

function formatPaymentMethodLabel(method: string, language: string): string {
  const locale = language.trim().toLowerCase().split(/[-_]/)[0] || "en"
  const localizedLabel = paymentMethodLabelsByLanguage[locale]?.[method]
  if (localizedLabel) return localizedLabel

  return method
    .split("_")
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ")
}

function computeNights(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0
  try {
    const start = new Date(startDate)
    const end = new Date(endDate)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
    const ms = end.getTime() - start.getTime()
    return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)))
  } catch {
    return 0
  }
}
