"use client"

import { AsyncCombobox } from "@voyant-travel/ui/components/async-combobox"
import * as React from "react"
import { useBookingsUiI18nOrDefault } from "../i18n/provider.js"
import { type BookingRecord, useBooking, useBookings } from "../index.js"
import { personDisplayName } from "../lib/person-name.js"

export interface BookingComboboxProps {
  value: string | null | undefined
  onChange: (value: string | null) => void
  placeholder?: string
  emptyText?: string
  disabled?: boolean
  className?: string
  triggerClassName?: string
  clearable?: boolean
  limit?: number
}

const DEFAULT_LIMIT = 20

function compact(parts: Array<string | null | undefined>) {
  return parts.map((part) => part?.trim()).filter(Boolean) as string[]
}

function formatCustomer(booking: BookingRecord, locale?: string | null) {
  const name = personDisplayName(
    { firstName: booking.contactFirstName, lastName: booking.contactLastName },
    locale,
  )
  return name || booking.contactEmail || null
}

function formatPrimaryItem(booking: BookingRecord) {
  return booking.items?.find((item) => item.title.trim())?.title ?? null
}

function formatDateRange(booking: BookingRecord) {
  const start = booking.startDate ?? booking.startsAt
  const end = booking.endDate ?? booking.endsAt
  if (start && end) return `${start} - ${end}`
  return start ?? end ?? null
}

function formatBookingLabel(booking: BookingRecord, locale?: string | null) {
  return compact([
    booking.bookingNumber,
    formatCustomer(booking, locale),
    formatPrimaryItem(booking),
  ]).join(" - ")
}

function formatBookingSecondary(booking: BookingRecord) {
  return compact([formatDateRange(booking), booking.sellCurrency]).join(" - ")
}

export function BookingCombobox({
  value,
  onChange,
  placeholder,
  emptyText,
  disabled,
  className,
  triggerClassName,
  clearable = true,
  limit = DEFAULT_LIMIT,
}: BookingComboboxProps) {
  const { locale, messages: allMessages } = useBookingsUiI18nOrDefault()
  const messages = allMessages.bookingCombobox
  const [search, setSearch] = React.useState("")
  const listQuery = useBookings({
    search: search || undefined,
    limit,
  })
  const selectedQuery = useBooking(value ?? undefined, { enabled: Boolean(value) })
  const selectedBooking = selectedQuery.data?.data ?? null
  const bookings = listQuery.data?.data ?? []

  return (
    <AsyncCombobox<BookingRecord>
      value={value ?? null}
      onChange={onChange}
      items={bookings}
      selectedItem={selectedBooking}
      getKey={(booking) => booking.id}
      getLabel={(booking) => formatBookingLabel(booking, locale)}
      getSecondary={formatBookingSecondary}
      onSearchChange={setSearch}
      placeholder={placeholder ?? messages.placeholder}
      emptyText={
        listQuery.isPending || selectedQuery.isPending
          ? messages.loading
          : (emptyText ?? messages.empty)
      }
      disabled={disabled}
      className={className}
      triggerClassName={triggerClassName}
      clearable={clearable}
    />
  )
}
