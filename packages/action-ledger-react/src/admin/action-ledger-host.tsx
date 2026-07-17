// agent-quality: file-size exception -- owner: action-ledger-react; existing UI surface stays co-located until a dedicated split preserves behavior and tests.
"use client"

import { keepPreviousData, useQuery } from "@tanstack/react-query"
import type {
  ActionLedgerEntryResponse,
  ActionLedgerListResponse,
} from "@voyant-travel/action-ledger"
import {
  useAdminHref,
  useOperatorAdminMessages as useAdminMessages,
  useAdminNavigate,
  useLocale,
} from "@voyant-travel/admin"
// Type-only: binds the bookings-react `AdminDestinations` augmentation
// (`booking.detail`, ...) into this module — the target cell links booking
// rows through that shared key.
import type {} from "@voyant-travel/bookings-react/admin"
import { formatMessage } from "@voyant-travel/i18n"
import { Badge } from "@voyant-travel/ui/components/badge"
import { Button } from "@voyant-travel/ui/components/button"
import { Input } from "@voyant-travel/ui/components/input"
import { Label } from "@voyant-travel/ui/components/label"
import { Skeleton } from "@voyant-travel/ui/components/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@voyant-travel/ui/components/table"
import { ArrowDown, ArrowUp, ArrowUpDown, ExternalLink, Eye, Search, X } from "lucide-react"
import * as React from "react"

import { useVoyantActionLedgerContext } from "../provider.js"
import { ActionLedgerEntrySheet } from "./action-ledger-entry-sheet.js"
import {
  ActionLedgerFiltersPopover,
  PRINCIPAL_TYPE_ALL,
  RISK_ALL,
  STATUS_ALL,
  TARGET_TYPE_ALL,
} from "./action-ledger-filters-popover.js"
import { ACTION_LEDGER_PAGE_SIZE, getActionLedgerEntries } from "./admin-api.js"
import { actionLedgerQueryKeys } from "./query-keys.js"

type LedgerBadgeVariant = "default" | "secondary" | "outline" | "destructive"
type ActionLedgerCursor = NonNullable<ActionLedgerListResponse["pageInfo"]["nextCursor"]>
type SortDir = "asc" | "desc"

interface ActionLedgerFilters {
  actionName: string
  principalType: string
  principalId: string
  targetType: string
  targetId: string
  workflowRunId: string
  correlationId: string
  evaluatedRisk: string
  status: string
}

const EMPTY_FILTERS: ActionLedgerFilters = {
  actionName: "",
  principalType: PRINCIPAL_TYPE_ALL,
  principalId: "",
  targetType: TARGET_TYPE_ALL,
  targetId: "",
  workflowRunId: "",
  correlationId: "",
  evaluatedRisk: RISK_ALL,
  status: STATUS_ALL,
}

const PAGE_SIZE = ACTION_LEDGER_PAGE_SIZE
const SKELETON_ROW_COUNT = 6
const TABLE_COLUMN_COUNT = 8

const STATUS_VARIANT: Partial<Record<ActionLedgerEntryResponse["status"], LedgerBadgeVariant>> = {
  succeeded: "default",
  approved: "default",
  awaiting_approval: "secondary",
  requested: "secondary",
  denied: "destructive",
  failed: "destructive",
  expired: "destructive",
  cancelled: "destructive",
  superseded: "outline",
  reversed: "outline",
  compensated: "outline",
}

const RISK_VARIANT: Partial<
  Record<ActionLedgerEntryResponse["evaluatedRisk"], LedgerBadgeVariant>
> = {
  low: "outline",
  medium: "secondary",
  high: "default",
  critical: "destructive",
}

/**
 * Packaged admin host for the action-ledger Logs page (packaged-admin RFC
 * Phase 3). The page keeps its filter/cursor state locally (no URL search
 * contract); booking targets link through the `"booking.detail"` semantic
 * destination (RFC §4.7). Data flows through the shared provider context —
 * no app RPC client.
 */
