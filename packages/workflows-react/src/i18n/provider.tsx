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

import { workflowRunsUiEn } from "./en.js"
import type { WorkflowRunsUiMessages } from "./messages.js"
import { workflowRunsUiRo } from "./ro.js"
import { workflowRunsUiZh } from "./zh.js"

const fallbackLocale = "en"

export const workflowRunsUiMessageDefinitions = {
  en: workflowRunsUiEn,
  ro: workflowRunsUiRo,
  zh: workflowRunsUiZh,
} satisfies LocaleMessageDefinitions<WorkflowRunsUiMessages>

export type WorkflowRunsUiMessageOverrides = LocaleMessageOverrides<WorkflowRunsUiMessages>

const workflowRunsUiContext =
  createPackageMessagesContext<WorkflowRunsUiMessages>("WorkflowRunsUiMessages")

const defaultWorkflowRunsUiI18n: PackageI18nValue<WorkflowRunsUiMessages> = {
  messages: workflowRunsUiEn,
  ...createLocaleFormatters(fallbackLocale),
}

export function resolveWorkflowRunsUiMessages({
  locale,
  overrides,
}: {
  locale: string | null | undefined
  overrides?: WorkflowRunsUiMessageOverrides | null
}) {
  return resolvePackageMessages({
    definitions: workflowRunsUiMessageDefinitions,
    fallbackLocale,
    locale,
    overrides,
  })
}

export function getWorkflowRunsUiI18n({
  locale,
  overrides,
}: {
  locale?: string | null | undefined
  overrides?: WorkflowRunsUiMessageOverrides | null
}): PackageI18nValue<WorkflowRunsUiMessages> {
  const resolvedLocale = locale ?? fallbackLocale
  return {
    messages: resolveWorkflowRunsUiMessages({
      locale: resolvedLocale,
      overrides,
    }),
    ...createLocaleFormatters(resolvedLocale),
  }
}

export function WorkflowRunsUiMessagesProvider({
  children,
  locale,
  overrides,
}: {
  children: ReactNode
  locale: string | null | undefined
  overrides?: WorkflowRunsUiMessageOverrides | null
}) {
  return (
    <workflowRunsUiContext.ResolvedMessagesProvider
      definitions={workflowRunsUiMessageDefinitions}
      fallbackLocale={fallbackLocale}
      locale={locale}
      overrides={overrides}
    >
      {children}
    </workflowRunsUiContext.ResolvedMessagesProvider>
  )
}

export const useWorkflowRunsUiI18n = workflowRunsUiContext.useI18n
export const useWorkflowRunsUiMessages = workflowRunsUiContext.useMessages

export function useWorkflowRunsUiI18nOrDefault() {
  return workflowRunsUiContext.useOptionalI18n() ?? defaultWorkflowRunsUiI18n
}

export function useWorkflowRunsUiMessagesOrDefault() {
  return useWorkflowRunsUiI18nOrDefault().messages
}
