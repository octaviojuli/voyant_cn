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

import { identityUiEn } from "./en.js"
import type { IdentityUiMessages } from "./messages.js"
import { identityUiRo } from "./ro.js"
import { identityUiZh } from "./zh.js"

const fallbackLocale = "en"

export const identityUiMessageDefinitions = {
  en: identityUiEn,
  ro: identityUiRo,
  zh: identityUiZh,
} satisfies LocaleMessageDefinitions<IdentityUiMessages>

export type IdentityUiMessageOverrides = LocaleMessageOverrides<IdentityUiMessages>

const identityUiContext = createPackageMessagesContext<IdentityUiMessages>("IdentityUiMessages")

const defaultIdentityUiI18n: PackageI18nValue<IdentityUiMessages> = {
  messages: identityUiEn,
  ...createLocaleFormatters(fallbackLocale),
}

export function resolveIdentityUiMessages({
  locale,
  overrides,
}: {
  locale: string | null | undefined
  overrides?: IdentityUiMessageOverrides | null
}) {
  return resolvePackageMessages({
    definitions: identityUiMessageDefinitions,
    fallbackLocale,
    locale,
    overrides,
  })
}

export function getIdentityUiI18n({
  locale,
  overrides,
}: {
  locale?: string | null | undefined
  overrides?: IdentityUiMessageOverrides | null
}): PackageI18nValue<IdentityUiMessages> {
  const resolvedLocale = locale ?? fallbackLocale
  return {
    messages: resolveIdentityUiMessages({
      locale: resolvedLocale,
      overrides,
    }),
    ...createLocaleFormatters(resolvedLocale),
  }
}

export function IdentityUiMessagesProvider({
  children,
  locale,
  overrides,
}: {
  children: ReactNode
  locale: string | null | undefined
  overrides?: IdentityUiMessageOverrides | null
}) {
  return (
    <identityUiContext.ResolvedMessagesProvider
      definitions={identityUiMessageDefinitions}
      fallbackLocale={fallbackLocale}
      locale={locale}
      overrides={overrides}
    >
      {children}
    </identityUiContext.ResolvedMessagesProvider>
  )
}

export const useIdentityUiI18n = identityUiContext.useI18n
export const useIdentityUiMessages = identityUiContext.useMessages

export function useIdentityUiI18nOrDefault() {
  return identityUiContext.useOptionalI18n() ?? defaultIdentityUiI18n
}

export function useIdentityUiMessagesOrDefault() {
  return useIdentityUiI18nOrDefault().messages
}
