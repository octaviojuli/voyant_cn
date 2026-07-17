"use client"

import {
  createPackageMessagesContext,
  type LocaleMessageDefinitions,
  type LocaleMessageOverrides,
} from "@voyant-travel/i18n"
import type { ReactNode } from "react"

import { navigationPreferencesEn } from "./en.js"
import type { NavigationPreferencesMessages } from "./messages.js"
import { navigationPreferencesRo } from "./ro.js"
import { navigationPreferencesZh } from "./zh.js"

export const navigationPreferencesMessageDefinitions = {
  en: navigationPreferencesEn,
  ro: navigationPreferencesRo,
  zh: navigationPreferencesZh,
} satisfies LocaleMessageDefinitions<NavigationPreferencesMessages>

export type NavigationPreferencesMessageOverrides =
  LocaleMessageOverrides<NavigationPreferencesMessages>

const context = createPackageMessagesContext<NavigationPreferencesMessages>(
  "NavigationPreferencesMessages",
)

export function NavigationPreferencesMessagesProvider({
  children,
  locale,
  overrides,
}: {
  children: ReactNode
  locale: string | null | undefined
  overrides?: NavigationPreferencesMessageOverrides | null
}) {
  return (
    <context.ResolvedMessagesProvider
      definitions={navigationPreferencesMessageDefinitions}
      fallbackLocale="en"
      locale={locale}
      overrides={overrides}
    >
      {children}
    </context.ResolvedMessagesProvider>
  )
}

export const useNavigationPreferencesMessages = context.useMessages
