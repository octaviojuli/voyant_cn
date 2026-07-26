"use client"

import { type AddressRecord, useAddresses, useAddressMutation } from "@voyant-travel/identity-react"
import { Badge } from "@voyant-travel/ui/components/badge"
import { Button } from "@voyant-travel/ui/components/button"
import { CountryCombobox } from "@voyant-travel/ui/components/country-combobox"
import { Input } from "@voyant-travel/ui/components/input"
import { Label } from "@voyant-travel/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@voyant-travel/ui/components/select"
import { Switch } from "@voyant-travel/ui/components/switch"
import { Textarea } from "@voyant-travel/ui/components/textarea"
import { Loader2, MapPin, Pencil, Plus, Trash2, X } from "lucide-react"
import * as React from "react"

import { useCrmUiMessagesOrDefault } from "../i18n/index.js"

const ADDRESS_LABELS = [
  "primary",
  "billing",
  "shipping",
  "mailing",
  "meeting",
  "service",
  "legal",
  "other",
] as const

type AddressLabel = (typeof ADDRESS_LABELS)[number]
type AddressTextParts = Pick<
  AddressRecord,
  "fullText" | "line1" | "line2" | "city" | "region" | "postalCode" | "country"
>

type AddressFormState = {
  label: AddressLabel
  line1: string
  line2: string
  city: string
  region: string
  postalCode: string
  country: string | null
  isPrimary: boolean
  notes: string
}

function emptyAddressFormState(): AddressFormState {
  return {
    label: "primary",
    line1: "",
    line2: "",
    city: "",
    region: "",
    postalCode: "",
    country: null,
    isPrimary: false,
    notes: "",
  }
}

function fromRecord(address: AddressRecord): AddressFormState {
  return {
    label: (ADDRESS_LABELS as readonly string[]).includes(address.label ?? "")
      ? (address.label as AddressLabel)
      : "other",
    line1: address.line1 ?? "",
    line2: address.line2 ?? "",
    city: address.city ?? "",
    region: address.region ?? "",
    postalCode: address.postalCode ?? "",
    country: address.country ?? null,
    isPrimary: address.isPrimary,
    notes: address.notes ?? "",
  }
}

