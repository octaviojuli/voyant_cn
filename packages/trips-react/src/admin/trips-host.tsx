// agent-quality: file-size exception -- owner: trips-react; existing UI surface stays co-located until a dedicated split preserves behavior and tests.
"use client"

import { useQuery } from "@tanstack/react-query"
import {
  useOperatorAdminMessages as useAdminMessages,
  useAdminNavigate,
} from "@voyant-travel/admin"
import { formatMessage } from "@voyant-travel/i18n"
import type { Trip, TripEnvelopeStatus, TripsListSortField } from "@voyant-travel/trips"
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
import { ArrowDown, ArrowUp, ArrowUpDown, Plus, Search, X } from "lucide-react"
import * as React from "react"

import type { ListTripsParams } from "../operations.js"
import { useVoyantTripsContext } from "../provider.js"
import { listTripsQueryOptions } from "../query-options.js"
import {
  componentTitleFor,
  readComponentSchedule,
  sortComponentsBySchedule,
} from "./trip-component-display.js"
import {
  TRIP_STATUS_ALL,
  TripListFiltersPopover,
  type TripStatusFilter,
} from "./trip-list-filters.js"

const PAGE_SIZE = 25
const SKELETON_ROWS = 6
const TABLE_COLUMN_COUNT = 7

type SortDir = NonNullable<ListTripsParams["sortDir"]>

/**
 * Initial list parameters mirrored by the `trips-index`
 * contribution's loader so the SSR-seeded cache entry and the page's first
 * `useQuery` line up on the same key.
 */
// fallow-ignore-next-line unused-export
export const initialTripsListParams: ListTripsParams = {
  limit: PAGE_SIZE,
  offset: 0,
  sortBy: "updatedAt",
  sortDir: "desc",
}

const statusBadgeVariant: Record<TripEnvelopeStatus, "default" | "secondary" | "destructive"> = {
  draft: "secondary",
  priced: "secondary",
  reserve_in_progress: "secondary",
  reserved: "default",
  checkout_started: "secondary",
  booked: "default",
  failed: "destructive",
  cancelled: "destructive",
}

/**
 * Packaged admin host for the trips list page (packaged-admin RFC Phase 3).
 * Opening a trip (or composing a new one) resolves the `"trip.detail"`
 * semantic destination (RFC §4.7); the page keeps its filter/sort/paging
 * state locally (no URL search contract), so the host takes no props.
 */
