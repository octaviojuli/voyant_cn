import { formatMessage } from "@voyant-travel/i18n"
import type { TripComponent } from "@voyant-travel/trips"

/** Localized fragments needed by {@link componentTitleFor}. */
export interface ComponentTitleMessages {
  cabinTitle: string
}

export function readComponentSchedule(component: TripComponent): {
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
    const aMissing = Number.isNaN(aMs)
    const bMissing = Number.isNaN(bMs)
    if (aMissing && bMissing) return a.sequence - b.sequence
    if (aMissing) return 1
    if (bMissing) return -1
    if (aMs !== bMs) return aMs - bMs
    return a.sequence - b.sequence
  })
}

export function componentTitleFor(
  component: TripComponent,
  display: ComponentTitleMessages,
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

export function componentReferenceLabelFor(component: TripComponent): string {
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
