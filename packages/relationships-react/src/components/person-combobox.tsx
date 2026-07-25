"use client"

import { AsyncCombobox } from "@voyant-travel/ui/components/async-combobox"
import * as React from "react"
import { useCrmUiI18nOrDefault } from "../i18n/index.js"
import { type PersonRecord, usePeople, usePerson } from "../index.js"

export interface PersonComboboxProps {
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

function formatPersonLabel(
  person: PersonRecord,
  formatPersonName: (person: PersonRecord) => string,
) {
  const name = formatPersonName(person)
  return name || person.email || person.id
}

function formatPersonSecondary(person: PersonRecord) {
  return compact([person.email, person.jobTitle, person.phone]).join(" - ")
}

export function PersonCombobox({
  value,
  onChange,
  placeholder,
  emptyText,
  disabled,
  className,
  triggerClassName,
  clearable = true,
  limit = DEFAULT_LIMIT,
}: PersonComboboxProps) {
  const { formatPersonName, messages: crmMessages } = useCrmUiI18nOrDefault()
  const messages = crmMessages.entityComboboxes.person
  const [search, setSearch] = React.useState("")
  const listQuery = usePeople({ search: search || undefined, limit })
  const selectedQuery = usePerson(value ?? undefined, { enabled: Boolean(value) })

  return (
    <AsyncCombobox<PersonRecord>
      value={value ?? null}
      onChange={onChange}
      items={listQuery.data?.data ?? []}
      selectedItem={selectedQuery.data ?? null}
      getKey={(person) => person.id}
      getLabel={(person) => formatPersonLabel(person, formatPersonName)}
      getSecondary={formatPersonSecondary}
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
