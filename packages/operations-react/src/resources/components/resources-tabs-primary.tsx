// agent-quality: file-size exception -- owner: resources-react; existing UI surface stays co-located until a dedicated split preserves behavior and tests.
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
import { formatSelectionLabel, formatSelectionSummary } from "../i18n/utils.js"
import {
  labelById,
  type ProductOption,
  type ResourceAllocationRow,
  type ResourcePoolRow,
  type ResourceRow,
  type SupplierOption,
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

const resourceColumns = (
  i18n: ReturnType<typeof useResourcesUiI18nOrDefault>,
  suppliers: SupplierOption[],
  onView: (resourceId: string) => void,
  onEdit: (resource: ResourceRow) => void,
): ColumnDef<ResourceRow>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={i18n.messages.tabsPrimary.columns.resources.name}
      />
    ),
  },
  {
    accessorKey: "kind",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={i18n.messages.tabsPrimary.columns.resources.kind}
      />
    ),
    cell: ({ row }) => (
      <Badge variant="outline">{i18n.messages.common.resourceKindLabels[row.original.kind]}</Badge>
    ),
  },
  {
    accessorKey: "supplierId",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={i18n.messages.tabsPrimary.columns.resources.supplier}
      />
    ),
    cell: ({ row }) => labelById(suppliers, row.original.supplierId),
  },
  {
    accessorKey: "capacity",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={i18n.messages.tabsPrimary.columns.resources.capacity}
      />
    ),
    cell: ({ row }) =>
      row.original.capacity === null ? "-" : i18n.formatNumber(row.original.capacity),
  },
  {
    accessorKey: "active",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={i18n.messages.tabsPrimary.columns.resources.status}
      />
    ),
    cell: ({ row }) => (
      <Badge variant={row.original.active ? "default" : "secondary"}>
        {row.original.active ? i18n.messages.common.active : i18n.messages.common.inactive}
      </Badge>
    ),
  },
  {
    id: "view",
    header: i18n.messages.tabsPrimary.columns.resources.view,
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

const poolColumns = (
  i18n: ReturnType<typeof useResourcesUiI18nOrDefault>,
  products: ProductOption[],
  onView: (poolId: string) => void,
  onEdit: (pool: ResourcePoolRow) => void,
): ColumnDef<ResourcePoolRow>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={i18n.messages.tabsPrimary.columns.pools.name} />
    ),
  },
  {
    accessorKey: "kind",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={i18n.messages.tabsPrimary.columns.pools.kind} />
    ),
    cell: ({ row }) => (
      <Badge variant="outline">{i18n.messages.common.resourceKindLabels[row.original.kind]}</Badge>
    ),
  },
  {
    accessorKey: "productId",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={i18n.messages.tabsPrimary.columns.pools.product}
      />
    ),
    cell: ({ row }) => labelById(products, row.original.productId),
  },
  {
    accessorKey: "sharedCapacity",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={i18n.messages.tabsPrimary.columns.pools.sharedCapacity}
      />
    ),
    cell: ({ row }) =>
      row.original.sharedCapacity === null ? "-" : i18n.formatNumber(row.original.sharedCapacity),
  },
  {
    id: "view",
    header: i18n.messages.tabsPrimary.columns.pools.view,
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

const allocationColumns = (
  i18n: ReturnType<typeof useResourcesUiI18nOrDefault>,
  pools: ResourcePoolRow[],
  products: ProductOption[],
  onView: (allocationId: string) => void,
  onEdit: (allocation: ResourceAllocationRow) => void,
): ColumnDef<ResourceAllocationRow>[] => [
  {
    accessorKey: "poolId",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={i18n.messages.tabsPrimary.columns.allocations.pool}
      />
    ),
    cell: ({ row }) => labelById(pools, row.original.poolId),
  },
  {
    accessorKey: "productId",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={i18n.messages.tabsPrimary.columns.allocations.product}
      />
    ),
    cell: ({ row }) => labelById(products, row.original.productId),
  },
  {
    accessorKey: "allocationMode",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={i18n.messages.tabsPrimary.columns.allocations.mode}
      />
    ),
    cell: ({ row }) => (
      <Badge variant="outline">
        {i18n.messages.common.allocationModeLabels[row.original.allocationMode]}
      </Badge>
    ),
  },
  {
    accessorKey: "quantityRequired",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={i18n.messages.tabsPrimary.columns.allocations.quantityRequired}
      />
    ),
    cell: ({ row }) => i18n.formatNumber(row.original.quantityRequired),
  },
  {
    accessorKey: "priority",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={i18n.messages.tabsPrimary.columns.allocations.priority}
      />
    ),
    cell: ({ row }) => i18n.formatNumber(row.original.priority),
  },
  {
    id: "view",
    header: i18n.messages.tabsPrimary.columns.allocations.view,
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

export function ResourcesTab(props: {
  suppliers: SupplierOption[]
  filteredResources: ResourceRow[]
  resourceSelection: RowSelectionState
  setResourceSelection: OnChangeFn<RowSelectionState>
  bulkActionTarget: string | null
  handleBulkUpdate: BulkFn
  handleBulkDelete: DeleteFn
  onCreate: () => void
  onOpenRoute: (resourceId: string) => void
  onEdit: (row: ResourceRow) => void
}) {
  const i18n = useResourcesUiI18nOrDefault()
  const m = i18n.messages
  const section = m.tabsPrimary.sections.resources
  const selection = m.common.selectionNouns.resource

  return (
    <TabsContent value="resources" className="space-y-4">
      <ResourcesSectionHeader
        title={section.title}
        description={section.description}
        actionLabel={section.actionLabel}
        onAction={props.onCreate}
      />
      <DataTable
        columns={resourceColumns(i18n, props.suppliers, props.onOpenRoute, props.onEdit)}
        data={props.filteredResources}
        emptyMessage={section.emptyMessage}
        enableRowSelection
        paginationMessages={i18n.messages.common.pagination}
        getRowId={(row) => row.id}
        rowSelection={props.resourceSelection}
        onRowSelectionChange={props.setResourceSelection}
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
              buttonLabel={section.actions.activate.buttonLabel}
              confirmLabel={section.actions.activate.confirmLabel}
              cancelLabel={m.common.cancel}
              title={formatMessage(section.actions.activate.title, {
                selection: formatSelectionLabel(
                  selectedRows.length,
                  selection,
                  m.common.selectionLabel,
                ),
              })}
              description={section.actions.activate.description}
              disabled={props.bulkActionTarget === "resources-activate"}
              onConfirm={() =>
                props.handleBulkUpdate({
                  ids: selectedRows.map((row) => row.original.id),
                  endpoint: "/v1/admin/operations/resources",
                  target: "resources-activate",
                  nounSingular: "resource",
                  nounPlural: "resources",
                  payload: { active: true },
                  successVerb: section.actions.activate.successVerb,
                  clearSelection,
                })
              }
            />
            <ConfirmActionButton
              buttonLabel={section.actions.deactivate.buttonLabel}
              confirmLabel={section.actions.deactivate.confirmLabel}
              cancelLabel={m.common.cancel}
              title={formatMessage(section.actions.deactivate.title, {
                selection: formatSelectionLabel(
                  selectedRows.length,
                  selection,
                  m.common.selectionLabel,
                ),
              })}
              description={section.actions.deactivate.description}
              disabled={props.bulkActionTarget === "resources-deactivate"}
              onConfirm={() =>
                props.handleBulkUpdate({
                  ids: selectedRows.map((row) => row.original.id),
                  endpoint: "/v1/admin/operations/resources",
                  target: "resources-deactivate",
                  nounSingular: "resource",
                  nounPlural: "resources",
                  payload: { active: false },
                  successVerb: section.actions.deactivate.successVerb,
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
              disabled={props.bulkActionTarget === "resources-delete"}
              variant="destructive"
              confirmVariant="destructive"
              onConfirm={() =>
                props.handleBulkDelete({
                  ids: selectedRows.map((row) => row.original.id),
                  endpoint: "/v1/admin/operations/resources",
                  target: "resources-delete",
                  nounSingular: "resource",
                  nounPlural: "resources",
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

export function PoolsTab(props: {
  products: ProductOption[]
  filteredPools: ResourcePoolRow[]
  poolSelection: RowSelectionState
  setPoolSelection: OnChangeFn<RowSelectionState>
  bulkActionTarget: string | null
  handleBulkUpdate: BulkFn
  handleBulkDelete: DeleteFn
  onCreate: () => void
  onOpenRoute: (poolId: string) => void
  onEdit: (row: ResourcePoolRow) => void
}) {
  const i18n = useResourcesUiI18nOrDefault()
  const m = i18n.messages
  const section = m.tabsPrimary.sections.pools
  const selection = m.common.selectionNouns.pool

  return (
    <TabsContent value="pools" className="space-y-4">
      <ResourcesSectionHeader
        title={section.title}
        description={section.description}
        actionLabel={section.actionLabel}
        onAction={props.onCreate}
      />
      <DataTable
        columns={poolColumns(i18n, props.products, props.onOpenRoute, props.onEdit)}
        data={props.filteredPools}
        emptyMessage={section.emptyMessage}
        enableRowSelection
        paginationMessages={i18n.messages.common.pagination}
        getRowId={(row) => row.id}
        rowSelection={props.poolSelection}
        onRowSelectionChange={props.setPoolSelection}
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
              buttonLabel={section.actions.activate.buttonLabel}
              confirmLabel={section.actions.activate.confirmLabel}
              cancelLabel={m.common.cancel}
              title={formatMessage(section.actions.activate.title, {
                selection: formatSelectionLabel(
                  selectedRows.length,
                  selection,
                  m.common.selectionLabel,
                ),
              })}
              description={section.actions.activate.description}
              disabled={props.bulkActionTarget === "pools-activate"}
              onConfirm={() =>
                props.handleBulkUpdate({
                  ids: selectedRows.map((row) => row.original.id),
                  endpoint: "/v1/admin/operations/pools",
                  target: "pools-activate",
                  nounSingular: "pool",
                  nounPlural: "pools",
                  payload: { active: true },
                  successVerb: section.actions.activate.successVerb,
                  clearSelection,
                })
              }
            />
            <ConfirmActionButton
              buttonLabel={section.actions.deactivate.buttonLabel}
              confirmLabel={section.actions.deactivate.confirmLabel}
              cancelLabel={m.common.cancel}
              title={formatMessage(section.actions.deactivate.title, {
                selection: formatSelectionLabel(
                  selectedRows.length,
                  selection,
                  m.common.selectionLabel,
                ),
              })}
              description={section.actions.deactivate.description}
              disabled={props.bulkActionTarget === "pools-deactivate"}
              onConfirm={() =>
                props.handleBulkUpdate({
                  ids: selectedRows.map((row) => row.original.id),
                  endpoint: "/v1/admin/operations/pools",
                  target: "pools-deactivate",
                  nounSingular: "pool",
                  nounPlural: "pools",
                  payload: { active: false },
                  successVerb: section.actions.deactivate.successVerb,
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
              disabled={props.bulkActionTarget === "pools-delete"}
              variant="destructive"
              confirmVariant="destructive"
              onConfirm={() =>
                props.handleBulkDelete({
                  ids: selectedRows.map((row) => row.original.id),
                  endpoint: "/v1/admin/operations/pools",
                  target: "pools-delete",
                  nounSingular: "pool",
                  nounPlural: "pools",
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

export function AllocationsTab(props: {
  pools: ResourcePoolRow[]
  products: ProductOption[]
  filteredAllocations: ResourceAllocationRow[]
  allocationSelection: RowSelectionState
  setAllocationSelection: OnChangeFn<RowSelectionState>
  bulkActionTarget: string | null
  handleBulkDelete: DeleteFn
  onCreate: () => void
  onOpenRoute: (allocationId: string) => void
  onEdit: (row: ResourceAllocationRow) => void
}) {
  const i18n = useResourcesUiI18nOrDefault()
  const m = i18n.messages
  const section = m.tabsPrimary.sections.allocations
  const selection = m.common.selectionNouns.allocation

  return (
    <TabsContent value="allocations" className="space-y-4">
      <ResourcesSectionHeader
        title={section.title}
        description={section.description}
        actionLabel={section.actionLabel}
        onAction={props.onCreate}
      />
      <DataTable
        columns={allocationColumns(
          i18n,
          props.pools,
          props.products,
          props.onOpenRoute,
          props.onEdit,
        )}
        data={props.filteredAllocations}
        emptyMessage={section.emptyMessage}
        enableRowSelection
        paginationMessages={i18n.messages.common.pagination}
        getRowId={(row) => row.id}
        rowSelection={props.allocationSelection}
        onRowSelectionChange={props.setAllocationSelection}
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
              disabled={props.bulkActionTarget === "allocations-delete"}
              variant="destructive"
              confirmVariant="destructive"
              onConfirm={() =>
                props.handleBulkDelete({
                  ids: selectedRows.map((row) => row.original.id),
                  endpoint: "/v1/admin/operations/allocations",
                  target: "allocations-delete",
                  nounSingular: "allocation",
                  nounPlural: "allocations",
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
