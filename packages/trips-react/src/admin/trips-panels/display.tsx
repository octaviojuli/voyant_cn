"use client"

import { emptyPaymentScheduleValue } from "@voyant-travel/bookings-react/components/payment-schedule-section"
import type { PaymentScheduleValue, PersonPickerValue } from "@voyant-travel/bookings-react/ui"
import type { AncillarySelection, FlightOffer } from "@voyant-travel/flights/contract/types"
import { formatMessage } from "@voyant-travel/i18n"
import type { TripComponent } from "@voyant-travel/trips"
import { BedDouble, ExternalLink, Landmark, Plane, Route as RouteIcon } from "lucide-react"

import type { AvailabilitySlot, PanelsMessages, PendingComponent } from "./shared.js"

export type ComponentDisplayMessages = PanelsMessages["componentDisplay"]

interface BillingDisplay {
  primary: string
  secondary: string
}

export function resolveBillingDisplay(
  billing: PersonPickerValue,
  person:
    | { firstName?: string | null; lastName?: string | null; email?: string | null }
    | undefined,
  org: { name?: string | null } | undefined,
  messages: PanelsMessages,
): BillingDisplay {
  if (billing.billTo === "organization" && org?.name) {
    return { primary: org.name, secondary: messages.billingPreview.organizationSecondary }
  }
  if (billing.mode === "new") {
    const name = [billing.newPerson.firstName, billing.newPerson.lastName]
      .filter((part) => part.trim().length > 0)
      .join(" ")
      .trim()
    return {
      primary: name || billing.newPerson.email.trim(),
      secondary: name ? billing.newPerson.email.trim() : "",
    }
  }
  if (person) {
    const name = [person.firstName, person.lastName]
      .filter((part) => (part ?? "").trim().length > 0)
      .join(" ")
      .trim()
    return { primary: name || (person.email ?? ""), secondary: name ? (person.email ?? "") : "" }
  }
  return { primary: "", secondary: "" }
}

export function Reference({
  label,
  value,
  href,
}: {
  label: string
  value: string | null | undefined
  href?: string
}) {
  if (!value) return null
  if (!href)
    return (
      <span>
        {label}: <span className="font-mono">{value.slice(0, 12)}…</span>
      </span>
    )
  return (
    <a className="inline-flex items-center gap-1 text-primary" href={href}>
      {label}: <span className="font-mono">{value.slice(0, 12)}…</span>
      <ExternalLink className="size-3" />
    </a>
  )
}

export function componentIcon(component: TripComponent) {
  if (component.kind === "flight_placeholder" || component.kind === "flight_order") return Plane
  if (component.entityModule === "accommodations") return BedDouble
  if (component.kind === "manual_placeholder" || component.kind === "external_order")
    return Landmark
  return RouteIcon
}

function readComponentSchedule(component: TripComponent): {
  start: string | null
  end: string | null
} {
  const md = component.metadata as
    | {
        scheduledStartsAt?: string | null
        scheduledEndsAt?: string | null
        bookingDraftV1?: {
          configure?: {
            dateRange?: { checkIn?: string | null; checkOut?: string | null }
          }
        }
        flightDraft?: { departDate?: string | null; returnDate?: string | null }
        cruiseDraft?: { embarkationDate?: string | null }
      }
    | undefined
  if (md?.scheduledStartsAt) {
    return { start: md.scheduledStartsAt, end: md.scheduledEndsAt ?? null }
  }
  const dateRange = md?.bookingDraftV1?.configure?.dateRange
  if (dateRange?.checkIn) {
    return { start: dateRange.checkIn, end: dateRange.checkOut ?? null }
  }
  const flight = md?.flightDraft
  if (flight?.departDate) {
    return { start: flight.departDate, end: flight.returnDate ?? null }
  }
  const cruise = md?.cruiseDraft
  if (cruise?.embarkationDate) {
    return { start: cruise.embarkationDate, end: null }
  }
  return { start: null, end: null }
}

