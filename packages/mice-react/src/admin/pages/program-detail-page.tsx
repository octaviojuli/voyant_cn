"use client"

import type { AdminRoutePageProps } from "@voyant-travel/admin"
import { ProgramDetailPage } from "../../components/program-detail-page.js"
import { useMiceUiMessagesOrDefault } from "../../i18n/index.js"

/**
 * Packaged admin route module for a MICE program's detail (packaged-admin RFC
 * Phase 3). Reads the program id from the route params the workspace shell
 * supplies and renders the package detail component — the program header plus
 * its per-currency cost sheet. Later phases nest the sessions / delegates /
 * rooming / RFP surfaces here. The route is registered with the
 * `mice.program.detail` destination so other surfaces can link to it.
 */
// fallow-ignore-next-line unused-export
export default function ProgramDetailRoute({ params }: AdminRoutePageProps) {
  const m = useMiceUiMessagesOrDefault()
  const programId = params.id ?? ""
  if (!programId) {
    return <div className="p-6 text-muted-foreground text-sm">{m.programDetailPage.notFound}</div>
  }
  return <ProgramDetailPage programId={programId} />
}
