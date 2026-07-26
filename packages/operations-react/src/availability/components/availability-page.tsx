"use client"

import { useQueryClient } from "@tanstack/react-query"
import type { RowSelectionState } from "@tanstack/react-table"
import { Button, cn, Label } from "@voyant-travel/ui/components"
import { AsyncCombobox } from "@voyant-travel/ui/components/async-combobox"
import {
  CalendarProvider,
  CalendarView,
  type IEvent,
  type TCalendarView,
} from "@voyant-travel/ui/components/big-calendar"
import { DateRangePicker, type DateRangeValue } from "@voyant-travel/ui/components/date-picker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@voyant-travel/ui/components/select"
import { ToggleGroup, ToggleGroupItem } from "@voyant-travel/ui/components/toggle-group"
import { CalendarDays, List, Plus } from "lucide-react"
import type { ReactNode } from "react"
import { useState } from "react"
import { useAvailabilityUiMessagesOrDefault } from "../i18n/index.js"
import {
  type AvailabilitySlotRow,
  availabilityQueryKeys,
  type CreateAvailabilitySlotInput,
  type ProductOption,
  type UpdateAvailabilitySlotInput,
  useAvailabilitySlotMutation,
  useProducts,
  useRules,
  useSlots,
  useStartTimes,
} from "../index.js"
import {
  AvailabilitySlotDialog,
  type AvailabilitySlotSubmitPayload,
} from "./availability-dialogs.js"
import { AvailabilityBodySkeleton } from "./availability-skeletons.js"
import {
  type AvailabilityBulkDeleteFn,
  type AvailabilityBulkUpdateFn,
  AvailabilitySlotsTab,
} from "./availability-tabs.js"

/**
 * Rows requested per slots page. The list is server-paginated: one API page is
 * exactly one rendered page, so the footer's totals come from the response
 * envelope's `total` and paging issues a fresh request with a new `offset`.
 * `ensureAvailabilityPageData` seeds the same first page.
 */
export const AVAILABILITY_SLOTS_PAGE_SIZE = 25

/**
 * The calendar has no pager, so it pulls a wider window than the list does.
 * 200 is the slots endpoint's `limit` ceiling (`paginationSchema`).
 */
const AVAILABILITY_CALENDAR_SLOT_LIMIT = 200

const MS_PER_DAY = 86_400_000

/** `yyyy-MM-dd` (from the date picker) to the ISO datetime the API expects. */
function dayStartIso(dateLocal: string): string | undefined {
  const parsed = Date.parse(`${dateLocal}T00:00:00.000Z`) // i18n-literal-ok ISO datetime suffix
  return Number.isNaN(parsed) ? undefined : new Date(parsed).toISOString()
}

/** Exclusive upper bound: the start of the day after `dateLocal`. */
function dayAfterStartIso(dateLocal: string): string | undefined {
  const parsed = Date.parse(`${dateLocal}T00:00:00.000Z`) // i18n-literal-ok ISO datetime suffix
  return Number.isNaN(parsed) ? undefined : new Date(parsed + MS_PER_DAY).toISOString()
}

export type AvailabilityPageView = "list" | "calendar"
export type AvailabilityPageSlotStatusFilter = "all" | AvailabilitySlotRow["status"]
export type AvailabilityPageBulkUpdateHandler = AvailabilityBulkUpdateFn
export type AvailabilityPageBulkDeleteHandler = AvailabilityBulkDeleteFn

type DialogSubmitContext = { isEditing: boolean; id?: string }

export type AvailabilityPageSlotSubmitHandler = (
  payload: AvailabilitySlotSubmitPayload,
  context: DialogSubmitContext,
) => Promise<void> // i18n-literal-ok type annotation

export interface AvailabilityPageSlots {
  headerEnd?: ReactNode
  beforeFilters?: ReactNode
  afterFilters?: ReactNode
  dialogs?: ReactNode
}

export interface AvailabilityPageProps {
  className?: string
  defaultView?: AvailabilityPageView
  bulkActionTarget?: string | null
  onBulkUpdate: AvailabilityPageBulkUpdateHandler
  onBulkDelete: AvailabilityPageBulkDeleteHandler
  onSlotOpen?: (slotId: string) => void
  onSlotSubmit?: AvailabilityPageSlotSubmitHandler
  slots?: AvailabilityPageSlots
}

const noopId = (_id: string) => undefined

