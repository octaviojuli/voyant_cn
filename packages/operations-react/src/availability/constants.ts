import type { AvailabilitySlotRow } from "./schemas.js"

export const NONE_VALUE = "__none__"

/**
 * Ordered option *values* for the availability selects.
 *
 * These deliberately carry no `label`. `<Select items={...}>` renders the
 * `items` labels in the collapsed trigger, so a hardcoded English label here
 * leaked "Yes"/"Open" into the trigger even when the dropdown list itself was
 * translated. Callsites render the localized copy as `<SelectItem>` children
 * and let the component harvest them.
 */
export const booleanOptions = [{ value: "true" }, { value: "false" }] as const

export const slotStatusOptions = [
  { value: "open" },
  { value: "closed" },
  { value: "sold_out" },
  { value: "cancelled" },
] as const

export const slotStatusVariant: Record<
  AvailabilitySlotRow["status"],
  "default" | "secondary" | "outline" | "destructive"
> = {
  open: "default",
  closed: "secondary",
  sold_out: "destructive",
  cancelled: "outline",
}

export type SlotStatusTone = "success" | "warning" | "danger" | "neutral"

export const slotStatusTone: Record<AvailabilitySlotRow["status"], SlotStatusTone> = {
  open: "success",
  closed: "danger",
  sold_out: "danger",
  cancelled: "neutral",
}