export function formatScheduleLabel(component: TripComponent): string | null {
  const { start, end } = readComponentSchedule(component)
  if (!start) return null
  const startLabel = formatDateTime(start)
  if (!end || end === start) return startLabel
  return `${startLabel} → ${formatDateTime(end)}`
}

export function sortComponentsBySchedule(components: TripComponent[]): TripComponent[] {
  return [...components].sort((a, b) => {
    const aStart = readComponentSchedule(a).start
    const bStart = readComponentSchedule(b).start
    const aMs = aStart ? new Date(aStart).getTime() : Number.NaN
    const bMs = bStart ? new Date(bStart).getTime() : Number.NaN
    // Components without a schedule fall to the bottom, then ordered by sequence.
    const aMissing = Number.isNaN(aMs)
    const bMissing = Number.isNaN(bMs)
    if (aMissing && bMissing) return a.sequence - b.sequence
    if (aMissing) return 1
    if (bMissing) return -1
    if (aMs !== bMs) return aMs - bMs
    return a.sequence - b.sequence
  })
}

function readPendingSchedule(pending: PendingComponent): {
  start: string | null
  end: string | null
} {
  if (pending.kind === "product" || pending.kind === "stay") {
    return { start: pending.startsAt || null, end: pending.endsAt || null }
  }
  if (pending.kind === "flight") {
    const offerSchedule = readFlightOfferSchedule(pending.selectedOffer)
    if (offerSchedule.start) return offerSchedule
    return { start: pending.departDate || null, end: pending.returnDate || null }
  }
  if (pending.kind === "cruise") {
    return { start: pending.embarkationDate || null, end: null }
  }
  return { start: pending.startsAt || null, end: pending.endsAt || null }
}

function readFlightOfferSchedule(offer: FlightOffer | null): {
  start: string | null
  end: string | null
} {
  if (!offer) return { start: null, end: null }
  const firstItinerary = offer.itineraries[0]
  const lastItinerary = offer.itineraries[offer.itineraries.length - 1]
  const firstSegment = firstItinerary?.segments[0]
  const lastSegment = lastItinerary?.segments[lastItinerary.segments.length - 1]
  return {
    start: firstSegment?.departure.at ?? null,
    end: lastSegment?.arrival.at ?? null,
  }
}

function toRange(start: string | null, end: string | null): [number, number] | null {
  if (!start) return null
  const startMs = new Date(start).getTime()
  if (Number.isNaN(startMs)) return null
  const endMs = end ? new Date(end).getTime() : startMs
  if (Number.isNaN(endMs)) return [startMs, startMs]
  return [startMs, Math.max(endMs, startMs)]
}

export function findOverlappingComponent(
  pending: PendingComponent,
  committed: TripComponent[],
): TripComponent | null {
  const { start: pStart, end: pEnd } = readPendingSchedule(pending)
  const pendingRange = toRange(pStart, pEnd)
  if (!pendingRange) return null
  for (const component of committed) {
    const { start, end } = readComponentSchedule(component)
    const range = toRange(start, end)
    if (!range) continue
    // Half-open overlap: [a1, a2) ∩ [b1, b2) ≠ ∅ iff a1 < b2 ∧ b1 < a2.
    if (pendingRange[0] < range[1] && range[0] < pendingRange[1]) return component
  }
  return null
}

