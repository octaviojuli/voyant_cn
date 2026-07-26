/**
 * Locale-derived defaults for CRM capture forms.
 *
 * These are *deployment/UI-locale* defaults, never data transforms: they pick
 * which country a fresh phone input starts on and which order the name fields
 * are laid out in. Stored field names (`firstName` / `lastName`) never change.
 */

/**
 * Default dialling country for a language that carries no region subtag.
 *
 * Deliberately narrow — we only map languages whose speaker base is
 * overwhelmingly one country, because a wrong flag is worse than a neutral
 * one. `zh` is the reason this map exists: the admin shell normalizes its
 * persisted locale down to the bare language tag (`DEFAULT_ADMIN_LOCALES` is
 * `["en", "ro", "zh"]`), so the region-subtag rule alone can never recover
 * "CN" for a zh-CN deployment.
 */
const REGION_BY_LANGUAGE: Readonly<Record<string, string>> = {
  ja: "JP",
  ko: "KR",
  ro: "RO",
  zh: "CN",
}

/** Last-resort dialling country, matching the booking journey's fallback. */
const FALLBACK_PHONE_COUNTRY = "GB"

/** Uppercased ISO 3166-1 alpha-2 code, or `undefined` when malformed. */
function normalizeAlpha2(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed && /^[A-Za-z]{2}$/.test(trimmed) ? trimmed.toUpperCase() : undefined
}

/** First 2-letter alpha region subtag of a BCP-47 tag, or `undefined`. */
function regionSubtag(locale: string | null | undefined): string | undefined {
  if (!locale) return undefined
  // BCP-47 separates subtags with "-"; tolerate "_" too. The language subtag
  // is first; the region is the first 2-letter alpha subtag after it (skipping
  // any 4-letter script subtag such as "Hant").
  return locale
    .split(/[-_]/)
    .slice(1)
    .find((part) => /^[A-Za-z]{2}$/.test(part))
}

/**
 * Resolve the default country (ISO 3166-1 alpha-2) a phone input should open
 * on. Order of preference:
 *
 *  1. an explicit value (a deployment's market/storefront setting),
 *  2. the locale's region subtag (`"zh-CN"` -> `"CN"`),
 *  3. the language's canonical region (`"zh"` -> `"CN"`), and
 *  4. `"GB"`.
 *
 * Steps 1, 2 and 4 mirror `resolveDefaultPhoneCountry` in the booking journey
 * (`@voyant-travel/bookings-react`); step 3 is the addition that keeps a
 * bare-`zh` admin locale off the previously hardcoded `"RO"` default.
 */
export function resolveDefaultPhoneCountry(
  locale: string | null | undefined,
  explicit?: string | null,
): string {
  const language = locale?.trim().toLowerCase().split(/[-_]/)[0] ?? ""
  return (
    normalizeAlpha2(explicit) ??
    normalizeAlpha2(regionSubtag(locale)) ??
    REGION_BY_LANGUAGE[language] ??
    FALLBACK_PHONE_COUNTRY
  )
}
