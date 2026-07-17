"use client"

import { formatMessage } from "@voyant-travel/i18n"
import { Badge } from "@voyant-travel/ui/components/badge"
import { Button } from "@voyant-travel/ui/components/button"
import { Pencil } from "lucide-react"
import { useState } from "react"

import { useProgram, useProgramCostSheet } from "../hooks/use-programs.js"
import {
  type MiceProgramStatus,
  type MiceProgramType,
  useMiceUiMessagesOrDefault,
} from "../i18n/index.js"
import { ProgramCostSheetPanel } from "./program-cost-sheet-panel.js"
import { ProgramDelegatesSection } from "./program-delegates-section.js"
import { ProgramFormDialog } from "./program-form-dialog.js"
import { ProgramRfpsSection } from "./program-rfps-section.js"
import { ProgramRoomingSection } from "./program-rooming-section.js"
import { ProgramSessionsSection } from "./program-sessions-section.js"

export interface ProgramDetailPageProps {
  programId: string
}

function metaLine(
  start: string | null | undefined,
  end: string | null | undefined,
  pax: number | null | undefined,
  paxTemplate: string,
): string | null {
  const parts: string[] = []
  if (start || end) parts.push(`${start ?? "?"} → ${end ?? "?"}`)
  if (pax != null) parts.push(formatMessage(paxTemplate, { count: pax }))
  return parts.length ? parts.join(" · ") : null
}

export function ProgramDetailPage({ programId }: ProgramDetailPageProps) {
  const m = useMiceUiMessagesOrDefault()
  const { data: programResponse, isLoading } = useProgram(programId)
  const { data: costSheetResponse } = useProgramCostSheet(programId)
  const program = programResponse?.data
  const [showEdit, setShowEdit] = useState(false)

  if (isLoading && !program) {
    return <div className="p-6 text-muted-foreground text-sm">{m.common.loading}</div>
  }
  if (!program) {
    return <div className="p-6 text-muted-foreground text-sm">{m.programDetailPage.notFound}</div>
  }

  const meta = metaLine(
    program.startDate,
    program.endDate,
    program.confirmedPax ?? program.estimatedPax,
    m.programDetailPage.paxMeta,
  )

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-semibold text-2xl tracking-tight">{program.name}</h1>
            <Badge variant="outline" className="capitalize">
              {m.common.programTypeLabels[program.type as MiceProgramType] ?? program.type}
            </Badge>
            <Badge variant="secondary" className="capitalize">
              {m.common.programStatusLabels[program.status as MiceProgramStatus] ?? program.status}
            </Badge>
          </div>
          {program.destination || meta ? (
            <p className="text-muted-foreground text-sm">
              {[program.destination, meta].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </div>
        <Button variant="outline" onClick={() => setShowEdit(true)}>
          <Pencil className="size-4" aria-hidden="true" />
          {m.programDetailPage.edit}
        </Button>
      </div>

      {/* key on the record's updatedAt so a reopen after a save re-initialises
          the form from the latest values rather than stale local state. */}
      <ProgramFormDialog
        key={program.updatedAt}
        open={showEdit}
        onOpenChange={setShowEdit}
        program={program}
      />

      {costSheetResponse?.data ? (
        <ProgramCostSheetPanel costSheet={costSheetResponse.data} />
      ) : null}

      <ProgramSessionsSection programId={programId} />

      <ProgramDelegatesSection programId={programId} />

      <ProgramRoomingSection programId={programId} />

      <ProgramRfpsSection programId={programId} />
    </div>
  )
}
