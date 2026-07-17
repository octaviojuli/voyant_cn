"use client"

import {
  createLocaleFormatters,
  createPackageMessagesContext,
  type LocaleMessageDefinitions,
  type PackageI18nValue,
} from "@voyant-travel/i18n"
import type { ReactNode } from "react"

import { type StorefrontMessages, storefrontMessagesEn } from "./messages-en.js"
import { storefrontMessagesRo } from "./messages-ro.js"
import { storefrontMessagesZh } from "./messages-zh.js"

/**
 * Customer-facing messages shared by storefront routes and standalone public
 * pages. Applications select the locale and pass it to the provider.
 *
 * Locale dictionaries live in `./messages-en.ts`, `./messages-ro.ts`, and
 * `./messages-zh.ts`; this module owns the provider, hooks, and locale table.
 */

const fallbackLocale = "en"

export { type StorefrontMessages, storefrontMessagesEn, storefrontMessagesRo, storefrontMessagesZh }

const storefrontMessageDefinitions = {
  en: storefrontMessagesEn,
  ro: storefrontMessagesRo,
  zh: storefrontMessagesZh,
} satisfies LocaleMessageDefinitions<StorefrontMessages>

const storefrontContext = createPackageMessagesContext<StorefrontMessages>("StorefrontMessages")

const defaultStorefrontI18n: PackageI18nValue<StorefrontMessages> = {
  messages: storefrontMessagesEn,
  ...createLocaleFormatters(fallbackLocale),
}

/**
 * Supplies storefront messages without coupling the package to an app locale
 * provider.
 */
export function StorefrontMessagesProvider({
  children,
  locale = fallbackLocale,
}: {
  children: ReactNode
  locale?: string
}) {
  return (
    <storefrontContext.ResolvedMessagesProvider
      definitions={storefrontMessageDefinitions}
      fallbackLocale={fallbackLocale}
      locale={locale}
    >
      {children}
    </storefrontContext.ResolvedMessagesProvider>
  )
}

export const useStorefrontMessages = storefrontContext.useMessages

export function useStorefrontMessagesOrDefault(): StorefrontMessages {
  return storefrontContext.useOptionalI18n()?.messages ?? defaultStorefrontI18n.messages
}
