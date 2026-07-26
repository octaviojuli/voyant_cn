/**
 * Locale-aware person-name presentation for every bookings surface.
 *
 * Storage is never reordered — `firstName` is always the given name and
 * `lastName` always the family name, on the wire and in the database.
 * Only the *display* order and the *form field* order change:
 *
 *   - `personDisplayName()` renders "张伟" for a CJK name under zh/ja/ko
 *     and "Ana Pop" everywhere else, by delegating to the shared
 *     `formatPersonName` in `@voyant-travel/i18n`.
 *   - `isFamilyNameFirstLocale()` / `orderNameFields()` put the 姓
 *     (family name) input to the LEFT of the 名 (given name) input for
 *     family-name-first locales, so an operator reading left-to-right
 *     types the family name into the family-name box.
 *
 * Mirrors the convention used by `relationships-react` so the CRM person
 * form and the booking journey behave identically.
 */

import {
  formatPersonName,
  isFamilyNameFirstLocale,
  type PersonNameParts,
} from "@voyant-travel/i18n"

export type { PersonNameParts }
export { isFamilyNameFirstLocale }

/**
 * Display name for a person-shaped record. Returns `""` when the record
 * is missing or has no name parts, so callers can `||` a fallback.
 */
export function personDisplayName(
  person: PersonNameParts | null | undefined,
  locale?: string | null,
): string {
  if (!person) return ""
  return formatPersonName(locale, person).trim()
}

/**
 * Orders a given-name control and a family-name control for the locale.
 * Returns `[given, family]` for western locales and `[family, given]`
 * for family-name-first locales.
 */
export function orderNameFields<T>(
  locale: string | null | undefined,
  givenNameField: T,
  familyNameField: T,
): [T, T] {
  return isFamilyNameFirstLocale(locale)
    ? [familyNameField, givenNameField]
    : [givenNameField, familyNameField]
}
