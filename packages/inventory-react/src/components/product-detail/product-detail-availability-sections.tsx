import { formatMessage } from "@voyant-travel/i18n"
import {
  Badge,
  Button,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@voyant-travel/ui/components"
import {
  CalendarPlus,
  CalendarRange,
  DollarSign,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"
import { useProductDetailMessages } from "./host.js"
import type { DepartureSlot } from "./product-departure-dialog.js"
import { ActionMenu, EmptyState, Section } from "./product-detail-section-shell.js"
import {
  type AvailabilityRule,
  formatCapacityLabel,
  formatDuration,
  formatSlotDate,
  formatSlotTime,
  formatSlotTimezoneOffset,
  getBrowserTimezone,
  getDepartureStatusLabel,
  isForeignSlotTimezone,
  RULE_SLOT_GENERATION_HORIZON_DAYS,
  slotStatusVariant,
} from "./product-detail-shared.js"
import { describeRRule } from "./rrule-labels.js"

export function ProductDeparturesSection({
  slots,
  itineraryNameById,
  slotIdsWithOverrides,
  onCreate,
  onEdit,
  onOverridePrice,
  onManageAvailability,
  onDelete,
}: {
  slots: DepartureSlot[]
  itineraryNameById: Map<string, string>
  slotIdsWithOverrides?: ReadonlySet<string>
  onCreate: () => void
  onEdit: (slot: DepartureSlot) => void
  onOverridePrice?: (slot: DepartureSlot) => void
  onManageAvailability?: (slot: DepartureSlot) => void
  onDelete: (slotId: string) => void
}) {
  const messages = useProductDetailMessages()
  const productMessages = messages.products.core
  // Departure instants are stored in UTC but belong to the slot's own calendar.
  // The offset marker is only rendered when the operator sits on a different
  // clock, so a domestic operator sees clean times and nothing else.
  const browserTimezone = getBrowserTimezone()
  return (
    <Section
      title={productMessages.departuresTitle}
      actions={
        <ActionMenu label={productMessages.newDeparture}>
          <DropdownMenuItem onClick={onCreate}>
            <Plus className="h-4 w-4" />
            {productMessages.newDeparture}
          </DropdownMenuItem>
        </ActionMenu>
      }
      contentClassName=""
    >
      {slots.length === 0 ? (
        <EmptyState message={productMessages.departuresEmpty} />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="py-2.5 pl-6 pr-3 text-left font-medium">
                {productMessages.departureStartColumn}
              </th>
              <th className="px-3 py-2.5 text-left font-medium">
                {productMessages.departureEndColumn}
              </th>
              <th className="px-3 py-2.5 text-left font-medium">
                {productMessages.departureItineraryColumn}
              </th>
              <th className="px-3 py-2.5 text-left font-medium">
                {productMessages.departureDurationColumn}
              </th>
              <th className="px-3 py-2.5 text-left font-medium">
                {productMessages.departureStatusColumn}
              </th>
              <th className="px-3 py-2.5 text-left font-medium">
                {productMessages.departureCapacityColumn}
              </th>
              <th className="w-10 px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {slots.map((slot) => {
              const offsetLabel = isForeignSlotTimezone(slot.timezone, browserTimezone)
                ? formatSlotTimezoneOffset(slot.startsAt, slot.timezone)
                : null
              return (
                <tr key={slot.id} className="border-b last:border-b-0">
                  <td className="py-2.5 pl-6 pr-3">
                    <div className="font-mono text-xs">{slot.dateLocal}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatSlotTime(slot.startsAt, slot.timezone)}
                      {offsetLabel ? (
                        <span className="ml-1.5 font-mono" title={slot.timezone}>
                          {offsetLabel}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    {slot.endsAt ? (
                      <>
                        <div className="font-mono text-xs">
                          {formatSlotDate(slot.endsAt, slot.timezone)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatSlotTime(slot.endsAt, slot.timezone)}
                        </div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">{productMessages.noValue}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {slot.itineraryId
                      ? (itineraryNameById.get(slot.itineraryId) ??
                        messages.products.operations.itineraries.customOverride)
                      : messages.products.operations.itineraries.defaultBadge}
                  </td>
                  <td className="px-3 py-2.5 text-xs">{formatDuration(slot, messages)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <Badge variant={slotStatusVariant[slot.status]} className="text-xs">
                        {getDepartureStatusLabel(slot.status, messages)}
                      </Badge>
                      {slotIdsWithOverrides?.has(slot.id) ? (
                        <Badge variant="outline" className="text-xs">
                          {productMessages.departureOverrideBadge}
                        </Badge>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs">
                    {formatCapacityLabel(slot, messages)}
                  </td>
                  <td className="px-3 py-2.5">
                    <ActionMenu label={`${productMessages.departuresTitle}: ${slot.dateLocal}`}>
                      <DropdownMenuItem onClick={() => onEdit(slot)}>
                        <Pencil className="h-4 w-4" />
                        {productMessages.edit}
                      </DropdownMenuItem>
                      {onManageAvailability ? (
                        <DropdownMenuItem onClick={() => onManageAvailability(slot)}>
                          <CalendarRange className="h-4 w-4" />
                          {productMessages.departureManageAvailability}
                        </DropdownMenuItem>
                      ) : null}
                      {onOverridePrice ? (
                        <DropdownMenuItem onClick={() => onOverridePrice(slot)}>
                          <DollarSign className="h-4 w-4" />
                          {productMessages.departureOverridePricing}
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={() => onDelete(slot.id)}>
                        <Trash2 className="h-4 w-4" />
                        {productMessages.delete}
                      </DropdownMenuItem>
                    </ActionMenu>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </Section>
  )
}

export function ProductSchedulesSection({
  rules,
  horizonDays = RULE_SLOT_GENERATION_HORIZON_DAYS,
  generatingRuleId,
  onCreate,
  onEdit,
  onGenerateSlots,
  onDelete,
}: {
  rules: AvailabilityRule[]
  /** Rolling horizon the generator covers, surfaced in the panel copy. */
  horizonDays?: number
  /** Id of the rule currently generating, so its row action can show progress. */
  generatingRuleId?: string | null
  onCreate: () => void
  onEdit: (rule: AvailabilityRule) => void
  onGenerateSlots?: (rule: AvailabilityRule) => void
  onDelete: (ruleId: string) => void
}) {
  const messages = useProductDetailMessages()
  const productMessages = messages.products.core
  return (
    <Section
      title={productMessages.schedulesTitle}
      actions={
        <ActionMenu label={productMessages.newSchedule}>
          <DropdownMenuItem onClick={onCreate}>
            <Plus className="h-4 w-4" />
            {productMessages.newSchedule}
          </DropdownMenuItem>
        </ActionMenu>
      }
    >
      {rules.length === 0 ? (
        <EmptyState message={formatMessage(productMessages.schedulesEmpty, { horizonDays })} />
      ) : (
        <>
          <p className="pb-3 text-xs text-muted-foreground">
            {formatMessage(productMessages.schedulesHint, { horizonDays })}
          </p>
          <div className="flex flex-col divide-y border-t">
            {rules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between py-3 last:pb-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {describeRRule(rule.recurrenceRule, productMessages.rrule)}
                    </span>
                    {!rule.active ? (
                      <Badge variant="outline" className="text-xs">
                        {productMessages.inactiveBadge}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatMessage(productMessages.scheduleSummary, {
                      maxCapacity: rule.maxCapacity,
                      timezone: rule.timezone,
                      cutoff:
                        rule.cutoffMinutes != null
                          ? formatMessage(productMessages.scheduleCutoffSuffix, {
                              minutes: rule.cutoffMinutes,
                            })
                          : "",
                    })}
                  </p>
                  {!rule.active ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {productMessages.scheduleGenerateInactiveHint}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-1">
                  {onGenerateSlots ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!rule.active || generatingRuleId === rule.id}
                      onClick={() => onGenerateSlots(rule)}
                    >
                      {generatingRuleId === rule.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                      )}
                      {productMessages.scheduleGenerate}
                    </Button>
                  ) : null}
                  <ActionMenu
                    label={`${productMessages.schedulesTitle}: ${describeRRule(rule.recurrenceRule, productMessages.rrule)}`}
                  >
                    <DropdownMenuItem onClick={() => onEdit(rule)}>
                      <Pencil className="h-4 w-4" />
                      {productMessages.edit}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => onDelete(rule.id)}>
                      <Trash2 className="h-4 w-4" />
                      {productMessages.delete}
                    </DropdownMenuItem>
                  </ActionMenu>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Section>
  )
}
