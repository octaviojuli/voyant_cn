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

import { externalRefsUiEn } from "./en.js"
import type { ExternalRefsUiMessages } from "./messages.js"
import { externalRefsUiRo } from "./ro.js"
import { externalRefsUiZh } from "./zh.js"

const fallbackLocale = "en"

export const externalRefsUiMessageDefinitions = {
  en: externalRefsUiEn,
  ro: externalRefsUiRo,
  zh: externalRefsUiZh,
} satisfies LocaleMessageDefinitions<ExternalRefsUiMessages>

export type ExternalRefsUiMessageOverrides = LocaleMessageOverrides<ExternalRefsUiMessages>

const externalRefsUiContext =
  createPackageMessagesContext<ExternalRefsUiMessages>("ExternalRefsUiMessages")

const defaultExternalRefsUiI18n: PackageI18nValue<ExternalRefsUiMessages> = {
  messages: externalRefsUiEn,
  ...createLocaleFormatters(fallbackLocale),
}

export function resolveExternalRefsUiMessages({
  locale,
  overrides,
}: {
  locale: string | null | undefined
  overrides?: ExternalRefsUiMessageOverrides | null
}) {
  return resolvePackageMessages({
    definitions: externalRefsUiMessageDefinitions,
    fallbackLocale,
    locale,
    overrides,
  })
}

export function getExternalRefsUiI18n({
  locale,
  overrides,
}: {
  locale?: string | null | undefined
  overrides?: ExternalRefsUiMessageOverrides | null
}): PackageI18nValue<ExternalRefsUiMessages> {
  const resolvedLocale = locale ?? fallbackLocale
  return {
    messages: resolveExternalRefsUiMessages({
      locale: resolvedLocale,
      overrides,
    }),
    ...createLocaleFormatters(resolvedLocale),
  }
}

export function ExternalRefsUiMessagesProvider({
  children,
  locale,
  overrides,
}: {
  children: ReactNode
  locale: string | null | undefined
  overrides?: ExternalRefsUiMessageOverrides | null
}) {
  return (
    <externalRefsUiContext.ResolvedMessagesProvider
      definitions={externalRefsUiMessageDefinitions}
      fallbackLocale={fallbackLocale}
      locale={locale}
      overrides={overrides}
    >
      {children}
    </externalRefsUiContext.ResolvedMessagesProvider>
  )
}

export const useExternalRefsUiI18n = externalRefsUiContext.useI18n
export const useExternalRefsUiMessages = externalRefsUiContext.useMessages

export function useExternalRefsUiI18nOrDefault() {
  return externalRefsUiContext.useOptionalI18n() ?? defaultExternalRefsUiI18n
}

export function useExternalRefsUiMessagesOrDefault() {
  return useExternalRefsUiI18nOrDefault().messages
}
