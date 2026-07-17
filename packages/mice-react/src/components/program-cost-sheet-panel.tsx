"use client"

import { formatMessage } from "@voyant-travel/i18n"
import { Badge } from "@voyant-travel/ui/components/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@voyant-travel/ui/components/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@voyant-travel/ui/components/table"

import { useMiceUiMessagesOrDefault } from "../i18n/index.js"
import type { CostSheetCurrencyTotals, ProgramCostSheet } from "../schemas.js"

function formatMoney(cents: number, currency: string): string {
  const amount = cents / 100
  if (currency === "UNSPECIFIED") return amount.toFixed(2)
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

export interface ProgramCostSheetPanelProps {
  costSheet: ProgramCostSheet
  /** Optional labels for i18n; sensible English defaults. */
  labels?: {
    title?: string
    description?: string
    mixedCurrencyNote?: string
    category?: string
    cost?: string
    sell?: string
    margin?: string
    rooms?: string
    space?: string
    sessions?: string
    total?: string
    empty?: string
  }
}

/**
 * Program P&L panel. Renders one block per currency (no FX is assumed — see the
 * cost-sheet service §9-Q + the mixed-currency review). Each block shows
 * cost/sell/margin per category and a program total + margin %.
 */
export function ProgramCostSheetPanel({ costSheet, labels = {} }: ProgramCostSheetPanelProps) {
  const m = useMiceUiMessagesOrDefault()
  const t = {
    title: labels.title ?? m.costSheetPanel.title,
    description: labels.description ?? m.costSheetPanel.description,
    mixedCurrencyNote: labels.mixedCurrencyNote ?? m.costSheetPanel.mixedCurrencyNote,
    category: labels.category ?? m.costSheetPanel.category,
    cost: labels.cost ?? m.costSheetPanel.cost,
    sell: labels.sell ?? m.costSheetPanel.sell,
    margin: labels.margin ?? m.costSheetPanel.margin,
    marginBadge: m.costSheetPanel.marginBadge,
    rooms: labels.rooms ?? m.costSheetPanel.rooms,
    space: labels.space ?? m.costSheetPanel.space,
    sessions: labels.sessions ?? m.costSheetPanel.sessions,
    total: labels.total ?? m.costSheetPanel.total,
    empty: labels.empty ?? m.costSheetPanel.empty,
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>{t.title}</CardTitle>
          {costSheet.mixedCurrency ? (
            <Badge variant="outline">{m.costSheetPanel.multiCurrencyBadge}</Badge>
          ) : null}
        </div>
        <CardDescription>
          {costSheet.mixedCurrency ? t.mixedCurrencyNote : t.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {costSheet.byCurrency.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t.empty}</p>
        ) : (
          costSheet.byCurrency.map((bucket) => (
            <CurrencyBlock key={bucket.currency} bucket={bucket} t={t} formatMoney={formatMoney} />
          ))
        )}
      </CardContent>
    </Card>
  )
}

function CurrencyBlock({
  bucket,
  t,
  formatMoney: fmt,
}: {
  bucket: CostSheetCurrencyTotals
  t: Record<string, string>
  formatMoney: (cents: number, currency: string) => string
}) {
  const c = bucket.currency
  const rows = [
    {
      label: t.rooms,
      cost: bucket.roomBlocks.pickedCostCents,
      sell: bucket.roomBlocks.pickedSellCents,
    },
    {
      label: t.space,
      cost: bucket.spaceBlocks.pickedCostCents,
      sell: bucket.spaceBlocks.pickedSellCents,
    },
    { label: t.sessions, cost: bucket.sessionInclusionsCostCents, sell: 0 },
  ]
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="font-medium text-sm">{c}</span>
        {bucket.marginPct !== null ? (
          <Badge variant="secondary">
            {formatMessage(t.marginBadge ?? "", { pct: bucket.marginPct })}
          </Badge>
        ) : null}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t.category}</TableHead>
            <TableHead className="text-right">{t.cost}</TableHead>
            <TableHead className="text-right">{t.sell}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.label}>
              <TableCell>{r.label}</TableCell>
              <TableCell className="text-right tabular-nums">{fmt(r.cost, c)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {r.sell ? fmt(r.sell, c) : "—"}
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="font-medium">
            <TableCell>{t.total}</TableCell>
            <TableCell className="text-right tabular-nums">{fmt(bucket.costCents, c)}</TableCell>
            <TableCell className="text-right tabular-nums">{fmt(bucket.sellCents, c)}</TableCell>
          </TableRow>
          <TableRow className="font-semibold">
            <TableCell>{t.margin}</TableCell>
            <TableCell className="text-right tabular-nums" colSpan={2}>
              {fmt(bucket.marginCents, c)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}
