"use client"

import {
  createLocaleFormatters,
  createPackageMessagesContext,
  type LocaleMessageDefinitions,
  type PackageI18nValue,
} from "@voyant-travel/i18n"
import type { ReactNode } from "react"

export type EventCatalogUiMessages = {
  navigation: { title: string }
  page: {
    title: string
    selectedContracts: string
    selectedContractsLoading: string
    requestFailed: string
    requestFailedWithStatus: string
    eventsLabel: string
    contractLabel: string
    filterLabel: string
    filterPlaceholder: string
    loading: string
    noMatchingEvents: string
    owner: string
    sourceModule: string
    visibility: string
    category: string
    redactedFields: string
    noneDeclared: string
    payloadSchema: string
  }
}

export const eventCatalogUiEn: EventCatalogUiMessages = {
  navigation: { title: "Event catalog" },
  page: {
    title: "Event catalog",
    selectedContracts: "{count} selected event contracts",
    selectedContractsLoading: "Selected event contracts",
    requestFailed: "Event catalog request failed",
    requestFailedWithStatus: "Event catalog request failed ({status})",
    eventsLabel: "Events",
    contractLabel: "Event contract",
    filterLabel: "Filter events",
    filterPlaceholder: "Filter events",
    loading: "Loading...",
    noMatchingEvents: "No matching events.",
    owner: "Owner",
    sourceModule: "Source module",
    visibility: "Visibility",
    category: "Category",
    redactedFields: "Redacted fields",
    noneDeclared: "None declared.",
    payloadSchema: "Payload schema",
  },
}

export const eventCatalogUiZh: EventCatalogUiMessages = {
  navigation: { title: "事件目录" },
  page: {
    title: "事件目录",
    selectedContracts: "已选定 {count} 个事件契约",
    selectedContractsLoading: "已选定的事件契约",
    requestFailed: "事件目录请求失败",
    requestFailedWithStatus: "事件目录请求失败（{status}）",
    eventsLabel: "事件",
    contractLabel: "事件契约",
    filterLabel: "筛选事件",
    filterPlaceholder: "筛选事件",
    loading: "加载中…",
    noMatchingEvents: "没有匹配的事件。",
    owner: "归属",
    sourceModule: "来源模块",
    visibility: "可见性",
    category: "类别",
    redactedFields: "已脱敏字段",
    noneDeclared: "未声明。",
    payloadSchema: "载荷 Schema",
  },
}

const fallbackLocale = "en"

// Locale resolution happens in the shared runtime (`resolveLocaleMessages`),
// which tries the exact tag first and then the primary subtag, so regional
// tags such as "zh-CN" fall back to the "zh" definition registered here.
export const eventCatalogMessageDefinitions = {
  en: eventCatalogUiEn,
  zh: eventCatalogUiZh,
} satisfies LocaleMessageDefinitions<EventCatalogUiMessages>

const eventCatalogUiContext =
  createPackageMessagesContext<EventCatalogUiMessages>("EventCatalogUiMessages")

const defaultEventCatalogUiI18n: PackageI18nValue<EventCatalogUiMessages> = {
  messages: eventCatalogUiEn,
  ...createLocaleFormatters(fallbackLocale),
}

export function EventCatalogUiMessagesProvider({
  children,
  locale,
}: {
  children: ReactNode
  locale: string | null | undefined
}) {
  return (
    <eventCatalogUiContext.ResolvedMessagesProvider
      definitions={eventCatalogMessageDefinitions}
      fallbackLocale={fallbackLocale}
      locale={locale}
    >
      {children}
    </eventCatalogUiContext.ResolvedMessagesProvider>
  )
}

export function useEventCatalogUiMessagesOrDefault(): EventCatalogUiMessages {
  return eventCatalogUiContext.useOptionalMessages() ?? defaultEventCatalogUiI18n.messages
}
