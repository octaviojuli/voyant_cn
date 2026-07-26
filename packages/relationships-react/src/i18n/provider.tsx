"use client"

import {
  createLocaleFormatters,
  createPackageMessagesContext,
  type LocaleMessageDefinitions,
  type LocaleMessageOverrides,
  type PackageI18nValue,
  resolvePackageMessages,
} from "@voyant-travel/i18n"
import type { ReactNode } from "react"

import { crmUiEn } from "./en.js"
import type { CrmUiMessages } from "./messages.js"
import { crmUiRo } from "./ro.js"
import { crmUiZh } from "./zh.js"

const fallbackLocale = "en"

export const crmUiMessageDefinitions = {
  en: crmUiEn,
  ro: crmUiRo,
  zh: crmUiZh,
} satisfies LocaleMessageDefinitions<CrmUiMessages>

export type CrmUiMessageOverrides = LocaleMessageOverrides<CrmUiMessages>

const crmUiContext = createPackageMessagesContext<CrmUiMessages>("CrmUiMessages")

/**
 * localStorage key the admin shell persists the operator's locale under.
 * Load-bearing: keep in sync with `LocaleProvider`'s `localeStorageKey` in
 * `@voyant-travel/admin` and with the pre-hydration bootstrap script in
 * `adminRootHead()`.
 */
const ADMIN_LOCALE_STORAGE_KEY = "admin-locale"

/**
 * Locale to use when a CRM component renders *outside* `<CrmUiMessagesProvider>`.
 *
 * Some hosts mount bare CRM components (e.g. the booking journey's person
 * picker renders `<PersonForm>` directly), and pinning the fallback to `en`
 * made those surfaces render English on a zh-CN deployment even though the
 * dictionaries exist. Detect the admin locale the same way
 * `AdminRootErrorBoundary` does — persisted `admin-locale`, then the browser
 * language — so an unwrapped component still speaks the operator's language.
 *
 * Only locales this package actually ships a dictionary for are accepted;
 * anything else falls back to `en` so copy and `Intl` formatting can't drift
 * apart (English text with French dates). Reading `window` during render
 * mirrors the error-boundary precedent: these components are interaction-
 * mounted (sheets/dialogs), never part of the SSR'd first paint, so there is
 * no hydration text to mismatch. Hosts that *do* server-render CRM copy should
 * wrap in `<CrmUiMessagesProvider locale=...>`, which always wins over this.
 */
export function detectCrmUiFallbackLocale(): string {
  if (typeof window === "undefined") {
    return fallbackLocale
  }

  const stored = window.localStorage?.getItem(ADMIN_LOCALE_STORAGE_KEY)
  const browser = typeof navigator === "undefined" ? null : navigator.language
  return normalizeSupportedLocale(stored ?? browser)
}

/**
 * Keep the full BCP-47 tag (so `Intl` renders "2026年7月26日" rather than the
 * bare-`zh` default) but only when we ship a dictionary for its language.
 */
function normalizeSupportedLocale(candidate: string | null | undefined): string {
  const trimmed = candidate?.trim()
  if (!trimmed) {
    return fallbackLocale
  }

  const language = trimmed.toLowerCase().split(/[-_]/)[0] ?? ""
  return language in crmUiMessageDefinitions ? trimmed : fallbackLocale
}

// Resolving a dictionary allocates a merged object, so memoize per locale —
// `useCrmUiI18nOrDefault()` runs on every render of every unwrapped component.
const defaultCrmUiI18nByLocale = new Map<string, PackageI18nValue<CrmUiMessages>>([
  [
    fallbackLocale,
    {
      messages: crmUiEn,
      ...createLocaleFormatters(fallbackLocale),
    },
  ],
])

function getDefaultCrmUiI18n(locale: string): PackageI18nValue<CrmUiMessages> {
  const cached = defaultCrmUiI18nByLocale.get(locale)
  if (cached) {
    return cached
  }

  const value = getCrmUiI18n({ locale })
  defaultCrmUiI18nByLocale.set(locale, value)
  return value
}

export function resolveCrmUiMessages({
  locale,
  overrides,
}: {
  locale: string | null | undefined
  overrides?: CrmUiMessageOverrides | null
}) {
  return resolvePackageMessages({
    definitions: crmUiMessageDefinitions,
    fallbackLocale,
    locale,
    overrides,
  })
}

export function getCrmUiI18n({
  locale,
  overrides,
}: {
  locale?: string | null | undefined
  overrides?: CrmUiMessageOverrides | null
}): PackageI18nValue<CrmUiMessages> {
  const resolvedLocale = locale ?? fallbackLocale

  return {
    messages: resolveCrmUiMessages({
      locale: resolvedLocale,
      overrides,
    }),
    ...createLocaleFormatters(resolvedLocale),
  }
}

export function CrmUiMessagesProvider({
  children,
  locale,
  overrides,
}: {
  children: ReactNode
  locale: string | null | undefined
  overrides?: CrmUiMessageOverrides | null
}) {
  return (
    <crmUiContext.ResolvedMessagesProvider
      definitions={crmUiMessageDefinitions}
      fallbackLocale={fallbackLocale}
      locale={locale}
      overrides={overrides}
    >
      {children}
    </crmUiContext.ResolvedMessagesProvider>
  )
}

export const useCrmUiI18n = crmUiContext.useI18n
export const useCrmUiMessages = crmUiContext.useMessages

export function useCrmUiI18nOrDefault() {
  const provided = crmUiContext.useOptionalI18n()
  if (provided) {
    return provided
  }

  return getDefaultCrmUiI18n(detectCrmUiFallbackLocale())
}

export function useCrmUiMessagesOrDefault() {
  return useCrmUiI18nOrDefault().messages
}
