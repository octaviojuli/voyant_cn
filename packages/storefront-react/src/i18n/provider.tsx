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

import { storefrontSettingsUiEn } from "./en.js"
import type { StorefrontSettingsUiMessages } from "./messages.js"
import { storefrontSettingsUiRo } from "./ro.js"
import { storefrontSettingsUiZh } from "./zh.js"

const fallbackLocale = "en"

export const storefrontSettingsUiMessageDefinitions = {
  en: storefrontSettingsUiEn,
  ro: storefrontSettingsUiRo,
  zh: storefrontSettingsUiZh,
} satisfies LocaleMessageDefinitions<StorefrontSettingsUiMessages>

export type StorefrontSettingsUiMessageOverrides =
  LocaleMessageOverrides<StorefrontSettingsUiMessages>

const storefrontSettingsUiContext = createPackageMessagesContext<StorefrontSettingsUiMessages>(
  "StorefrontSettingsUiMessages",
)

const defaultStorefrontSettingsUiI18n: PackageI18nValue<StorefrontSettingsUiMessages> = {
  messages: storefrontSettingsUiEn,
  ...createLocaleFormatters(fallbackLocale),
}

export function resolveStorefrontSettingsUiMessages({
  locale,
  overrides,
}: {
  locale: string | null | undefined
  overrides?: StorefrontSettingsUiMessageOverrides | null
}) {
  return resolvePackageMessages({
    definitions: storefrontSettingsUiMessageDefinitions,
    fallbackLocale,
    locale,
    overrides,
  })
}

export function getStorefrontSettingsUiI18n({
  locale,
  overrides,
}: {
  locale?: string | null | undefined
  overrides?: StorefrontSettingsUiMessageOverrides | null
}): PackageI18nValue<StorefrontSettingsUiMessages> {
  const resolvedLocale = locale ?? fallbackLocale
  return {
    messages: resolveStorefrontSettingsUiMessages({
      locale: resolvedLocale,
      overrides,
    }),
    ...createLocaleFormatters(resolvedLocale),
  }
}

export function StorefrontSettingsUiMessagesProvider({
  children,
  locale,
  overrides,
}: {
  children: ReactNode
  locale: string | null | undefined
  overrides?: StorefrontSettingsUiMessageOverrides | null
}) {
  return (
    <storefrontSettingsUiContext.ResolvedMessagesProvider
      definitions={storefrontSettingsUiMessageDefinitions}
      fallbackLocale={fallbackLocale}
      locale={locale}
      overrides={overrides}
    >
      {children}
    </storefrontSettingsUiContext.ResolvedMessagesProvider>
  )
}

export const useStorefrontSettingsUiI18n = storefrontSettingsUiContext.useI18n
export const useStorefrontSettingsUiMessages = storefrontSettingsUiContext.useMessages

export function useStorefrontSettingsUiI18nOrDefault() {
  return storefrontSettingsUiContext.useOptionalI18n() ?? defaultStorefrontSettingsUiI18n
}

export function useStorefrontSettingsUiMessagesOrDefault() {
  return useStorefrontSettingsUiI18nOrDefault().messages
}
