"use client"

import {
  type OrganizationRecord,
  type PersonRecord,
  useOrganization,
  useOrganizations,
  usePeople,
  usePerson,
} from "@voyant-travel/relationships-react"
import { OrganizationForm, PersonForm } from "@voyant-travel/relationships-react/ui"
import {
  Button,
  Label,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
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
import { Building2, Pencil, User, UserPlus } from "lucide-react"
import * as React from "react"
import { useBookingsUiI18nOrDefault } from "../i18n/provider.js"
import { personDisplayName } from "../lib/person-name.js"

export type PersonPickerMode = "existing" | "new"
export type BillingTargetMode = "person" | "organization"

export interface NewPersonValue {
  firstName: string
  lastName: string
  email: string
  phone: string
}

export interface PersonPickerValue {
  billTo?: BillingTargetMode
  mode: PersonPickerMode
  /** Set when mode === "existing". */
  personId: string
  /** Used when mode === "new". */
  newPerson: NewPersonValue
  /** `null` = no organization attached. */
  organizationId: string | null
}

export const emptyNewPerson: NewPersonValue = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
}

export const emptyPersonPickerValue: PersonPickerValue = {
  billTo: "person",
  mode: "existing",
  personId: "",
  newPerson: emptyNewPerson,
  organizationId: null,
}

export interface PersonPickerSectionProps {
  value: PersonPickerValue
  onChange: (value: PersonPickerValue) => void
  enabled?: boolean
  showOrganization?: boolean
  /**
   * Hide the person-vs-organization toggle while still allowing org mode
   * (driven by `value.billTo`). Use when an outer control already chooses
   * the target — e.g. the journey's Buyer type radio.
   */
  hideTargetToggle?: boolean
  labels?: {
    person?: string
    organization?: string
    billTo?: string
    billToPerson?: string
    billToOrganization?: string
    createNewPerson?: string
    createNewOrganization?: string
    createPersonSheetTitle?: string
    createOrganizationSheetTitle?: string
    editPerson?: string
    editOrganization?: string
    editPersonSheetTitle?: string
    editOrganizationSheetTitle?: string
    selectExistingPerson?: string
    personSearchPlaceholder?: string
    personSelectPlaceholder?: string
    personEmpty?: string
    firstName?: string
    firstNamePlaceholder?: string
    lastName?: string
    lastNamePlaceholder?: string
    email?: string
    emailPlaceholder?: string
    phone?: string
    phonePlaceholder?: string
    organizationSearchPlaceholder?: string
    organizationSelectPlaceholder?: string
    organizationEmpty?: string
    organizationNone?: string
  }
}

/**
 * Billing target picker for booking create.
 *
 * State is fully controlled. The embedded create sheets use the CRM forms and
 * select the newly-created person or organization after save.
 */
