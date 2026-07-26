// agent-quality: file-size exception -- owner: bookings-react; existing UI surface stays co-located until a dedicated split preserves behavior and tests.
"use client"

import { useAddresses } from "@voyant-travel/identity-react"
import {
  type OrganizationRecord,
  type PersonRecord,
  useOrganization,
  useOrganizations,
  usePeople,
  usePerson,
} from "@voyant-travel/relationships-react"
import {
  Button,
  ButtonGroup,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@voyant-travel/ui/components"
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@voyant-travel/ui/components/combobox"
import { CountryCombobox } from "@voyant-travel/ui/components/country-combobox"
import { PhoneInput } from "@voyant-travel/ui/components/phone-input"
import { zodResolver } from "@voyant-travel/ui/lib/zod-resolver"
import { Building2, Loader2, Search, User } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod/v4"
import { useBookingsUiI18nOrDefault } from "../i18n/provider.js"
import { type BookingRecord, useBookingMutation } from "../index.js"
import { orderNameFields, personDisplayName } from "../lib/person-name.js"

const billingFormSchema = z.object({
  contactPartyType: z.enum(["individual", "company"]),
  contactFirstName: z.string().max(255).optional().nullable(),
  contactLastName: z.string().max(255).optional().nullable(),
  contactTaxId: z.string().max(100).optional().nullable(),
  contactEmail: z.string().email().optional().nullable().or(z.literal("")),
  contactPhone: z.string().max(50).optional().nullable(),
  contactAddressLine1: z.string().max(500).optional().nullable(),
  contactAddressLine2: z.string().max(500).optional().nullable(),
  contactCity: z.string().max(100).optional().nullable(),
  contactRegion: z.string().max(100).optional().nullable(),
  contactPostalCode: z.string().max(20).optional().nullable(),
  contactCountry: z.string().max(2).optional().nullable(),
})

type BillingFormValues = z.input<typeof billingFormSchema>
type BillingFormOutput = z.output<typeof billingFormSchema>
type BillingPartyType = BillingFormOutput["contactPartyType"]
type BillingAddressFormKey =
  | "contactAddressLine1"
  | "contactAddressLine2"
  | "contactCity"
  | "contactRegion"
  | "contactPostalCode"
  | "contactCountry"

export interface BookingBillingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  booking: BookingRecord
  onSuccess?: () => void
}

function inferBillingPartyType(booking: BookingRecord): BillingPartyType {
  if (booking.contactPartyType === "individual" || booking.contactPartyType === "company") {
    return booking.contactPartyType
  }

  return booking.organizationId && !booking.personId ? "company" : "individual"
}

function getBillingFormDefaults(booking: BookingRecord): BillingFormValues {
  return {
    contactPartyType: inferBillingPartyType(booking),
    contactFirstName: booking.contactFirstName ?? "",
    contactLastName: booking.contactLastName ?? "",
    contactTaxId: booking.contactTaxId ?? "",
    contactEmail: booking.contactEmail ?? "",
    contactPhone: booking.contactPhone ?? "",
    contactAddressLine1: booking.contactAddressLine1 ?? "",
    contactAddressLine2: booking.contactAddressLine2 ?? "",
    contactCity: booking.contactCity ?? "",
    contactRegion: booking.contactRegion ?? "",
    contactPostalCode: booking.contactPostalCode ?? "",
    contactCountry: booking.contactCountry ?? "",
  }
}

/**
 * Edit the billing-contact snapshot on a booking. The snapshot is the
 * source of truth for the detail-page billing card and for downstream
 * invoice / document generation — when an operator's data correction
 * needs to land on documents without modifying the CRM person record,
 * this is the dialog they reach for.
 */
