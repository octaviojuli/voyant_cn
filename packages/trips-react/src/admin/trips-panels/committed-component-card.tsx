"use client"

import { useOperatorAdminMessages as useAdminMessages } from "@voyant-travel/admin"
import { PaymentScheduleSection, type PaymentScheduleValue } from "@voyant-travel/bookings-react/ui"
import type { TripComponent } from "@voyant-travel/trips"
import { Badge } from "@voyant-travel/ui/components/badge"
import { Button } from "@voyant-travel/ui/components/button"
import { Checkbox } from "@voyant-travel/ui/components/checkbox"
import { Label } from "@voyant-travel/ui/components/label"
import { CalendarClock, CircleAlert, Loader2, Trash2 } from "lucide-react"

import {
  componentIcon,
  componentOptionSummaryFor,
  componentThumbnailFor,
  componentTitleFor,
  formatMoney,
  formatScheduleLabel,
  isUserVisibleWarning,
  paymentScheduleValueFromUnknown,
  Reference,
  recordFromUnknown,
} from "./display.js"

export function CommittedComponentCard({
  component,
  selectable = false,
  selected = false,
  onSelectedChange,
  onRemove,
  removePending = false,
  bookingSetupEditable = false,
  bookingSetupSaving = false,
  onBookingSetupChange,
}: {
  component: TripComponent
  index: number
  selectable?: boolean
  selected?: boolean
  onSelectedChange?: (checked: boolean) => void
  onRemove?: () => void
  removePending?: boolean
  bookingSetupEditable?: boolean
  bookingSetupSaving?: boolean
  onBookingSetupChange?: (component: TripComponent, setup: ComponentBookingSetup) => void
}) {
  const t = useAdminMessages().trips.adminComposer.panels
  const Icon = componentIcon(component)
  const coverUrl = componentThumbnailFor(component)
  const componentName = componentTitleFor(component, t.componentDisplay)
  const optionSummary = componentOptionSummaryFor(component, t.componentDisplay)
  const bookingSetup = componentBookingSetupFor(component)
  const canEditBookingSetup =
    bookingSetupEditable && component.kind === "catalog_booking" && !component.bookingId

  return (
    <div
      className={`flex flex-col gap-3 rounded-md border bg-card p-4 ${
        selected ? "ring-2 ring-destructive/40" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        {selectable ? (
          <Checkbox
            className="mt-1"
            checked={selected}
            onCheckedChange={(value) => onSelectedChange?.(Boolean(value))}
            aria-label={`Select ${componentName} for cancellation`}
          />
        ) : null}
        {coverUrl ? (
          <img
            src={coverUrl}
            alt=""
            className="size-12 shrink-0 rounded-md object-cover ring-1 ring-border"
            loading="lazy"
          />
        ) : (
          <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-muted">
            <Icon className="size-5 text-muted-foreground" />
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{componentName}</span>
            {component.status === "failed" ? (
              <Badge variant="destructive">{t.committedCard.statusFailed}</Badge>
            ) : component.status === "cancelled" ? (
              <Badge variant="secondary">{t.committedCard.statusCancelled}</Badge>
            ) : null}
          </div>
          {(() => {
            const label = formatScheduleLabel(component)
            return label ? (
              <p className="flex items-center gap-1 text-muted-foreground text-sm">
                <CalendarClock className="size-3.5" />
                {label}
              </p>
            ) : null
          })()}
          {component.description ? (
            <p className="truncate text-muted-foreground text-sm">{component.description}</p>
          ) : null}
          {optionSummary ? (
            <p className="truncate text-muted-foreground text-sm">{optionSummary}</p>
          ) : null}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground text-xs">
            <Reference
              label={t.committedCard.bookingLabel}
              value={component.bookingId}
              href={component.bookingId ? `/bookings/${component.bookingId}` : undefined}
            />
            <Reference label={t.committedCard.orderLabel} value={component.orderId} />
            <Reference label={t.committedCard.paymentLabel} value={component.paymentSessionId} />
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          <p className="font-semibold">
            {formatMoney(component.componentTotalAmountCents, component.componentCurrency)}
          </p>
          {component.componentTaxAmountCents != null && component.componentTaxAmountCents > 0 ? (
            <p className="text-muted-foreground text-xs">
              tax {formatMoney(component.componentTaxAmountCents, component.componentCurrency)}
            </p>
          ) : null}
          {onRemove ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              disabled={removePending}
              aria-label={t.removeComponent}
              className="text-muted-foreground hover:text-destructive"
            >
              {removePending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
            </Button>
          ) : null}
        </div>
      </div>
      {canEditBookingSetup ? (
        <div className="flex flex-col gap-3 border-t pt-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-sm">{t.bookingSetupHeading}</p>
              <p className="text-muted-foreground text-xs">{t.committedCard.bookingSetupHint}</p>
            </div>
            {bookingSetupSaving ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : null}
          </div>
          <PaymentScheduleSection
            value={bookingSetup.paymentSchedule}
            onChange={(paymentSchedule) =>
              onBookingSetupChange?.(component, { ...bookingSetup, paymentSchedule })
            }
            currency={component.componentCurrency ?? undefined}
            totalAmountCents={component.componentTotalAmountCents ?? undefined}
            labels={{ heading: t.committedCard.paymentScheduleHeading }}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <ComponentSetupCheckbox
              id={`${component.id}-contract-document`}
              checked={bookingSetup.generateContractDocument}
              label={t.committedCard.generateContract}
              onCheckedChange={(generateContractDocument) =>
                onBookingSetupChange?.(component, { ...bookingSetup, generateContractDocument })
              }
            />
            <ComponentSetupCheckbox
              id={`${component.id}-invoice-document`}
              checked={bookingSetup.generateInvoiceDocument}
              label={t.committedCard.generateInvoice}
              onCheckedChange={(generateInvoiceDocument) =>
                onBookingSetupChange?.(component, { ...bookingSetup, generateInvoiceDocument })
              }
            />
          </div>
        </div>
      ) : component.bookingId ? (
        <p className="border-t pt-3 text-muted-foreground text-xs">
          {t.committedCard.committedFooter}
        </p>
      ) : null}
      {(() => {
        const visibleCodes = component.warningCodes.filter(isUserVisibleWarning)
        if (visibleCodes.length === 0) return null
        return (
          <p className="flex items-center gap-1 text-amber-600 text-xs">
            <CircleAlert className="size-3" />
            {visibleCodes.join(", ")}
          </p>
        )
      })()}
    </div>
  )
}

function ComponentSetupCheckbox({
  id,
  checked,
  label,
  onCheckedChange,
}: {
  id: string
  checked: boolean
  label: string
  onCheckedChange(value: boolean): void
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
      <Label htmlFor={id} className="cursor-pointer text-sm">
        {label}
      </Label>
    </div>
  )
}

export interface ComponentBookingSetup {
  paymentSchedule: PaymentScheduleValue
  generateContractDocument: boolean
  generateInvoiceDocument: boolean
}

function componentBookingSetupFor(component: TripComponent): ComponentBookingSetup {
  const metadata = recordFromUnknown(component.metadata)
  const bookingSetup = recordFromUnknown(metadata?.bookingSetup)
  const draft = recordFromUnknown(metadata?.bookingDraftV1)
  const draftDocumentGeneration = recordFromUnknown(draft?.documentGeneration)
  const setupDocumentGeneration = recordFromUnknown(bookingSetup?.documentGeneration)
  const documentGeneration = setupDocumentGeneration ?? draftDocumentGeneration

  return {
    paymentSchedule: paymentScheduleValueFromUnknown(bookingSetup?.paymentSchedule),
    generateContractDocument: documentGeneration?.contractDocument === true,
    generateInvoiceDocument: documentGeneration?.invoiceDocument === true,
  }
}
