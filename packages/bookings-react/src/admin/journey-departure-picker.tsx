"use client"

import { useSlots } from "@voyant-travel/operations-react/availability"
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@voyant-travel/ui/components/combobox"
import { DatePicker } from "@voyant-travel/ui/components/date-picker"
import { Label } from "@voyant-travel/ui/components/label"
import { useEffect, useMemo, useState } from "react"

import { getBookableDepartureSlots } from "../components/booking-create-utils.js"
import { formatMessage, useBookingsUiI18nOrDefault } from "../i18n/provider.js"
import type { DeparturePickerProps } from "../journey/index.js"

/**
 * Admin departure picker for the booking journey's `"departure"`
 * sub-step. Loads the owned product's scheduled departures from
 * availability and lets the operator pick a real one (filtered by the
 * chosen product option). When the product has no scheduled
 * departures, it falls back to a free date so non-scheduled
 * products can still be booked.
 *
 * Wired into `<BookingJourneyHost />` via the journey's
 * `renderDeparturePicker` slot.
 */
type LoadedSlot = {
  id: string
  optionId: string | null
  startsAt: string
  status?: string
  remainingPax?: number | null
  unlimited?: boolean | null
}

export function JourneyDeparturePicker({
  productId,
  optionId,
  slotId,
  departureDate,
  onChange,
  lockDeparture = false,
}: DeparturePickerProps & {
  /** The departure is fixed (a sourced offer's date came in pre-selected) —
   *  show it read-only rather than a re-editable input. */
  lockDeparture?: boolean
}): React.ReactElement {
  const { formatDate, messages: allMessages } = useBookingsUiI18nOrDefault()
  const messages = allMessages.bookingCreateDialog
  const dateFormat: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  }
  // Stable "now" so the slot query + future filter don't churn every render.
  const [nowIso] = useState(() => new Date().toISOString())

  const query = useSlots({
    productId: productId || undefined,
    status: "open",
    startsAtFrom: nowIso,
    limit: 100,
    enabled: Boolean(productId) && !lockDeparture,
  })

  const slots = useMemo<LoadedSlot[]>(
    () =>
      getBookableDepartureSlots((query.data?.data ?? []) as LoadedSlot[], {
        nowIso,
        optionId,
      }),
    [query.data?.data, nowIso, optionId],
  )
  const slotMap = useMemo(() => new Map(slots.map((s) => [s.id, s])), [slots])

  const formatLabel = (slot: LoadedSlot): string => {
    const date = formatDate(new Date(slot.startsAt), dateFormat)
    // Interpolated, not suffixed: Chinese needs "剩余 6 位", which no
    // `${count} ${suffix}` concatenation can produce.
    const remaining =
      !slot.unlimited && typeof slot.remainingPax === "number"
        ? ` · ${formatMessage(messages.labels.remainingCapacityCount, {
            count: slot.remainingPax,
          })}`
        : ""
    return `${date}${remaining}`
  }

  const [inputValue, setInputValue] = useState(() => {
    const current = slotId ? slotMap.get(slotId) : undefined
    return current ? formatLabel(current) : ""
  })

  // The draft keeps the picked slotId across step navigation, but this
  // component's input is local state and re-seeds to "" on remount (before
  // slots load). Reflect the selected slot's label once it resolves so a
  // revisited departure shows as selected rather than empty.
  // biome-ignore lint/correctness/useExhaustiveDependencies: formatLabel is render-stable; slotId/slotMap are the real triggers -- owner: bookings-react; existing suppression is intentional pending typed cleanup.
  useEffect(() => {
    if (!slotId) return
    const slot = slotMap.get(slotId)
    if (slot) setInputValue((prev) => (prev ? prev : formatLabel(slot)))
  }, [slotId, slotMap])

  // Sourced offer with a fixed date (came in pre-selected) → show it read-only.
  // A different date would be a different offer, so there's nothing to edit.
  if (lockDeparture && departureDate) {
    return (
      <div className="space-y-1">
        <Label>{messages.fields.departure}</Label>
        <p className="font-medium text-sm">
          {formatDate(new Date(`${departureDate.slice(0, 10)}T00:00:00`), dateFormat)}
        </p>
      </div>
    )
  }

  // No scheduled departures for this product → a free date so the operator can
  // still set a departure for non-scheduled products. (No time field — tour /
  // package departures are by date.)
  if (!query.isLoading && slots.length === 0) {
    return (
      <div className="space-y-1">
        <Label htmlFor="bj-departure-date">{messages.fields.departure}</Label>
        <DatePicker
          displayFormat={allMessages.common.datePickerFormats.long}
          className="w-full sm:max-w-xs"
          value={departureDate ?? ""}
          onChange={(value) => onChange({ departureDate: value || null })}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <Label>
        {messages.fields.departure} <span className="text-destructive">*</span>
      </Label>
      <Combobox
        items={slots.map((s) => s.id)}
        value={slotId || null}
        inputValue={inputValue}
        autoHighlight
        disabled={query.isLoading}
        filter={() => true}
        itemToStringLabel={(id) => {
          const slot = slotMap.get(id as string)
          return slot ? formatLabel(slot) : (id as string)
        }}
        itemToStringValue={(id) => id as string}
        onInputValueChange={(next) => setInputValue(next)}
        onValueChange={(next) => {
          const id = (next as string | null) ?? ""
          const slot = id ? slotMap.get(id) : undefined
          if (!slot) {
            onChange({ slotId: null, departureDate: null })
            setInputValue("")
            return
          }
          onChange({
            slotId: slot.id,
            // Anchor the free-date field on the slot's date so downstream
            // (payment schedules, hold) has a concrete departure date.
            departureDate: slot.startsAt.slice(0, 10),
          })
          setInputValue(formatLabel(slot))
        }}
      >
        <ComboboxInput placeholder={messages.placeholders.departure} showClear={Boolean(slotId)} />
        <ComboboxContent>
          <ComboboxEmpty>{messages.placeholders.departureEmpty}</ComboboxEmpty>
          <ComboboxList>
            <ComboboxCollection>
              {(id) => {
                const slot = slotMap.get(id as string)
                if (!slot) return null
                return (
                  <ComboboxItem key={slot.id} value={slot.id}>
                    {formatLabel(slot)}
                  </ComboboxItem>
                )
              }}
            </ComboboxCollection>
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  )
}
