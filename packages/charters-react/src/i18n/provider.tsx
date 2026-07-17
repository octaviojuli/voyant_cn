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

import { chartersUiEn } from "./en.js"
import type { ChartersUiMessages } from "./messages.js"
import { chartersUiRo } from "./ro.js"
import { chartersUiZh } from "./zh.js"

const fallbackLocale = "en"

export const chartersUiMessageDefinitions = {
  en: chartersUiEn,
  ro: chartersUiRo,
  zh: chartersUiZh,
} satisfies LocaleMessageDefinitions<ChartersUiMessages>

export type ChartersUiMessageOverrides = LocaleMessageOverrides<ChartersUiMessages>

const chartersUiContext = createPackageMessagesContext<ChartersUiMessages>("ChartersUiMessages")

const defaultChartersUiI18n: PackageI18nValue<ChartersUiMessages> = {
  messages: chartersUiEn,
  ...createLocaleFormatters(fallbackLocale),
}

export function resolveChartersUiMessages({
  locale,
  overrides,
}: {
  locale: string | null | undefined
  overrides?: ChartersUiMessageOverrides | null
}) {
  return resolvePackageMessages({
    definitions: chartersUiMessageDefinitions,
    fallbackLocale,
    locale,
    overrides,
  })
}

export function getChartersUiI18n({
  locale,
  overrides,
}: {
  locale?: string | null | undefined
  overrides?: ChartersUiMessageOverrides | null
}): PackageI18nValue<ChartersUiMessages> {
  const resolvedLocale = locale ?? fallbackLocale
  return {
    messages: resolveChartersUiMessages({
      locale: resolvedLocale,
      overrides,
    }),
    ...createLocaleFormatters(resolvedLocale),
  }
}

export function ChartersUiMessagesProvider({
  children,
  locale,
  overrides,
}: {
  children: ReactNode
  locale: string | null | undefined
  overrides?: ChartersUiMessageOverrides | null
}) {
  return (
    <chartersUiContext.ResolvedMessagesProvider
      definitions={chartersUiMessageDefinitions}
      fallbackLocale={fallbackLocale}
      locale={locale}
      overrides={overrides}
    >
      {children}
    </chartersUiContext.ResolvedMessagesProvider>
  )
}

export const useChartersUiI18n = chartersUiContext.useI18n
export const useChartersUiMessages = chartersUiContext.useMessages

export function useChartersUiI18nOrDefault() {
  return chartersUiContext.useOptionalI18n() ?? defaultChartersUiI18n
}

export function useChartersUiMessagesOrDefault() {
  return useChartersUiI18nOrDefault().messages
}
