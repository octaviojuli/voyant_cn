export interface PersonNameParts {
  firstName?: string | null
  lastName?: string | null
}

export interface LocaleFormatters {
  locale: string
  formatCurrency: (
    value: number | string | bigint,
    currency: string,
    options?: Omit<Intl.NumberFormatOptions, "currency" | "style">,
  ) => string
  formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string
  formatDateTime: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string
  formatNumber: (value: number | string | bigint, options?: Intl.NumberFormatOptions) => string
  formatPersonName: (person: PersonNameParts) => string
}

function normalizeLocale(locale: string | null | undefined): string {
  return (locale ?? "").trim() || "en"
}

function coerceNumber(value: number | string | bigint): number | bigint | null {
  if (typeof value === "number" || typeof value === "bigint") {
    return value
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function coerceDate(value: Date | string | number): Date | null {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

// Languages that customarily render the family name before the given name.
const FAMILY_NAME_FIRST_LANGUAGES = new Set(["zh", "ja", "ko"])

const CJK_PATTERN = /[぀-ヿ㐀-䶿一-鿿豈-﫿가-힯]/

/**
 * True when the locale's language customarily writes the family name before
 * the given name (zh/ja/ko).
 *
 * Unlike {@link formatPersonName} this looks at the *locale only* — never at
 * the characters in the value. Name-capture forms have to decide field order
 * before anything has been typed, so a content sniff can't work there. This is
 * the single source of truth for the repo-wide name-order convention:
 * family-name field first in zh/ja/ko, given-name field first everywhere else.
 */
export function isFamilyNameFirstLocale(locale: string | null | undefined): boolean {
  const language = normalizeLocale(locale).toLowerCase().split("-")[0] ?? ""
  return FAMILY_NAME_FIRST_LANGUAGES.has(language)
}

/**
 * Locale-aware person display name. In family-name-first languages
 * (zh/ja/ko) a CJK name renders as family name + given name with no
 * separator (e.g. 张 + 伟 → 张伟); everything else renders as
 * "given family". Only the display order changes — stored fields are
 * never reordered.
 */
export function formatPersonName(
  locale: string | null | undefined,
  { firstName, lastName }: PersonNameParts,
): string {
  const given = (firstName ?? "").trim()
  const family = (lastName ?? "").trim()
  const language = normalizeLocale(locale).toLowerCase().split("-")[0] ?? ""
  if (FAMILY_NAME_FIRST_LANGUAGES.has(language) && CJK_PATTERN.test(`${family}${given}`)) {
    return `${family}${given}`
  }

  return [given, family].filter(Boolean).join(" ")
}

export function createLocaleFormatters(locale: string | null | undefined): LocaleFormatters {
  const resolvedLocale = normalizeLocale(locale)

  return {
    locale: resolvedLocale,
    formatCurrency(value, currency, options) {
      const normalizedValue = coerceNumber(value)
      if (normalizedValue === null) {
        return `${currency} ${value}`
      }

      return new Intl.NumberFormat(resolvedLocale, {
        currency,
        style: "currency",
        ...options,
      }).format(normalizedValue)
    },
    formatDate(value, options) {
      const normalizedValue = coerceDate(value)
      if (!normalizedValue) {
        return String(value)
      }

      return new Intl.DateTimeFormat(resolvedLocale, options).format(normalizedValue)
    },
    formatDateTime(value, options) {
      const normalizedValue = coerceDate(value)
      if (!normalizedValue) {
        return String(value)
      }

      return new Intl.DateTimeFormat(resolvedLocale, {
        dateStyle: "medium",
        timeStyle: "short",
        ...options,
      }).format(normalizedValue)
    },
    formatNumber(value, options) {
      const normalizedValue = coerceNumber(value)
      if (normalizedValue === null) {
        return String(value)
      }

      return new Intl.NumberFormat(resolvedLocale, options).format(normalizedValue)
    },
    formatPersonName(person) {
      return formatPersonName(resolvedLocale, person)
    },
  }
}