export function componentTitleFor(
  component: TripComponent,
  display: ComponentDisplayMessages,
  resolvedEntityName?: string | null,
): string {
  const metadata = component.metadata as
    | {
        flightDraft?: {
          origin?: string | null
          destination?: string | null
        }
        cruiseDraft?: {
          cabin?: string | null
        }
        manualService?: {
          name?: string | null
        }
        catalogItem?: {
          name?: string | null
          thumbnailUrl?: string | null
        }
        accommodation?: {
          name?: string | null
          propertyName?: string | null
          roomTypeName?: string | null
        }
      }
    | undefined
  const entityName = cleanDisplayLabel(resolvedEntityName)
  if (entityName) return entityName

  const catalogName = cleanDisplayLabel(metadata?.catalogItem?.name)
  if (catalogName) return catalogName

  if (component.kind === "flight_placeholder" || component.kind === "flight_order") {
    const origin = cleanDisplayLabel(metadata?.flightDraft?.origin)
    const destination = cleanDisplayLabel(metadata?.flightDraft?.destination)
    if (origin && destination) return `${origin} → ${destination}`
  }

  if (component.entityModule === "cruises") {
    const cabin = cleanDisplayLabel(metadata?.cruiseDraft?.cabin)
    if (cabin) return formatMessage(display.cabinTitle, { cabin })
  }

  if (component.entityModule === "accommodations") {
    const accommodationName =
      cleanDisplayLabel(metadata?.accommodation?.propertyName) ??
      cleanDisplayLabel(metadata?.accommodation?.name) ??
      cleanDisplayLabel(metadata?.accommodation?.roomTypeName)
    if (accommodationName) return accommodationName
  }

  if (metadata?.cruiseDraft) {
    const cabin = cleanDisplayLabel(metadata.cruiseDraft.cabin)
    if (cabin) return formatMessage(display.cabinTitle, { cabin })
  }

  if (component.kind === "manual_placeholder") {
    const serviceName = cleanDisplayLabel(metadata?.manualService?.name)
    if (serviceName) return serviceName
    const title = cleanDisplayLabel(component.title)
    if (title) return title
    const description = cleanDisplayLabel(component.description)
    if (description) return description
  }

  return componentReferenceLabelFor(component)
}

export function componentOptionSummaryFor(
  component: TripComponent,
  display: ComponentDisplayMessages,
): string | null {
  const metadata = component.metadata as
    | {
        flightDraft?: {
          selectedOffer?: FlightOffer | null
          ancillaries?: AncillarySelection | null
        }
        bookingDraftV1?: {
          configure?: {
            optionSelections?: Array<{
              optionId?: string
              optionName?: string
              optionUnitId?: string
              optionUnitName?: string
              quantity?: number
            }>
          }
        }
      }
    | undefined
  if (metadata?.flightDraft) {
    const flightLabels = flightSelectionLabels(
      metadata.flightDraft.selectedOffer ?? null,
      metadata.flightDraft.ancillaries ?? null,
      display,
    )
    if (flightLabels.length > 0) return flightLabels.join(", ")
  }
  const selections = metadata?.bookingDraftV1?.configure?.optionSelections ?? []
  const labels = selections.flatMap((selection) => {
    const quantity =
      typeof selection.quantity === "number" && Number.isFinite(selection.quantity)
        ? selection.quantity
        : 0
    if (quantity <= 0) return []
    const name =
      cleanDisplayLabel(selection.optionName) ??
      cleanDisplayLabel(selection.optionUnitName) ??
      cleanDisplayLabel(selection.optionId) ??
      cleanDisplayLabel(selection.optionUnitId)
    if (!name) return []
    return [`${quantity} × ${name}`]
  })
  return labels.length > 0 ? labels.join(", ") : null
}

function flightSelectionLabels(
  offer: FlightOffer | null,
  ancillaries: AncillarySelection | null,
  display: ComponentDisplayMessages,
): string[] {
  if (!offer || !ancillaries) return []
  const labels: string[] = []
  const bundles = offer.fareBundles ?? []
  const bundleCounts = countById(ancillaries.fareBundle?.map((pick) => pick.bundleId) ?? [])
  for (const [bundleId, quantity] of bundleCounts) {
    const bundle = bundles.find((candidate) => candidate.id === bundleId)
    labels.push(`${quantity} × ${bundle?.label ?? bundleId}`)
  }
  const baggageCount =
    ancillaries.baggage?.reduce((sum, pick) => sum + (pick.quantity ?? 1), 0) ?? 0
  if (baggageCount > 0) {
    labels.push(
      baggageCount === 1
        ? display.bagSingular
        : formatMessage(display.bagPlural, { count: baggageCount }),
    )
  }
  const assistanceCount = ancillaries.assistance?.length ?? 0
  if (assistanceCount > 0) {
    labels.push(
      assistanceCount === 1
        ? display.assistanceSingular
        : formatMessage(display.assistancePlural, { count: assistanceCount }),
    )
  }
  const extrasCount = ancillaries.extras?.reduce((sum, pick) => sum + (pick.quantity ?? 1), 0) ?? 0
  if (extrasCount > 0) {
    labels.push(
      extrasCount === 1
        ? display.extraSingular
        : formatMessage(display.extraPlural, { count: extrasCount }),
    )
  }
  return labels
}

