import type { AvailabilityColumnsMessages } from "../availability-columns.js"

type MessageValues = Record<string, string | number>

export function formatTemplate(template: string, values: MessageValues) {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = values[key]
    return value == null ? match : String(value)
  })
}

/**
 * Server-driven pagination state for a list tab. `total` is the API envelope's
 * `total` (every matching row), not the number of rows currently in memory, so
 * the footer reports the real size of the result set.
 */
export interface AvailabilityServerPagination {
  pageIndex: number
  pageSize: number
  total: number
  onPageChange: (pageIndex: number) => void
}

export interface AvailabilityPageSummary {
  /** 1-based index of the first row on the current page (0 when empty). */
  start: number
  /** 1-based index of the last row on the current page (0 when empty). */
  end: number
  /** 1-based current page number (0 when empty). */
  page: number
  pageCount: number
  canPreviousPage: boolean
  canNextPage: boolean
}

/**
 * Footer arithmetic for a server-paginated list. Derived entirely from the
 * API's `total` so "showing X-Y of Z" and the page count stay honest even
 * though only one page of rows is loaded.
 */
export function resolveAvailabilityPageSummary(
  pagination: Pick<AvailabilityServerPagination, "pageIndex" | "pageSize" | "total">,
): AvailabilityPageSummary {
  const pageSize = Math.max(1, pagination.pageSize)
  const total = Math.max(0, pagination.total)
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const pageIndex = Math.min(Math.max(0, pagination.pageIndex), pageCount - 1)

  return {
    start: total === 0 ? 0 : pageIndex * pageSize + 1,
    end: total === 0 ? 0 : Math.min((pageIndex + 1) * pageSize, total),
    page: total === 0 ? 0 : pageIndex + 1,
    pageCount,
    canPreviousPage: pageIndex > 0,
    canNextPage: pageIndex + 1 < pageCount,
  }
}

export interface AvailabilityTabMessages extends AvailabilityColumnsMessages {
  nouns: {
    slotSingular: string
    slotPlural: string
    ruleSingular: string
    rulePlural: string
    startTimeSingular: string
    startTimePlural: string
    closeoutSingular: string
    closeoutPlural: string
    pickupPointSingular: string
    pickupPointPlural: string
  }
  tabs: {
    slots: AvailabilitySlotTabMessages
    rules: AvailabilityToggleTabMessages
    startTimes: AvailabilityToggleTabMessages
    closeouts: AvailabilityDeleteOnlyTabMessages
    pickupPoints: AvailabilityToggleTabMessages
  }
  verbOpened: string
  verbClosed: string
  verbActivated: string
  verbDeactivated: string
  bulkStatusPlaceholder: string
  pagination: {
    showing: string
    page: string
    previous: string
    next: string
  }
}

export interface AvailabilityBaseTabMessages {
  title: string
  description: string
  actionLabel: string
  emptyMessage: string
  bulkDeleteButton: string
  bulkDeleteConfirm: string
  bulkDeleteTitle: string
  bulkDeleteDescription: string
}

export interface AvailabilitySlotTabMessages extends AvailabilityBaseTabMessages {
  bulkOpenButton: string
  bulkOpenConfirm: string
  bulkOpenTitle: string
  bulkOpenDescription: string
  bulkCloseButton: string
  bulkCloseConfirm: string
  bulkCloseTitle: string
  bulkCloseDescription: string
}

export interface AvailabilityToggleTabMessages extends AvailabilityBaseTabMessages {
  bulkActivateButton: string
  bulkActivateConfirm: string
  bulkActivateTitle: string
  bulkActivateDescription: string
  bulkDeactivateButton: string
  bulkDeactivateConfirm: string
  bulkDeactivateTitle: string
  bulkDeactivateDescription: string
}

export type AvailabilityDeleteOnlyTabMessages = AvailabilityBaseTabMessages

export type AvailabilityBulkUpdateFn = (args: {
  ids: string[]
  endpoint: string
  target: string
  nounSingular: string
  nounPlural: string
  payload: Record<string, unknown>
  successVerb: string
  clearSelection: () => void
}) => Promise<void> // i18n-literal-ok type annotation

export type AvailabilityBulkDeleteFn = (args: {
  ids: string[]
  endpoint: string
  target: string
  nounSingular: string
  nounPlural: string
  clearSelection: () => void
}) => Promise<void> // i18n-literal-ok type annotation
