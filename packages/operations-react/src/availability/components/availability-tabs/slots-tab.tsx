"use client"

import { useQueries } from "@tanstack/react-query"
import type { OnChangeFn, RowSelectionState } from "@tanstack/react-table"
import {
  getProductOptionsQueryOptions,
  useVoyantProductsContext,
} from "@voyant-travel/inventory-react"
import { Button, ConfirmActionButton, SelectionActionBar } from "@voyant-travel/ui/components"
import { DataTable } from "@voyant-travel/ui/components/data-table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@voyant-travel/ui/components/select"
import { TabsContent } from "@voyant-travel/ui/components/tabs"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { type ReactNode, useMemo } from "react"
import { useAvailabilityUiMessagesOrDefault } from "../../i18n/index.js"
import type { AvailabilitySlotRow, ProductOption } from "../../index.js"
import { formatLocalizedSelectionLabel } from "../../utils.js"
import { availabilitySlotColumns } from "../availability-columns.js"
import { AvailabilitySectionHeader } from "../availability-section-header.js"
import {
  type AvailabilityBulkDeleteFn,
  type AvailabilityBulkUpdateFn,
  type AvailabilityServerPagination,
  type AvailabilityTabMessages,
  formatTemplate,
  resolveAvailabilityPageSummary,
} from "./shared.js"

