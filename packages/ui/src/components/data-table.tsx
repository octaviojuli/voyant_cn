"use client"

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type OnChangeFn,
  type Row,
  type RowSelectionState,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table"
import * as React from "react"

import { cn } from "../lib/utils.js"

import { Checkbox } from "./checkbox.js"
import { DataTablePagination, type DataTablePaginationMessages } from "./data-table-pagination.js"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table.js"

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  onRowClick?: (row: Row<TData>) => void
  emptyMessage?: string
  pageSize?: number
  showPagination?: boolean
  paginationMessages?: DataTablePaginationMessages
  className?: string
  enableRowSelection?: boolean
  rowSelection?: RowSelectionState
  onRowSelectionChange?: OnChangeFn<RowSelectionState>
  getRowId?: (originalRow: TData, index: number, parent?: Row<TData>) => string
  renderSelectionActions?: (context: {
    selectedRows: Row<TData>[]
    clearSelection: () => void
  }) => React.ReactNode
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onRowClick,
  emptyMessage = "No results.",
  pageSize = 10,
  showPagination = true,
  paginationMessages,
  className,
  enableRowSelection = false,
  rowSelection,
  onRowSelectionChange,
  getRowId,
  renderSelectionActions,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [internalRowSelection, setInternalRowSelection] = React.useState<RowSelectionState>({})
  const resolvedRowSelection = rowSelection ?? internalRowSelection

  const handleRowSelectionChange: OnChangeFn<RowSelectionState> = React.useCallback(
    (updater) => {
      if (onRowSelectionChange) {
        onRowSelectionChange(updater)
        return
      }

      setInternalRowSelection(updater)
    },
    [onRowSelectionChange],
  )

  const selectionColumn = React.useMemo<ColumnDef<TData, TValue>>(
    () => ({
      id: "__select__",
      header: ({ table }) => (
        // biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation wrapper — the Checkbox handles its own keyboard activation. -- owner: ui; existing suppression is intentional pending typed cleanup.
        // biome-ignore lint/a11y/noStaticElementInteractions: stopPropagation wrapper only — no semantic role added. -- owner: ui; existing suppression is intentional pending typed cleanup.
        <span onClick={(event) => event.stopPropagation()}>
          <Checkbox
            aria-label="Select all rows on page"
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()}
            onCheckedChange={(checked) => table.toggleAllPageRowsSelected(checked)}
          />
        </span>
      ),
      cell: ({ row }) => (
        // biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation wrapper — the Checkbox handles its own keyboard activation. -- owner: ui; existing suppression is intentional pending typed cleanup.
        // biome-ignore lint/a11y/noStaticElementInteractions: stopPropagation wrapper only — no semantic role added. -- owner: ui; existing suppression is intentional pending typed cleanup.
        <span onClick={(event) => event.stopPropagation()}>
          <Checkbox
            aria-label="Select row"
            checked={row.getIsSelected()}
            indeterminate={row.getIsSomeSelected() && !row.getIsSelected()}
            onCheckedChange={(checked) => row.toggleSelected(checked)}
          />
        </span>
      ),
      enableSorting: false,
      enableHiding: false,
    }),
    [],
  )

  const resolvedColumns = React.useMemo(
    () => (enableRowSelection ? [selectionColumn, ...columns] : columns),
    [columns, enableRowSelection, selectionColumn],
  )

  const table = useReactTable({
    data,
    columns: resolvedColumns,
    initialState: {
      pagination: {
        pageSize,
      },
    },
    enableRowSelection,
    onSortingChange: setSorting,
    onRowSelectionChange: handleRowSelectionChange,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId,
    state: {
      rowSelection: resolvedRowSelection,
      sorting,
    },
  })

  const selectedRows = table.getSelectedRowModel().rows
  const clearSelection = React.useCallback(
    () => handleRowSelectionChange({}),
    [handleRowSelectionChange],
  )

  return (
    <div className="space-y-3">
      {enableRowSelection && selectedRows.length > 0 && renderSelectionActions
        ? renderSelectionActions({ selectedRows, clearSelection })
        : null}
      <div className={cn("overflow-hidden rounded-md border", className)}>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  onClick={() => onRowClick?.(row)}
                  className={cn(onRowClick && "cursor-pointer")}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={resolvedColumns.length} className="h-24 text-center">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {showPagination && table.getPrePaginationRowModel().rows.length > pageSize ? (
          <DataTablePagination table={table} messages={paginationMessages} />
        ) : null}
      </div>
    </div>
  )
}
