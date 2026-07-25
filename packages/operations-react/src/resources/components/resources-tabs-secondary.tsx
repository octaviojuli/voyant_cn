import type { ColumnDef, OnChangeFn, RowSelectionState } from "@tanstack/react-table"
import { formatMessage } from "@voyant-travel/i18n"
import {
  Badge,
  Button,
  ConfirmActionButton,
  SelectionActionBar,
} from "@voyant-travel/ui/components"
import { DataTable } from "@voyant-travel/ui/components/data-table"
import { DataTableColumnHeader } from "@voyant-travel/ui/components/data-table-column-header"
import { TabsContent } from "@voyant-travel/ui/components/tabs"
import { ExternalLink, Pencil } from "lucide-react"
import { useResourcesUiI18nOrDefault } from "../i18n/index.js"
import {
  formatDateTimeOrFallback,
  formatResourceSlotLabel,
  formatSelectionLabel,
  formatSelectionSummary,
} from "../i18n/utils.js"
import {
  type BookingOption,
  labelById,
  type ProductOption,
  type ResourceCloseoutRow,
  type ResourceRow,
  type ResourceSlotAssignmentRow,
  type SlotOption,
} from "../index.js"
import { ResourcesSectionHeader } from "./resources-section-header.js"

type BulkFn = (args: {
  ids: string[]
  endpoint: string
  target: string
  nounSingular: string
  nounPlural: string
  payload: Record<string, unknown>
  successVerb: string
  clearSelection: () => void
}) => Promise<void> // i18n-literal-ok local callback type alias

type DeleteFn = (args: {
  ids: string[]
  endpoint: string
  target: string
  nounSingular: string
  nounPlural: string
  clearSelection: () => void
}) => Promise<void> // i18n-literal-ok local callback type alias

const assignmentColumns = (
  i18n: ReturnType<typeof useResourcesUiI18nOrDefault>,
  slots: SlotOption[],
  products: ProductOption[],
  resources: ResourceRow[],
  bookings: BookingOption[],
  onView: (assignmentId: string) => void,
  onEdit: (assignment: ResourceSlotAssignmentRow) => void,
): ColumnDef<ResourceSlotAssignmentRow>[] => [
  {
    accessorKey: "slotId",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={i18n.messages.tabsSecondary.columns.assignments.slot}
      />
    ),
    cell: ({ row }) =>
      formatResourceSlotLabel(
        slots.find((slot) => slot.id === row.original.slotId) ?? {
          id: row.original.slotId,
          productId: "",
          dateLocal: row.original.slotId,
          startsAt: row.original.slotId,
        },
        {
          template: i18n.messages.common.slotLabel,
          formatDate: i18n.formatDate,
          products,
        },
      ),
  },
  {
    accessorKey: "resourceId",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={i18n.messages.tabsSecondary.columns.assignments.resource}
      />
    ),
    cell: ({ row }) => labelById(resources, row.original.resourceId),
  },
  {
    accessorKey: "bookingId",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={i18n.messages.tabsSecondary.columns.assignments.booking}
      />
    ),
    cell: ({ row }) => labelById(bookings, row.original.bookingId),
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={i18n.messages.tabsSecondary.columns.assignments.status}
      />
    ),
    cell: ({ row }) => (
      <Badge variant="outline">
        {i18n.messages.common.assignmentStatusLabels[row.original.status]}
      </Badge>
    ),
  },
  {
    accessorKey: "releasedAt",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={i18n.messages.tabsSecondary.columns.assignments.released}
      />
    ),
    cell: ({ row }) =>
      formatDateTimeOrFallback(row.original.releasedAt, {
        fallback: i18n.messages.common.dateTimeFallback,
        formatDateTime: i18n.formatDateTime,
      }),
  },
  {
    id: "view",
    header: i18n.messages.tabsSecondary.columns.assignments.view,
    cell: ({ row }) => (
      <div className="flex flex-wrap items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={(event) => {
            event.stopPropagation()
            onView(row.original.id)
          }}
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          {i18n.messages.common.open}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={(event) => {
            event.stopPropagation()
            onEdit(row.original)
          }}
        >
          <Pencil className="mr-2 h-4 w-4" />
          {i18n.messages.common.edit}
        </Button>
      </div>
    ),
  },
]

