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

import { notificationsUiEn } from "./en.js"
import type { NotificationsUiMessages } from "./messages.js"
import { notificationsUiRo } from "./ro.js"
import { notificationsUiZh } from "./zh.js"

const fallbackLocale = "en"

export const notificationsUiMessageDefinitions = {
  en: notificationsUiEn,
  ro: notificationsUiRo,
  zh: notificationsUiZh,
} satisfies LocaleMessageDefinitions<NotificationsUiMessages>

export type NotificationsUiMessageOverrides = LocaleMessageOverrides<NotificationsUiMessages>

const notificationsUiContext =
  createPackageMessagesContext<NotificationsUiMessages>("NotificationsUiMessages")

const defaultNotificationsUiI18n: PackageI18nValue<NotificationsUiMessages> = {
  messages: notificationsUiEn,
  ...createLocaleFormatters(fallbackLocale),
}

export function resolveNotificationsUiMessages({
  locale,
  overrides,
}: {
  locale: string | null | undefined
  overrides?: NotificationsUiMessageOverrides | null
}) {
  return resolvePackageMessages({
    definitions: notificationsUiMessageDefinitions,
    fallbackLocale,
    locale,
    overrides,
  })
}

export function getNotificationsUiI18n({
  locale,
  overrides,
}: {
  locale?: string | null | undefined
  overrides?: NotificationsUiMessageOverrides | null
}): PackageI18nValue<NotificationsUiMessages> {
  const resolvedLocale = locale ?? fallbackLocale
  return {
    messages: resolveNotificationsUiMessages({
      locale: resolvedLocale,
      overrides,
    }),
    ...createLocaleFormatters(resolvedLocale),
  }
}

export function NotificationsUiMessagesProvider({
  children,
  locale,
  overrides,
}: {
  children: ReactNode
  locale: string | null | undefined
  overrides?: NotificationsUiMessageOverrides | null
}) {
  return (
    <notificationsUiContext.ResolvedMessagesProvider
      definitions={notificationsUiMessageDefinitions}
      fallbackLocale={fallbackLocale}
      locale={locale}
      overrides={overrides}
    >
      {children}
    </notificationsUiContext.ResolvedMessagesProvider>
  )
}

export const useNotificationsUiI18n = notificationsUiContext.useI18n
export const useNotificationsUiMessages = notificationsUiContext.useMessages

export function useNotificationsUiI18nOrDefault() {
  return notificationsUiContext.useOptionalI18n() ?? defaultNotificationsUiI18n
}

export function useNotificationsUiMessagesOrDefault() {
  return useNotificationsUiI18nOrDefault().messages
}
