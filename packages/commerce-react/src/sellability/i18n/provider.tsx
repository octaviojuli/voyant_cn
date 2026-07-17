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

import { sellabilityUiEn } from "./en.js"
import type { SellabilityUiMessages } from "./messages.js"
import { sellabilityUiRo } from "./ro.js"
import { sellabilityUiZh } from "./zh.js"

const fallbackLocale = "en"

export const sellabilityUiMessageDefinitions = {
  en: sellabilityUiEn,
  ro: sellabilityUiRo,
  zh: sellabilityUiZh,
} satisfies LocaleMessageDefinitions<SellabilityUiMessages>

export type SellabilityUiMessageOverrides = LocaleMessageOverrides<SellabilityUiMessages>

const sellabilityUiContext =
  createPackageMessagesContext<SellabilityUiMessages>("SellabilityUiMessages")

const defaultSellabilityUiI18n: PackageI18nValue<SellabilityUiMessages> = {
  messages: sellabilityUiEn,
  ...createLocaleFormatters(fallbackLocale),
}

export function resolveSellabilityUiMessages({
  locale,
  overrides,
}: {
  locale: string | null | undefined
  overrides?: SellabilityUiMessageOverrides | null
}) {
  return resolvePackageMessages({
    definitions: sellabilityUiMessageDefinitions,
    fallbackLocale,
    locale,
    overrides,
  })
}

export function getSellabilityUiI18n({
  locale,
  overrides,
}: {
  locale?: string | null | undefined
  overrides?: SellabilityUiMessageOverrides | null
}): PackageI18nValue<SellabilityUiMessages> {
  const resolvedLocale = locale ?? fallbackLocale
  return {
    messages: resolveSellabilityUiMessages({
      locale: resolvedLocale,
      overrides,
    }),
    ...createLocaleFormatters(resolvedLocale),
  }
}

export function SellabilityUiMessagesProvider({
  children,
  locale,
  overrides,
}: {
  children: ReactNode
  locale: string | null | undefined
  overrides?: SellabilityUiMessageOverrides | null
}) {
  return (
    <sellabilityUiContext.ResolvedMessagesProvider
      definitions={sellabilityUiMessageDefinitions}
      fallbackLocale={fallbackLocale}
      locale={locale}
      overrides={overrides}
    >
      {children}
    </sellabilityUiContext.ResolvedMessagesProvider>
  )
}

export const useSellabilityUiI18n = sellabilityUiContext.useI18n
export const useSellabilityUiMessages = sellabilityUiContext.useMessages

export function useSellabilityUiI18nOrDefault() {
  return sellabilityUiContext.useOptionalI18n() ?? defaultSellabilityUiI18n
}

export function useSellabilityUiMessagesOrDefault() {
  return useSellabilityUiI18nOrDefault().messages
}
