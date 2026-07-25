"use client"

import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@voyant-travel/ui/components"
import { Alert, AlertDescription } from "@voyant-travel/ui/components/alert"
import { Loader2 } from "lucide-react"
import { useState } from "react"
import { useCrmUiI18nOrDefault, useCrmUiMessagesOrDefault } from "../i18n/index.js"
import type { OrganizationRecord, PersonRecord } from "../index.js"
import { useOrganizationMutation, usePersonMutation } from "../index.js"
import { OrganizationCombobox } from "./organization-combobox.js"
import { PersonCombobox } from "./person-combobox.js"

export interface PersonMergeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  keepPerson: Pick<PersonRecord, "id" | "firstName" | "lastName" | "email">
  onMerged?: (person: PersonRecord) => void
}

export function PersonMergeDialog({
  open,
  onOpenChange,
  keepPerson,
  onMerged,
}: PersonMergeDialogProps) {
  const { formatPersonName, messages } = useCrmUiI18nOrDefault()
  const dialogMessages = messages.personDetail.mergeDialog
  const { merge } = usePersonMutation()
  const [mergeId, setMergeId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const invalidSelection = !mergeId || mergeId === keepPerson.id

  async function submit() {
    if (invalidSelection) return
    setError(null)
    try {
      const person = await merge.mutateAsync({ keepId: keepPerson.id, mergeId })
      onMerged?.(person)
      setMergeId(null)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : messages.common.unknownError)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) {
          setMergeId(null)
          setError(null)
        }
      }}
    >
      <DialogContent data-slot="person-merge-dialog" className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{dialogMessages.title}</DialogTitle>
          <DialogDescription>{dialogMessages.description}</DialogDescription>
        </DialogHeader>
        <DialogBody className="grid gap-3">
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="font-medium">{dialogMessages.keepLabel}</div>
            <div className="mt-1 text-muted-foreground">
              {formatPersonName(keepPerson) || keepPerson.email || keepPerson.id}
            </div>
          </div>
          <div className="grid gap-2">
            <div className="text-sm font-medium">{dialogMessages.mergeLabel}</div>
            <PersonCombobox
              value={mergeId}
              onChange={setMergeId}
              placeholder={dialogMessages.placeholder}
              emptyText={dialogMessages.empty}
              triggerClassName="w-full"
            />
            {mergeId === keepPerson.id ? (
              <p className="text-sm text-destructive">{dialogMessages.selfError}</p>
            ) : null}
          </div>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {messages.common.cancel}
          </Button>
          <Button type="button" disabled={invalidSelection || merge.isPending} onClick={submit}>
            {merge.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : null}
            {dialogMessages.action}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export interface OrganizationMergeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  keepOrganization: Pick<OrganizationRecord, "id" | "name">
  onMerged?: (organization: OrganizationRecord) => void
}

export function OrganizationMergeDialog({
  open,
  onOpenChange,
  keepOrganization,
  onMerged,
}: OrganizationMergeDialogProps) {
  const messages = useCrmUiMessagesOrDefault()
  const dialogMessages = messages.organizationDetail.mergeDialog
  const { merge } = useOrganizationMutation()
  const [mergeId, setMergeId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const invalidSelection = !mergeId || mergeId === keepOrganization.id

  async function submit() {
    if (invalidSelection) return
    setError(null)
    try {
      const organization = await merge.mutateAsync({ keepId: keepOrganization.id, mergeId })
      onMerged?.(organization)
      setMergeId(null)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : messages.common.unknownError)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) {
          setMergeId(null)
          setError(null)
        }
      }}
    >
      <DialogContent data-slot="organization-merge-dialog" className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{dialogMessages.title}</DialogTitle>
          <DialogDescription>{dialogMessages.description}</DialogDescription>
        </DialogHeader>
        <DialogBody className="grid gap-3">
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="font-medium">{dialogMessages.keepLabel}</div>
            <div className="mt-1 text-muted-foreground">{keepOrganization.name}</div>
          </div>
          <div className="grid gap-2">
            <div className="text-sm font-medium">{dialogMessages.mergeLabel}</div>
            <OrganizationCombobox
              value={mergeId}
              onChange={setMergeId}
              placeholder={dialogMessages.placeholder}
              emptyText={dialogMessages.empty}
              triggerClassName="w-full"
            />
            {mergeId === keepOrganization.id ? (
              <p className="text-sm text-destructive">{dialogMessages.selfError}</p>
            ) : null}
          </div>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {messages.common.cancel}
          </Button>
          <Button type="button" disabled={invalidSelection || merge.isPending} onClick={submit}>
            {merge.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : null}
            {dialogMessages.action}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