export function AvailabilityPage({
  className,
  defaultView = "list",
  bulkActionTarget = null,
  onBulkUpdate,
  onBulkDelete,
  onSlotOpen = noopId,
  onSlotSubmit,
  slots: pageSlots,
}: AvailabilityPageProps) {
  const messages = useAvailabilityUiMessagesOrDefault()
  const toolbar = messages.toolbar
  const queryClient = useQueryClient()
  const slotMutation = useAvailabilitySlotMutation()

  const [productFilter, setProductFilter] = useState("all")
  const [productSearch, setProductSearch] = useState("")
  const [slotStatusFilter, setSlotStatusFilter] = useState<AvailabilityPageSlotStatusFilter>("all")
  const [slotDateRange, setSlotDateRange] = useState<DateRangeValue | null>(null)
  const [view, setView] = useState<AvailabilityPageView>(defaultView)
  const [calendarView, setCalendarView] = useState<TCalendarView>("month")
  const [slotSelection, setSlotSelection] = useState<RowSelectionState>({})
  const [slotPageIndex, setSlotPageIndex] = useState(0)
  const [slotDialogOpen, setSlotDialogOpen] = useState(false)
  const [editingSlot, setEditingSlot] = useState<AvailabilitySlotRow | undefined>()

  const productIdFilter = productFilter === "all" ? undefined : productFilter
  const slotStatusFilterParam = slotStatusFilter === "all" ? undefined : slotStatusFilter
  // The picker yields `yyyy-MM-dd`; the API's startsAt bounds want ISO
  // datetimes, so widen each edge to a whole UTC day (upper bound exclusive).
  const slotStartsAtFrom = slotDateRange?.from ? dayStartIso(slotDateRange.from) : undefined
  const slotStartsAtUntil = slotDateRange?.to ? dayAfterStartIso(slotDateRange.to) : undefined

  const isCalendarView = view === "calendar"

  const productsQuery = useProducts({ search: productSearch || undefined, limit: 25, offset: 0 })
  // Rules + start times back the slot create/edit dialog. Eager-load so the
  // dialog opens with full options the first time, but keep the queries cheap
  // (no filters).
  const rulesQuery = useRules({ limit: 25, offset: 0 })
  const startTimesQuery = useStartTimes({ limit: 25, offset: 0 })
  // Every filter and the page offset are server-side: the endpoint owns
  // product/status/date-window matching plus the row count, so the table shows
  // (and the footer counts) every matching departure rather than whichever
  // rows happened to land in the first response.
  const slotsQuery = useSlots({
    limit: isCalendarView ? AVAILABILITY_CALENDAR_SLOT_LIMIT : AVAILABILITY_SLOTS_PAGE_SIZE,
    offset: isCalendarView ? 0 : slotPageIndex * AVAILABILITY_SLOTS_PAGE_SIZE,
    productId: productIdFilter,
    status: slotStatusFilterParam,
    startsAtFrom: slotStartsAtFrom,
    startsAtUntil: slotStartsAtUntil,
    keepPreviousData: true,
  })

  const products = productsQuery.data?.data ?? []
  const rules = rulesQuery.data?.data ?? []
  const startTimes = startTimesQuery.data?.data ?? []
  const slots = slotsQuery.data?.data ?? []
  const slotTotal = slotsQuery.data?.total ?? 0

  const selectedProduct = products.find((product) => product.id === productFilter) ?? null

  // Row selection is keyed by slot id against the rows currently loaded, so a
  // new page or filter must drop it — otherwise a bulk action could run
  // against ids the operator can no longer see.
  const resetSlotPaging = () => {
    setSlotPageIndex(0)
    setSlotSelection({})
  }

  const goToSlotPage = (nextPageIndex: number) => {
    setSlotPageIndex(Math.max(0, nextPageIndex))
    setSlotSelection({})
  }

  const slotStatusToColor: Record<AvailabilitySlotRow["status"], IEvent["color"]> = {
    open: "green",
    closed: "gray",
    sold_out: "red",
    cancelled: "yellow",
  }
  const calendarEvents: IEvent[] = slots.map((slot) => {
    const productName = products.find((product) => product.id === slot.productId)?.name
    return {
      id: slot.id,
      startDate: slot.startsAt,
      endDate: slot.endsAt ?? slot.startsAt,
      title: productName ?? slot.productName ?? messages.slotFallbackTitle,
      description: slot.notes ?? "",
      color: slotStatusToColor[slot.status],
    }
  })

  const filtersHaveValues =
    productFilter !== "all" ||
    slotStatusFilter !== "all" ||
    Boolean(slotDateRange?.from) ||
    Boolean(slotDateRange?.to)

  const refreshAll = async () => {
    await queryClient.invalidateQueries({ queryKey: availabilityQueryKeys.all })
  }

  const handleSlotSubmit: AvailabilityPageSlotSubmitHandler =
    onSlotSubmit ??
    (async (payload, context) => {
      if (context.isEditing) {
        if (!context.id) throw new Error("AvailabilityPage slot edit requires an id.")
        await slotMutation.update.mutateAsync({
          id: context.id,
          input: payload as UpdateAvailabilitySlotInput,
        })
        return
      }
      await slotMutation.create.mutateAsync(payload as CreateAvailabilitySlotInput)
    })

  const closeSlotDialog = () => {
    setSlotDialogOpen(false)
    setEditingSlot(undefined)
  }

  const isLoading =
    productsQuery.isPending ||
    rulesQuery.isPending ||
    startTimesQuery.isPending ||
    slotsQuery.isPending

  return (
    <div className={cn("flex flex-col gap-6 p-6", className)}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{messages.title}</h1>
          <p className="text-sm text-muted-foreground">{messages.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {pageSlots?.headerEnd}
          <Button
            onClick={() => {
              setEditingSlot(undefined)
              setSlotDialogOpen(true)
            }}
          >
            <Plus className="mr-2 size-4" />
            {messages.tabs.slots.actionLabel}
          </Button>
        </div>
      </div>

      {pageSlots?.beforeFilters}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="availability-product-filter" className="text-xs">
              {messages.productLabel}
            </Label>
            <AsyncCombobox<ProductOption>
              value={productFilter === "all" ? null : productFilter}
              onChange={(value) => {
                setProductFilter(value ?? "all")
                resetSlotPaging()
              }}
              items={products}
              selectedItem={selectedProduct}
              getKey={(product) => product.id}
              getLabel={(product) => product.name}
              onSearchChange={setProductSearch}
              placeholder={messages.allProducts}
              emptyText={
                productsQuery.isFetching
                  ? messages.productsComboboxSearching
                  : messages.productsComboboxEmpty
              }
              triggerClassName="w-full sm:w-64"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="availability-slot-status" className="text-xs">
              {messages.statusLabel}
            </Label>
            <Select
              value={slotStatusFilter}
              onValueChange={(value) => {
                setSlotStatusFilter((value as AvailabilityPageSlotStatusFilter) ?? "all")
                resetSlotPaging()
              }}
            >
              <SelectTrigger id="availability-slot-status" className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{toolbar.statusAll}</SelectItem>
                <SelectItem value="open">{messages.statusOpen}</SelectItem>
                <SelectItem value="closed">{messages.statusClosed}</SelectItem>
                <SelectItem value="sold_out">{messages.statusSoldOut}</SelectItem>
                <SelectItem value="cancelled">{messages.statusCancelled}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">{toolbar.dateRangeLabel}</Label>
            <DateRangePicker
              value={slotDateRange}
              onChange={(value) => {
                setSlotDateRange(value)
                resetSlotPaging()
              }}
              className="w-full sm:w-72"
              placeholder={toolbar.dateRangePlaceholder}
            />
          </div>
          {filtersHaveValues ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setProductFilter("all")
                setSlotStatusFilter("all")
                setSlotDateRange(null)
                resetSlotPaging()
              }}
            >
              {toolbar.reset}
            </Button>
          ) : null}
        </div>
        <ToggleGroup
          value={[view]}
          onValueChange={(values) => {
            const next = values[values.length - 1]
            if (next === "list" || next === "calendar") setView(next)
          }}
          variant="outline"
          aria-label={messages.title}
        >
          <ToggleGroupItem value="list" aria-label={messages.tabSlots}>
            <List className="mr-2 size-4" />
            {messages.tabSlots}
          </ToggleGroupItem>
          <ToggleGroupItem value="calendar" aria-label={messages.tabCalendar}>
            <CalendarDays className="mr-2 size-4" />
            {messages.tabCalendar}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {pageSlots?.afterFilters}

      {isLoading ? (
        <AvailabilityBodySkeleton />
      ) : view === "list" ? (
        <AvailabilitySlotsTab
          messages={messages}
          products={products}
          filteredSlots={slots}
          serverPagination={{
            pageIndex: slotPageIndex,
            pageSize: AVAILABILITY_SLOTS_PAGE_SIZE,
            total: slotTotal,
            onPageChange: goToSlotPage,
          }}
          slotSelection={slotSelection}
          setSlotSelection={setSlotSelection}
          bulkActionTarget={bulkActionTarget}
          handleBulkUpdate={onBulkUpdate}
          handleBulkDelete={onBulkDelete}
          onCreate={() => {
            setEditingSlot(undefined)
            setSlotDialogOpen(true)
          }}
          onOpenRoute={onSlotOpen}
          onEdit={(row) => {
            setEditingSlot(row)
            setSlotDialogOpen(true)
          }}
          hideHeader
          asPanel={false}
          hideBulkDelete
          bulkStatusSelect
        />
      ) : (
        <CalendarProvider events={calendarEvents} onEventClick={(event) => onSlotOpen(event.id)}>
          <CalendarView
            view={calendarView}
            onViewChange={setCalendarView}
            onDayClick={() => setCalendarView("day")}
          />
        </CalendarProvider>
      )}

      <AvailabilitySlotDialog
        messages={messages}
        open={slotDialogOpen}
        onOpenChange={setSlotDialogOpen}
        slot={editingSlot}
        products={products}
        rules={rules}
        startTimes={startTimes}
        onSubmit={handleSlotSubmit}
        onSuccess={() => {
          closeSlotDialog()
          void refreshAll()
        }}
      />

      {pageSlots?.dialogs}
    </div>
  )
}
