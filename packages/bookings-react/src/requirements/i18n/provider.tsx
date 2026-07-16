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

import { bookingRequirementsUiEn } from "./en.js"
import type { BookingRequirementsUiMessages } from "./messages.js"
import { bookingRequirementsUiRo } from "./ro.js"
import { bookingRequirementsUiZh } from "./zh.js"

const fallbackLocale = "en"

export const bookingRequirementsUiMessageDefinitions = {
  en: bookingRequirementsUiEn,
  ro: bookingRequirementsUiRo,
  zh: bookingRequirementsUiZh,
} satisfies LocaleMessageDefinitions<BookingRequirementsUiMessages>

export type BookingRequirementsUiMessageOverrides =
  LocaleMessageOverrides<BookingRequirementsUiMessages>

const bookingRequirementsUiContext = createPackageMessagesContext<BookingRequirementsUiMessages>(
  "BookingRequirementsUiMessages",
)

const defaultBookingRequirementsUiI18n: PackageI18nValue<BookingRequirementsUiMessages> = {
  messages: bookingRequirementsUiEn,
  ...createLocaleFormatters(fallbackLocale),
}

export function resolveBookingRequirementsUiMessages({
  locale,
  overrides,
}: {
  locale: string | null | undefined
  overrides?: BookingRequirementsUiMessageOverrides | null
}) {
  return resolvePackageMessages({
    definitions: bookingRequirementsUiMessageDefinitions,
    fallbackLocale,
    locale,
    overrides,
  })
}

export function getBookingRequirementsUiI18n({
  locale,
  overrides,
}: {
  locale?: string | null | undefined
  overrides?: BookingRequirementsUiMessageOverrides | null
}): PackageI18nValue<BookingRequirementsUiMessages> {
  const resolvedLocale = locale ?? fallbackLocale
  return {
    messages: resolveBookingRequirementsUiMessages({
      locale: resolvedLocale,
      overrides,
    }),
    ...createLocaleFormatters(resolvedLocale),
  }
}

export function BookingRequirementsUiMessagesProvider({
  children,
  locale,
  overrides,
}: {
  children: ReactNode
  locale: string | null | undefined
  overrides?: BookingRequirementsUiMessageOverrides | null
}) {
  return (
    <bookingRequirementsUiContext.ResolvedMessagesProvider
      definitions={bookingRequirementsUiMessageDefinitions}
      fallbackLocale={fallbackLocale}
      locale={locale}
      overrides={overrides}
    >
      {children}
    </bookingRequirementsUiContext.ResolvedMessagesProvider>
  )
}

export const useBookingRequirementsUiI18n = bookingRequirementsUiContext.useI18n
export const useBookingRequirementsUiMessages = bookingRequirementsUiContext.useMessages

export function useBookingRequirementsUiI18nOrDefault() {
  return bookingRequirementsUiContext.useOptionalI18n() ?? defaultBookingRequirementsUiI18n
}

export function useBookingRequirementsUiMessagesOrDefault() {
  return useBookingRequirementsUiI18nOrDefault().messages
}
