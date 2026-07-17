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

import { facilitiesUiEn } from "./en.js"
import type { FacilitiesUiMessages } from "./messages.js"
import { facilitiesUiRo } from "./ro.js"
import { facilitiesUiZh } from "./zh.js"

const fallbackLocale = "en"

export const facilitiesUiMessageDefinitions = {
  en: facilitiesUiEn,
  ro: facilitiesUiRo,
  zh: facilitiesUiZh,
} satisfies LocaleMessageDefinitions<FacilitiesUiMessages>

export type FacilitiesUiMessageOverrides = LocaleMessageOverrides<FacilitiesUiMessages>

const facilitiesUiContext =
  createPackageMessagesContext<FacilitiesUiMessages>("FacilitiesUiMessages")

const defaultFacilitiesUiI18n: PackageI18nValue<FacilitiesUiMessages> = {
  messages: facilitiesUiEn,
  ...createLocaleFormatters(fallbackLocale),
}

export function resolveFacilitiesUiMessages({
  locale,
  overrides,
}: {
  locale: string | null | undefined
  overrides?: FacilitiesUiMessageOverrides | null
}) {
  return resolvePackageMessages({
    definitions: facilitiesUiMessageDefinitions,
    fallbackLocale,
    locale,
    overrides,
  })
}

export function getFacilitiesUiI18n({
  locale,
  overrides,
}: {
  locale?: string | null | undefined
  overrides?: FacilitiesUiMessageOverrides | null
}): PackageI18nValue<FacilitiesUiMessages> {
  const resolvedLocale = locale ?? fallbackLocale
  return {
    messages: resolveFacilitiesUiMessages({
      locale: resolvedLocale,
      overrides,
    }),
    ...createLocaleFormatters(resolvedLocale),
  }
}

export function FacilitiesUiMessagesProvider({
  children,
  locale,
  overrides,
}: {
  children: ReactNode
  locale: string | null | undefined
  overrides?: FacilitiesUiMessageOverrides | null
}) {
  return (
    <facilitiesUiContext.ResolvedMessagesProvider
      definitions={facilitiesUiMessageDefinitions}
      fallbackLocale={fallbackLocale}
      locale={locale}
      overrides={overrides}
    >
      {children}
    </facilitiesUiContext.ResolvedMessagesProvider>
  )
}

export const useFacilitiesUiI18n = facilitiesUiContext.useI18n
export const useFacilitiesUiMessages = facilitiesUiContext.useMessages

export function useFacilitiesUiI18nOrDefault() {
  return facilitiesUiContext.useOptionalI18n() ?? defaultFacilitiesUiI18n
}

export function useFacilitiesUiMessagesOrDefault() {
  return useFacilitiesUiI18nOrDefault().messages
}
