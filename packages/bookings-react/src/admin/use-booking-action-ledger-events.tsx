"use client"

import { useOperatorAdminMessages } from "@voyant-travel/admin"
import { Button } from "@voyant-travel/ui/components/button"
import { CreditCard, FileText, ScrollText } from "lucide-react"
import { useMemo } from "react"
import type { TimelineEvent, TimelineSource } from "../components/booking-activity-timeline.js"
import { useBookingsUiI18nOrDefault } from "../i18n/provider.js"
import {
  type BookingActionLedgerEntryRecord,
  type BookingActionLedgerTraveler,
  useBookingActionLedger,
} from "../index.js"
import { personDisplayName } from "../lib/person-name.js"

/**
 * Fetch the booking's central action-ledger entries and map them into
 * `TimelineEvent`s so they can be merged into `BookingActivityTimeline`.
 * Replaces the standalone Ledger tab — operators see one chronological
 * activity feed instead of two sibling tabs.
 *
 * Returns a "Load more" `footer` element when the cursor pager hasn't
 * exhausted yet so the timeline can render it below the event list.
 */
export function useBookingActionLedgerEvents(bookingId: string): {
  events: TimelineEvent[]
  footer: React.ReactNode | null
} {
  const t = useOperatorAdminMessages().bookings.detail.actionLedger
  const { locale } = useBookingsUiI18nOrDefault()
  const ledgerQuery = useBookingActionLedger(bookingId)

  const pages = useMemo(() => ledgerQuery.data?.pages ?? [], [ledgerQuery.data])
  const travelers = pages[0]?.travelers ?? []
  const travelersById = useMemo(
    () => new Map(travelers.map((traveler) => [traveler.id, traveler])),
    [travelers],
  )

  const events = useMemo<TimelineEvent[]>(() => {
    const all: TimelineEvent[] = []
    for (const page of pages) {
      for (const entry of page.data) {
        const traveler = travelersById.get(entry.targetId) ?? null
        const presentation = getLedgerTimelinePresentation(entry.actionName)
        all.push({
          id: `action:${entry.id}`,
          source: presentation.source,
          title: formatActionName(entry.actionName),
          description: formatLedgerDescription(
            entry,
            traveler,
            t.travelerFallback,
            t.targetBooking,
            locale,
          ),
          actorId: entry.principalId,
          timestamp: entry.occurredAt,
          icon: presentation.icon,
        })
      }
    }
    return all
  }, [pages, travelersById, t.targetBooking, t.travelerFallback, locale])

  const footer = ledgerQuery.hasNextPage ? (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={ledgerQuery.isFetchingNextPage}
      onClick={() => void ledgerQuery.fetchNextPage()}
    >
      {ledgerQuery.isFetchingNextPage ? t.loadingMore : t.loadMore}
    </Button>
  ) : null

  return { events, footer }
}

function formatActionName(value: string) {
  return value.replaceAll(".", " / ").replaceAll("_", " ")
}

function getLedgerTimelinePresentation(actionName: string): {
  source: TimelineSource
  icon: typeof ScrollText
} {
  if (
    actionName.startsWith("finance.invoice.") ||
    actionName.startsWith("finance.invoice_line_item.") ||
    actionName.startsWith("finance.credit_note.") ||
    actionName.startsWith("finance.credit_note_line_item.")
  ) {
    return { source: "document", icon: FileText }
  }

  if (
    actionName.startsWith("finance.payment") ||
    actionName.startsWith("finance.booking_payment") ||
    actionName.startsWith("finance.booking_guarantee")
  ) {
    return { source: "payment", icon: CreditCard }
  }

  return { source: "action", icon: ScrollText }
}

function formatTarget(
  entry: BookingActionLedgerEntryRecord,
  traveler: BookingActionLedgerTraveler | null,
  travelerFallback: string,
  bookingFallback: string,
  locale?: string | null,
) {
  if (traveler) {
    return personDisplayName(traveler, locale) || travelerFallback
  }
  if (entry.targetType === "booking") return bookingFallback
  return entry.targetType.replaceAll("_", " ")
}

function formatLedgerDescription(
  entry: BookingActionLedgerEntryRecord,
  traveler: BookingActionLedgerTraveler | null,
  travelerFallback: string,
  bookingFallback: string,
  locale?: string | null,
) {
  // status / target / risk are machine-readable enum strings the
  // ledger ships unmodified (matches the standalone panel behaviour).
  const parts = [
    entry.status,
    formatTarget(entry, traveler, travelerFallback, bookingFallback, locale),
    entry.evaluatedRisk,
  ]
  if (entry.routeOrToolName) parts.push(entry.routeOrToolName)
  return parts.join(" · ")
}
