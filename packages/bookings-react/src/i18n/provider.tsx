"use client"

import {
  createLocaleFormatters,
  createPackageMessagesContext,
  formatMessage,
  type LocaleMessageDefinitions,
  type LocaleMessageOverrides,
  type PackageI18nValue,
  resolvePackageMessages,
} from "@voyant-travel/i18n"
import type { ReactNode } from "react"

import { bookingsUiEn } from "./en.js"
import type { BookingsUiMessages } from "./messages.js"
import { bookingsUiRo } from "./ro.js"
import { bookingsUiZh } from "./zh.js"

const fallbackLocale = "en"

export const bookingsUiMessageDefinitions = {
  en: bookingsUiEn,
  ro: bookingsUiRo,
  zh: bookingsUiZh,
} satisfies LocaleMessageDefinitions<BookingsUiMessages>

export type BookingsUiMessageOverrides = LocaleMessageOverrides<BookingsUiMessages>

const bookingsUiContext = createPackageMessagesContext<BookingsUiMessages>("BookingsUiMessages")

const defaultBookingsUiI18n: PackageI18nValue<BookingsUiMessages> = {
  messages: bookingsUiEn,
  ...createLocaleFormatters(fallbackLocale),
}

export function resolveBookingsUiMessages({
  locale,
  overrides,
}: {
  locale: string | null | undefined
  overrides?: BookingsUiMessageOverrides | null
}) {
  return resolvePackageMessages({
    definitions: bookingsUiMessageDefinitions,
    fallbackLocale,
    locale,
    overrides,
  })
}

export function getBookingsUiI18n({
  locale,
  overrides,
}: {
  locale?: string | null | undefined
  overrides?: BookingsUiMessageOverrides | null
}): PackageI18nValue<BookingsUiMessages> {
  const resolvedLocale = locale ?? fallbackLocale
  return {
    messages: resolveBookingsUiMessages({
      locale: resolvedLocale,
      overrides,
    }),
    ...createLocaleFormatters(resolvedLocale),
  }
}

export function BookingsUiMessagesProvider({
  children,
  locale,
  overrides,
}: {
  children: ReactNode
  locale: string | null | undefined
  overrides?: BookingsUiMessageOverrides | null
}) {
  return (
    <bookingsUiContext.ResolvedMessagesProvider
      definitions={bookingsUiMessageDefinitions}
      fallbackLocale={fallbackLocale}
      locale={locale}
      overrides={overrides}
    >
      {children}
    </bookingsUiContext.ResolvedMessagesProvider>
  )
}

export const useBookingsUiI18n = bookingsUiContext.useI18n
export const useBookingsUiMessages = bookingsUiContext.useMessages

export function useBookingsUiI18nOrDefault() {
  return bookingsUiContext.useOptionalI18n() ?? defaultBookingsUiI18n
}

export function useBookingsUiMessagesOrDefault() {
  return useBookingsUiI18nOrDefault().messages
}

export { formatMessage }