function normalizeNullable(value: string): string | null {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function formatAddressText(address: AddressTextParts): string | null {
  if (address.fullText?.trim()) return address.fullText.trim()
  const locality = [address.city, address.region, address.postalCode]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ")
  const parts = [address.line1, address.line2, locality || null, address.country]
    .map((part) => part?.trim())
    .filter(Boolean)
  return parts.length > 0 ? parts.join(", ") : null
}

type EditState = { kind: "closed" } | { kind: "create" } | { kind: "edit"; id: string }

export interface PersonAddressesSectionProps {
  personId: string
}

/**
 * Multi-address management for a Person — inline list with expand-to-edit.
 * Renders inside a Sheet, so add/edit are inline expanding forms rather
 * than nested dialogs.
 */
export function PersonAddressesSection({ personId }: PersonAddressesSectionProps) {
  const messages = useCrmUiMessagesOrDefault()
  const labels = messages.personForm.addresses
  const addressQuery = useAddresses({ entityType: "person", entityId: personId })
  const mutation = useAddressMutation()
  const [editing, setEditing] = React.useState<EditState>({ kind: "closed" })

  const addresses = addressQuery.data?.data ?? []
  const sorted = React.useMemo(
    () =>
      [...addresses].sort((left, right) => {
        if (left.isPrimary === right.isPrimary) {
          return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
        }
        return left.isPrimary ? -1 : 1
      }),
    [addresses],
  )

  const handleSubmit = async (form: AddressFormState) => {
    const payload = {
      entityType: "person",
      entityId: personId,
      label: form.label,
      line1: normalizeNullable(form.line1),
      line2: normalizeNullable(form.line2),
      city: normalizeNullable(form.city),
      region: normalizeNullable(form.region),
      postalCode: normalizeNullable(form.postalCode),
      country: form.country?.trim() ? form.country.trim().toUpperCase() : null,
      isPrimary: form.isPrimary,
      notes: normalizeNullable(form.notes),
      fullText: null as string | null,
    }
    payload.fullText = formatAddressText(payload) ?? null

    if (editing.kind === "edit") {
      await mutation.update.mutateAsync({ id: editing.id, input: payload })
    } else {
      await mutation.create.mutateAsync(payload)
    }
    setEditing({ kind: "closed" })
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">
          {messages.personForm.sections.addresses}
        </h3>
        {editing.kind === "closed" ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEditing({ kind: "create" })}
          >
            <Plus className="mr-1 size-3.5" />
            {labels.add}
          </Button>
        ) : null}
      </div>

      {addressQuery.isPending ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {labels.saving}
        </div>
      ) : sorted.length === 0 && editing.kind === "closed" ? (
        <p className="text-sm text-muted-foreground">{labels.empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sorted.map((address) => {
            const isEditingThis = editing.kind === "edit" && editing.id === address.id
            const formatted = formatAddressText(address)
            const typeLabel = addressLabelText(address.label as AddressLabel, labels)
            return (
              <li key={address.id} className="rounded-md border">
                <div className="flex items-start justify-between gap-3 p-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px]">
                        {typeLabel}
                      </Badge>
                      {address.isPrimary ? (
                        <Badge variant="secondary" className="text-[10px]">
                          {labels.primaryToggle}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="flex items-start gap-1.5 text-sm">
                      <MapPin
                        className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <p className="truncate">{formatted ?? labels.noValue}</p>
                        {address.notes ? (
                          <p className="text-xs text-muted-foreground">{address.notes}</p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7"
                      onClick={() =>
                        setEditing(
                          isEditingThis ? { kind: "closed" } : { kind: "edit", id: address.id },
                        )
                      }
                      aria-label={labels.edit}
                    >
                      {isEditingThis ? <X className="size-3.5" /> : <Pencil className="size-3.5" />}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-destructive"
                      onClick={() => mutation.remove.mutate(address.id)}
                      disabled={mutation.remove.isPending}
                      aria-label={labels.remove}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
                {isEditingThis ? (
                  <div className="border-t p-3">
                    <AddressInlineForm
                      initial={fromRecord(address)}
                      pending={mutation.update.isPending}
                      submitLabel={labels.edit}
                      onCancel={() => setEditing({ kind: "closed" })}
                      onSubmit={handleSubmit}
                    />
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}

      {editing.kind === "create" ? (
        <div className="rounded-md border bg-muted/30 p-3">
          <AddressInlineForm
            initial={emptyAddressFormState()}
            pending={mutation.create.isPending}
            submitLabel={labels.add}
            onCancel={() => setEditing({ kind: "closed" })}
            onSubmit={handleSubmit}
          />
        </div>
      ) : null}
    </section>
  )
}

function addressLabelText(
  label: AddressLabel,
  labels: ReturnType<typeof useCrmUiMessagesOrDefault>["personForm"]["addresses"],
): string {
  switch (label) {
    case "primary":
      return labels.typePrimary
    case "billing":
      return labels.typeBilling
    case "shipping":
      return labels.typeShipping
    case "mailing":
      return labels.typeMailing
    case "meeting":
      return labels.typeMeeting
    case "service":
      return labels.typeService
    case "legal":
      return labels.typeLegal
    case "other":
      return labels.typeOther
    default:
      return label
  }
}

function AddressInlineForm({
  initial,
  pending,
  submitLabel,
  onCancel,
  onSubmit,
}: {
  initial: AddressFormState
  pending: boolean
  submitLabel: string
  onCancel: () => void
  onSubmit: (form: AddressFormState) => Promise<void>
}) {
  const messages = useCrmUiMessagesOrDefault()
  const labels = messages.personForm.addresses
  const fields = messages.personForm.fields
  const [form, setForm] = React.useState<AddressFormState>(initial)
  const [error, setError] = React.useState<string | null>(null)

  const updateField = <K extends keyof AddressFormState>(key: K, value: AddressFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const submit = async () => {
    try {
      setError(null)
      await onSubmit(form)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : labels.saveFailed)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label className="text-xs">{labels.typeLabel}</Label>
          <Select
            value={form.label}
            onValueChange={(value) => updateField("label", value as AddressLabel)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ADDRESS_LABELS.map((label) => (
                <SelectItem key={label} value={label}>
                  {addressLabelText(label, labels)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 sm:pb-2">
          <Switch
            checked={form.isPrimary}
            onCheckedChange={(checked) => updateField("isPrimary", checked)}
          />
          <Label className="text-xs">{labels.primaryToggle}</Label>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">{fields.addressLine1}</Label>
          <Input
            value={form.line1}
            onChange={(event) => updateField("line1", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{fields.addressLine2}</Label>
          <Input
            value={form.line2}
            onChange={(event) => updateField("line2", event.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="text-xs">{fields.addressCity}</Label>
          <Input value={form.city} onChange={(event) => updateField("city", event.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{fields.addressRegion}</Label>
          <Input
            value={form.region}
            onChange={(event) => updateField("region", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{fields.addressPostalCode}</Label>
          <Input
            value={form.postalCode}
            onChange={(event) => updateField("postalCode", event.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">{fields.addressCountry}</Label>
        <CountryCombobox
          messages={messages.common.countryCombobox}
          value={form.country}
          onChange={(code) => updateField("country", code)}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">{labels.notesLabel}</Label>
        <Textarea
          value={form.notes}
          onChange={(event) => updateField("notes", event.target.value)}
          className="min-h-[80px]"
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
          {messages.common.cancel}
        </Button>
        <Button type="button" size="sm" onClick={() => void submit()} disabled={pending}>
          {pending ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : null}
          {submitLabel}
        </Button>
      </div>
    </div>
  )
}