const closeoutColumns = (
  i18n: ReturnType<typeof useResourcesUiI18nOrDefault>,
  resources: ResourceRow[],
  onEdit: (closeout: ResourceCloseoutRow) => void,
): ColumnDef<ResourceCloseoutRow>[] => [
  {
    accessorKey: "resourceId",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={i18n.messages.tabsSecondary.columns.closeouts.resource}
      />
    ),
    cell: ({ row }) => labelById(resources, row.original.resourceId),
  },
  {
    accessorKey: "dateLocal",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={i18n.messages.tabsSecondary.columns.closeouts.date}
      />
    ),
  },
  {
    accessorKey: "startsAt",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={i18n.messages.tabsSecondary.columns.closeouts.starts}
      />
    ),
    cell: ({ row }) =>
      formatDateTimeOrFallback(row.original.startsAt, {
        fallback: i18n.messages.common.dateTimeFallback,
        formatDateTime: i18n.formatDateTime,
      }),
  },
  {
    accessorKey: "endsAt",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={i18n.messages.tabsSecondary.columns.closeouts.ends}
      />
    ),
    cell: ({ row }) =>
      formatDateTimeOrFallback(row.original.endsAt, {
        fallback: i18n.messages.common.dateTimeFallback,
        formatDateTime: i18n.formatDateTime,
      }),
  },
  {
    accessorKey: "reason",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={i18n.messages.tabsSecondary.columns.closeouts.reason}
      />
    ),
    cell: ({ row }) => row.original.reason ?? "-",
  },
  {
    id: "edit",
    header: i18n.messages.common.edit,
    cell: ({ row }) => (
      <Button
        variant="ghost"
        size="sm"
        onClick={(event) => {
          event.stopPropagation()
          onEdit(row.original)
        }}
      >
        <Pencil className="mr-2 h-4 w-4" />
        {i18n.messages.common.edit}
      </Button>
    ),
  },
]

export function AssignmentsTab(props: {
  slots: SlotOption[]
  products?: ProductOption[]
  resources: ResourceRow[]
  bookings: BookingOption[]
  filteredAssignments: ResourceSlotAssignmentRow[]
  assignmentSelection: RowSelectionState
  setAssignmentSelection: OnChangeFn<RowSelectionState>
  bulkActionTarget: string | null
  handleBulkUpdate: BulkFn
  handleBulkDelete: DeleteFn
  onCreate: () => void
  onOpenRoute: (assignmentId: string) => void
  onEdit: (row: ResourceSlotAssignmentRow) => void
}) {
  const i18n = useResourcesUiI18nOrDefault()
  const m = i18n.messages
  const section = m.tabsSecondary.sections.assignments
  const selection = m.common.selectionNouns.assignment
  const products = props.products ?? []

  return (
    <TabsContent value="assignments" className="space-y-4">
      <ResourcesSectionHeader
        title={section.title}
        description={section.description}
        actionLabel={section.actionLabel}
        onAction={props.onCreate}
      />
      <DataTable
        columns={assignmentColumns(
          i18n,
          props.slots,
          products,
          props.resources,
          props.bookings,
          props.onOpenRoute,
          props.onEdit,
        )}
        data={props.filteredAssignments}
        emptyMessage={section.emptyMessage}
        enableRowSelection
        paginationMessages={i18n.messages.common.pagination}
        getRowId={(row) => row.id}
        rowSelection={props.assignmentSelection}
        onRowSelectionChange={props.setAssignmentSelection}
        renderSelectionActions={({ selectedRows, clearSelection }) => (
          <SelectionActionBar
            selectedCount={selectedRows.length}
            onClear={clearSelection}
            clearLabel={m.common.clearSelection}
            selectionSummary={formatSelectionSummary(
              selectedRows.length,
              m.common.selectionSummary,
            )}
          >
            <ConfirmActionButton
              buttonLabel={section.actions.assign.buttonLabel}
              confirmLabel={section.actions.assign.confirmLabel}
              cancelLabel={m.common.cancel}
              title={formatMessage(section.actions.assign.title, {
                selection: formatSelectionLabel(
                  selectedRows.length,
                  selection,
                  m.common.selectionLabel,
                ),
              })}
              description={section.actions.assign.description}
              disabled={props.bulkActionTarget === "assignments-assigned"}
              onConfirm={() =>
                props.handleBulkUpdate({
                  ids: selectedRows.map((row) => row.original.id),
                  endpoint: "/v1/admin/operations/slot-assignments",
                  target: "assignments-assigned",
                  nounSingular: "assignment",
                  nounPlural: "assignments",
                  payload: { status: "assigned" },
                  successVerb: section.actions.assign.successVerb,
                  clearSelection,
                })
              }
            />
            <ConfirmActionButton
              buttonLabel={section.actions.release.buttonLabel}
              confirmLabel={section.actions.release.confirmLabel}
              cancelLabel={m.common.cancel}
              title={formatMessage(section.actions.release.title, {
                selection: formatSelectionLabel(
                  selectedRows.length,
                  selection,
                  m.common.selectionLabel,
                ),
              })}
              description={section.actions.release.description}
              disabled={props.bulkActionTarget === "assignments-released"}
              onConfirm={() =>
                props.handleBulkUpdate({
                  ids: selectedRows.map((row) => row.original.id),
                  endpoint: "/v1/admin/operations/slot-assignments",
                  target: "assignments-released",
                  nounSingular: "assignment",
                  nounPlural: "assignments",
                  payload: { status: "released" },
                  successVerb: section.actions.release.successVerb,
                  clearSelection,
                })
              }
            />
            <ConfirmActionButton
              buttonLabel={section.actions.delete.buttonLabel}
              confirmLabel={section.actions.delete.confirmLabel}
              cancelLabel={m.common.cancel}
              title={formatMessage(section.actions.delete.title, {
                selection: formatSelectionLabel(
                  selectedRows.length,
                  selection,
                  m.common.selectionLabel,
                ),
              })}
              description={section.actions.delete.description}
              disabled={props.bulkActionTarget === "assignments-delete"}
              variant="destructive"
              confirmVariant="destructive"
              onConfirm={() =>
                props.handleBulkDelete({
                  ids: selectedRows.map((row) => row.original.id),
                  endpoint: "/v1/admin/operations/slot-assignments",
                  target: "assignments-delete",
                  nounSingular: "assignment",
                  nounPlural: "assignments",
                  clearSelection,
                })
              }
            />
          </SelectionActionBar>
        )}
        onRowClick={(row) => props.onEdit(row.original)}
      />
    </TabsContent>
  )
}

