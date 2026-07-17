"use client"

import { consumeAdminSetupPrefill } from "@voyant-travel/admin"
import { cn } from "@voyant-travel/ui/lib/utils"
import { useEffect, useMemo, useState } from "react"
import { useStorefrontSettingsUiMessagesOrDefault } from "../i18n/provider.js"
import { useAdminStorefrontSettings, useAdminStorefrontSettingsMutation } from "../index.js"

import {
  emptyForm,
  type FormState,
  hasEmptySettings,
  type SupportLinkRow,
  toFormState,
  toPayload,
  validateForm,
} from "../internal/storefront-settings-form.js"
import {
  PaymentSection,
  StorefrontSettingsSaveButton,
} from "../internal/storefront-settings-payment-section.js"
import {
  BrandingSection,
  LegalLocalizationSection,
  StorefrontSettingsErrorState,
  StorefrontSettingsLoadingSections,
  StorefrontSettingsSaveError,
  SupportSection,
} from "../internal/storefront-settings-sections.js"
import {
  mergeStorefrontSetupPrefill,
  STOREFRONT_BRANDING_SETUP_STEP_ID,
} from "../internal/storefront-setup-prefill.js"

export interface StorefrontSettingsPageProps {
  className?: string
}

export function StorefrontSettingsPage({ className }: StorefrontSettingsPageProps) {
  const messages = useStorefrontSettingsUiMessagesOrDefault()
  const settingsQuery = useAdminStorefrontSettings()
  const mutation = useAdminStorefrontSettingsMutation()
  const [form, setForm] = useState<FormState>(emptyForm)
  const [localError, setLocalError] = useState<string | null>(null)
  const [setupPrefill] = useState(() => consumeAdminSetupPrefill(STOREFRONT_BRANDING_SETUP_STEP_ID))

  useEffect(() => {
    if (settingsQuery.data?.data) {
      setForm(mergeStorefrontSetupPrefill(toFormState(settingsQuery.data.data), setupPrefill))
      setLocalError(null)
    }
  }, [settingsQuery.data?.data, setupPrefill])

  const isEmpty = useMemo(() => hasEmptySettings(settingsQuery.data?.data), [settingsQuery.data])
  const isSaving = mutation.isPending

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const updateSupportLink = (rowKey: string, patch: Partial<SupportLinkRow>) => {
    setForm((prev) => ({
      ...prev,
      supportLinks: prev.supportLinks.map((link) =>
        link.rowKey === rowKey ? { ...link, ...patch } : link,
      ),
    }))
  }

  const save = async () => {
    const validationError = validateForm(form, messages.validation)
    setLocalError(validationError)
    if (validationError) return

    await mutation.mutateAsync(toPayload(form))
  }

  return (
    <div data-slot="storefront-settings-page" className={cn("flex flex-col gap-6 p-6", className)}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{messages.page.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{messages.page.intro}</p>
      </div>

      {settingsQuery.isLoading ? (
        <StorefrontSettingsLoadingSections />
      ) : settingsQuery.isError ? (
        <StorefrontSettingsErrorState
          error={settingsQuery.error}
          refetch={() => void settingsQuery.refetch()}
        />
      ) : (
        <>
          {isEmpty ? (
            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              {messages.page.emptyNotice}
            </p>
          ) : null}

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <BrandingSection form={form} setField={setField} />
            <SupportSection form={form} setField={setField} updateSupportLink={updateSupportLink} />
            <LegalLocalizationSection form={form} setField={setField} />
            <PaymentSection form={form} setField={setField} />
          </div>

          <StorefrontSettingsSaveError localError={localError} mutationError={mutation.error} />
          <StorefrontSettingsSaveButton isSaving={isSaving} save={() => void save()} />
        </>
      )}
    </div>
  )
}
