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

import { authUiEn } from "./en.js"
import type { AuthUiMessages } from "./messages.js"
import { authUiRo } from "./ro.js"
import { authUiZh } from "./zh.js"

const fallbackLocale = "en"

export const authUiMessageDefinitions = {
  en: authUiEn,
  ro: authUiRo,
  zh: authUiZh,
} satisfies LocaleMessageDefinitions<AuthUiMessages>

export type AuthUiMessageOverrides = LocaleMessageOverrides<AuthUiMessages>

const authUiContext = createPackageMessagesContext<AuthUiMessages>("AuthUiMessages")

const defaultAuthUiI18n: PackageI18nValue<AuthUiMessages> = {
  messages: authUiEn,
  ...createLocaleFormatters(fallbackLocale),
}

export function resolveAuthUiMessages({
  locale,
  overrides,
}: {
  locale: string | null | undefined
  overrides?: AuthUiMessageOverrides | null
}) {
  return resolvePackageMessages({
    definitions: authUiMessageDefinitions,
    fallbackLocale,
    locale,
    overrides,
  })
}

export function getAuthUiI18n({
  locale,
  overrides,
}: {
  locale?: string | null | undefined
  overrides?: AuthUiMessageOverrides | null
}): PackageI18nValue<AuthUiMessages> {
  const resolvedLocale = locale ?? fallbackLocale
  return {
    messages: resolveAuthUiMessages({ locale: resolvedLocale, overrides }),
    ...createLocaleFormatters(resolvedLocale),
  }
}

export function AuthUiMessagesProvider({
  children,
  locale,
  overrides,
}: {
  children: ReactNode
  locale: string | null | undefined
  overrides?: AuthUiMessageOverrides | null
}) {
  return (
    <authUiContext.ResolvedMessagesProvider
      definitions={authUiMessageDefinitions}
      fallbackLocale={fallbackLocale}
      locale={locale}
      overrides={overrides}
    >
      {children}
    </authUiContext.ResolvedMessagesProvider>
  )
}

export const useAuthUiI18n = authUiContext.useI18n
export const useAuthUiMessages = authUiContext.useMessages

export function useAuthUiI18nOrDefault() {
  return authUiContext.useOptionalI18n() ?? defaultAuthUiI18n
}

export function useAuthUiMessagesOrDefault() {
  return useAuthUiI18nOrDefault().messages
}