export function PersonPickerSection({
  value,
  onChange,
  enabled = true,
  showOrganization = true,
  hideTargetToggle = false,
  labels,
}: PersonPickerSectionProps) {
  const [personSearch, setPersonSearch] = React.useState("")
  const [orgSearch, setOrgSearch] = React.useState("")
  const cachedPeopleRef = React.useRef(new Map<string, PersonRecord>())
  const cachedOrgsRef = React.useRef(new Map<string, OrganizationRecord>())
  const [personInputValue, setPersonInputValue] = React.useState("")
  const [orgInputValue, setOrgInputValue] = React.useState("")
  const [personSheetOpen, setPersonSheetOpen] = React.useState(false)
  const [personSheetMode, setPersonSheetMode] = React.useState<"create" | "edit">("create")
  const [orgSheetOpen, setOrgSheetOpen] = React.useState(false)
  const [orgSheetMode, setOrgSheetMode] = React.useState<"create" | "edit">("create")
  const { locale, messages } = useBookingsUiI18nOrDefault()
  const merged = { ...messages.personPickerSection.labels, ...labels }
  const billingTarget = value.billTo ?? "person"

  const { data: peopleData } = usePeople({
    search: personSearch || undefined,
    limit: 20,
    enabled: enabled && billingTarget === "person",
  })
  const selectedPersonQuery = usePerson(value.personId || undefined, {
    enabled: enabled && billingTarget === "person" && Boolean(value.personId),
  })
  const people = React.useMemo(() => {
    const map = new Map(cachedPeopleRef.current)
    for (const person of peopleData?.data ?? []) map.set(person.id, person)
    if (selectedPersonQuery.data) map.set(selectedPersonQuery.data.id, selectedPersonQuery.data)
    cachedPeopleRef.current = map
    return Array.from(map.values())
  }, [peopleData?.data, selectedPersonQuery.data])
  const peopleMap = React.useMemo(
    () => new Map(people.map((person) => [person.id, person])),
    [people],
  )

  const { data: orgsData } = useOrganizations({
    search: orgSearch || undefined,
    limit: 20,
    enabled: enabled && showOrganization && billingTarget === "organization",
  })
  const selectedOrgQuery = useOrganization(value.organizationId || undefined, {
    enabled: enabled && billingTarget === "organization" && Boolean(value.organizationId),
  })
  const orgs = React.useMemo(() => {
    const map = new Map(cachedOrgsRef.current)
    for (const org of orgsData?.data ?? []) map.set(org.id, org)
    if (selectedOrgQuery.data) map.set(selectedOrgQuery.data.id, selectedOrgQuery.data)
    cachedOrgsRef.current = map
    return Array.from(map.values())
  }, [orgsData?.data, selectedOrgQuery.data])
  const orgsMap = React.useMemo(() => new Map(orgs.map((org) => [org.id, org])), [orgs])

  const setPerson = (patch: Partial<PersonPickerValue>) => onChange({ ...value, ...patch })
  const resolvePersonLabel = React.useCallback(
    (personId: string) =>
      formatPerson(peopleMap.get(personId) ?? cachedPeopleRef.current.get(personId), locale),
    [peopleMap, locale],
  )
  const resolveOrgLabel = React.useCallback(
    (organizationId: string) =>
      orgsMap.get(organizationId)?.name ?? cachedOrgsRef.current.get(organizationId)?.name ?? "",
    [orgsMap],
  )
  const selectedPersonLabel = value.personId ? resolvePersonLabel(value.personId) : ""
  const selectedOrgLabel = value.organizationId ? resolveOrgLabel(value.organizationId) : ""

  React.useEffect(() => {
    if (selectedPersonLabel) setPersonInputValue(selectedPersonLabel)
  }, [selectedPersonLabel])

  React.useEffect(() => {
    if (selectedOrgLabel) setOrgInputValue(selectedOrgLabel)
  }, [selectedOrgLabel])

  return (
    <>
      {/* Bill-to (person vs organization) toggle. Hidden when orgs aren't
          offered at all (a per-traveler picker), OR when the consumer drives
          the target externally (e.g. the journey's Buyer type radio) via
          `hideTargetToggle` — org mode still works, just without the toggle. */}
      {showOrganization && !hideTargetToggle ? (
        <div className="flex flex-col gap-2">
          <Label>{merged.billTo}</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={billingTarget === "person" ? "default" : "outline"}
              onClick={() => setPerson({ billTo: "person", organizationId: null })}
              disabled={!enabled}
            >
              <User className="mr-2 h-4 w-4" />
              {merged.billToPerson}
            </Button>
            <Button
              type="button"
              variant={billingTarget === "organization" ? "default" : "outline"}
              onClick={() => setPerson({ billTo: "organization", personId: "" })}
              disabled={!enabled}
            >
              <Building2 className="mr-2 h-4 w-4" />
              {merged.billToOrganization}
            </Button>
          </div>
        </div>
      ) : null}

      {billingTarget === "person" ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label>
              {merged.person} <span className="text-destructive">*</span>
            </Label>
            <div className="flex items-center gap-1">
              {value.personId ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7"
                  onClick={() => {
                    setPersonSheetMode("edit")
                    setPersonSheetOpen(true)
                  }}
                  disabled={!enabled || !selectedPersonQuery.data}
                >
                  <Pencil className="mr-1 h-3.5 w-3.5" />
                  {merged.editPerson}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7"
                onClick={() => {
                  setPersonSheetMode("create")
                  setPersonSheetOpen(true)
                }}
                disabled={!enabled}
              >
                <UserPlus className="mr-1 h-3.5 w-3.5" />
                {merged.createNewPerson}
              </Button>
            </div>
          </div>
          <Combobox
            items={people.map((person) => person.id)}
            value={value.personId || null}
            inputValue={personInputValue}
            autoHighlight
            disabled={!enabled}
            itemToStringLabel={(id) => resolvePersonLabel(id as string) || (id as string)}
            itemToStringValue={(id) => id as string}
            onInputValueChange={(next) => {
              setPersonInputValue(next)
              setPersonSearch(next)
              if (!next) setPerson({ personId: "" })
            }}
            onValueChange={(next) => {
              const personId = (next as string | null) ?? ""
              setPerson({ personId })
              setPersonInputValue(personId ? resolvePersonLabel(personId) : "")
            }}
          >
            <ComboboxInput
              placeholder={merged.personSearchPlaceholder}
              showClear={!!value.personId}
            />
            <ComboboxContent>
              <ComboboxEmpty>{merged.personEmpty}</ComboboxEmpty>
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
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label>
              {merged.organization} <span className="text-destructive">*</span>
            </Label>
            <div className="flex items-center gap-1">
              {value.organizationId ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7"
                  onClick={() => {
                    setOrgSheetMode("edit")
                    setOrgSheetOpen(true)
                  }}
                  disabled={!enabled || !selectedOrgQuery.data}
                >
                  <Pencil className="mr-1 h-3.5 w-3.5" />
                  {merged.editOrganization}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7"
                onClick={() => {
                  setOrgSheetMode("create")
                  setOrgSheetOpen(true)
                }}
                disabled={!enabled}
              >
                <Building2 className="mr-1 h-3.5 w-3.5" />
                {merged.createNewOrganization}
              </Button>
            </div>
          </div>
          <Combobox
            items={orgs.map((org) => org.id)}
            value={value.organizationId ?? null}
            inputValue={orgInputValue}
            autoHighlight
            disabled={!enabled}
            itemToStringLabel={(id) => resolveOrgLabel(id as string) || (id as string)}
            itemToStringValue={(id) => id as string}
            onInputValueChange={(next) => {
              setOrgInputValue(next)
              setOrgSearch(next)
              if (!next) setPerson({ organizationId: null })
            }}
            onValueChange={(next) => {
              const organizationId = (next as string | null) ?? null
              setPerson({ organizationId })
              setOrgInputValue(organizationId ? resolveOrgLabel(organizationId) : "")
            }}
          >
            <ComboboxInput
              placeholder={merged.organizationSearchPlaceholder}
              showClear={!!value.organizationId}
            />
            <ComboboxContent>
              <ComboboxEmpty>{merged.organizationEmpty}</ComboboxEmpty>
              <ComboboxList>
                <ComboboxCollection>
                  {(id) => {
                    const org = orgsMap.get(id as string)
                    if (!org) return null
                    return (
                      <ComboboxItem key={org.id} value={org.id}>
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate font-medium">{org.name}</span>
                          {org.legalName ? (
                            <span className="truncate text-xs text-muted-foreground">
                              {org.legalName}
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
        </div>
      )}

      <Sheet open={personSheetOpen} onOpenChange={setPersonSheetOpen}>
        <SheetContent side="right" size="lg">
          <SheetHeader>
            <SheetTitle>
              {personSheetMode === "edit"
                ? merged.editPersonSheetTitle
                : merged.createPersonSheetTitle}
            </SheetTitle>
          </SheetHeader>
          <SheetBody>
            <PersonForm
              mode={
                personSheetMode === "edit" && selectedPersonQuery.data
                  ? { kind: "edit", person: selectedPersonQuery.data }
                  : { kind: "create" }
              }
              onCancel={() => setPersonSheetOpen(false)}
              onSuccess={(saved) => {
                setPerson({ billTo: "person", personId: saved.id, organizationId: null })
                setPersonInputValue(formatPerson(saved, locale))
                setPersonSheetOpen(false)
              }}
            />
          </SheetBody>
        </SheetContent>
      </Sheet>

      <Sheet open={orgSheetOpen} onOpenChange={setOrgSheetOpen}>
        <SheetContent side="right" size="lg">
          <SheetHeader>
            <SheetTitle>
              {orgSheetMode === "edit"
                ? merged.editOrganizationSheetTitle
                : merged.createOrganizationSheetTitle}
            </SheetTitle>
          </SheetHeader>
          <SheetBody>
            <OrganizationForm
              mode={
                orgSheetMode === "edit" && selectedOrgQuery.data
                  ? { kind: "edit", organization: selectedOrgQuery.data }
                  : { kind: "create" }
              }
              onCancel={() => setOrgSheetOpen(false)}
              onSuccess={(saved) => {
                setPerson({ billTo: "organization", personId: "", organizationId: saved.id })
                setOrgInputValue(saved.name)
                setOrgSheetOpen(false)
              }}
            />
          </SheetBody>
        </SheetContent>
      </Sheet>
    </>
  )
}

function formatPerson(person: PersonRecord | undefined, locale?: string | null): string {
  if (!person) return ""
  const name = personDisplayName(person, locale)
  return person.email ? `${name} · ${person.email}` : name
}