export function TripsHost() {
  const messages = useAdminMessages().trips
  const listMessages = messages.list
  const navigateTo = useAdminNavigate()
  const { baseUrl, fetcher } = useVoyantTripsContext()
  const client = React.useMemo(() => ({ baseUrl, fetcher }), [baseUrl, fetcher])

  const [search, setSearch] = React.useState("")
  const [status, setStatus] = React.useState<TripStatusFilter>(TRIP_STATUS_ALL)
  const [productId, setProductId] = React.useState<string | null>(null)
  const [accommodationId, setAccommodationId] = React.useState<string | null>(null)
  const [cruiseId, setCruiseId] = React.useState<string | null>(null)
  const [hasFlight, setHasFlight] = React.useState(false)
  const [totalMin, setTotalMin] = React.useState("")
  const [totalMax, setTotalMax] = React.useState("")
  const [createdRange, setCreatedRange] = React.useState<{
    from: string | null
    to: string | null
  } | null>(null)
  const [sortBy, setSortBy] = React.useState<TripsListSortField>("updatedAt")
  const [sortDir, setSortDir] = React.useState<SortDir>("desc")
  const [offset, setOffset] = React.useState(0)
  const [filterPopoverOpen, setFilterPopoverOpen] = React.useState(false)

  const totalMinCents = parseAmountCents(totalMin)
  const totalMaxCents = parseAmountCents(totalMax)

  const params: ListTripsParams = React.useMemo(
    () => ({
      limit: PAGE_SIZE,
      offset,
      sortBy,
      sortDir,
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(status !== TRIP_STATUS_ALL ? { status } : {}),
      ...(productId ? { productId } : {}),
      ...(accommodationId ? { accommodationId } : {}),
      ...(cruiseId ? { cruiseId } : {}),
      ...(hasFlight ? { hasFlight: true } : {}),
      ...(totalMinCents !== null ? { totalMinCents } : {}),
      ...(totalMaxCents !== null ? { totalMaxCents } : {}),
      ...(createdRange?.from ? { createdFrom: createdRange.from } : {}),
      ...(createdRange?.to ? { createdTo: createdRange.to } : {}),
    }),
    [
      offset,
      sortBy,
      sortDir,
      search,
      status,
      productId,
      accommodationId,
      cruiseId,
      hasFlight,
      totalMinCents,
      totalMaxCents,
      createdRange,
    ],
  )

  const activeFilterCount =
    (status !== TRIP_STATUS_ALL ? 1 : 0) +
    (productId ? 1 : 0) +
    (accommodationId ? 1 : 0) +
    (cruiseId ? 1 : 0) +
    (hasFlight ? 1 : 0) +
    (totalMin !== "" || totalMax !== "" ? 1 : 0) +
    (createdRange?.from || createdRange?.to ? 1 : 0)

  const { data, isPending, isFetching, isError } = useQuery(listTripsQueryOptions(client, params))

  const trips = data?.data ?? []
  const total = data?.total ?? 0
  const page = Math.floor(offset / PAGE_SIZE) + 1
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const showSkeleton = isPending || (isFetching && trips.length === 0)

  const resetOffset = () => setOffset(0)
  const handleSort = (field: TripsListSortField) => {
    setOffset(0)
    if (sortBy !== field) {
      setSortBy(field)
      setSortDir(field === "status" ? "asc" : "desc")
      return
    }
    setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))
  }

  const hasActiveFilters = search.trim() !== "" || activeFilterCount > 0
  const clearFilters = () => {
    setSearch("")
    setStatus(TRIP_STATUS_ALL)
    setProductId(null)
    setAccommodationId(null)
    setCruiseId(null)
    setHasFlight(false)
    setTotalMin("")
    setTotalMax("")
    setCreatedRange(null)
    resetOffset()
  }

  return (
    <main className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-bold text-2xl tracking-tight">{listMessages.title}</h1>
          <p className="text-muted-foreground text-sm">{listMessages.description}</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[14rem] flex-1">
            <Label htmlFor="trips-search" className="sr-only">
              {listMessages.searchLabel}
            </Label>
            <Search className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground" />
            <Input
              id="trips-search"
              placeholder={listMessages.searchPlaceholder}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                resetOffset()
              }}
              className="pl-9"
            />
          </div>

          <TripListFiltersPopover
            open={filterPopoverOpen}
            onOpenChange={setFilterPopoverOpen}
            activeFilterCount={activeFilterCount}
            status={status}
            onStatusChange={setStatus}
            productId={productId}
            onProductIdChange={setProductId}
            accommodationId={accommodationId}
            onAccommodationIdChange={setAccommodationId}
            cruiseId={cruiseId}
            onCruiseIdChange={setCruiseId}
            hasFlight={hasFlight}
            onHasFlightChange={setHasFlight}
            totalMin={totalMin}
            onTotalMinChange={setTotalMin}
            totalMax={totalMax}
            onTotalMaxChange={setTotalMax}
            createdRange={createdRange}
            onCreatedRangeChange={setCreatedRange}
            onFiltersChanged={resetOffset}
          />

          {hasActiveFilters ? (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="mr-1 size-4" />
              {listMessages.clearFilters}
            </Button>
          ) : null}

          <div className="ml-auto">
            <Button onClick={() => navigateTo("trip.detail", { tripId: "new" })}>
              <Plus className="size-4" aria-hidden="true" />
              {listMessages.newTrip}
            </Button>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{listMessages.columns.start}</TableHead>
                <TableHead>{listMessages.columns.end}</TableHead>
                <TableHead>
                  <SortHeader
                    label={listMessages.columns.status}
                    field="status"
                    sortBy={sortBy}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead>{listMessages.columns.components}</TableHead>
                <TableHead>
                  <SortHeader
                    label={listMessages.columns.total}
                    field="total"
                    sortBy={sortBy}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead>
                  <SortHeader
                    label={listMessages.columns.created}
                    field="createdAt"
                    sortBy={sortBy}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead>
                  <SortHeader
                    label={listMessages.columns.updated}
                    field="updatedAt"
                    sortBy={sortBy}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {showSkeleton ? (
                <TripTableSkeleton rows={SKELETON_ROWS} />
              ) : isError ? (
                <TableRow>
                  <TableCell
                    colSpan={TABLE_COLUMN_COUNT}
                    className="h-24 text-center text-destructive text-sm"
                  >
                    {listMessages.loadFailed}
                  </TableCell>
                </TableRow>
              ) : trips.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={TABLE_COLUMN_COUNT}
                    className="h-24 text-center text-muted-foreground text-sm"
                  >
                    {hasActiveFilters ? listMessages.emptyFiltered : listMessages.empty}
                  </TableCell>
                </TableRow>
              ) : (
                trips.map((trip) => (
                  <TripRow
                    key={trip.envelope.id}
                    trip={trip}
                    messages={messages}
                    onOpen={() => navigateTo("trip.detail", { tripId: trip.envelope.id })}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between text-muted-foreground text-sm">
          <span>
            {total === 0
              ? listMessages.countEmpty
              : formatMessage(listMessages.countRange, {
                  start: String(trips.length === 0 ? 0 : offset + 1),
                  end: String(offset + trips.length),
                  total: String(total),
                })}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0}
              onClick={() => setOffset((prev) => Math.max(0, prev - PAGE_SIZE))}
            >
              {listMessages.previous}
            </Button>
            <span>
              {formatMessage(listMessages.pageOf, {
                page: String(page),
                pageCount: String(pageCount),
              })}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={offset + PAGE_SIZE >= total}
              onClick={() => setOffset((prev) => prev + PAGE_SIZE)}
            >
              {listMessages.next}
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}

interface SortHeaderProps {
  label: string
  field: TripsListSortField
  sortBy: TripsListSortField
  sortDir: SortDir
  onSort: (field: TripsListSortField) => void
}

function SortHeader({ label, field, sortBy, sortDir, onSort }: SortHeaderProps) {
  const active = sortBy === field
  const Icon = active ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className="-ml-2 inline-flex h-8 items-center gap-1 rounded-sm px-2 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span>{label}</span>
      <Icon
        className={`size-3.5 ${active ? "text-foreground" : "text-muted-foreground/60"}`}
        aria-hidden
      />
    </button>
  )
}

