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

import { cruisesUiEn } from "./en.js"
import type { CruisesUiMessages } from "./messages.js"
import { cruisesUiRo } from "./ro.js"
import { cruisesUiZh } from "./zh.js"

const fallbackLocale = "en"

export const cruisesUiMessageDefinitions = {
  en: cruisesUiEn,
  ro: cruisesUiRo,
  zh: cruisesUiZh,
} satisfies LocaleMessageDefinitions<CruisesUiMessages>

export type CruisesUiMessageOverrides = LocaleMessageOverrides<CruisesUiMessages>

const cruisesUiContext = createPackageMessagesContext<CruisesUiMessages>("CruisesUiMessages")

const defaultCruisesUiI18n: PackageI18nValue<CruisesUiMessages> = {
  messages: cruisesUiEn,
  ...createLocaleFormatters(fallbackLocale),
}

export function resolveCruisesUiMessages({
  locale,
  overrides,
}: {
  locale: string | null | undefined
  overrides?: CruisesUiMessageOverrides | null
}) {
  return resolvePackageMessages({
    definitions: cruisesUiMessageDefinitions,
    fallbackLocale,
    locale,
    overrides,
  })
}

export function getCruisesUiI18n({
  locale,
  overrides,
}: {
  locale?: string | null | undefined
  overrides?: CruisesUiMessageOverrides | null
}): PackageI18nValue<CruisesUiMessages> {
  const resolvedLocale = locale ?? fallbackLocale
  return {
    messages: resolveCruisesUiMessages({
      locale: resolvedLocale,
      overrides,
    }),
    ...createLocaleFormatters(resolvedLocale),
  }
}

export function CruisesUiMessagesProvider({
  children,
  locale,
  overrides,
}: {
  children: ReactNode
  locale: string | null | undefined
  overrides?: CruisesUiMessageOverrides | null
}) {
  return (
    <cruisesUiContext.ResolvedMessagesProvider
      definitions={cruisesUiMessageDefinitions}
      fallbackLocale={fallbackLocale}
      locale={locale}
      overrides={overrides}
    >
      {children}
    </cruisesUiContext.ResolvedMessagesProvider>
  )
}

export const useCruisesUiI18n = cruisesUiContext.useI18n
export const useCruisesUiMessages = cruisesUiContext.useMessages

export function useCruisesUiI18nOrDefault() {
  return cruisesUiContext.useOptionalI18n() ?? defaultCruisesUiI18n
}

export function useCruisesUiMessagesOrDefault() {
  return useCruisesUiI18nOrDefault().messages
}