function countById(values: string[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return counts
}

export function componentThumbnailFor(component: TripComponent): string | null {
  const metadata = component.metadata as
    | {
        catalogItem?: { thumbnailUrl?: string | null }
      }
    | undefined
  return cleanDisplayLabel(metadata?.catalogItem?.thumbnailUrl)
}

function componentReferenceLabelFor(component: TripComponent): string {
  const reference =
    component.providerRef ??
    component.supplierRef ??
    component.bookingId ??
    component.orderId ??
    component.paymentSessionId ??
    component.sourceRef ??
    component.entityId ??
    component.id
  return reference.length > 18 ? reference.slice(0, 18) : reference
}

function cleanDisplayLabel(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  const normalized = trimmed.toLowerCase()
  if (
    normalized === "untitled trip" ||
    normalized === "untitled component" ||
    normalized === "flight placeholder" ||
    normalized.startsWith("flight placeholder ") ||
    normalized === "manual placeholder" ||
    normalized === "cruise" ||
    normalized === "cruise placeholder" ||
    normalized === "catalog booking" ||
    normalized === "product booking" ||
    normalized === "stay booking" ||
    normalized === "cruise booking" ||
    normalized === "external order" ||
    normalized === "flight order" ||
    /^component \d+$/.test(normalized)
  ) {
    return null
  }
  return trimmed
}

export function recordFromUnknown(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

export function paymentScheduleValueFromUnknown(value: unknown): PaymentScheduleValue {
  const record = recordFromUnknown(value)
  const mode = record?.mode === "split" ? "split" : record?.mode === "full" ? "full" : null
  if (!mode) return { ...emptyPaymentScheduleValue }
  return {
    ...emptyPaymentScheduleValue,
    ...record,
    mode,
  } as PaymentScheduleValue
}

// Backend-emitted noise codes that just acknowledge how the price was set —
// staff-built trips always carry `manual_placeholder_price` for manual /
// external / flight placeholders. `currency_mismatch:*` is also noise here
// because the rail already breaks totals out per currency.
export function isUserVisibleWarning(code: string): boolean {
  if (code === "manual_placeholder_price") return false
  if (code.startsWith("currency_mismatch")) return false
  return true
}

function formatDateTime(iso: string): string {
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return iso
  const hasTime = iso.includes("T") || iso.includes(" ")
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(hasTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(parsed)
}

export function formatDepartureLabel(
  slot: AvailabilitySlot,
  display: ComponentDisplayMessages,
): string {
  const date = formatDateTime(slot.startsAt)
  const duration = slot.nights
    ? ` · ${formatMessage(display.nightsShort, { count: slot.nights })}`
    : slot.days
      ? ` · ${formatMessage(display.daysShort, { count: slot.days })}`
      : ""
  const capacity = slot.unlimited
    ? ""
    : slot.remainingPax != null
      ? ` · ${formatMessage(display.seatsRemaining, { count: slot.remainingPax })}`
      : ""
  return `${date}${duration}${capacity}`
}

export function formatMoney(
  amountCents: number | null | undefined,
  currencyCode: string | null | undefined,
) {
  if (amountCents == null) return "-"
  return (amountCents / 100).toLocaleString(undefined, {
    style: "currency",
    currency: currencyCode ?? "EUR",
  })
}
