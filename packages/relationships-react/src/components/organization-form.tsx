"use client"

import {
  type AddressRecord,
  type ContactPointRecord,
  useAddresses,
  useAddressMutation,
  useContactPointMutation,
  useContactPoints,
} from "@voyant-travel/identity-react"
import { Button } from "@voyant-travel/ui/components/button"
import { CountryCombobox } from "@voyant-travel/ui/components/country-combobox"
import { Input } from "@voyant-travel/ui/components/input"
import { Label } from "@voyant-travel/ui/components/label"
import { Loader2 } from "lucide-react"
import * as React from "react"
import { useCrmUiMessagesOrDefault } from "../i18n/index.js"
import {
  type CreateOrganizationInput,
  type OrganizationRecord,
  useOrganizationMutation,
} from "../index.js"

type Mode = { kind: "create" } | { kind: "edit"; organization: OrganizationRecord }

export interface OrganizationFormProps {
  mode: Mode
  onSuccess?: (organization: OrganizationRecord) => void
  onCancel?: () => void
}

interface FormState {
  name: string
  legalName: string
  taxId: string
  website: string
  industry: string
  billingEmail: string
  billingAddressLine1: string
  billingAddressLine2: string
  billingCity: string
  billingRegion: string
  billingPostalCode: string
  billingCountry: string
}

function initialState(mode: Mode): FormState {
  if (mode.kind === "edit") {
    const org = mode.organization
    return {
      name: org.name,
      legalName: org.legalName ?? "",
      taxId: org.taxId ?? "",
      website: org.website ?? "",
      industry: org.industry ?? "",
      billingEmail: "",
      billingAddressLine1: "",
      billingAddressLine2: "",
      billingCity: "",
      billingRegion: "",
      billingPostalCode: "",
      billingCountry: "",
    }
  }

  return {
    name: "",
    legalName: "",
    taxId: "",
    website: "",
    industry: "",
    billingEmail: "",
    billingAddressLine1: "",
    billingAddressLine2: "",
    billingCity: "",
    billingRegion: "",
    billingPostalCode: "",
    billingCountry: "",
  }
}

function toPayload(state: FormState): CreateOrganizationInput {
  return {
    name: state.name.trim(),
    legalName: state.legalName.trim() || null,
    taxId: state.taxId.trim() || null,
    website: state.website.trim() || null,
    industry: state.industry.trim() || null,
  }
}

function findBillingEmail(
  points: ContactPointRecord[] | undefined,
): ContactPointRecord | undefined {
  return (
    points?.find((point) => point.label === "billing") ?? points?.find((point) => point.isPrimary)
  )
}

function findBillingAddress(addresses: AddressRecord[] | undefined): AddressRecord | undefined {
  return (
    addresses?.find((address) => address.label === "billing") ??
    addresses?.find((address) => address.isPrimary)
  )
}

function hasBillingAddress(state: FormState): boolean {
  return [
    state.billingAddressLine1,
    state.billingAddressLine2,
    state.billingCity,
    state.billingRegion,
    state.billingPostalCode,
    state.billingCountry,
  ].some((value) => Boolean(value.trim()))
}

function formatBillingAddress(state: FormState): string | null {
  const fullText = [
    state.billingAddressLine1,
    state.billingAddressLine2,
    state.billingCity,
    state.billingRegion,
    state.billingPostalCode,
    state.billingCountry,
  ]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(", ")
  return fullText || null
}

