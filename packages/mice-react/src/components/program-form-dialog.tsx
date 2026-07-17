"use client"

import { formatMessage } from "@voyant-travel/i18n"
import {
  Button,
  CurrencyCombobox,
  DatePicker,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@voyant-travel/ui/components"
import { Loader2 } from "lucide-react"
import { useState } from "react"

import { useProgramMutation } from "../hooks/use-program-mutation.js"
import { useMiceUiMessagesOrDefault } from "../i18n/index.js"
import type { ProgramRecord } from "../schemas.js"

/** Program types + lifecycle statuses the MICE backend accepts (`validation.ts`). */
const PROGRAM_TYPES = ["meeting", "incentive", "conference", "exhibition", "other"] as const
type ProgramType = (typeof PROGRAM_TYPES)[number]

const PROGRAM_STATUSES = [
  "lead",
  "planning",
  "contracted",
  "operating",
  "completed",
  "cancelled",
] as const
type ProgramStatus = (typeof PROGRAM_STATUSES)[number]

function statusLabel(value: string): string {
  return value.replace(/_/g, " ")
}

function toIntOrUndefined(value: string): number | undefined {
  const trimmed = value.trim()
  if (trimmed === "") return undefined
  const n = Number(trimmed)
  return Number.isInteger(n) && n >= 0 ? n : Number.NaN
}

export interface ProgramFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When provided, the dialog edits that program; otherwise it creates one. */
  program?: ProgramRecord
  /** Called with the created/updated program after a successful save. */
  onSaved?: (program: ProgramRecord) => void
}

/**
 * Create or edit a MICE program. The single form behind the "New program"
 * action on the programs list and the "Edit" action on the program detail —
 * without it the list is a dead end (nothing to open). Covers the fields an
 * operator sets directly: name, type, lifecycle status, destination, dates,
 * pax, currency, and budget.
 */
