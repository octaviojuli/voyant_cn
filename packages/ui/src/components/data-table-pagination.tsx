"use client"

import type { Table } from "@tanstack/react-table"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "./button.js"

export type DataTablePaginationMessages = {
  /** Range summary template, e.g. "Showing {start}-{end} of {total}". */
  showing: string
  /** Page indicator template, e.g. "Page {page} of {pageCount}". */
  page: string
  previous: string
  next: string
}

// i18n-literal-ok: contractual plain-English defaults; hosts pass localized
// messages through the `messages` prop (usually via DataTable's
// `paginationMessages`).
const defaultDataTablePaginationMessages: DataTablePaginationMessages = {
  showing: "Showing {start}-{end} of {total}",
  page: "Page {page} of {pageCount}",
  previous: "Previous",
  next: "Next",
}

function interpolate(template: string, values: Record<string, number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  )
}

type DataTablePaginationProps<TData> = {
  table: Table<TData>
  messages?: DataTablePaginationMessages
}

export function DataTablePagination<TData>({
  table,
  messages = defaultDataTablePaginationMessages,
}: DataTablePaginationProps<TData>) {
  const totalRows = table.getPrePaginationRowModel().rows.length
  const { pageIndex, pageSize } = table.getState().pagination
  const start = totalRows === 0 ? 0 : pageIndex * pageSize + 1
  const end = totalRows === 0 ? 0 : Math.min((pageIndex + 1) * pageSize, totalRows)

  return (
    <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
      <p className="text-sm text-muted-foreground">
        {interpolate(messages.showing, { start, end, total: totalRows })}
      </p>
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground">
          {interpolate(messages.page, {
            page: totalRows === 0 ? 0 : pageIndex + 1,
            pageCount: table.getPageCount(),
          })}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          <ChevronLeft className="h-4 w-4" />
          {messages.previous}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          {messages.next}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