export function OrganizationForm({ mode, onSuccess, onCancel }: OrganizationFormProps) {
  const [state, setState] = React.useState<FormState>(() => initialState(mode))
  const [error, setError] = React.useState<string | null>(null)
  const { create, update } = useOrganizationMutation()
  const contactPointMutation = useContactPointMutation()
  const addressMutation = useAddressMutation()
  const messages = useCrmUiMessagesOrDefault()
  const editOrganizationId = mode.kind === "edit" ? mode.organization.id : undefined

  const billingEmailQuery = useContactPoints({
    entityType: "organization",
    entityId: editOrganizationId,
    kind: "email",
    enabled: Boolean(editOrganizationId),
  })
  const billingAddressQuery = useAddresses({
    entityType: "organization",
    entityId: editOrganizationId,
    label: "billing",
    enabled: Boolean(editOrganizationId),
  })

  const existingBillingEmail = React.useMemo(
    () => findBillingEmail(billingEmailQuery.data?.data),
    [billingEmailQuery.data?.data],
  )
  const existingBillingAddress = React.useMemo(
    () => findBillingAddress(billingAddressQuery.data?.data),
    [billingAddressQuery.data?.data],
  )

  React.useEffect(() => {
    if (!existingBillingEmail) return
    setState((prev) => ({ ...prev, billingEmail: existingBillingEmail.value }))
  }, [existingBillingEmail])

  React.useEffect(() => {
    if (!existingBillingAddress) return
    setState((prev) => ({
      ...prev,
      billingAddressLine1: existingBillingAddress.line1 ?? "",
      billingAddressLine2: existingBillingAddress.line2 ?? "",
      billingCity: existingBillingAddress.city ?? "",
      billingRegion: existingBillingAddress.region ?? "",
      billingPostalCode: existingBillingAddress.postalCode ?? "",
      billingCountry: existingBillingAddress.country ?? "",
    }))
  }, [existingBillingAddress])

  const isSubmitting =
    create.isPending ||
    update.isPending ||
    contactPointMutation.create.isPending ||
    contactPointMutation.update.isPending ||
    addressMutation.create.isPending ||
    addressMutation.update.isPending

  const field =
    <K extends keyof FormState>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setState((prev) => ({ ...prev, [key]: e.target.value }))
    }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!state.name.trim()) {
      setError(messages.organizationForm.validation.nameRequired)
      return
    }

    const payload = toPayload(state)

    try {
      const organization =
        mode.kind === "create"
          ? await create.mutateAsync(payload)
          : await update.mutateAsync({ id: mode.organization.id, input: payload })
      const billingEmail = state.billingEmail.trim()
      if (billingEmail) {
        const input = {
          entityType: "organization",
          entityId: organization.id,
          kind: "email" as const,
          label: "billing",
          value: billingEmail,
          normalizedValue: billingEmail.toLowerCase(),
          isPrimary: true,
        }
        if (existingBillingEmail) {
          await contactPointMutation.update.mutateAsync({
            id: existingBillingEmail.id,
            input,
          })
        } else {
          await contactPointMutation.create.mutateAsync(input)
        }
      }

      if (hasBillingAddress(state)) {
        const input = {
          entityType: "organization",
          entityId: organization.id,
          label: "billing" as const,
          fullText: formatBillingAddress(state),
          line1: state.billingAddressLine1.trim() || null,
          line2: state.billingAddressLine2.trim() || null,
          city: state.billingCity.trim() || null,
          region: state.billingRegion.trim() || null,
          postalCode: state.billingPostalCode.trim() || null,
          country: state.billingCountry.trim() || null,
          isPrimary: true,
        }
        if (existingBillingAddress) {
          await addressMutation.update.mutateAsync({
            id: existingBillingAddress.id,
            input,
          })
        } else {
          await addressMutation.create.mutateAsync(input)
        }
      }

      onSuccess?.(organization)
    } catch (err) {
      setError(err instanceof Error ? err.message : messages.organizationForm.validation.saveFailed)
    }
  }

  return (
    <form data-slot="organization-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="organization-name">{messages.organizationForm.fields.name}</Label>
          <Input id="organization-name" required value={state.name} onChange={field("name")} />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="organization-legal-name">
            {messages.organizationForm.fields.legalName}
          </Label>
          <Input
            id="organization-legal-name"
            value={state.legalName}
            onChange={field("legalName")}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="organization-tax-id">{messages.organizationForm.fields.taxId}</Label>
          <Input id="organization-tax-id" value={state.taxId} onChange={field("taxId")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="organization-website">{messages.organizationForm.fields.website}</Label>
          <Input
            id="organization-website"
            type="url"
            value={state.website}
            onChange={field("website")}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="organization-industry">{messages.organizationForm.fields.industry}</Label>
          <Input id="organization-industry" value={state.industry} onChange={field("industry")} />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="organization-billing-email">
            {messages.organizationForm.fields.billingEmail}
          </Label>
          <Input
            id="organization-billing-email"
            type="email"
            value={state.billingEmail}
            onChange={field("billingEmail")}
          />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="organization-billing-address-line-1">
            {messages.organizationForm.fields.billingAddressLine1}
          </Label>
          <Input
            id="organization-billing-address-line-1"
            value={state.billingAddressLine1}
            onChange={field("billingAddressLine1")}
          />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="organization-billing-address-line-2">
            {messages.organizationForm.fields.billingAddressLine2}
          </Label>
          <Input
            id="organization-billing-address-line-2"
            value={state.billingAddressLine2}
            onChange={field("billingAddressLine2")}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="organization-billing-city">
            {messages.organizationForm.fields.billingCity}
          </Label>
          <Input
            id="organization-billing-city"
            value={state.billingCity}
            onChange={field("billingCity")}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="organization-billing-region">
            {messages.organizationForm.fields.billingRegion}
          </Label>
          <Input
            id="organization-billing-region"
            value={state.billingRegion}
            onChange={field("billingRegion")}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="organization-billing-postal-code">
            {messages.organizationForm.fields.billingPostalCode}
          </Label>
          <Input
            id="organization-billing-postal-code"
            value={state.billingPostalCode}
            onChange={field("billingPostalCode")}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="organization-billing-country">
            {messages.organizationForm.fields.billingCountry}
          </Label>
          <CountryCombobox
            messages={messages.common.countryCombobox}
            value={state.billingCountry || null}
            onChange={(code) => setState((prev) => ({ ...prev, billingCountry: code ?? "" }))}
          />
        </div>
      </div>

      {error ? (
        <p data-slot="organization-form-error" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
            {messages.common.cancel}
          </Button>
        ) : null}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
              {messages.common.saving}
            </>
          ) : mode.kind === "create" ? (
            messages.organizationForm.actions.create
          ) : (
            messages.common.saveChanges
          )}
        </Button>
      </div>
    </form>
  )
}
