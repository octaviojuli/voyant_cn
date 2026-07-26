// agent-quality: file-size exception -- owner: relationships-react; existing UI surface stays co-located until a dedicated split preserves behavior and tests.
"use client"

import { isFamilyNameFirstLocale } from "@voyant-travel/i18n"
import { useAddressMutation } from "@voyant-travel/identity-react"
import { Button } from "@voyant-travel/ui/components/button"
import { CountryCombobox } from "@voyant-travel/ui/components/country-combobox"
import { DatePicker } from "@voyant-travel/ui/components/date-picker"
import { Input } from "@voyant-travel/ui/components/input"
import { Label } from "@voyant-travel/ui/components/label"
import { PhoneInput } from "@voyant-travel/ui/components/phone-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@voyant-travel/ui/components/select"
import { Loader2, Plus, Trash2 } from "lucide-react"
import * as React from "react"
import { useCrmUiI18nOrDefault, useCrmUiMessagesOrDefault } from "../i18n/index.js"
import {
  type CreatePersonDocumentFromPlaintextInput,
  type CreatePersonInput,
  type PersonDocumentRecord,
  type PersonDocumentType,
  type PersonRecord,
  usePersonDocumentMutation,
  usePersonDocuments,
  usePersonMutation,
} from "../index.js"
import { resolveDefaultPhoneCountry } from "../lib/locale-defaults.js"
import { PersonAddressesSection } from "./person-addresses-section.js"
import { PersonRelationshipsSection } from "./person-relationships-section.js"

type Mode = { kind: "create" } | { kind: "edit"; person: PersonRecord }

export interface PersonFormProps {
  mode: Mode
  initialOrganizationId?: string
  onSuccess?: (person: PersonRecord) => void
  onCancel?: () => void
}

interface FormState {
  firstName: string
  lastName: string
  email: string
  phone: string
  jobTitle: string
  dateOfBirth: string | null
  addressLine1: string
  addressLine2: string
  addressCity: string
  addressRegion: string
  addressPostalCode: string
  addressCountry: string
}

const DOCUMENT_TYPES: PersonDocumentType[] = [
  "passport",
  "id_card",
  "driver_license",
  "visa",
  "other",
]

function initialState(mode: Mode): FormState {
  if (mode.kind === "edit") {
    const p = mode.person
    return {
      firstName: p.firstName ?? "",
      lastName: p.lastName ?? "",
      email: p.email ?? "",
      phone: p.phone ?? "",
      jobTitle: p.jobTitle ?? "",
      dateOfBirth: p.dateOfBirth ?? null,
      addressLine1: "",
      addressLine2: "",
      addressCity: "",
      addressRegion: "",
      addressPostalCode: "",
      addressCountry: "",
    }
  }
  return {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    jobTitle: "",
    dateOfBirth: null,
    addressLine1: "",
    addressLine2: "",
    addressCity: "",
    addressRegion: "",
    addressPostalCode: "",
    addressCountry: "",
  }
}

function toPayload(state: FormState, organizationId?: string): CreatePersonInput {
  return {
    firstName: state.firstName.trim(),
    lastName: state.lastName.trim(),
    organizationId: organizationId ?? undefined,
    email: state.email.trim() || null,
    phone: state.phone.trim() || null,
    jobTitle: state.jobTitle.trim() || null,
    dateOfBirth: state.dateOfBirth || null,
  }
}

function hasAddress(state: FormState): boolean {
  return [
    state.addressLine1,
    state.addressLine2,
    state.addressCity,
    state.addressRegion,
    state.addressPostalCode,
    state.addressCountry,
  ].some((value) => Boolean(value.trim()))
}

function formatAddress(state: FormState): string | null {
  const text = [
    state.addressLine1,
    state.addressLine2,
    state.addressCity,
    state.addressRegion,
    state.addressPostalCode,
    state.addressCountry,
  ]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(", ")
  return text || null
}

/**
 * Create/edit form for a Person. Validates via the server-side Zod schema
 * exposed on `/api/v1/admin/relationships/people` — client-side errors surface as toast-
 * friendly `VoyantApiError`s inside the mutation.
 */
