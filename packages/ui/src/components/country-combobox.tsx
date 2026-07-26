import { countries } from "@voyant-travel/utils/countries"
import * as React from "react"
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "./combobox.js"

type Country = { name: string; code: string }

const COUNTRY_LIST: readonly Country[] = (countries.flat() as Country[])
  .slice()
  .sort((a, b) => a.name.localeCompare(b.name))

const COUNTRY_BY_CODE = new Map<string, Country>()
for (const c of COUNTRY_LIST) COUNTRY_BY_CODE.set(c.code, c)

export type CountryComboboxMessages = {
  /** Search-input placeholder. */
  placeholder: string
  /** Shown when the search matches no country. */
  empty: string
}

// i18n-literal-ok: contractual plain-English defaults; hosts pass localized
// copy through the `messages` prop (see `data-table-pagination.tsx` for the
// same seam).
const defaultCountryComboboxMessages: CountryComboboxMessages = {
  placeholder: "Search countries…",
  empty: "No countries found.",
}

export type CountryComboboxProps = {
  value: string | null | undefined
  onChange: (code: string | null) => void
  /** Localized copy from the host. Defaults to English. */
  messages?: CountryComboboxMessages
  /** Per-instance override; wins over `messages.placeholder`. */
  placeholder?: string
  /** Per-instance override; wins over `messages.empty`. */
  emptyText?: string
  disabled?: boolean
}

export function CountryCombobox({
  value,
  onChange,
  messages = defaultCountryComboboxMessages,
  placeholder,
  emptyText,
  disabled,
}: CountryComboboxProps) {
  const resolvedPlaceholder = placeholder ?? messages.placeholder
  const resolvedEmptyText = emptyText ?? messages.empty
  const normalized = value ? value.toUpperCase() : null
  const selectedLabel = React.useMemo(() => {
    if (!normalized) return ""
    const match = COUNTRY_BY_CODE.get(normalized)
    return match ? `${match.name} (${match.code})` : normalized
  }, [normalized])

  const [inputValue, setInputValue] = React.useState(selectedLabel)
  React.useEffect(() => {
    setInputValue(selectedLabel)
  }, [selectedLabel])

  const itemCodes = React.useMemo(() => COUNTRY_LIST.map((c) => c.code), [])

  // base-ui filters and displays via `itemToStringLabel`; the
  // `itemToStringValue` prop is for form submission only. We want
  // searches like "rom" to match Romania, so the label string includes
  // the country name.
  const itemToStringLabel = React.useCallback((code: unknown) => {
    const match = COUNTRY_BY_CODE.get(code as string)
    return match ? `${match.name} (${match.code})` : (code as string)
  }, [])

  return (
    <Combobox
      items={itemCodes}
      value={normalized}
      inputValue={inputValue}
      autoHighlight
      disabled={disabled}
      itemToStringLabel={itemToStringLabel}
      itemToStringValue={(code) => code as string}
      onInputValueChange={(next) => {
        setInputValue(next)
        if (!next) onChange(null)
      }}
      onValueChange={(next) => {
        const code = (next as string | null) ?? null
        onChange(code)
        if (code) {
          const match = COUNTRY_BY_CODE.get(code)
          setInputValue(match ? `${match.name} (${match.code})` : code)
        } else {
          setInputValue("")
        }
      }}
    >
      <ComboboxInput placeholder={resolvedPlaceholder} showClear={!!normalized} />
      <ComboboxContent>
        <ComboboxEmpty>{resolvedEmptyText}</ComboboxEmpty>
        <ComboboxList>
          <ComboboxCollection>
            {(code) => {
              const country = COUNTRY_BY_CODE.get(code as string)
              if (!country) return null
              return (
                <ComboboxItem key={country.code} value={country.code}>
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                    <span className="truncate">{country.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{country.code}</span>
                  </div>
                </ComboboxItem>
              )
            }}
          </ComboboxCollection>
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
