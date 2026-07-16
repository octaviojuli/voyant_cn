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

import { catalogUiEn } from "./en.js"
import type { CatalogUiMessages } from "./messages.js"
import { catalogUiRo } from "./ro.js"
import { catalogUiZh } from "./zh.js"

const fallbackLocale = "en"

export const catalogUiMessageDefinitions = {
  en: catalogUiEn,
  ro: catalogUiRo,
  zh: catalogUiZh,
} satisfies LocaleMessageDefinitions<CatalogUiMessages>

export type CatalogUiMessageOverrides = LocaleMessageOverrides<CatalogUiMessages>

const catalogUiContext = createPackageMessagesContext<CatalogUiMessages>("CatalogUiMessages")

const defaultCatalogUiI18n: PackageI18nValue<CatalogUiMessages> = {
  messages: catalogUiEn,
  ...createLocaleFormatters(fallbackLocale),
}

export function resolveCatalogUiMessages({
  locale,
  overrides,
}: {
  locale: string | null | undefined
  overrides?: CatalogUiMessageOverrides | null
}) {
  return resolvePackageMessages({
    definitions: catalogUiMessageDefinitions,
    fallbackLocale,
    locale,
    overrides,
  })
}

export function getCatalogUiI18n({
  locale,
  overrides,
}: {
  locale?: string | null | undefined
  overrides?: CatalogUiMessageOverrides | null
}): PackageI18nValue<CatalogUiMessages> {
  const resolvedLocale = locale ?? fallbackLocale
  return {
    messages: resolveCatalogUiMessages({
      locale: resolvedLocale,
      overrides,
    }),
    ...createLocaleFormatters(resolvedLocale),
  }
}

export function CatalogUiMessagesProvider({
  children,
  locale,
  overrides,
}: {
  children: ReactNode
  locale: string | null | undefined
  overrides?: CatalogUiMessageOverrides | null
}) {
  return (
    <catalogUiContext.ResolvedMessagesProvider
      definitions={catalogUiMessageDefinitions}
      fallbackLocale={fallbackLocale}
      locale={locale}
      overrides={overrides}
    >
      {children}
    </catalogUiContext.ResolvedMessagesProvider>
  )
}

export const useCatalogUiI18n = catalogUiContext.useI18n
export const useCatalogUiMessages = catalogUiContext.useMessages

export function useCatalogUiI18nOrDefault() {
  return catalogUiContext.useOptionalI18n() ?? defaultCatalogUiI18n
}

export function useCatalogUiMessagesOrDefault() {
  return useCatalogUiI18nOrDefault().messages
}