export function CloseoutsTab(props: {
  resources: ResourceRow[]
  filteredCloseouts: ResourceCloseoutRow[]
  closeoutSelection: RowSelectionState
  setCloseoutSelection: OnChangeFn<RowSelectionState>
  bulkActionTarget: string | null
  handleBulkDelete: DeleteFn
  onCreate: () => void
  onEdit: (row: ResourceCloseoutRow) => void
}) {
  const i18n = useResourcesUiI18nOrDefault()
  const m = i18n.messages
  const section = m.tabsSecondary.sections.closeouts
  const selection = m.common.selectionNouns.closeout

  return (
    <TabsContent value="closeouts" className="space-y-4">
      <ResourcesSectionHeader
        title={section.title}
        description={section.description}
        actionLabel={section.actionLabel}
        onAction={props.onCreate}
      />
      <DataTable
        columns={closeoutColumns(i18n, props.resources, props.onEdit)}
        data={props.filteredCloseouts}
        emptyMessage={section.emptyMessage}
        enableRowSelection
        paginationMessages={i18n.messages.common.pagination}
        getRowId={(row) => row.id}
        rowSelection={props.closeoutSelection}
        onRowSelectionChange={props.setCloseoutSelection}
        renderSelectionActions={({ selectedRows, clearSelection }) => (
          <SelectionActionBar
            selectedCount={selectedRows.length}
            onClear={clearSelection}
            clearLabel={m.common.clearSelection}
            selectionSummary={formatSelectionSummary(
              selectedRows.length,
              m.common.selectionSummary,
            )}
          >
            <ConfirmActionButton
              buttonLabel={section.actions.delete.buttonLabel}
              confirmLabel={section.actions.delete.confirmLabel}
              cancelLabel={m.common.cancel}
              title={formatMessage(section.actions.delete.title, {
                selection: formatSelectionLabel(
                  selectedRows.length,
                  selection,
                  m.common.selectionLabel,
                ),
              })}
              description={section.actions.delete.description}
              disabled={props.bulkActionTarget === "closeouts-delete"}
              variant="destructive"
              confirmVariant="destructive"
              onConfirm={() =>
                props.handleBulkDelete({
                  ids: selectedRows.map((row) => row.original.id),
                  endpoint: "/v1/admin/operations/closeouts",
                  target: "closeouts-delete",
                  nounSingular: "closeout",
                  nounPlural: "closeouts",
                  clearSelection,
                })
              }
            />
          </SelectionActionBar>
        )}
        onRowClick={(row) => props.onEdit(row.original)}
      />
    </TabsContent>
  )
}