function TripTableSkeleton({ rows }: { rows: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, idx) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders are stable -- owner: trips-react; existing suppression is intentional pending typed cleanup.
        <TableRow key={`skeleton-${idx}`}>
          <TableCell>
            <Skeleton className="h-4 w-20" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-20" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-20 rounded-full" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-48" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-20" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-20" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-20" />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

function TripRow({
  trip,
  messages,
  onOpen,
}: {
  trip: Trip
  messages: ReturnType<typeof useAdminMessages>["trips"]
  onOpen(): void
}) {
  const envelope = trip.envelope
  const activeComponents = sortComponentsBySchedule(
    trip.components.filter((component) => component.status !== "removed"),
  )
  const schedule = tripScheduleBounds(activeComponents)

  return (
    <TableRow className="cursor-pointer" onClick={onOpen}>
      <TableCell>
        <span className="whitespace-nowrap text-sm">{formatDate(schedule.start)}</span>
      </TableCell>
      <TableCell>
        <span className="whitespace-nowrap text-sm">{formatDate(schedule.end)}</span>
      </TableCell>
      <TableCell>
        <Badge variant={statusBadgeVariant[envelope.status]}>
          {messages.statuses[envelope.status]}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="min-w-0">
          <p>{componentCountLabel(activeComponents, messages)}</p>
          <TripComponentSummary components={activeComponents} messages={messages} />
        </div>
      </TableCell>
      <TableCell>
        {formatMoney(envelope.aggregateTotalAmountCents, envelope.aggregateCurrency)}
      </TableCell>
      <TableCell>
        <span className="whitespace-nowrap text-muted-foreground text-sm">
          {formatDate(envelope.createdAt)}
        </span>
      </TableCell>
      <TableCell>
        <span className="whitespace-nowrap text-muted-foreground text-sm">
          {formatDate(envelope.updatedAt)}
        </span>
      </TableCell>
    </TableRow>
  )
}

function componentCountLabel(
  components: Trip["components"],
  messages: ReturnType<typeof useAdminMessages>["trips"],
): string {
  const committedBookings = components.filter((component) => component.bookingId).length
  const externalRefs = components.filter(
    (component) => component.orderId || component.paymentSessionId,
  ).length
  const parts = [
    formatMessage(messages.list.componentCount, {
      count: String(components.length),
      label:
        components.length === 1 ? messages.list.componentSingular : messages.list.componentPlural,
    }),
  ]
  if (committedBookings > 0) {
    parts.push(
      formatMessage(messages.list.componentCount, {
        count: String(committedBookings),
        label:
          committedBookings === 1 ? messages.list.bookingSingular : messages.list.bookingPlural,
      }),
    )
  }
  if (externalRefs > 0) {
    parts.push(`${externalRefs} ${messages.list.external}`)
  }
  return parts.join(" · ")
}

function TripComponentSummary({
  components,
  messages,
}: {
  components: Trip["components"]
  messages: ReturnType<typeof useAdminMessages>["trips"]
}) {
  const visibleComponents = components.slice(0, 2)
  if (visibleComponents.length === 0) {
    return (
      <p className="max-w-64 truncate text-muted-foreground text-xs">
        {messages.list.noComponents}
      </p>
    )
  }
  return (
    <p className="max-w-64 truncate text-muted-foreground text-xs">
      {visibleComponents.map((component, index) => (
        <span key={component.id}>
          {index > 0 ? ", " : ""}
          <TripComponentName component={component} />
        </span>
      ))}
      {components.length > visibleComponents.length
        ? ` +${components.length - visibleComponents.length}`
        : ""}
    </p>
  )
}

function TripComponentName({ component }: { component: Trip["components"][number] }) {
  const display = useAdminMessages().trips.adminComposer.panels.componentDisplay
  return <>{componentTitleFor(component, display)}</>
}

function tripScheduleBounds(components: Trip["components"]): {
  start: string | null
  end: string | null
} {
  let start: string | null = null
  let end: string | null = null
  for (const component of components) {
    const schedule = readComponentSchedule(component)
    if (schedule.start && (!start || new Date(schedule.start) < new Date(start))) {
      start = schedule.start
    }
    const candidateEnd = schedule.end ?? schedule.start
    if (candidateEnd && (!end || new Date(candidateEnd) > new Date(end))) {
      end = candidateEnd
    }
  }
  return { start, end }
}

function parseAmountCents(value: string): number | null {
  if (value.trim() === "") return null
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return Math.round(parsed * 100)
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-"
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleDateString()
}

function formatMoney(amountCents: number | null | undefined, currency: string | null | undefined) {
  if (amountCents == null) return "-"
  return (amountCents / 100).toLocaleString(undefined, {
    style: "currency",
    currency: currency ?? "EUR",
  })
}
