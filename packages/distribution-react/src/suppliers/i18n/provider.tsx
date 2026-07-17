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

import { suppliersUiEn } from "./en.js"
import type { SuppliersUiMessages } from "./messages.js"
import { suppliersUiRo } from "./ro.js"
import { suppliersUiZh } from "./zh.js"

const fallbackLocale = "en"

export const suppliersUiMessageDefinitions = {
  en: suppliersUiEn,
  ro: suppliersUiRo,
  zh: suppliersUiZh,
} satisfies LocaleMessageDefinitions<SuppliersUiMessages>

export type SuppliersUiMessageOverrides = LocaleMessageOverrides<SuppliersUiMessages>

const suppliersUiContext = createPackageMessagesContext<SuppliersUiMessages>("SuppliersUiMessages")

const defaultSuppliersUiI18n: PackageI18nValue<SuppliersUiMessages> = {
  messages: suppliersUiEn,
  ...createLocaleFormatters(fallbackLocale),
}

export function resolveSuppliersUiMessages({
  locale,
  overrides,
}: {
  locale: string | null | undefined
  overrides?: SuppliersUiMessageOverrides | null
}) {
  return resolvePackageMessages({
    definitions: suppliersUiMessageDefinitions,
    fallbackLocale,
    locale,
    overrides,
  })
}

export function getSuppliersUiI18n({
  locale,
  overrides,
}: {
  locale?: string | null | undefined
  overrides?: SuppliersUiMessageOverrides | null
}): PackageI18nValue<SuppliersUiMessages> {
  const resolvedLocale = locale ?? fallbackLocale
  return {
    messages: resolveSuppliersUiMessages({
      locale: resolvedLocale,
      overrides,
    }),
    ...createLocaleFormatters(resolvedLocale),
  }
}

export function SuppliersUiMessagesProvider({
  children,
  locale,
  overrides,
}: {
  children: ReactNode
  locale: string | null | undefined
  overrides?: SuppliersUiMessageOverrides | null
}) {
  return (
    <suppliersUiContext.ResolvedMessagesProvider
      definitions={suppliersUiMessageDefinitions}
      fallbackLocale={fallbackLocale}
      locale={locale}
      overrides={overrides}
    >
      {children}
    </suppliersUiContext.ResolvedMessagesProvider>
  )
}

export const useSuppliersUiI18n = suppliersUiContext.useI18n
export const useSuppliersUiMessages = suppliersUiContext.useMessages

export function useSuppliersUiI18nOrDefault() {
  return suppliersUiContext.useOptionalI18n() ?? defaultSuppliersUiI18n
}

export function useSuppliersUiMessagesOrDefault() {
  return useSuppliersUiI18nOrDefault().messages
}
