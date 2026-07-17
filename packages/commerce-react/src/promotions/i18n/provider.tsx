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

import { promotionsUiEn } from "./en.js"
import type { PromotionsUiMessages } from "./messages.js"
import { promotionsUiRo } from "./ro.js"
import { promotionsUiZh } from "./zh.js"

const fallbackLocale = "en"

export const promotionsUiMessageDefinitions = {
  en: promotionsUiEn,
  ro: promotionsUiRo,
  zh: promotionsUiZh,
} satisfies LocaleMessageDefinitions<PromotionsUiMessages>

export type PromotionsUiMessageOverrides = LocaleMessageOverrides<PromotionsUiMessages>

const promotionsUiContext =
  createPackageMessagesContext<PromotionsUiMessages>("PromotionsUiMessages")

const defaultPromotionsUiI18n: PackageI18nValue<PromotionsUiMessages> = {
  messages: promotionsUiEn,
  ...createLocaleFormatters(fallbackLocale),
}

export function resolvePromotionsUiMessages({
  locale,
  overrides,
}: {
  locale: string | null | undefined
  overrides?: PromotionsUiMessageOverrides | null
}) {
  return resolvePackageMessages({
    definitions: promotionsUiMessageDefinitions,
    fallbackLocale,
    locale,
    overrides,
  })
}

export function getPromotionsUiI18n({
  locale,
  overrides,
}: {
  locale?: string | null | undefined
  overrides?: PromotionsUiMessageOverrides | null
}): PackageI18nValue<PromotionsUiMessages> {
  const resolvedLocale = locale ?? fallbackLocale
  return {
    messages: resolvePromotionsUiMessages({
      locale: resolvedLocale,
      overrides,
    }),
    ...createLocaleFormatters(resolvedLocale),
  }
}

export function PromotionsUiMessagesProvider({
  children,
  locale,
  overrides,
}: {
  children: ReactNode
  locale: string | null | undefined
  overrides?: PromotionsUiMessageOverrides | null
}) {
  return (
    <promotionsUiContext.ResolvedMessagesProvider
      definitions={promotionsUiMessageDefinitions}
      fallbackLocale={fallbackLocale}
      locale={locale}
      overrides={overrides}
    >
      {children}
    </promotionsUiContext.ResolvedMessagesProvider>
  )
}

export const usePromotionsUiI18n = promotionsUiContext.useI18n
export const usePromotionsUiMessages = promotionsUiContext.useMessages

export function usePromotionsUiI18nOrDefault() {
  return promotionsUiContext.useOptionalI18n() ?? defaultPromotionsUiI18n
}

export function usePromotionsUiMessagesOrDefault() {
  return usePromotionsUiI18nOrDefault().messages
}