export function ActionLedgerHost() {
  const { resolvedLocale } = useLocale()
  const t = useAdminMessages().actionLedgerPage
  const client = useVoyantActionLedgerContext()
  const [filters, setFilters] = React.useState<ActionLedgerFilters>(EMPTY_FILTERS)
  const [sortDir, setSortDir] = React.useState<SortDir>("desc")
  const [cursorStack, setCursorStack] = React.useState<Array<ActionLedgerCursor | null>>([null])
  const [filterPopoverOpen, setFilterPopoverOpen] = React.useState(false)
  const [selectedEntryId, setSelectedEntryId] = React.useState<string | null>(null)

  const currentCursor = cursorStack[cursorStack.length - 1] ?? null
  const filterCacheKey = React.useMemo(
    () => getFilterCacheKey(filters, sortDir),
    [filters, sortDir],
  )

  const ledgerQuery = useQuery({
    queryKey: actionLedgerQueryKeys.entries(`${filterCacheKey}|cursor=${cursorKey(currentCursor)}`),
    queryFn: () => {
      const search = buildFilterSearchParams(filters, sortDir)
      search.set("limit", String(PAGE_SIZE))
      if (currentCursor) {
        search.set("cursorOccurredAt", currentCursor.occurredAt)
        search.set("cursorId", currentCursor.id)
      }
      return getActionLedgerEntries(client, search)
    },
    placeholderData: keepPreviousData,
  })

  const entries = ledgerQuery.data?.data ?? []
  const nextCursor = ledgerQuery.data?.pageInfo.nextCursor ?? null
  const page = cursorStack.length
  const hasPrev = cursorStack.length > 1
  const hasNext = nextCursor !== null
  const showSkeleton = ledgerQuery.isLoading

  const activeFilterCount = React.useMemo(() => countActiveFilters(filters), [filters])
  const hasActiveSearch = filters.actionName !== ""
  const hasActiveFilters = activeFilterCount > 0 || hasActiveSearch

  const resetPagination = React.useCallback(() => setCursorStack([null]), [])

  const updateFilter = React.useCallback(
    <K extends keyof ActionLedgerFilters>(key: K, value: ActionLedgerFilters[K]) => {
      setFilters((current) => ({ ...current, [key]: value }))
      resetPagination()
    },
    [resetPagination],
  )

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS)
    resetPagination()
  }

  const handleSortWhen = () => {
    setSortDir((prev) => (prev === "desc" ? "asc" : "desc"))
    resetPagination()
  }

  const goNext = () => {
    if (!nextCursor) return
    setCursorStack((stack) => [...stack, nextCursor])
  }

  const goPrev = () => {
    if (cursorStack.length <= 1) return
    setCursorStack((stack) => stack.slice(0, -1))
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">{t.title}</h1>
          <p className="mt-1 text-muted-foreground text-sm">{t.description}</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[14rem] flex-1">
            <Label htmlFor="logs-search" className="sr-only">
              {t.searchAria}
            </Label>
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="logs-search"
              placeholder={t.searchPlaceholder}
              value={filters.actionName}
              onChange={(event) => updateFilter("actionName", event.target.value)}
              className="pl-9"
            />
          </div>

          <ActionLedgerFiltersPopover
            open={filterPopoverOpen}
            onOpenChange={setFilterPopoverOpen}
            activeFilterCount={activeFilterCount}
            principalType={filters.principalType}
            onPrincipalTypeChange={(value) => {
              setFilters((current) => ({ ...current, principalType: value, principalId: "" }))
              resetPagination()
            }}
            principalId={filters.principalId}
            onPrincipalIdChange={(value) => updateFilter("principalId", value)}
            targetType={filters.targetType}
            onTargetTypeChange={(value) => {
              setFilters((current) => ({ ...current, targetType: value, targetId: "" }))
              resetPagination()
            }}
            targetId={filters.targetId}
            onTargetIdChange={(value) => updateFilter("targetId", value)}
            workflowRunId={filters.workflowRunId}
            onWorkflowRunIdChange={(value) => updateFilter("workflowRunId", value)}
            correlationId={filters.correlationId}
            onCorrelationIdChange={(value) => updateFilter("correlationId", value)}
            evaluatedRisk={filters.evaluatedRisk}
            onEvaluatedRiskChange={(value) => updateFilter("evaluatedRisk", value)}
            status={filters.status}
            onStatusChange={(value) => updateFilter("status", value)}
          />

          {hasActiveFilters ? (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="mr-1 size-4" />
              {t.clear}
            </Button>
          ) : null}
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <SortHeader
                    label={t.table.headerWhen}
                    sortDir={sortDir}
                    onSort={handleSortWhen}
                  />
                </TableHead>
                <TableHead>{t.table.headerAction}</TableHead>
                <TableHead>{t.table.headerActor}</TableHead>
                <TableHead>{t.table.headerTarget}</TableHead>
                <TableHead>{t.table.headerWorkflow}</TableHead>
                <TableHead>{t.table.headerRisk}</TableHead>
                <TableHead>{t.table.headerStatus}</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {showSkeleton ? (
                <LedgerTableSkeleton rows={SKELETON_ROW_COUNT} />
              ) : ledgerQuery.isError ? (
                <TableRow>
                  <TableCell
                    colSpan={TABLE_COLUMN_COUNT}
                    className="h-24 text-center text-destructive text-sm"
                  >
                    {t.table.loadFailed}
                  </TableCell>
                </TableRow>
              ) : entries.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={TABLE_COLUMN_COUNT}
                    className="h-24 text-center text-muted-foreground text-sm"
                  >
                    {t.table.empty}
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry) => (
                  <LedgerRow
                    key={entry.id}
                    entry={entry}
                    locale={resolvedLocale}
                    onSelect={setSelectedEntryId}
                    viewAriaTemplate={t.viewEntryAria}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between text-muted-foreground text-sm">
          <span>
            {entries.length === 0
              ? t.footer.empty
              : entries.length === 1
                ? t.footer.showingOne
                : formatMessage(t.footer.showingMany, { count: entries.length })}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!hasPrev || ledgerQuery.isFetching}
              onClick={goPrev}
            >
              {t.footer.previous}
            </Button>
            <span>{formatMessage(t.footer.pageLabel, { page })}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasNext || ledgerQuery.isFetching}
              onClick={goNext}
            >
              {t.footer.next}
            </Button>
          </div>
        </div>
      </div>

      <ActionLedgerEntrySheet
        open={Boolean(selectedEntryId)}
        onOpenChange={(open) => {
          if (!open) setSelectedEntryId(null)
        }}
        entryId={selectedEntryId}
        locale={resolvedLocale}
      />
    </div>
  )
}

