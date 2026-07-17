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

import { miceUiEn } from "./en.js"
import type { MiceUiMessages } from "./messages.js"
import { miceUiRo } from "./ro.js"
import { miceUiZh } from "./zh.js"

const fallbackLocale = "en"

export const miceUiMessageDefinitions = {
  en: miceUiEn,
  ro: miceUiRo,
  zh: miceUiZh,
} satisfies LocaleMessageDefinitions<MiceUiMessages>

export type MiceUiMessageOverrides = LocaleMessageOverrides<MiceUiMessages>

const miceUiContext = createPackageMessagesContext<MiceUiMessages>("MiceUiMessages")

const defaultMiceUiI18n: PackageI18nValue<MiceUiMessages> = {
  messages: miceUiEn,
  ...createLocaleFormatters(fallbackLocale),
}

export function resolveMiceUiMessages({
  locale,
  overrides,
}: {
  locale: string | null | undefined
  overrides?: MiceUiMessageOverrides | null
}) {
  return resolvePackageMessages({
    definitions: miceUiMessageDefinitions,
    fallbackLocale,
    locale,
    overrides,
  })
}

export function getMiceUiI18n({
  locale,
  overrides,
}: {
  locale?: string | null | undefined
  overrides?: MiceUiMessageOverrides | null
}): PackageI18nValue<MiceUiMessages> {
  const resolvedLocale = locale ?? fallbackLocale
  return {
    messages: resolveMiceUiMessages({
      locale: resolvedLocale,
      overrides,
    }),
    ...createLocaleFormatters(resolvedLocale),
  }
}

export function MiceUiMessagesProvider({
  children,
  locale,
  overrides,
}: {
  children: ReactNode
  locale: string | null | undefined
  overrides?: MiceUiMessageOverrides | null
}) {
  return (
    <miceUiContext.ResolvedMessagesProvider
      definitions={miceUiMessageDefinitions}
      fallbackLocale={fallbackLocale}
      locale={locale}
      overrides={overrides}
    >
      {children}
    </miceUiContext.ResolvedMessagesProvider>
  )
}

export const useMiceUiI18n = miceUiContext.useI18n
export const useMiceUiMessages = miceUiContext.useMessages

export function useMiceUiI18nOrDefault() {
  return miceUiContext.useOptionalI18n() ?? defaultMiceUiI18n
}

export function useMiceUiMessagesOrDefault() {
  return useMiceUiI18nOrDefault().messages
}
