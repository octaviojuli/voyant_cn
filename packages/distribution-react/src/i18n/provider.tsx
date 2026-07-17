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

import { distributionUiEn } from "./en.js"
import type { DistributionUiMessages } from "./messages.js"
import { distributionUiRo } from "./ro.js"
import { distributionUiZh } from "./zh.js"

const fallbackLocale = "en"

export const distributionUiMessageDefinitions = {
  en: distributionUiEn,
  ro: distributionUiRo,
  zh: distributionUiZh,
} satisfies LocaleMessageDefinitions<DistributionUiMessages>

export type DistributionUiMessageOverrides = LocaleMessageOverrides<DistributionUiMessages>
export type DistributionUiI18n = PackageI18nValue<DistributionUiMessages>

const distributionUiContext =
  createPackageMessagesContext<DistributionUiMessages>("DistributionUiMessages")

const defaultDistributionUiI18n: DistributionUiI18n = {
  messages: distributionUiEn,
  ...createLocaleFormatters(fallbackLocale),
}

export function resolveDistributionUiMessages({
  locale,
  overrides,
}: {
  locale: string | null | undefined
  overrides?: DistributionUiMessageOverrides | null
}) {
  return resolvePackageMessages({
    definitions: distributionUiMessageDefinitions,
    fallbackLocale,
    locale,
    overrides,
  })
}

export function getDistributionUiI18n({
  locale,
  overrides,
}: {
  locale?: string | null | undefined
  overrides?: DistributionUiMessageOverrides | null
}): DistributionUiI18n {
  const resolvedLocale = locale ?? fallbackLocale
  return {
    messages: resolveDistributionUiMessages({
      locale: resolvedLocale,
      overrides,
    }),
    ...createLocaleFormatters(resolvedLocale),
  }
}

export function DistributionUiMessagesProvider({
  children,
  locale,
  overrides,
}: {
  children: ReactNode
  locale: string | null | undefined
  overrides?: DistributionUiMessageOverrides | null
}) {
  return (
    <distributionUiContext.ResolvedMessagesProvider
      definitions={distributionUiMessageDefinitions}
      fallbackLocale={fallbackLocale}
      locale={locale}
      overrides={overrides}
    >
      {children}
    </distributionUiContext.ResolvedMessagesProvider>
  )
}

export const useDistributionUiI18n = distributionUiContext.useI18n
export const useDistributionUiMessages = distributionUiContext.useMessages

export function useDistributionUiI18nOrDefault() {
  return distributionUiContext.useOptionalI18n() ?? defaultDistributionUiI18n
}

export function useDistributionUiMessagesOrDefault() {
  return useDistributionUiI18nOrDefault().messages
}