export function PersonForm({ mode, initialOrganizationId, onSuccess, onCancel }: PersonFormProps) {
  const [state, setState] = React.useState<FormState>(() => initialState(mode))
  const [error, setError] = React.useState<string | null>(null)
  // After the operator hits "Create" on a fresh sheet, we flip into an
  // edit-like UI in-place so the addresses (multi) + documents sections
  // become available without closing the sheet. The parent's `onSuccess`
  // is deferred until the operator hits "Done" / "Save changes".
  const [createdPerson, setCreatedPerson] = React.useState<PersonRecord | null>(null)
  const { create, update } = usePersonMutation()
  const addressMutation = useAddressMutation()
  const { locale, messages } = useCrmUiI18nOrDefault()
  // Name-order convention: in family-name-first languages (zh/ja/ko) the 姓
  // field comes first, so an operator reading left-to-right types the family
  // name into the family-name box. Only the layout flips — `firstName` stays
  // the given name in state and on the wire.
  const familyNameFirst = isFamilyNameFirstLocale(locale)
  const defaultPhoneCountry = resolveDefaultPhoneCountry(locale)
  const effectivePerson: PersonRecord | null =
    createdPerson ?? (mode.kind === "edit" ? mode.person : null)
  const editPersonId = effectivePerson?.id
  const creating = !effectivePerson

  const isSubmitting = create.isPending || update.isPending || addressMutation.create.isPending

  const field =
    <K extends keyof FormState>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setState((prev) => ({ ...prev, [key]: e.target.value }))
    }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!state.firstName.trim() || !state.lastName.trim()) {
      setError(messages.personForm.validation.nameRequired)
      return
    }

    const payload = toPayload(
      state,
      !effectivePerson && initialOrganizationId ? initialOrganizationId : undefined,
    )

    try {
      if (!effectivePerson) {
        const person = await create.mutateAsync(payload)
        if (hasAddress(state)) {
          await addressMutation.create.mutateAsync({
            entityType: "person",
            entityId: person.id,
            label: "primary" as const,
            fullText: formatAddress(state),
            line1: state.addressLine1.trim() || null,
            line2: state.addressLine2.trim() || null,
            city: state.addressCity.trim() || null,
            region: state.addressRegion.trim() || null,
            postalCode: state.addressPostalCode.trim() || null,
            country: state.addressCountry.trim() || null,
            isPrimary: true,
          })
        }
        // Stay on the sheet — the operator now sees the multi-address
        // and documents sections and can keep editing before closing.
        setCreatedPerson(person)
      } else {
        const updated = await update.mutateAsync({ id: effectivePerson.id, input: payload })
        onSuccess?.(updated)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : messages.personForm.validation.saveFailed)
    }
  }

  const handleCancel = () => {
    // If we already created the person in this session, treat the close
    // button as "Done" so the picker still selects the new person.
    if (createdPerson) {
      onSuccess?.(createdPerson)
    } else {
      onCancel?.()
    }
  }

  const givenNameField = (
    <div key="given-name" className="flex flex-col gap-1.5">
      <Label htmlFor="person-first-name">{messages.personForm.fields.firstName}</Label>
      <Input
        id="person-first-name"
        required
        value={state.firstName}
        onChange={field("firstName")}
      />
    </div>
  )
  const familyNameField = (
    <div key="family-name" className="flex flex-col gap-1.5">
      <Label htmlFor="person-last-name">{messages.personForm.fields.lastName}</Label>
      <Input id="person-last-name" required value={state.lastName} onChange={field("lastName")} />
    </div>
  )

  return (
    <form data-slot="person-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-foreground">
          {messages.personForm.sections.identity}
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {familyNameFirst ? [familyNameField, givenNameField] : [givenNameField, familyNameField]}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="person-job-title">{messages.personForm.fields.jobTitle}</Label>
            <Input id="person-job-title" value={state.jobTitle} onChange={field("jobTitle")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="person-date-of-birth">{messages.personForm.fields.dateOfBirth}</Label>
            <DatePicker
              value={state.dateOfBirth}
              onChange={(next) => setState((prev) => ({ ...prev, dateOfBirth: next }))}
            />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-foreground">
          {messages.personForm.sections.contact}
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="person-email">{messages.personForm.fields.email}</Label>
            <Input id="person-email" type="email" value={state.email} onChange={field("email")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="person-phone">{messages.personForm.fields.phone}</Label>
            <PhoneInput
              id="person-phone"
              international
              defaultCountry={
                defaultPhoneCountry as React.ComponentProps<typeof PhoneInput>["defaultCountry"]
              }
              value={state.phone}
              onChange={(value) =>
                setState((prev) => ({ ...prev, phone: (value as string) ?? "" }))
              }
            />
          </div>
        </div>
      </section>

      {editPersonId ? (
        <PersonAddressesSection personId={editPersonId} />
      ) : (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-foreground">
            {messages.personForm.sections.address}
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="person-address-line-1">
                {messages.personForm.fields.addressLine1}
              </Label>
              <Input
                id="person-address-line-1"
                value={state.addressLine1}
                onChange={field("addressLine1")}
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="person-address-line-2">
                {messages.personForm.fields.addressLine2}
              </Label>
              <Input
                id="person-address-line-2"
                value={state.addressLine2}
                onChange={field("addressLine2")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="person-address-city">{messages.personForm.fields.addressCity}</Label>
              <Input
                id="person-address-city"
                value={state.addressCity}
                onChange={field("addressCity")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="person-address-region">
                {messages.personForm.fields.addressRegion}
              </Label>
              <Input
                id="person-address-region"
                value={state.addressRegion}
                onChange={field("addressRegion")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="person-address-postal-code">
                {messages.personForm.fields.addressPostalCode}
              </Label>
              <Input
                id="person-address-postal-code"
                value={state.addressPostalCode}
                onChange={field("addressPostalCode")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="person-address-country">
                {messages.personForm.fields.addressCountry}
              </Label>
              <CountryCombobox
                messages={messages.common.countryCombobox}
                value={state.addressCountry || null}
                onChange={(code) => setState((prev) => ({ ...prev, addressCountry: code ?? "" }))}
              />
            </div>
          </div>
        </section>
      )}

      {editPersonId ? <PersonRelationshipsSection personId={editPersonId} /> : null}

      {editPersonId ? <DocumentsSection personId={editPersonId} /> : null}

      {error ? (
        <p data-slot="person-form-error" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        {onCancel || createdPerson ? (
          <Button type="button" variant="ghost" onClick={handleCancel} disabled={isSubmitting}>
            {createdPerson ? messages.common.done : messages.common.cancel}
          </Button>
        ) : null}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
              {messages.common.saving}
            </>
          ) : creating ? (
            messages.personForm.actions.create
          ) : (
            messages.common.saveChanges
          )}
        </Button>
      </div>
    </form>
  )
}

function DocumentsSection({ personId }: { personId: string }) {
  const messages = useCrmUiMessagesOrDefault()
  const documentsQuery = usePersonDocuments(personId)
  const mutation = usePersonDocumentMutation(personId)
  const [adding, setAdding] = React.useState(false)
  const [draft, setDraft] = React.useState<CreatePersonDocumentFromPlaintextInput>({
    type: "passport",
    number: "",
    issuingCountry: "",
    expiryDate: null,
  })

  const documents = documentsQuery.data?.data ?? []
  const typeLabels = messages.personDetail.documentTypeLabels

  const resetDraft = () => {
    setDraft({ type: "passport", number: "", issuingCountry: "", expiryDate: null })
    setAdding(false)
  }

  const submitDraft = async () => {
    await mutation.createFromPlaintext.mutateAsync({
      type: draft.type,
      number: draft.number?.trim() || null,
      issuingCountry: draft.issuingCountry?.trim() || null,
      expiryDate: draft.expiryDate || null,
    })
    resetDraft()
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">
          {messages.personForm.sections.documents}
        </h3>
        {!adding ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(true)}>
            <Plus className="mr-1 size-3.5" />
            {messages.personForm.documents.add}
          </Button>
        ) : null}
      </div>

      {documentsQuery.isPending ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {messages.common.saving}
        </div>
      ) : documents.length === 0 && !adding ? (
        <p className="text-sm text-muted-foreground">{messages.personForm.documents.empty}</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {documents.map((doc: PersonDocumentRecord) => (
            <li key={doc.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-medium">{typeLabels[doc.type] ?? doc.type}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {[doc.issuingCountry, doc.expiryDate].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-destructive"
                onClick={() => mutation.remove.mutate(doc.id)}
                disabled={mutation.remove.isPending}
                aria-label={messages.personForm.documents.remove}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <div className="grid grid-cols-1 gap-3 rounded-md border bg-muted/30 p-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">{messages.personForm.documents.type}</Label>
            <Select
              value={draft.type}
              onValueChange={(v) =>
                setDraft((prev) => ({ ...prev, type: v as PersonDocumentType }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {typeLabels[t] ?? t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">{messages.personForm.documents.number}</Label>
            <Input
              value={draft.number ?? ""}
              onChange={(e) => setDraft((prev) => ({ ...prev, number: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">{messages.personForm.documents.issuingCountry}</Label>
            <Input
              value={draft.issuingCountry ?? ""}
              onChange={(e) => setDraft((prev) => ({ ...prev, issuingCountry: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">{messages.personForm.documents.expiryDate}</Label>
            <DatePicker
              value={draft.expiryDate ?? null}
              onChange={(next) => setDraft((prev) => ({ ...prev, expiryDate: next }))}
            />
          </div>
          <div className="flex items-center justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="ghost" size="sm" onClick={resetDraft}>
              {messages.common.cancel}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={submitDraft}
              disabled={mutation.createFromPlaintext.isPending}
            >
              {mutation.createFromPlaintext.isPending ? (
                <Loader2 className="mr-2 size-3.5 animate-spin" />
              ) : null}
              {messages.personForm.documents.save}
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
