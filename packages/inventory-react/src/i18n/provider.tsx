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

import { productsUiEn } from "./en.js"
import type { ProductsUiMessages } from "./messages.js"
import { productsUiRo } from "./ro.js"
import { productsUiZh } from "./zh.js"

const fallbackLocale = "en"

export const productsUiMessageDefinitions = {
  en: productsUiEn,
  ro: productsUiRo,
  zh: productsUiZh,
} satisfies LocaleMessageDefinitions<ProductsUiMessages>

export type ProductsUiMessageOverrides = LocaleMessageOverrides<ProductsUiMessages>

const productsUiContext = createPackageMessagesContext<ProductsUiMessages>("ProductsUiMessages")

const defaultProductsUiI18n: PackageI18nValue<ProductsUiMessages> = {
  messages: productsUiEn,
  ...createLocaleFormatters(fallbackLocale),
}

export function resolveProductsUiMessages({
  locale,
  overrides,
}: {
  locale: string | null | undefined
  overrides?: ProductsUiMessageOverrides | null
}) {
  return resolvePackageMessages({
    definitions: productsUiMessageDefinitions,
    fallbackLocale,
    locale,
    overrides,
  })
}

export function getProductsUiI18n({
  locale,
  overrides,
}: {
  locale?: string | null | undefined
  overrides?: ProductsUiMessageOverrides | null
}): PackageI18nValue<ProductsUiMessages> {
  const resolvedLocale = locale ?? fallbackLocale
  return {
    messages: resolveProductsUiMessages({
      locale: resolvedLocale,
      overrides,
    }),
    ...createLocaleFormatters(resolvedLocale),
  }
}

export function ProductsUiMessagesProvider({
  children,
  locale,
  overrides,
}: {
  children: ReactNode
  locale: string | null | undefined
  overrides?: ProductsUiMessageOverrides | null
}) {
  return (
    <productsUiContext.ResolvedMessagesProvider
      definitions={productsUiMessageDefinitions}
      fallbackLocale={fallbackLocale}
      locale={locale}
      overrides={overrides}
    >
      {children}
    </productsUiContext.ResolvedMessagesProvider>
  )
}

export const useProductsUiI18n = productsUiContext.useI18n
export const useProductsUiMessages = productsUiContext.useMessages

export function useProductsUiI18nOrDefault() {
  return productsUiContext.useOptionalI18n() ?? defaultProductsUiI18n
}

export function useProductsUiMessagesOrDefault() {
  return useProductsUiI18nOrDefault().messages
}