export function AvailabilitySlotsTab(props: {
  messages: AvailabilityTabMessages
  products: ProductOption[]
  filteredSlots: AvailabilitySlotRow[]
  slotSelection: RowSelectionState
  setSlotSelection: OnChangeFn<RowSelectionState>
  bulkActionTarget: string | null
  handleBulkUpdate: AvailabilityBulkUpdateFn
  handleBulkDelete: AvailabilityBulkDeleteFn
  onCreate: () => void
  onOpenRoute: (slotId: string) => void
  onEdit: (row: AvailabilitySlotRow) => void
  toolbar?: ReactNode
  hideHeader?: boolean
  asPanel?: boolean
  hideBulkDelete?: boolean
  bulkStatusSelect?: boolean
  /**
   * When provided, `filteredSlots` is one server page rather than the whole
   * result set: the table renders every row it was handed and the footer below
   * pages by re-querying the API. Omit it to keep the legacy client-side
   * pagination (all rows in memory, DataTable slices them).
   */
  serverPagination?: AvailabilityServerPagination
}) {
  useAvailabilityUiMessagesOrDefault()
  const serverPagination = props.serverPagination
  const isServerPaginated = Boolean(serverPagination)

  // Resolve each slot's option name, and learn which products have options at
  // all, so the option column can flag a missing option only when it actually
  // makes the departure unpriceable (#2062). Scope the lookup to the products
  // actually visible in the (paginated) table — one capped query per product —
  // rather than an unbounded global read (the options API caps `limit` at 100).
  const productsContext = useVoyantProductsContext()
  const visibleProductIds = useMemo(
    () => [...new Set(props.filteredSlots.map((slot) => slot.productId))],
    [props.filteredSlots],
  )
  const optionQueries = useQueries({
    queries: visibleProductIds.map((productId) =>
      getProductOptionsQueryOptions(productsContext, {
        productId,
        status: "active",
        limit: 100,
      }),
    ),
  })
  const optionInfo = useMemo(() => {
    const optionNameById = new Map<string, string>()
    const productsWithOptions = new Set<string>()
    for (const query of optionQueries) {
      for (const option of query.data?.data ?? []) {
        optionNameById.set(option.id, option.name)
        productsWithOptions.add(option.productId)
      }
    }
    return { optionNameById, productsWithOptions }
  }, [optionQueries])

  const columns = useMemo(() => {
    const baseColumns = availabilitySlotColumns(
      props.products,
      props.onOpenRoute,
      props.messages,
      props.onEdit,
      optionInfo,
    )
    if (!isServerPaginated) return baseColumns
    // The slots endpoint has no sort parameter — rows always come back ordered
    // by `startsAt`. In server-paginated mode a header sort arrow could only
    // reorder the page already in memory while reading as a sort of all
    // `total` rows, so drop the affordance rather than imply a sort we cannot
    // perform. `DataTableColumnHeader` renders a plain title once sorting is
    // disabled.
    return baseColumns.map((column) => ({ ...column, enableSorting: false }))
  }, [
    isServerPaginated,
    optionInfo,
    props.messages,
    props.onEdit,
    props.onOpenRoute,
    props.products,
  ])

  const selection = (count: number) =>
    formatLocalizedSelectionLabel(
      count,
      props.messages.nouns.slotSingular,
      props.messages.nouns.slotPlural,
    )

  const asPanel = props.asPanel ?? true
  const body = (
    <>
      {!props.hideHeader && (
        <AvailabilitySectionHeader
          title={props.messages.tabs.slots.title}
          description={props.messages.tabs.slots.description}
          actionLabel={props.messages.tabs.slots.actionLabel}
          onAction={props.onCreate}
        />
      )}
      {props.toolbar}
      <DataTable
        columns={columns}
        data={props.filteredSlots}
        emptyMessage={props.messages.tabs.slots.emptyMessage}
        enableRowSelection
        paginationMessages={props.messages.pagination}
        {...(serverPagination
          ? { pageSize: serverPagination.pageSize, showPagination: false }
          : {})}
        getRowId={(row) => row.id}
        rowSelection={props.slotSelection}
        onRowSelectionChange={props.setSlotSelection}
        renderSelectionActions={({ selectedRows, clearSelection }) => (
          <SelectionActionBar selectedCount={selectedRows.length} onClear={clearSelection}>
            {props.bulkStatusSelect ? (
              <Select
                value=""
                onValueChange={(value) => {
                  if (!value) return
                  const verb =
                    value === "open"
                      ? props.messages.verbOpened
                      : value === "closed"
                        ? props.messages.verbClosed
                        : value === "cancelled"
                          ? props.messages.verbDeactivated
                          : props.messages.verbClosed
                  props.handleBulkUpdate({
                    ids: selectedRows.map((row) => row.original.id),
                    endpoint: "/v1/admin/operations/availability/slots",
                    target: `slots-status-${value}`,
                    nounSingular: props.messages.nouns.slotSingular,
                    nounPlural: props.messages.nouns.slotPlural,
                    payload: { status: value },
                    successVerb: verb,
                    clearSelection,
                  })
                }}
              >
                <SelectTrigger size="sm" className="w-44">
                  <SelectValue placeholder={props.messages.bulkStatusPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">{props.messages.statusOpen}</SelectItem>
                  <SelectItem value="closed">{props.messages.statusClosed}</SelectItem>
                  <SelectItem value="sold_out">{props.messages.statusSoldOut}</SelectItem>
                  <SelectItem value="cancelled">{props.messages.statusCancelled}</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <>
                <ConfirmActionButton
                  buttonLabel={props.messages.tabs.slots.bulkOpenButton}
                  confirmLabel={props.messages.tabs.slots.bulkOpenConfirm}
                  title={formatTemplate(props.messages.tabs.slots.bulkOpenTitle, {
                    selection: selection(selectedRows.length),
                  })}
                  description={props.messages.tabs.slots.bulkOpenDescription}
                  disabled={props.bulkActionTarget === "slots-open"}
                  onConfirm={() =>
                    props.handleBulkUpdate({
                      ids: selectedRows.map((row) => row.original.id),
                      endpoint: "/v1/admin/operations/availability/slots",
                      target: "slots-open",
                      nounSingular: props.messages.nouns.slotSingular,
                      nounPlural: props.messages.nouns.slotPlural,
                      payload: { status: "open" },
                      successVerb: props.messages.verbOpened,
                      clearSelection,
                    })
                  }
                />
                <ConfirmActionButton
                  buttonLabel={props.messages.tabs.slots.bulkCloseButton}
                  confirmLabel={props.messages.tabs.slots.bulkCloseConfirm}
                  title={formatTemplate(props.messages.tabs.slots.bulkCloseTitle, {
                    selection: selection(selectedRows.length),
                  })}
                  description={props.messages.tabs.slots.bulkCloseDescription}
                  disabled={props.bulkActionTarget === "slots-close"}
                  onConfirm={() =>
                    props.handleBulkUpdate({
                      ids: selectedRows.map((row) => row.original.id),
                      endpoint: "/v1/admin/operations/availability/slots",
                      target: "slots-close",
                      nounSingular: props.messages.nouns.slotSingular,
                      nounPlural: props.messages.nouns.slotPlural,
                      payload: { status: "closed" },
                      successVerb: props.messages.verbClosed,
                      clearSelection,
                    })
                  }
                />
              </>
            )}
            {props.hideBulkDelete ? null : (
              <ConfirmActionButton
                buttonLabel={props.messages.tabs.slots.bulkDeleteButton}
                confirmLabel={props.messages.tabs.slots.bulkDeleteConfirm}
                title={formatTemplate(props.messages.tabs.slots.bulkDeleteTitle, {
                  selection: selection(selectedRows.length),
                })}
                description={props.messages.tabs.slots.bulkDeleteDescription}
                disabled={props.bulkActionTarget === "slots-delete"}
                variant="destructive"
                confirmVariant="destructive"
                onConfirm={() =>
                  props.handleBulkDelete({
                    ids: selectedRows.map((row) => row.original.id),
                    endpoint: "/v1/admin/operations/availability/slots",
                    target: "slots-delete",
                    nounSingular: props.messages.nouns.slotSingular,
                    nounPlural: props.messages.nouns.slotPlural,
                    clearSelection,
                  })
                }
              />
            )}
          </SelectionActionBar>
        )}
      />
      {serverPagination && serverPagination.total > 0 ? (
        <AvailabilityServerPaginationFooter
          messages={props.messages.pagination}
          pagination={serverPagination}
        />
      ) : null}
    </>
  )

  return asPanel ? (
    <TabsContent value="slots" className="space-y-4">
      {body}
    </TabsContent>
  ) : (
    <div className="flex flex-col gap-4">{body}</div>
  )
}

/**
 * Footer for a server-paginated list. Mirrors the shared
 * `DataTablePagination` layout and reuses its message templates, but the
 * counts come from the API envelope's `total` and the buttons request the
 * next/previous page from the server instead of slicing rows already loaded.
 */
function AvailabilityServerPaginationFooter({
  messages,
  pagination,
}: {
  messages: AvailabilityTabMessages["pagination"]
  pagination: AvailabilityServerPagination
}) {
  const summary = resolveAvailabilityPageSummary(pagination)

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border px-4 py-3">
      <p className="text-sm text-muted-foreground">
        {formatTemplate(messages.showing, {
          start: summary.start,
          end: summary.end,
          total: pagination.total,
        })}
      </p>
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground">
          {formatTemplate(messages.page, {
            page: summary.page,
            pageCount: summary.pageCount,
          })}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => pagination.onPageChange(pagination.pageIndex - 1)}
          disabled={!summary.canPreviousPage}
        >
          <ChevronLeft className="h-4 w-4" />
          {messages.previous}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => pagination.onPageChange(pagination.pageIndex + 1)}
          disabled={!summary.canNextPage}
        >
          {messages.next}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
