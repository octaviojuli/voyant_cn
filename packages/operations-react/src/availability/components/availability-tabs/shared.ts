import type { AvailabilityColumnsMessages } from "../availability-columns.js"

type MessageValues = Record<string, string | number>

export function formatTemplate(template: string, values: MessageValues) {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = values[key]
    return value == null ? match : String(value)
  })
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
