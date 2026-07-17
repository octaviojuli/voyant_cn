"use client"

import { formatMessage } from "@voyant-travel/i18n"
import {
  Badge,
  Button,
  Checkbox,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@voyant-travel/ui/components"
import { Loader2, Plus } from "lucide-react"
import { useState } from "react"

import { useProgramSessions } from "../hooks/use-mice-lists.js"
import { useSessionMutation } from "../hooks/use-session-mutation.js"
import { type MiceSessionType, useMiceUiMessagesOrDefault } from "../i18n/index.js"
import { formatSessionTimeLabel } from "./program-session-labels.js"

/** The session types the MICE backend accepts (`createSessionSchema`). */
const SESSION_TYPES = [
  "keynote",
  "breakout",
  "meal",
  "networking",
  "gala",
  "excursion",
  "free",
] as const
type SessionType = (typeof SESSION_TYPES)[number]

export interface ProgramSessionsSectionProps {
  programId: string
}

// Mirrors the default limit `getSessionsQueryOptions` requests (the backend's
// `sessionListQuerySchema` max). When an agenda hits it the section says so
// rather than silently dropping sessions (matching the delegates/RFP surfaces).
const SESSIONS_PAGE_LIMIT = 200

/**
 * Agenda sessions for a program (RFC voyant#1489 Phase 2). Lists the program's
 * sessions and creates new ones in place — sessions are never a top-level
 * surface, they are the program's agenda, so this lives inside the program
 * detail page. Data flows through the shared `@voyant-travel/react` provider.
 */
export function ProgramSessionsSection({ programId }: ProgramSessionsSectionProps) {
  const m = useMiceUiMessagesOrDefault()
  const { data, isLoading } = useProgramSessions(programId)
  const sessions = data?.data ?? []
  const capped = sessions.length === SESSIONS_PAGE_LIMIT
  const [open, setOpen] = useState(false)

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-lg tracking-tight">{m.sessionsSection.heading}</h2>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="size-4" aria-hidden="true" />
          {m.sessionsSection.create}
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{m.sessionsSection.titleColumn}</TableHead>
              <TableHead>{m.sessionsSection.typeColumn}</TableHead>
              <TableHead>{m.sessionsSection.dayColumn}</TableHead>
              <TableHead>{m.sessionsSection.timeColumn}</TableHead>
              <TableHead>{m.sessionsSection.trackColumn}</TableHead>
              <TableHead className="text-right">{m.sessionsSection.capacityColumn}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!isLoading && sessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  {m.sessionsSection.empty}
                </TableCell>
              </TableRow>
            ) : (
              sessions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {m.sessionsSection.sessionTypeLabels[s.sessionType as MiceSessionType] ??
                        s.sessionType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {s.dayDate ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatSessionTimeLabel(s.startsAt)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{s.track ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.capacity ?? "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {capped ? (
        <p className="text-muted-foreground text-xs">
          {formatMessage(m.sessionsSection.capped, { count: SESSIONS_PAGE_LIMIT })}
        </p>
      ) : null}

      <CreateSessionDialog programId={programId} open={open} onOpenChange={setOpen} />
    </section>
  )
}

interface CreateSessionDialogProps {
  programId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

function CreateSessionDialog({ programId, open, onOpenChange }: CreateSessionDialogProps) {
  const m = useMiceUiMessagesOrDefault()
  const { create } = useSessionMutation()
  const [title, setTitle] = useState("")
  const [sessionType, setSessionType] = useState<SessionType>("breakout")
  const [dayDate, setDayDate] = useState("")
  const [track, setTrack] = useState("")
  const [capacity, setCapacity] = useState("")
  const [requiresRegistration, setRequiresRegistration] = useState(false)

  const reset = () => {
    setTitle("")
    setSessionType("breakout")
    setDayDate("")
    setTrack("")
    setCapacity("")
    setRequiresRegistration(false)
  }

  // Reset on every close so a cancelled draft doesn't reappear on reopen.
  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  // `Number` (not `parseInt`) so "12.5"/"1e2" don't silently truncate to an
  // accepted integer — anything non-integer or negative is rejected, not coerced.
  const trimmedCapacity = capacity.trim()
  const capacityNumber = trimmedCapacity === "" ? undefined : Number(trimmedCapacity)
  const capacityInvalid =
    capacityNumber !== undefined && (!Number.isInteger(capacityNumber) || capacityNumber < 0)
  const canSubmit = title.trim().length > 0 && !capacityInvalid && !create.isPending

  const submit = async () => {
    if (!canSubmit) return
    await create.mutateAsync({
      programId,
      title: title.trim(),
      sessionType,
      dayDate: dayDate || undefined,
      track: track.trim() || undefined,
      capacity: capacityNumber,
      requiresRegistration,
    })
    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.sessionsSection.dialog.title}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="session-title">{m.sessionsSection.dialog.titleLabel}</Label>
            <Input
              id="session-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={m.sessionsSection.dialog.titlePlaceholder}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="session-type">{m.sessionsSection.dialog.typeLabel}</Label>
              <Select
                value={sessionType}
                onValueChange={(value) => setSessionType(value as SessionType)}
              >
                <SelectTrigger id="session-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SESSION_TYPES.map((type) => (
                    <SelectItem key={type} value={type} className="capitalize">
                      {m.sessionsSection.sessionTypeLabels[type] ?? type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="session-day">{m.sessionsSection.dialog.dayLabel}</Label>
              <DatePicker
                value={dayDate || null}
                onChange={(value) => setDayDate(value ?? "")}
                placeholder={m.sessionsSection.dialog.dayPlaceholder}
                className="w-full"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="session-track">{m.sessionsSection.dialog.trackLabel}</Label>
              <Input
                id="session-track"
                value={track}
                onChange={(e) => setTrack(e.target.value)}
                placeholder={m.sessionsSection.dialog.trackPlaceholder}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="session-capacity">{m.sessionsSection.dialog.capacityLabel}</Label>
              <Input
                id="session-capacity"
                type="number"
                min={0}
                step={1}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                aria-invalid={capacityInvalid || undefined}
              />
              {capacityInvalid ? (
                <p className="text-destructive text-xs">
                  {m.sessionsSection.dialog.capacityInvalid}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="session-requires-registration"
              checked={requiresRegistration}
              onCheckedChange={(checked) => setRequiresRegistration(checked === true)}
            />
            <Label htmlFor="session-requires-registration">
              {m.sessionsSection.dialog.requiresRegistration}
            </Label>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={create.isPending}
          >
            {m.common.cancel}
          </Button>
          <Button onClick={() => void submit()} disabled={!canSubmit}>
            {create.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : null}
            {m.sessionsSection.dialog.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
