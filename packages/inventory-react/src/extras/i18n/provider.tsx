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

import { extrasUiEn } from "./en.js"
import type { ExtrasUiMessages } from "./messages.js"
import { extrasUiRo } from "./ro.js"
import { extrasUiZh } from "./zh.js"

const fallbackLocale = "en"

export const extrasUiMessageDefinitions = {
  en: extrasUiEn,
  ro: extrasUiRo,
  zh: extrasUiZh,
} satisfies LocaleMessageDefinitions<ExtrasUiMessages>

export type ExtrasUiMessageOverrides = LocaleMessageOverrides<ExtrasUiMessages>

const extrasUiContext = createPackageMessagesContext<ExtrasUiMessages>("ExtrasUiMessages")

const defaultExtrasUiI18n: PackageI18nValue<ExtrasUiMessages> = {
  messages: extrasUiEn,
  ...createLocaleFormatters(fallbackLocale),
}

export function resolveExtrasUiMessages({
  locale,
  overrides,
}: {
  locale: string | null | undefined
  overrides?: ExtrasUiMessageOverrides | null
}) {
  return resolvePackageMessages({
    definitions: extrasUiMessageDefinitions,
    fallbackLocale,
    locale,
    overrides,
  })
}

export function getExtrasUiI18n({
  locale,
  overrides,
}: {
  locale?: string | null | undefined
  overrides?: ExtrasUiMessageOverrides | null
}): PackageI18nValue<ExtrasUiMessages> {
  const resolvedLocale = locale ?? fallbackLocale
  return {
    messages: resolveExtrasUiMessages({
      locale: resolvedLocale,
      overrides,
    }),
    ...createLocaleFormatters(resolvedLocale),
  }
}

export function ExtrasUiMessagesProvider({
  children,
  locale,
  overrides,
}: {
  children: ReactNode
  locale: string | null | undefined
  overrides?: ExtrasUiMessageOverrides | null
}) {
  return (
    <extrasUiContext.ResolvedMessagesProvider
      definitions={extrasUiMessageDefinitions}
      fallbackLocale={fallbackLocale}
      locale={locale}
      overrides={overrides}
    >
      {children}
    </extrasUiContext.ResolvedMessagesProvider>
  )
}

export const useExtrasUiI18n = extrasUiContext.useI18n
export const useExtrasUiMessages = extrasUiContext.useMessages

export function useExtrasUiI18nOrDefault() {
  return extrasUiContext.useOptionalI18n() ?? defaultExtrasUiI18n
}

export function useExtrasUiMessagesOrDefault() {
  return useExtrasUiI18nOrDefault().messages
}
