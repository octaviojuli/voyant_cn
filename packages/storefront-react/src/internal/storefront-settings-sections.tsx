import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
} from "@voyant-travel/ui/components"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@voyant-travel/ui/components/field"
import { PhoneInput } from "@voyant-travel/ui/components/phone-input"
import { Skeleton } from "@voyant-travel/ui/components/skeleton"
import { AlertCircle, Plus, Trash2 } from "lucide-react"

import { useStorefrontSettingsUiMessagesOrDefault } from "../i18n/provider.js"
import {
  type FormState,
  loadingSectionKeys,
  nextSupportLinkKey,
  type SupportLinkRow,
} from "./storefront-settings-form.js"

type SetField = <K extends keyof FormState>(key: K, value: FormState[K]) => void

interface SettingsSectionProps {
  form: FormState
  setField: SetField
}

interface SupportSectionProps extends SettingsSectionProps {
  updateSupportLink: (rowKey: string, patch: Partial<SupportLinkRow>) => void
}

export function StorefrontSettingsLoadingSections() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {loadingSectionKeys.map((key) => (
        <Card key={key}>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function StorefrontSettingsErrorState({
  error,
  refetch,
}: {
  error: unknown
  refetch: () => void
}) {
  const t = useStorefrontSettingsUiMessagesOrDefault().loadError
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="size-5 text-destructive" />
          {t.title}
        </CardTitle>
        <CardDescription>{error instanceof Error ? error.message : t.fallbackBody}</CardDescription>
      </CardHeader>
      <CardFooter>
        <Button type="button" variant="outline" onClick={refetch}>
          {t.retry}
        </Button>
      </CardFooter>
    </Card>
  )
}

export function BrandingSection({ form, setField }: SettingsSectionProps) {
  const t = useStorefrontSettingsUiMessagesOrDefault().branding
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="storefront-logo-url">{t.logoUrl}</FieldLabel>
            <Input
              id="storefront-logo-url"
              value={form.logoUrl}
              onChange={(event) => setField("logoUrl", event.target.value)}
              placeholder={t.logoUrlPlaceholder}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="storefront-favicon-url">{t.faviconUrl}</FieldLabel>
              <Input
                id="storefront-favicon-url"
                value={form.faviconUrl}
                onChange={(event) => setField("faviconUrl", event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="storefront-brand-mark-url">{t.brandMarkUrl}</FieldLabel>
              <Input
                id="storefront-brand-mark-url"
                value={form.brandMarkUrl}
                onChange={(event) => setField("brandMarkUrl", event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="storefront-primary-color">{t.primaryColor}</FieldLabel>
              <Input
                id="storefront-primary-color"
                value={form.primaryColor}
                onChange={(event) => setField("primaryColor", event.target.value)}
                placeholder={t.primaryColorPlaceholder}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="storefront-accent-color">{t.accentColor}</FieldLabel>
              <Input
                id="storefront-accent-color"
                value={form.accentColor}
                onChange={(event) => setField("accentColor", event.target.value)}
                placeholder={t.accentColorPlaceholder}
              />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="storefront-supported-languages">{t.supportedLanguages}</FieldLabel>
            <Input
              id="storefront-supported-languages"
              value={form.supportedLanguages}
              onChange={(event) => setField("supportedLanguages", event.target.value)}
              placeholder={t.supportedLanguagesPlaceholder}
            />
            <FieldDescription>{t.supportedLanguagesHint}</FieldDescription>
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}

export function SupportSection({ form, setField, updateSupportLink }: SupportSectionProps) {
  const t = useStorefrontSettingsUiMessagesOrDefault().support
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="storefront-support-email">{t.email}</FieldLabel>
              <Input
                id="storefront-support-email"
                type="email"
                value={form.supportEmail}
                onChange={(event) => setField("supportEmail", event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="storefront-support-phone">{t.phone}</FieldLabel>
              <PhoneInput
                id="storefront-support-phone"
                value={form.supportPhone ?? ""}
                onChange={(value) => setField("supportPhone", value)}
              />
            </Field>
          </div>
          <FieldSet>
            <FieldLegend>{t.contactLinks}</FieldLegend>
            <div className="space-y-2">
              {form.supportLinks.map((link) => (
                <div
                  key={link.rowKey}
                  className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
                >
                  <Input
                    value={link.label}
                    onChange={(event) =>
                      updateSupportLink(link.rowKey, { label: event.target.value })
                    }
                    placeholder={t.linkLabelPlaceholder}
                    aria-label={t.linkLabelAria}
                  />
                  <Input
                    value={link.url}
                    onChange={(event) =>
                      updateSupportLink(link.rowKey, { url: event.target.value })
                    }
                    placeholder={t.linkUrlPlaceholder}
                    aria-label={t.linkUrlAria}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setField(
                        "supportLinks",
                        form.supportLinks.filter((row) => row.rowKey !== link.rowKey),
                      )
                    }
                    aria-label={t.removeLinkAria}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setField("supportLinks", [
                    ...form.supportLinks,
                    { rowKey: nextSupportLinkKey(), label: "", url: "" },
                  ])
                }
              >
                <Plus className="size-4" />
                {t.addLink}
              </Button>
            </div>
          </FieldSet>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}

export function LegalLocalizationSection({ form, setField }: SettingsSectionProps) {
  const t = useStorefrontSettingsUiMessagesOrDefault().legalLocalization
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="storefront-terms-url">{t.termsUrl}</FieldLabel>
              <Input
                id="storefront-terms-url"
                value={form.termsUrl}
                onChange={(event) => setField("termsUrl", event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="storefront-privacy-url">{t.privacyUrl}</FieldLabel>
              <Input
                id="storefront-privacy-url"
                value={form.privacyUrl}
                onChange={(event) => setField("privacyUrl", event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="storefront-cancellation-url">{t.cancellationUrl}</FieldLabel>
              <Input
                id="storefront-cancellation-url"
                value={form.cancellationUrl}
                onChange={(event) => setField("cancellationUrl", event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="storefront-contract-template">{t.contractTemplateId}</FieldLabel>
              <Input
                id="storefront-contract-template"
                value={form.defaultContractTemplateId}
                onChange={(event) => setField("defaultContractTemplateId", event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="storefront-default-locale">{t.defaultLocale}</FieldLabel>
              <Input
                id="storefront-default-locale"
                value={form.defaultLocale}
                onChange={(event) => setField("defaultLocale", event.target.value)}
                placeholder={t.defaultLocalePlaceholder}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="storefront-currency-display">{t.currencyDisplay}</FieldLabel>
              <select
                id="storefront-currency-display"
                className="h-9 rounded-md border bg-background px-3 text-sm"
                value={form.currencyDisplay}
                onChange={(event) =>
                  setField("currencyDisplay", event.target.value as FormState["currencyDisplay"])
                }
              >
                <option value="code">{t.currencyDisplayLabels.code}</option>
                <option value="symbol">{t.currencyDisplayLabels.symbol}</option>
                <option value="name">{t.currencyDisplayLabels.name}</option>
              </select>
            </Field>
          </div>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}

export function StorefrontSettingsSaveError({
  localError,
  mutationError,
}: {
  localError: string | null
  mutationError: unknown
}) {
  const t = useStorefrontSettingsUiMessagesOrDefault().save
  if (!localError && !mutationError) return null

  return (
    <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
      {localError ?? (mutationError instanceof Error ? mutationError.message : t.fallbackError)}
    </p>
  )
}