export function ProgramFormDialog({
  open,
  onOpenChange,
  program,
  onSaved,
}: ProgramFormDialogProps) {
  const editing = program !== undefined
  const m = useMiceUiMessagesOrDefault()
  const { create, update } = useProgramMutation()
  const pending = create.isPending || update.isPending

  const [name, setName] = useState(program?.name ?? "")
  const [type, setType] = useState<ProgramType>((program?.type as ProgramType) ?? "conference")
  const [status, setStatus] = useState<ProgramStatus>((program?.status as ProgramStatus) ?? "lead")
  const [destination, setDestination] = useState(program?.destination ?? "")
  const [startDate, setStartDate] = useState(program?.startDate ?? "")
  const [endDate, setEndDate] = useState(program?.endDate ?? "")
  const [estimatedPax, setEstimatedPax] = useState(
    program?.estimatedPax != null ? String(program.estimatedPax) : "",
  )
  const [confirmedPax, setConfirmedPax] = useState(
    program?.confirmedPax != null ? String(program.confirmedPax) : "",
  )
  const [currency, setCurrency] = useState(program?.currency ?? "")
  const [budget, setBudget] = useState(
    program?.budgetAmountCents != null ? String(program.budgetAmountCents / 100) : "",
  )

  const estimatedPaxValue = toIntOrUndefined(estimatedPax)
  const confirmedPaxValue = toIntOrUndefined(confirmedPax)
  const budgetTrimmed = budget.trim()
  const budgetValue = budgetTrimmed === "" ? undefined : Number(budgetTrimmed)
  const budgetInvalid =
    budgetValue !== undefined && (!Number.isFinite(budgetValue) || budgetValue < 0)
  const paxInvalid = Number.isNaN(estimatedPaxValue) || Number.isNaN(confirmedPaxValue)
  const canSubmit = name.trim().length > 0 && !paxInvalid && !budgetInvalid && !pending

  // Restore to the program's values (edit) or blanks (create) — used on close
  // so a cancelled edit doesn't leave dirty state for the next open.
  const reset = () => {
    setName(program?.name ?? "")
    setType((program?.type as ProgramType) ?? "conference")
    setStatus((program?.status as ProgramStatus) ?? "lead")
    setDestination(program?.destination ?? "")
    setStartDate(program?.startDate ?? "")
    setEndDate(program?.endDate ?? "")
    setEstimatedPax(program?.estimatedPax != null ? String(program.estimatedPax) : "")
    setConfirmedPax(program?.confirmedPax != null ? String(program.confirmedPax) : "")
    setCurrency(program?.currency ?? "")
    setBudget(program?.budgetAmountCents != null ? String(program.budgetAmountCents / 100) : "")
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const budgetCents = budgetTrimmed === "" ? undefined : Math.round((budgetValue as number) * 100)

  const submit = async () => {
    if (!canSubmit) return
    const name_ = name.trim()
    const dest = destination.trim()
    const cur = currency.trim()

    // Edit sends `null` (not `undefined`) for blanked fields so the key is
    // serialized and the backend clears the column; create omits empties.
    const saved = editing
      ? await update.mutateAsync({
          id: program.id,
          name: name_,
          type,
          status,
          destination: dest || null,
          startDate: startDate || null,
          endDate: endDate || null,
          estimatedPax: estimatedPax.trim() === "" ? null : estimatedPaxValue,
          confirmedPax: confirmedPax.trim() === "" ? null : confirmedPaxValue,
          currency: cur || null,
          budgetAmountCents: budgetCents ?? null,
        })
      : await create.mutateAsync({
          name: name_,
          type,
          status,
          destination: dest || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          estimatedPax: estimatedPaxValue,
          confirmedPax: confirmedPaxValue,
          currency: cur || undefined,
          budgetAmountCents: budgetCents,
        })
    reset()
    onOpenChange(false)
    onSaved?.(saved)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? m.programFormDialog.editTitle : m.programFormDialog.createTitle}
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="program-name">{m.programFormDialog.nameLabel}</Label>
            <Input
              id="program-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={m.programFormDialog.namePlaceholder}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="program-type">{m.programFormDialog.typeLabel}</Label>
              <Select value={type} onValueChange={(value) => setType(value as ProgramType)}>
                <SelectTrigger id="program-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROGRAM_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">
                      {m.common.programTypeLabels[t] ?? t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="program-status">{m.programFormDialog.statusLabel}</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as ProgramStatus)}>
                <SelectTrigger id="program-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROGRAM_STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {m.common.programStatusLabels[s] ?? statusLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="program-destination">{m.programFormDialog.destinationLabel}</Label>
            <Input
              id="program-destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder={m.programFormDialog.destinationPlaceholder}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="program-start">{m.programFormDialog.startDateLabel}</Label>
              <DatePicker
                value={startDate || null}
                onChange={(value) => setStartDate(value ?? "")}
                placeholder={m.programFormDialog.startDateLabel}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="program-end">{m.programFormDialog.endDateLabel}</Label>
              <DatePicker
                value={endDate || null}
                onChange={(value) => setEndDate(value ?? "")}
                placeholder={m.programFormDialog.endDateLabel}
                className="w-full"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="program-est-pax">{m.programFormDialog.estimatedPaxLabel}</Label>
              <Input
                id="program-est-pax"
                type="number"
                min={0}
                step={1}
                value={estimatedPax}
                onChange={(e) => setEstimatedPax(e.target.value)}
                aria-invalid={Number.isNaN(estimatedPaxValue) || undefined}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="program-conf-pax">{m.programFormDialog.confirmedPaxLabel}</Label>
              <Input
                id="program-conf-pax"
                type="number"
                min={0}
                step={1}
                value={confirmedPax}
                onChange={(e) => setConfirmedPax(e.target.value)}
                aria-invalid={Number.isNaN(confirmedPaxValue) || undefined}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="program-currency">{m.programFormDialog.currencyLabel}</Label>
              <CurrencyCombobox
                value={currency || null}
                onChange={(value) => setCurrency(value ?? "")}
                className="w-full"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="program-budget">
              {formatMessage(m.programFormDialog.budgetLabel, {
                currency: currency.trim() || m.programFormDialog.budgetCurrencyFallback,
              })}
            </Label>
            <Input
              id="program-budget"
              type="number"
              min={0}
              step="0.01"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              aria-invalid={budgetInvalid || undefined}
              placeholder={m.programFormDialog.budgetPlaceholder}
            />
          </div>
          {paxInvalid ? (
            <p className="text-destructive text-xs">{m.programFormDialog.paxInvalid}</p>
          ) : budgetInvalid ? (
            <p className="text-destructive text-xs">{m.programFormDialog.budgetInvalid}</p>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={pending}>
            {m.common.cancel}
          </Button>
          <Button onClick={() => void submit()} disabled={!canSubmit}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            {editing ? m.programFormDialog.saveChanges : m.programFormDialog.create}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
