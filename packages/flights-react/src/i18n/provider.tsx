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

import { flightsUiEn } from "./en.js"
import type { FlightsUiMessages } from "./messages.js"
import { flightsUiRo } from "./ro.js"
import { flightsUiZh } from "./zh.js"

const fallbackLocale = "en"

export const flightsUiMessageDefinitions = {
  en: flightsUiEn,
  ro: flightsUiRo,
  zh: flightsUiZh,
} satisfies LocaleMessageDefinitions<FlightsUiMessages>

export type FlightsUiMessageOverrides = LocaleMessageOverrides<FlightsUiMessages>

const flightsUiContext = createPackageMessagesContext<FlightsUiMessages>("FlightsUiMessages")

const defaultFlightsUiI18n: PackageI18nValue<FlightsUiMessages> = {
  messages: flightsUiEn,
  ...createLocaleFormatters(fallbackLocale),
}

export function resolveFlightsUiMessages({
  locale,
  overrides,
}: {
  locale: string | null | undefined
  overrides?: FlightsUiMessageOverrides | null
}) {
  return resolvePackageMessages({
    definitions: flightsUiMessageDefinitions,
    fallbackLocale,
    locale,
    overrides,
  })
}

export function getFlightsUiI18n({
  locale,
  overrides,
}: {
  locale?: string | null | undefined
  overrides?: FlightsUiMessageOverrides | null
}): PackageI18nValue<FlightsUiMessages> {
  const resolvedLocale = locale ?? fallbackLocale
  return {
    messages: resolveFlightsUiMessages({
      locale: resolvedLocale,
      overrides,
    }),
    ...createLocaleFormatters(resolvedLocale),
  }
}

export function FlightsUiMessagesProvider({
  children,
  locale,
  overrides,
}: {
  children: ReactNode
  locale: string | null | undefined
  overrides?: FlightsUiMessageOverrides | null
}) {
  return (
    <flightsUiContext.ResolvedMessagesProvider
      definitions={flightsUiMessageDefinitions}
      fallbackLocale={fallbackLocale}
      locale={locale}
      overrides={overrides}
    >
      {children}
    </flightsUiContext.ResolvedMessagesProvider>
  )
}

export const useFlightsUiI18n = flightsUiContext.useI18n
export const useFlightsUiMessages = flightsUiContext.useMessages

export function useFlightsUiI18nOrDefault() {
  return flightsUiContext.useOptionalI18n() ?? defaultFlightsUiI18n
}

export function useFlightsUiMessagesOrDefault() {
  return useFlightsUiI18nOrDefault().messages
}
