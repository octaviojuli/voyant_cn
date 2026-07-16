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

import { financeUiEn } from "./en.js"
import type { FinanceUiMessages } from "./messages.js"
import { financeUiRo } from "./ro.js"
import { financeUiZh } from "./zh.js"

const fallbackLocale = "en"

export const financeUiMessageDefinitions = {
  en: financeUiEn,
  ro: financeUiRo,
  zh: financeUiZh,
} satisfies LocaleMessageDefinitions<FinanceUiMessages>

export type FinanceUiMessageOverrides = LocaleMessageOverrides<FinanceUiMessages>

const financeUiContext = createPackageMessagesContext<FinanceUiMessages>("FinanceUiMessages")

const defaultFinanceUiI18n: PackageI18nValue<FinanceUiMessages> = {
  messages: financeUiEn,
  ...createLocaleFormatters(fallbackLocale),
}

export function resolveFinanceUiMessages({
  locale,
  overrides,
}: {
  locale: string | null | undefined
  overrides?: FinanceUiMessageOverrides | null
}) {
  return resolvePackageMessages({
    definitions: financeUiMessageDefinitions,
    fallbackLocale,
    locale,
    overrides,
  })
}

export function getFinanceUiI18n({
  locale,
  overrides,
}: {
  locale?: string | null | undefined
  overrides?: FinanceUiMessageOverrides | null
}): PackageI18nValue<FinanceUiMessages> {
  const resolvedLocale = locale ?? fallbackLocale
  return {
    messages: resolveFinanceUiMessages({
      locale: resolvedLocale,
      overrides,
    }),
    ...createLocaleFormatters(resolvedLocale),
  }
}

export function FinanceUiMessagesProvider({
  children,
  locale,
  overrides,
}: {
  children: ReactNode
  locale: string | null | undefined
  overrides?: FinanceUiMessageOverrides | null
}) {
  return (
    <financeUiContext.ResolvedMessagesProvider
      definitions={financeUiMessageDefinitions}
      fallbackLocale={fallbackLocale}
      locale={locale}
      overrides={overrides}
    >
      {children}
    </financeUiContext.ResolvedMessagesProvider>
  )
}

export const useFinanceUiI18n = financeUiContext.useI18n
export const useFinanceUiMessages = financeUiContext.useMessages

export function useFinanceUiI18nOrDefault() {
  return financeUiContext.useOptionalI18n() ?? defaultFinanceUiI18n
}

export function useFinanceUiMessagesOrDefault() {
  return useFinanceUiI18nOrDefault().messages
}
