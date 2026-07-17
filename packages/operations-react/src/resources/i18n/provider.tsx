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

import { resourcesUiEn } from "./en.js"
import type { ResourcesUiMessages } from "./messages.js"
import { resourcesUiRo } from "./ro.js"
import { resourcesUiZh } from "./zh.js"

const fallbackLocale = "en"

export const resourcesUiMessageDefinitions = {
  en: resourcesUiEn,
  ro: resourcesUiRo,
  zh: resourcesUiZh,
} satisfies LocaleMessageDefinitions<ResourcesUiMessages>

export type ResourcesUiMessageOverrides = LocaleMessageOverrides<ResourcesUiMessages>

const resourcesUiContext = createPackageMessagesContext<ResourcesUiMessages>("ResourcesUiMessages")

const defaultResourcesUiI18n: PackageI18nValue<ResourcesUiMessages> = {
  messages: resourcesUiEn,
  ...createLocaleFormatters(fallbackLocale),
}

export function resolveResourcesUiMessages({
  locale,
  overrides,
}: {
  locale: string | null | undefined
  overrides?: ResourcesUiMessageOverrides | null
}) {
  return resolvePackageMessages({
    definitions: resourcesUiMessageDefinitions,
    fallbackLocale,
    locale,
    overrides,
  })
}

export function getResourcesUiI18n({
  locale,
  overrides,
}: {
  locale?: string | null | undefined
  overrides?: ResourcesUiMessageOverrides | null
}): PackageI18nValue<ResourcesUiMessages> {
  const resolvedLocale = locale ?? fallbackLocale
  return {
    messages: resolveResourcesUiMessages({
      locale: resolvedLocale,
      overrides,
    }),
    ...createLocaleFormatters(resolvedLocale),
  }
}

export function ResourcesUiMessagesProvider({
  children,
  locale,
  overrides,
}: {
  children: ReactNode
  locale: string | null | undefined
  overrides?: ResourcesUiMessageOverrides | null
}) {
  return (
    <resourcesUiContext.ResolvedMessagesProvider
      definitions={resourcesUiMessageDefinitions}
      fallbackLocale={fallbackLocale}
      locale={locale}
      overrides={overrides}
    >
      {children}
    </resourcesUiContext.ResolvedMessagesProvider>
  )
}

export const useResourcesUiI18n = resourcesUiContext.useI18n
export const useResourcesUiMessages = resourcesUiContext.useMessages

export function useResourcesUiI18nOrDefault() {
  return resourcesUiContext.useOptionalI18n() ?? defaultResourcesUiI18n
}

export function useResourcesUiMessagesOrDefault() {
  return useResourcesUiI18nOrDefault().messages
}