interface SortHeaderProps {
  label: string
  sortDir: SortDir
  onSort: () => void
}

function SortHeader({ label, sortDir, onSort }: SortHeaderProps) {
  const Icon = sortDir === "asc" ? ArrowUp : sortDir === "desc" ? ArrowDown : ArrowUpDown
  return (
    <button
      type="button"
      onClick={onSort}
      className="-ml-2 inline-flex h-8 items-center gap-1 rounded-sm px-2 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span>{label}</span>
      <Icon className="size-3.5 text-foreground" aria-hidden />
    </button>
  )
}

function LedgerTableSkeleton({ rows }: { rows: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, idx) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders are stable -- owner: action-ledger-react; existing suppression is intentional pending typed cleanup.
        <TableRow key={`logs-skeleton-${idx}`}>
          <TableCell>
            <Skeleton className="h-4 w-28" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-40" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-28" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-32" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-24" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-16 rounded-full" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-20 rounded-full" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-8 w-8 rounded-md" />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

function LedgerRow({
  entry,
  locale,
  onSelect,
  viewAriaTemplate,
}: {
  entry: ActionLedgerEntryResponse
  locale: string
  onSelect: (id: string) => void
  viewAriaTemplate: string
}) {
  const resolveHref = useAdminHref()
  const navigateTo = useAdminNavigate()
  const labels = useAdminMessages().actionLedgerPage.filtersPopover
  return (
    <TableRow className="cursor-pointer" onClick={() => onSelect(entry.id)}>
      <TableCell className="whitespace-nowrap text-muted-foreground text-xs">
        {formatDateTime(entry.occurredAt, locale)}
      </TableCell>
      <TableCell>
        <div className="font-medium">{formatActionName(entry.actionName)}</div>
        <div className="mt-0.5 max-w-[16rem] truncate text-muted-foreground text-xs">
          {entry.routeOrToolName ?? entry.id}
        </div>
      </TableCell>
      <TableCell>
        <div className="font-medium">{labels.principalTypeOptions[entry.principalType]}</div>
        <div className="mt-0.5 max-w-[13rem] truncate font-mono text-muted-foreground text-xs">
          {entry.principalId}
        </div>
      </TableCell>
      <TableCell>
        <div className="font-medium">
          {formatTargetTypeLabel(entry.targetType, labels.targetTypeOptions)}
        </div>
        <div className="mt-0.5 max-w-[14rem] truncate font-mono text-muted-foreground text-xs">
          {entry.targetType === "booking" ? (
            <a
              href={resolveHref("booking.detail", { bookingId: entry.targetId })}
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                navigateTo("booking.detail", { bookingId: entry.targetId })
              }}
              className="inline-flex items-center text-primary underline-offset-4 hover:underline"
            >
              {entry.targetId}
              <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          ) : (
            entry.targetId
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="max-w-[12rem] truncate font-mono text-muted-foreground text-xs">
          {entry.workflowRunId ?? entry.correlationId ?? "-"}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={RISK_VARIANT[entry.evaluatedRisk] ?? "outline"}>
          {labels.riskOptions[entry.evaluatedRisk]}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant={STATUS_VARIANT[entry.status] ?? "outline"}>
          {labels.statusOptions[entry.status]}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label={formatMessage(viewAriaTemplate, { id: entry.id })}
          onClick={(event) => {
            event.stopPropagation()
            onSelect(entry.id)
          }}
        >
          <Eye className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  )
}

function getFilterCacheKey(filters: ActionLedgerFilters, sortDir: SortDir) {
  return buildFilterSearchParams(filters, sortDir).toString()
}

function buildFilterSearchParams(filters: ActionLedgerFilters, sortDir: SortDir) {
  const search = new URLSearchParams({ sortDir })
  for (const [key, value] of Object.entries(filters)) {
    const trimmed = typeof value === "string" ? value.trim() : ""
    if (!trimmed || trimmed === PRINCIPAL_TYPE_ALL || trimmed === TARGET_TYPE_ALL) continue
    if (trimmed === RISK_ALL || trimmed === STATUS_ALL) continue
    search.set(key, trimmed)
  }
  return search
}

function cursorKey(cursor: ActionLedgerCursor | null) {
  if (!cursor) return "first"
  return `${cursor.occurredAt}:${cursor.id}`
}

function countActiveFilters(filters: ActionLedgerFilters) {
  let count = 0
  if (filters.principalType !== PRINCIPAL_TYPE_ALL) count += 1
  if (filters.principalId.trim()) count += 1
  if (filters.targetType !== TARGET_TYPE_ALL) count += 1
  if (filters.targetId.trim()) count += 1
  if (filters.workflowRunId.trim()) count += 1
  if (filters.correlationId.trim()) count += 1
  if (filters.evaluatedRisk !== RISK_ALL) count += 1
  if (filters.status !== STATUS_ALL) count += 1
  return count
}

function formatDateTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function formatActionName(value: string) {
  return value.replaceAll(".", " / ").replaceAll("_", " ")
}

function formatTargetType(value: string) {
  return value.replaceAll("_", " ")
}

type TargetTypeOptionLabels = ReturnType<
  typeof useAdminMessages
>["actionLedgerPage"]["filtersPopover"]["targetTypeOptions"]

/**
 * Target types are freeform strings on the wire — known types render the
 * localized filter-option label, unknown ones fall back to the raw
 * underscore-split value.
 */
function formatTargetTypeLabel(value: string, labels: TargetTypeOptionLabels) {
  if (value !== "any" && value in labels) {
    return labels[value as keyof TargetTypeOptionLabels]
  }
  return formatTargetType(value)
}
