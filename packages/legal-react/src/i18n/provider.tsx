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

import { legalUiEn } from "./en.js"
import type { LegalUiMessages } from "./messages.js"
import { legalUiRo } from "./ro.js"
import { legalUiZh } from "./zh.js"

const fallbackLocale = "en"

export const legalUiMessageDefinitions = {
  en: legalUiEn,
  ro: legalUiRo,
  zh: legalUiZh,
} satisfies LocaleMessageDefinitions<LegalUiMessages>

export type LegalUiMessageOverrides = LocaleMessageOverrides<LegalUiMessages>

const legalUiContext = createPackageMessagesContext<LegalUiMessages>("LegalUiMessages")

const defaultLegalUiI18n: PackageI18nValue<LegalUiMessages> = {
  messages: legalUiEn,
  ...createLocaleFormatters(fallbackLocale),
}

export function resolveLegalUiMessages({
  locale,
  overrides,
}: {
  locale: string | null | undefined
  overrides?: LegalUiMessageOverrides | null
}) {
  return resolvePackageMessages({
    definitions: legalUiMessageDefinitions,
    fallbackLocale,
    locale,
    overrides,
  })
}

export function getLegalUiI18n({
  locale,
  overrides,
}: {
  locale?: string | null | undefined
  overrides?: LegalUiMessageOverrides | null
}): PackageI18nValue<LegalUiMessages> {
  const resolvedLocale = locale ?? fallbackLocale
  return {
    messages: resolveLegalUiMessages({
      locale: resolvedLocale,
      overrides,
    }),
    ...createLocaleFormatters(resolvedLocale),
  }
}

export function LegalUiMessagesProvider({
  children,
  locale,
  overrides,
}: {
  children: ReactNode
  locale: string | null | undefined
  overrides?: LegalUiMessageOverrides | null
}) {
  return (
    <legalUiContext.ResolvedMessagesProvider
      definitions={legalUiMessageDefinitions}
      fallbackLocale={fallbackLocale}
      locale={locale}
      overrides={overrides}
    >
      {children}
    </legalUiContext.ResolvedMessagesProvider>
  )
}

export const useLegalUiI18n = legalUiContext.useI18n
export const useLegalUiMessages = legalUiContext.useMessages

export function useLegalUiI18nOrDefault() {
  return legalUiContext.useOptionalI18n() ?? defaultLegalUiI18n
}

export function useLegalUiMessagesOrDefault() {
  return useLegalUiI18nOrDefault().messages
}
