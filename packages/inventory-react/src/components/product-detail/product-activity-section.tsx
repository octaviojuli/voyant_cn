import { Badge, Button } from "@voyant-travel/ui/components"
import { Activity, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import {
  type ProductActionLedgerEntryRecord,
  type ProductActionLedgerListResponse,
  useProductActionLedger,
} from "../../index.js"
import {
  actionLedgerRiskVariant,
  actionLedgerStatusVariant,
} from "../product-action-ledger-card.js"
import { useProductDetailMessages, useProductLocale } from "./host.js"
import { Section } from "./product-detail-sections.js"

function formatActionLedgerName(actionName: string) {
  const label = actionName.replace(/^product\./, "").replace(/[._-]/g, " ")
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function ProductActivitySection({ productId }: { productId: string }) {
  const messages = useProductDetailMessages()
  const productMessages = messages.products.core
  const resolvedLocale = useProductLocale()

  const [cursor, setCursor] =
    useState<ProductActionLedgerListResponse["pageInfo"]["nextCursor"]>(null)
  const ledgerQuery = useProductActionLedger(productId, { cursor, limit: 20 })
  const [pages, setPages] = useState<ProductActionLedgerListResponse[]>([])

  useEffect(() => {
    const page = ledgerQuery.data
    if (!page) return
    setPages((current) => {
      if (current.some((entry) => entry.data[0]?.id === page.data[0]?.id)) return current
      return cursor ? [...current, page] : [page]
    })
  }, [ledgerQuery.data, cursor])

  const entries = pages.flatMap((page) => page.data)
  const nextCursor = pages.at(-1)?.pageInfo.nextCursor ?? null

  const formatTimestamp = (iso: string) =>
    new Date(iso).toLocaleString(resolvedLocale, { dateStyle: "medium", timeStyle: "short" })

  return (
    <Section title={productMessages.activityTitle} contentClassName="p-0">
      {ledgerQuery.isPending && entries.length === 0 ? (
        <div className="flex justify-center py-8">
          <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
        </div>
      ) : ledgerQuery.isError && entries.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {productMessages.activityLoadFailed}
        </p>
      ) : entries.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {productMessages.activityEmpty}
        </p>
      ) : (
        <div className="max-h-[420px] overflow-y-auto">
          <ul className="divide-y">
            {entries.map((entry) => (
              <ActivityRow
                key={entry.id}
                entry={entry}
                timestamp={formatTimestamp(entry.occurredAt)}
              />
            ))}
          </ul>
          {nextCursor ? (
            <div className="border-t p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full"
                disabled={ledgerQuery.isFetching}
                onClick={() => setCursor(nextCursor)}
              >
                {ledgerQuery.isFetching ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : null}
                {productMessages.activityLoadMore}
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </Section>
  )
}

function ActivityRow({
  entry,
  timestamp,
}: {
  entry: ProductActionLedgerEntryRecord
  timestamp: string
}) {
  const messages = useProductDetailMessages()
  // Reuse the central action-ledger label maps so the activity feed matches
  // the Logs page; fall back to the raw identifier for unknown values.
  const statusLabels: Partial<Record<string, string>> =
    messages.actionLedgerPage.filtersPopover.statusOptions
  const riskLabels: Partial<Record<string, string>> =
    messages.actionLedgerPage.filtersPopover.riskOptions
  return (
    <li className="flex items-start gap-2.5 px-4 py-2.5">
      <Activity className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-xs font-medium">
            {formatActionLedgerName(entry.actionName)}
          </span>
          <Badge
            variant={actionLedgerStatusVariant[entry.status] ?? "secondary"}
            className="px-1.5 py-0 text-[10px]"
          >
            {statusLabels[entry.status] ?? entry.status.replace(/_/g, " ")}
          </Badge>
          <Badge
            variant={actionLedgerRiskVariant[entry.evaluatedRisk] ?? "outline"}
            className="px-1.5 py-0 text-[10px]"
          >
            {riskLabels[entry.evaluatedRisk] ?? entry.evaluatedRisk}
          </Badge>
        </div>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {entry.principalType}:{entry.principalId} · {timestamp}
        </p>
        {entry.mutationSummary ? (
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {entry.mutationSummary}
          </p>
        ) : null}
      </div>
    </li>
  )
}
