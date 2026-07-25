"use client"

import { formatPersonName as formatLocalePersonName } from "@voyant-travel/i18n"
import { Badge } from "@voyant-travel/ui/components/badge"
import { Button } from "@voyant-travel/ui/components/button"
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@voyant-travel/ui/components/combobox"
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
import { Loader2, Pencil, Plus, Trash2, Users, X } from "lucide-react"
import * as React from "react"
import { useCrmUiI18nOrDefault, useCrmUiMessagesOrDefault } from "../i18n/index.js"
import {
  type PersonRecord,
  type PersonRelationshipKind,
  type PersonRelationshipRecord,
  usePeople,
  usePerson,
  usePersonRelationshipMutation,
  usePersonRelationships,
} from "../index.js"

const RELATIONSHIP_KINDS: PersonRelationshipKind[] = [
  "spouse",
  "partner",
  "parent",
  "child",
  "sibling",
  "guardian",
  "ward",
  "emergency_contact",
  "friend",
  "travel_companion",
  "other",
]

/**
 * Symmetric kind for the reverse edge. When the user picks "John is the
 * parent of Jane" we auto-write Jane → John as "child". Sibling/spouse/
 * partner/friend/etc. are reflexive. The service still respects an
 * explicit `inverseKind`; this just supplies the sensible default.
 */
function inverseOf(kind: PersonRelationshipKind): PersonRelationshipKind {
  switch (kind) {
    case "parent":
      return "child"
    case "child":
      return "parent"
    case "guardian":
      return "ward"
    case "ward":
      return "guardian"
    case "spouse":
    case "partner":
    case "sibling":
    case "friend":
    case "travel_companion":
    case "emergency_contact":
    case "other":
      return kind
  }
}

type DraftState = {
  toPersonId: string | null
  kind: PersonRelationshipKind
  isPrimary: boolean
  notes: string
}

function emptyDraft(): DraftState {
  return { toPersonId: null, kind: "travel_companion", isPrimary: false, notes: "" }
}

type EditState = { kind: "closed" } | { kind: "create" } | { kind: "edit"; id: string }

export interface PersonRelationshipsSectionProps {
  personId: string
}

/**
 * Inline list + add/edit form for a Person's relationships, rendered
 * inside the PersonForm sheet. Auto-writes the symmetric edge (the
 * service mirrors `inverseKind`).
 */
