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

import { marketsUiEn } from "./en.js"
import type { MarketsUiMessages } from "./messages.js"
import { marketsUiRo } from "./ro.js"
import { marketsUiZh } from "./zh.js"

const fallbackLocale = "en"

export const marketsUiMessageDefinitions = {
  en: marketsUiEn,
  ro: marketsUiRo,
  zh: marketsUiZh,
} satisfies LocaleMessageDefinitions<MarketsUiMessages>

export type MarketsUiMessageOverrides = LocaleMessageOverrides<MarketsUiMessages>

const marketsUiContext = createPackageMessagesContext<MarketsUiMessages>("MarketsUiMessages")

const defaultMarketsUiI18n: PackageI18nValue<MarketsUiMessages> = {
  messages: marketsUiEn,
  ...createLocaleFormatters(fallbackLocale),
}

export function resolveMarketsUiMessages({
  locale,
  overrides,
}: {
  locale: string | null | undefined
  overrides?: MarketsUiMessageOverrides | null
}) {
  return resolvePackageMessages({
    definitions: marketsUiMessageDefinitions,
    fallbackLocale,
    locale,
    overrides,
  })
}

export function getMarketsUiI18n({
  locale,
  overrides,
}: {
  locale?: string | null | undefined
  overrides?: MarketsUiMessageOverrides | null
}): PackageI18nValue<MarketsUiMessages> {
  const resolvedLocale = locale ?? fallbackLocale
  return {
    messages: resolveMarketsUiMessages({
      locale: resolvedLocale,
      overrides,
    }),
    ...createLocaleFormatters(resolvedLocale),
  }
}

export function MarketsUiMessagesProvider({
  children,
  locale,
  overrides,
}: {
  children: ReactNode
  locale: string | null | undefined
  overrides?: MarketsUiMessageOverrides | null
}) {
  return (
    <marketsUiContext.ResolvedMessagesProvider
      definitions={marketsUiMessageDefinitions}
      fallbackLocale={fallbackLocale}
      locale={locale}
      overrides={overrides}
    >
      {children}
    </marketsUiContext.ResolvedMessagesProvider>
  )
}

export const useMarketsUiI18n = marketsUiContext.useI18n
export const useMarketsUiMessages = marketsUiContext.useMessages

export function useMarketsUiI18nOrDefault() {
  return marketsUiContext.useOptionalI18n() ?? defaultMarketsUiI18n
}

export function useMarketsUiMessagesOrDefault() {
  return useMarketsUiI18nOrDefault().messages
}
