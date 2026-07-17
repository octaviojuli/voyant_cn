"use client"

import { formatMessage } from "@voyant-travel/i18n"
import { Badge } from "@voyant-travel/ui/components/badge"
import { Button } from "@voyant-travel/ui/components/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@voyant-travel/ui/components/table"
import { Plus } from "lucide-react"
import { useState } from "react"

import { usePrograms } from "../hooks/use-programs.js"
import {
  type MiceProgramStatus,
  type MiceProgramType,
  useMiceUiMessagesOrDefault,
} from "../i18n/index.js"
import type { ProgramRecord } from "../schemas.js"
import { ProgramFormDialog } from "./program-form-dialog.js"

export interface ProgramsPageProps {
  /**
   * Called when a program is opened — and after one is created — so the host
   * resolves the detail route. Creating a program lands the operator straight
   * in its detail, where the agenda / delegates / sourcing surfaces live.
   */
  onProgramOpen?: (program: ProgramRecord) => void
  labels?: {
    title?: string
    description?: string
    create?: string
    name?: string
    type?: string
    status?: string
    dates?: string
    pax?: string
    empty?: string
  }
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  lead: "outline",
  planning: "secondary",
  contracted: "default",
  operating: "default",
  completed: "secondary",
  cancelled: "outline",
}

function dateRange(start?: string | null, end?: string | null): string {
  if (start && end) return `${start} → ${end}`
  return start ?? end ?? "—"
}

// 200 is the backend's hard per-page max (`programListQuerySchema`). One page
// covers any realistic operator; when it hits the cap the list says so rather
// than silently dropping the rest (matching the program sub-section surfaces).
const PROGRAMS_PAGE_LIMIT = 200

export function ProgramsPage({ onProgramOpen, labels = {} }: ProgramsPageProps) {
  const m = useMiceUiMessagesOrDefault()
  const t = {
    title: labels.title ?? m.programsPage.title,
    description: labels.description ?? m.programsPage.description,
    create: labels.create ?? m.programsPage.create,
    name: labels.name ?? m.programsPage.nameColumn,
    type: labels.type ?? m.programsPage.typeColumn,
    status: labels.status ?? m.programsPage.statusColumn,
    dates: labels.dates ?? m.programsPage.datesColumn,
    pax: labels.pax ?? m.programsPage.paxColumn,
    empty: labels.empty ?? m.programsPage.empty,
  }
  const { data, isLoading } = usePrograms({ limit: PROGRAMS_PAGE_LIMIT })
  const programs = data?.data ?? []
  const capped = programs.length === PROGRAMS_PAGE_LIMIT
  const [showCreate, setShowCreate] = useState(false)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-semibold text-2xl tracking-tight">{t.title}</h1>
          <p className="text-muted-foreground text-sm">{t.description}</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="size-4" aria-hidden="true" />
          {t.create}
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.name}</TableHead>
              <TableHead>{t.type}</TableHead>
              <TableHead>{t.status}</TableHead>
              <TableHead>{t.dates}</TableHead>
              <TableHead className="text-right">{t.pax}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!isLoading && programs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  {t.empty}
                </TableCell>
              </TableRow>
            ) : (
              programs.map((p) => (
                <TableRow
                  key={p.id}
                  className={onProgramOpen ? "cursor-pointer" : undefined}
                  onClick={onProgramOpen ? () => onProgramOpen(p) : undefined}
                >
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="capitalize">
                    {m.common.programTypeLabels[p.type as MiceProgramType] ?? p.type}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[p.status] ?? "outline"} className="capitalize">
                      {m.common.programStatusLabels[p.status as MiceProgramStatus] ?? p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {dateRange(p.startDate, p.endDate)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {p.confirmedPax ?? p.estimatedPax ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {capped ? (
        <p className="text-muted-foreground text-xs">
          {formatMessage(m.programsPage.capped, { count: PROGRAMS_PAGE_LIMIT })}
        </p>
      ) : null}

      <ProgramFormDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onSaved={(program) => onProgramOpen?.(program)}
      />
    </div>
  )
}