export function PersonRelationshipsSection({ personId }: PersonRelationshipsSectionProps) {
  const messages = useCrmUiMessagesOrDefault()
  const labels = messages.personForm.relationships
  const kindLabels = messages.personDetail.relationshipKindLabels
  const query = usePersonRelationships(personId)
  const mutation = usePersonRelationshipMutation(personId)
  const [editing, setEditing] = React.useState<EditState>({ kind: "closed" })

  const rawRelationships = query.data?.data ?? []

  // Each create writes both the forward and inverse edges, so a
  // direction=both list returns two rows for the same pair. Group by
  // the *other* person id, prefer the outgoing edge for display (it
  // carries the kind from this person's perspective), and fall back to
  // the incoming edge's `inverseKind`.
  const groupedRelationships = React.useMemo(() => {
    const map = new Map<
      string,
      { otherId: string; outgoing?: PersonRelationshipRecord; incoming?: PersonRelationshipRecord }
    >()
    for (const rel of rawRelationships) {
      const otherId = rel.fromPersonId === personId ? rel.toPersonId : rel.fromPersonId
      const entry = map.get(otherId) ?? { otherId }
      if (rel.fromPersonId === personId) {
        entry.outgoing = rel
      } else {
        entry.incoming = rel
      }
      map.set(otherId, entry)
    }
    return Array.from(map.values())
  }, [rawRelationships, personId])

  const excludePersonIds = React.useMemo(
    () => [personId, ...groupedRelationships.map((g) => g.otherId)],
    [personId, groupedRelationships],
  )

  const removePair = (entry: {
    outgoing?: PersonRelationshipRecord
    incoming?: PersonRelationshipRecord
  }) => {
    const id = entry.outgoing?.id ?? entry.incoming?.id
    if (id) mutation.remove.mutate(id)
  }

  const handleSubmit = async (draft: DraftState) => {
    if (!draft.toPersonId) return
    if (editing.kind === "edit") {
      await mutation.update.mutateAsync({
        id: editing.id,
        input: {
          kind: draft.kind,
          inverseKind: inverseOf(draft.kind),
          isPrimary: draft.isPrimary,
          notes: draft.notes.trim() || null,
        },
      })
    } else {
      await mutation.create.mutateAsync({
        toPersonId: draft.toPersonId,
        kind: draft.kind,
        inverseKind: inverseOf(draft.kind),
        isPrimary: draft.isPrimary,
        notes: draft.notes.trim() || null,
      })
    }
    setEditing({ kind: "closed" })
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">
          {messages.personForm.sections.relationships}
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

      {query.isPending ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
        </div>
      ) : groupedRelationships.length === 0 && editing.kind === "closed" ? (
        <p className="text-sm text-muted-foreground">{labels.empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {groupedRelationships.map((group) => {
            // Display from this person's perspective: outgoing kind
            // wins; otherwise use the incoming edge's `inverseKind`
            // (the canonical "other → me" reversal).
            const displayKind =
              group.outgoing?.kind ?? group.incoming?.inverseKind ?? group.incoming?.kind
            const displayPrimary = group.outgoing?.isPrimary || group.incoming?.isPrimary || false
            const displayNotes = group.outgoing?.notes ?? group.incoming?.notes ?? null
            const editableId = group.outgoing?.id ?? group.incoming?.id
            if (!editableId || !displayKind) return null
            const isEditingThis = editing.kind === "edit" && editing.id === editableId
            const kindLabel = kindLabels[displayKind as keyof typeof kindLabels] ?? displayKind
            return (
              <li key={group.otherId} className="rounded-md border">
                <div className="flex items-start justify-between gap-3 p-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px]">
                        {kindLabel}
                      </Badge>
                      {displayPrimary ? (
                        <Badge variant="secondary" className="text-[10px]">
                          {labels.primaryToggle}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="flex items-start gap-1.5 text-sm">
                      <Users
                        className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <RelatedPersonLabel personId={group.otherId} />
                    </div>
                    {displayNotes ? (
                      <p className="text-xs text-muted-foreground">{displayNotes}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7"
                      onClick={() =>
                        setEditing(
                          isEditingThis ? { kind: "closed" } : { kind: "edit", id: editableId },
                        )
                      }
                      aria-label={labels.kindLabel}
                    >
                      {isEditingThis ? <X className="size-3.5" /> : <Pencil className="size-3.5" />}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-destructive"
                      onClick={() => removePair(group)}
                      disabled={mutation.remove.isPending}
                      aria-label={labels.remove}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
                {isEditingThis ? (
                  <div className="border-t p-3">
                    <RelationshipInlineForm
                      initial={{
                        toPersonId: group.otherId,
                        kind: displayKind,
                        isPrimary: displayPrimary,
                        notes: displayNotes ?? "",
                      }}
                      lockPerson
                      pending={mutation.update.isPending}
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
          <RelationshipInlineForm
            initial={emptyDraft()}
            lockPerson={false}
            pending={mutation.create.isPending}
            excludePersonIds={excludePersonIds}
            onCancel={() => setEditing({ kind: "closed" })}
            onSubmit={handleSubmit}
          />
        </div>
      ) : null}
    </section>
  )
}

function RelatedPersonLabel({ personId }: { personId: string }) {
  const { locale } = useCrmUiI18nOrDefault()
  const query = usePerson(personId, { enabled: Boolean(personId) })
  const name = formatPersonName(query.data, locale)
  return <span className="truncate text-sm">{name || personId}</span>
}

function formatPersonName(person: PersonRecord | undefined, locale?: string | null): string {
  if (!person) return ""
  return formatLocalePersonName(locale, person)
}

function RelationshipInlineForm({
  initial,
  lockPerson,
  excludePersonIds = [],
  pending,
  onCancel,
  onSubmit,
}: {
  initial: DraftState
  lockPerson: boolean
  excludePersonIds?: string[]
  pending: boolean
  onCancel: () => void
  onSubmit: (draft: DraftState) => Promise<void>
}) {
  const { locale, messages } = useCrmUiI18nOrDefault()
  const labels = messages.personForm.relationships
  const kindLabels = messages.personDetail.relationshipKindLabels
  const [draft, setDraft] = React.useState<DraftState>(initial)
  const [error, setError] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState("")
  const [inputValue, setInputValue] = React.useState("")
  const peopleQuery = usePeople({ search: search || undefined, limit: 20 })
  // Always resolve the currently-selected person to a PersonRecord —
  // searches mutate `peopleQuery.data`, so without a dedicated fetch
  // the selected row drops out of the in-memory list and the combobox
  // label falls back to the raw `pers_…` id.
  const selectedPersonQuery = usePerson(draft.toPersonId ?? undefined, {
    enabled: Boolean(draft.toPersonId),
  })

  const excludeSet = React.useMemo(() => new Set(excludePersonIds), [excludePersonIds])
  const people = React.useMemo(() => {
    const map = new Map<string, PersonRecord>()
    for (const p of peopleQuery.data?.data ?? []) {
      if (!excludeSet.has(p.id)) map.set(p.id, p)
    }
    if (selectedPersonQuery.data) map.set(selectedPersonQuery.data.id, selectedPersonQuery.data)
    return Array.from(map.values())
  }, [peopleQuery.data?.data, selectedPersonQuery.data, excludeSet])
  const peopleMap = React.useMemo(() => new Map(people.map((p) => [p.id, p])), [people])

  // Keep the input mirror in sync with the selected person — covers both
  // lockPerson (edit) and the post-pick case in create mode where the
  // search input was the partial query.
  React.useEffect(() => {
    if (selectedPersonQuery.data) {
      setInputValue(formatPersonName(selectedPersonQuery.data, locale))
    }
  }, [selectedPersonQuery.data, locale])

  const submit = async () => {
    try {
      setError(null)
      await onSubmit(draft)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : labels.saveFailed)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">{labels.personLabel}</Label>
          {lockPerson ? (
            <Input
              value={formatPersonName(selectedPersonQuery.data, locale) || inputValue}
              disabled
            />
          ) : (
            <Combobox
              items={people.map((p) => p.id)}
              value={draft.toPersonId}
              inputValue={inputValue}
              autoHighlight
              itemToStringLabel={(id) =>
                formatPersonName(peopleMap.get(id as string), locale) || (id as string)
              }
              itemToStringValue={(id) => id as string}
              onInputValueChange={(next) => {
                setInputValue(next)
                setSearch(next)
                if (!next) setDraft((prev) => ({ ...prev, toPersonId: null }))
              }}
              onValueChange={(next) => {
                const id = (next as string | null) ?? null
                setDraft((prev) => ({ ...prev, toPersonId: id }))
                setInputValue(id ? formatPersonName(peopleMap.get(id), locale) : "")
              }}
            >
              <ComboboxInput
                placeholder={labels.personPlaceholder}
                showClear={!!draft.toPersonId}
              />
              <ComboboxContent>
                <ComboboxEmpty>{labels.personEmpty}</ComboboxEmpty>
                <ComboboxList>
                  <ComboboxCollection>
                    {(id) => {
                      const p = peopleMap.get(id as string)
                      if (!p) return null
                      return (
                        <ComboboxItem key={p.id} value={p.id}>
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate font-medium">
                              {formatPersonName(p, locale)}
                            </span>
                            {p.email ? (
                              <span className="truncate text-xs text-muted-foreground">
                                {p.email}
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
        <div className="space-y-1.5">
          <Label className="text-xs">{labels.kindLabel}</Label>
          <Select
            value={draft.kind}
            onValueChange={(v) =>
              setDraft((prev) => ({ ...prev, kind: v as PersonRelationshipKind }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RELATIONSHIP_KINDS.map((k) => (
                <SelectItem key={k} value={k}>
                  {kindLabels[k as keyof typeof kindLabels] ?? k}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={draft.isPrimary}
          onCheckedChange={(checked) => setDraft((prev) => ({ ...prev, isPrimary: checked }))}
        />
        <Label className="text-xs">{labels.primaryToggle}</Label>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">{labels.notesLabel}</Label>
        <Input
          value={draft.notes}
          onChange={(event) => setDraft((prev) => ({ ...prev, notes: event.target.value }))}
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
          {messages.common.cancel}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => void submit()}
          disabled={pending || !draft.toPersonId}
        >
          {pending ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : null}
          {messages.common.saveChanges}
        </Button>
      </div>
    </div>
  )
}

export type { PersonRelationshipRecord }