export function BookingBillingDialog({
  open,
  onOpenChange,
  booking,
  onSuccess,
}: BookingBillingDialogProps) {
  const { update } = useBookingMutation()
  const { locale, messages: allMessages } = useBookingsUiI18nOrDefault()
  const messages = allMessages.bookingBillingDialog
  const [crmPickerOpen, setCrmPickerOpen] = useState(false)
  const [personSearch, setPersonSearch] = useState("")
  const [organizationSearch, setOrganizationSearch] = useState("")
  const [personInputValue, setPersonInputValue] = useState("")
  const [organizationInputValue, setOrganizationInputValue] = useState("")
  const [selectedPersonId, setSelectedPersonId] = useState(booking.personId ?? "")
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(
    booking.organizationId ?? null,
  )
  const cachedPeopleRef = useRef(new Map<string, PersonRecord>())
  const cachedOrganizationsRef = useRef(new Map<string, OrganizationRecord>())
  const pendingAddressPrefillRef = useRef<string | null>(null)

  const form = useForm<BillingFormValues, unknown, BillingFormOutput>({
    resolver: zodResolver(billingFormSchema),
    defaultValues: getBillingFormDefaults(booking),
  })

  const partyType = form.watch("contactPartyType")
  const peopleQuery = usePeople({
    search: personSearch || undefined,
    limit: 20,
    enabled: open && partyType === "individual",
  })
  const selectedPersonQuery = usePerson(selectedPersonId || undefined, {
    enabled: open && partyType === "individual" && Boolean(selectedPersonId),
  })
  const organizationsQuery = useOrganizations({
    search: organizationSearch || undefined,
    limit: 20,
    enabled: open && partyType === "company",
  })
  const selectedOrganizationQuery = useOrganization(selectedOrganizationId || undefined, {
    enabled: open && partyType === "company" && Boolean(selectedOrganizationId),
  })
  const people = useMemo(() => {
    const map = new Map(cachedPeopleRef.current)
    for (const person of peopleQuery.data?.data ?? []) map.set(person.id, person)
    if (selectedPersonQuery.data) map.set(selectedPersonQuery.data.id, selectedPersonQuery.data)
    cachedPeopleRef.current = map
    return Array.from(map.values())
  }, [peopleQuery.data?.data, selectedPersonQuery.data])
  const organizations = useMemo(() => {
    const map = new Map(cachedOrganizationsRef.current)
    for (const organization of organizationsQuery.data?.data ?? []) {
      map.set(organization.id, organization)
    }
    if (selectedOrganizationQuery.data) {
      map.set(selectedOrganizationQuery.data.id, selectedOrganizationQuery.data)
    }
    cachedOrganizationsRef.current = map
    return Array.from(map.values())
  }, [organizationsQuery.data?.data, selectedOrganizationQuery.data])
  const peopleMap = useMemo(() => new Map(people.map((person) => [person.id, person])), [people])
  const organizationsMap = useMemo(
    () => new Map(organizations.map((organization) => [organization.id, organization])),
    [organizations],
  )
  const selectedPersonLabel = selectedPersonId
    ? formatPerson(
        peopleMap.get(selectedPersonId) ?? cachedPeopleRef.current.get(selectedPersonId),
        locale,
      )
    : ""
  const selectedOrganizationLabel = selectedOrganizationId
    ? (organizationsMap.get(selectedOrganizationId)?.name ??
      cachedOrganizationsRef.current.get(selectedOrganizationId)?.name ??
      "")
    : ""
  const billingAddressKind: "person" | "organization" | null =
    partyType === "individual" && selectedPersonId
      ? "person"
      : partyType === "company" && selectedOrganizationId
        ? "organization"
        : null
  const billingAddressEntityId =
    billingAddressKind === "person"
      ? selectedPersonId
      : billingAddressKind === "organization"
        ? (selectedOrganizationId ?? undefined)
        : undefined
  const billingAddressQuery = useAddresses({
    entityType: billingAddressKind ?? undefined,
    entityId: billingAddressEntityId,
    isPrimary: true,
    limit: 1,
    enabled: open && Boolean(billingAddressKind && billingAddressEntityId),
  })
  const billingAddress = billingAddressQuery.data?.data?.[0] ?? null

  // biome-ignore lint/correctness/useExhaustiveDependencies: see comment -- owner: bookings-react; existing suppression is intentional pending typed cleanup.
  useEffect(() => {
    // `form` is intentionally omitted — react-hook-form returns a fresh
    // wrapper object each render even though the store is in a ref, so
    // including it would re-fire on every render. Resetting from the
    // latest booking snapshot when the dialog opens is sufficient.
    if (open) {
      form.reset(getBillingFormDefaults(booking))
      setCrmPickerOpen(false)
      setPersonSearch("")
      setOrganizationSearch("")
      setPersonInputValue("")
      setOrganizationInputValue("")
      setSelectedPersonId(booking.personId ?? "")
      setSelectedOrganizationId(booking.organizationId ?? null)
      pendingAddressPrefillRef.current = null
    }
  }, [open, booking])

  useEffect(() => {
    if (selectedPersonLabel) setPersonInputValue(selectedPersonLabel)
  }, [selectedPersonLabel])

  useEffect(() => {
    if (selectedOrganizationLabel) setOrganizationInputValue(selectedOrganizationLabel)
  }, [selectedOrganizationLabel])

  const setAddressFields = (
    values: Record<BillingAddressFormKey, string | null | undefined>,
    shouldDirty: boolean,
  ) => {
    for (const [key, value] of Object.entries(values) as Array<
      [BillingAddressFormKey, string | null | undefined]
    >) {
      form.setValue(key, value ?? "", { shouldDirty, shouldValidate: true })
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: `setAddressFields` only writes to the stable react-hook-form store. -- owner: bookings-react; existing suppression is intentional pending typed cleanup.
  useEffect(() => {
    if (!billingAddressQuery.data || !pendingAddressPrefillRef.current) return

    const expectedTarget =
      billingAddressKind && billingAddressEntityId
        ? `${billingAddressKind}:${billingAddressEntityId}`
        : null
    if (pendingAddressPrefillRef.current !== expectedTarget) return

    setAddressFields(
      {
        contactAddressLine1: billingAddress?.line1 ?? "",
        contactAddressLine2: billingAddress?.line2 ?? "",
        contactCity: billingAddress?.city ?? "",
        contactRegion: billingAddress?.region ?? "",
        contactPostalCode: billingAddress?.postalCode ?? "",
        contactCountry: billingAddress?.country ?? "",
      },
      true,
    )
    pendingAddressPrefillRef.current = null
  }, [billingAddress, billingAddressEntityId, billingAddressKind, billingAddressQuery.data])

  const prepareAddressPrefill = (kind: "person" | "organization", id: string) => {
    pendingAddressPrefillRef.current = `${kind}:${id}`
    setAddressFields(
      {
        contactAddressLine1: "",
        contactAddressLine2: "",
        contactCity: "",
        contactRegion: "",
        contactPostalCode: "",
        contactCountry: "",
      },
      true,
    )
  }

  const setPartyType = (next: BillingPartyType) => {
    form.setValue("contactPartyType", next, { shouldDirty: true })
    if (next === "individual") {
      setSelectedOrganizationId(null)
      setOrganizationInputValue("")
    } else {
      setSelectedPersonId("")
      setPersonInputValue("")
    }
  }

  const applyPersonPrefill = (person: PersonRecord) => {
    form.setValue("contactPartyType", "individual", { shouldDirty: true })
    form.setValue("contactFirstName", person.firstName, { shouldDirty: true })
    form.setValue("contactLastName", person.lastName, { shouldDirty: true })
    form.setValue("contactTaxId", "", { shouldDirty: true })
    form.setValue("contactEmail", person.email ?? "", { shouldDirty: true, shouldValidate: true })
    form.setValue("contactPhone", person.phone ?? "", { shouldDirty: true })
    setSelectedPersonId(person.id)
    setSelectedOrganizationId(null)
    setPersonInputValue(formatPerson(person, locale))
    prepareAddressPrefill("person", person.id)
  }

  const applyOrganizationPrefill = (organization: OrganizationRecord) => {
    form.setValue("contactPartyType", "company", { shouldDirty: true })
    form.setValue("contactFirstName", organization.name, { shouldDirty: true })
    form.setValue("contactLastName", "", { shouldDirty: true })
    form.setValue("contactTaxId", organization.taxId ?? "", { shouldDirty: true })
    form.setValue("contactEmail", "", { shouldDirty: true, shouldValidate: true })
    form.setValue("contactPhone", "", { shouldDirty: true })
    setSelectedPersonId("")
    setSelectedOrganizationId(organization.id)
    setOrganizationInputValue(organization.name)
    prepareAddressPrefill("organization", organization.id)
  }

  const onSubmit = async (values: BillingFormOutput) => {
    const isCompany = values.contactPartyType === "company"
    await update.mutateAsync({
      id: booking.id,
      input: {
        personId: isCompany ? null : selectedPersonId || booking.personId || null,
        organizationId: isCompany ? selectedOrganizationId || booking.organizationId || null : null,
        contactPartyType: values.contactPartyType,
        contactFirstName: values.contactFirstName?.trim() || null,
        contactLastName: isCompany ? null : values.contactLastName?.trim() || null,
        contactTaxId: isCompany ? values.contactTaxId?.trim() || null : null,
        contactEmail: values.contactEmail?.trim() || null,
        contactPhone: values.contactPhone?.trim() || null,
        contactAddressLine1: values.contactAddressLine1?.trim() || null,
        contactAddressLine2: values.contactAddressLine2?.trim() || null,
        contactCity: values.contactCity?.trim() || null,
        contactRegion: values.contactRegion?.trim() || null,
        contactPostalCode: values.contactPostalCode?.trim() || null,
        contactCountry: values.contactCountry?.trim() || null,
      },
    })
    onOpenChange(false)
    onSuccess?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{messages.title}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <DialogBody className="grid gap-4">
            <div className="flex flex-col gap-2">
              <Label>{messages.fields.partyType}</Label>
              <ButtonGroup>
                <Button
                  type="button"
                  variant={partyType === "individual" ? "secondary" : "outline"}
                  size="sm"
                  aria-pressed={partyType === "individual"}
                  onClick={() => setPartyType("individual")}
                >
                  <User className="mr-2 h-4 w-4" aria-hidden="true" />
                  {messages.partyTypeLabels.individual}
                </Button>
                <Button
                  type="button"
                  variant={partyType === "company" ? "secondary" : "outline"}
                  size="sm"
                  aria-pressed={partyType === "company"}
                  onClick={() => setPartyType("company")}
                >
                  <Building2 className="mr-2 h-4 w-4" aria-hidden="true" />
                  {messages.partyTypeLabels.company}
                </Button>
              </ButtonGroup>
            </div>

            <div className="rounded-md border p-3">
              <div className="flex items-center justify-between gap-3">
                <Label>{messages.crmPicker.label}</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCrmPickerOpen((current) => !current)}
                >
                  <Search className="mr-2 h-4 w-4" aria-hidden="true" />
                  {crmPickerOpen ? messages.actions.hideCrmPicker : messages.actions.selectFromCrm}
                </Button>
              </div>

              {crmPickerOpen ? (
                <div className="mt-3">
                  {partyType === "company" ? (
                    <Combobox
                      items={organizations.map((organization) => organization.id)}
                      value={selectedOrganizationId}
                      inputValue={organizationInputValue}
                      autoHighlight
                      itemToStringLabel={(id) =>
                        organizationsMap.get(id as string)?.name ??
                        cachedOrganizationsRef.current.get(id as string)?.name ??
                        (id as string)
                      }
                      itemToStringValue={(id) => id as string}
                      onInputValueChange={(next) => {
                        setOrganizationInputValue(next)
                        setOrganizationSearch(next)
                        if (!next) setSelectedOrganizationId(null)
                      }}
                      onValueChange={(next) => {
                        const id = (next as string | null) ?? null
                        const organization = id
                          ? (organizationsMap.get(id) ?? cachedOrganizationsRef.current.get(id))
                          : undefined
                        if (organization) applyOrganizationPrefill(organization)
                      }}
                    >
                      <ComboboxInput
                        placeholder={messages.crmPicker.organizationSearchPlaceholder}
                        showClear={Boolean(selectedOrganizationId)}
                      />
                      <ComboboxContent>
                        <ComboboxEmpty>{messages.crmPicker.organizationEmpty}</ComboboxEmpty>
                        <ComboboxList>
                          <ComboboxCollection>
                            {(id) => {
                              const organization = organizationsMap.get(id as string)
                              if (!organization) return null
                              return (
                                <ComboboxItem key={organization.id} value={organization.id}>
                                  <div className="flex min-w-0 flex-col">
                                    <span className="truncate font-medium">
                                      {organization.name}
                                    </span>
                                    {organization.taxId ? (
                                      <span className="truncate text-xs text-muted-foreground">
                                        {organization.taxId}
                                      </span>
                                    ) : null}
                                  </div>
                                </ComboboxItem>
                              )
                            }}
                          </ComboboxCollection>
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                  ) : (
                    <Combobox
                      items={people.map((person) => person.id)}
                      value={selectedPersonId || null}
                      inputValue={personInputValue}
                      autoHighlight
                      itemToStringLabel={(id) =>
                        formatPerson(
                          peopleMap.get(id as string) ?? cachedPeopleRef.current.get(id as string),
                          locale,
                        ) || (id as string)
                      }
                      itemToStringValue={(id) => id as string}
                      onInputValueChange={(next) => {
                        setPersonInputValue(next)
                        setPersonSearch(next)
                        if (!next) setSelectedPersonId("")
                      }}
                      onValueChange={(next) => {
                        const id = (next as string | null) ?? ""
                        const person = id
                          ? (peopleMap.get(id) ?? cachedPeopleRef.current.get(id))
                          : undefined
                        if (person) applyPersonPrefill(person)
                      }}
                    >
                      <ComboboxInput
                        placeholder={messages.crmPicker.personSearchPlaceholder}
                        showClear={Boolean(selectedPersonId)}
                      />
                      <ComboboxContent>
                        <ComboboxEmpty>{messages.crmPicker.personEmpty}</ComboboxEmpty>
                        <ComboboxList>
                          <ComboboxCollection>
                            {(id) => {
                              const person = peopleMap.get(id as string)
                              if (!person) return null
                              return (
                                <ComboboxItem key={person.id} value={person.id}>
                                  <div className="flex min-w-0 flex-col">
                                    <span className="truncate font-medium">
                                      {personDisplayName(person, locale)}
                                    </span>
                                    {person.email ? (
                                      <span className="truncate text-xs text-muted-foreground">
                                        {person.email}
                                      </span>
                                    ) : null}
                                  </div>
                                </ComboboxItem>
                              )
                            }}
                          </ComboboxCollection>
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                  )}
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {partyType === "company" ? (
                <>
                  <div className="flex flex-col gap-2">
                    <Label>{messages.fields.companyName}</Label>
                    <Input {...form.register("contactFirstName")} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>{messages.fields.taxId}</Label>
                    <Input {...form.register("contactTaxId")} />
                  </div>
                </>
              ) : (
                // Family-name-first locales (zh/ja/ko) read 姓 then 名, so the
                // family-name box has to sit on the left or operators type the
                // family name into the given-name field.
                orderNameFields(
                  locale,
                  <div key="given" className="flex flex-col gap-2">
                    <Label>{messages.fields.firstName}</Label>
                    <Input {...form.register("contactFirstName")} />
                  </div>,
                  <div key="family" className="flex flex-col gap-2">
                    <Label>{messages.fields.lastName}</Label>
                    <Input {...form.register("contactLastName")} />
                  </div>,
                )
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>{messages.fields.email}</Label>
                <Input type="email" {...form.register("contactEmail")} />
                {form.formState.errors.contactEmail ? (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.contactEmail.message}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                <Label>{messages.fields.phone}</Label>
                <PhoneInput
                  value={form.watch("contactPhone") ?? ""}
                  onChange={(next) => form.setValue("contactPhone", next, { shouldDirty: true })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>{messages.fields.addressLine1}</Label>
                <Input {...form.register("contactAddressLine1")} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>{messages.fields.addressLine2}</Label>
                <Input {...form.register("contactAddressLine2")} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-2">
                <Label>{messages.fields.city}</Label>
                <Input {...form.register("contactCity")} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>{messages.fields.region}</Label>
                <Input {...form.register("contactRegion")} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>{messages.fields.postalCode}</Label>
                <Input {...form.register("contactPostalCode")} />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>{messages.fields.country}</Label>
              <CountryCombobox
                value={form.watch("contactCountry") || null}
                onChange={(next) =>
                  form.setValue("contactCountry", next ?? "", {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              {messages.actions.cancel}
            </Button>
            <Button type="submit" size="sm" disabled={update.isPending}>
              {update.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {messages.actions.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function formatPerson(person: PersonRecord | undefined, locale?: string | null): string {
  if (!person) return ""
  const name = personDisplayName(person, locale)
  return person.email ? `${name} · ${person.email}` : name
}
