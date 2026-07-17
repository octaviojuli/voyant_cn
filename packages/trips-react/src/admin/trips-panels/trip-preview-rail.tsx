"use client"

import { useOperatorAdminMessages as useAdminMessages } from "@voyant-travel/admin"
import type { PersonPickerValue, TravelCreditPickerValue } from "@voyant-travel/bookings-react/ui"
import { TravelCreditPickerSection } from "@voyant-travel/bookings-react/ui"
import { formatMessage } from "@voyant-travel/i18n"
import { useOrganization, usePerson } from "@voyant-travel/relationships-react"
import type { Trip, TripComponent } from "@voyant-travel/trips"
import { Alert, AlertDescription, AlertTitle } from "@voyant-travel/ui/components/alert"
import { Badge } from "@voyant-travel/ui/components/badge"
import { Button } from "@voyant-travel/ui/components/button"
import { AlertTriangle, Check, Loader2 } from "lucide-react"
import * as React from "react"
import type { ReservePaymentScheduleValidationReason } from "../admin-trips-page-model.js"
import {
  componentIcon,
  componentOptionSummaryFor,
  componentThumbnailFor,
  componentTitleFor,
  formatMoney,
  formatScheduleLabel,
  isUserVisibleWarning,
  resolveBillingDisplay,
  sortComponentsBySchedule,
} from "./display.js"
import { formatPersonName, type TripTraveler } from "./travelers-section.js"

export function TripPreviewRail({
  trip,
  pendingCount,
  travelers,
  billing,
  billingPersonId,
  travelCredit,
  onTravelCreditChange,
  paymentCurrency,
}: {
  trip: Trip | null
  pendingCount: number
  travelers: TripTraveler[]
  billing: PersonPickerValue
  billingPersonId?: string | null
  travelCredit: TravelCreditPickerValue
  onTravelCreditChange(value: TravelCreditPickerValue): void
  paymentCurrency: string
}) {
  const envelope = trip?.envelope
  const aggregate = envelope?.aggregatePricingSnapshot
  const components = React.useMemo(
    () =>
      sortComponentsBySchedule(
        (trip?.components ?? []).filter((component) => component.status !== "removed"),
      ),
    [trip?.components],
  )
  const status = envelope?.status
  const t = useAdminMessages().trips.adminComposer.panels

  return (
    <div className="flex flex-col gap-4 rounded-md border bg-muted/10 p-4">
      <div className="flex items-center justify-between">
        <PreviewLabel>{t.tripPreviewLabel}</PreviewLabel>
        <Badge variant="outline" className="text-[10px] capitalize">
          {status ?? "draft"}
        </Badge>
      </div>

      {components.length === 0 && pendingCount === 0 ? (
        <p className="text-muted-foreground text-xs">{t.previewRail.empty}</p>
      ) : null}

      {components.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {components.map((component) => (
            <li key={component.id}>
              <PreviewComponentRow component={component} />
            </li>
          ))}
        </ul>
      ) : null}

      {pendingCount > 0 ? (
        <p className="text-muted-foreground text-xs">
          {pendingCount === 1
            ? t.previewRail.pendingComponentsSingular
            : formatMessage(t.previewRail.pendingComponentsPlural, { count: pendingCount })}
        </p>
      ) : null}

      {components.length > 0 ? <CurrencyTotals components={components} /> : null}

      <div className="flex items-center justify-between border-t pt-3 text-sm">
        <PreviewLabel>{t.paymentCurrencyLabel}</PreviewLabel>
        <span className="font-medium">{paymentCurrency}</span>
      </div>

      <BillingPreview billing={billing} />
      <TravelersPreview travelers={travelers} billingPersonId={billingPersonId ?? null} />

      {(() => {
        const warnings = (aggregate?.warnings ?? []).filter(isUserVisibleWarning)
        if (warnings.length === 0) return null
        return (
          <Alert>
            <AlertTriangle className="size-4" />
            <AlertTitle>{t.pricingWarningsTitle}</AlertTitle>
            <AlertDescription>{warnings.join(", ")}</AlertDescription>
          </Alert>
        )
      })()}

      {components.length > 0 ? (
        <div className="flex flex-col gap-4 border-t pt-3">
          <TravelCreditPickerSection
            value={travelCredit}
            onChange={onTravelCreditChange}
            currency={paymentCurrency}
            amountCents={aggregate?.totalAmountCents ?? undefined}
          />
        </div>
      ) : null}
    </div>
  )
}

function PreviewComponentRow({ component }: { component: TripComponent }) {
  const display = useAdminMessages().trips.adminComposer.panels.componentDisplay
  const Icon = componentIcon(component)
  const coverUrl = componentThumbnailFor(component)
  const name = componentTitleFor(component, display)
  const optionSummary = componentOptionSummaryFor(component, display)

  return (
    <div className="flex items-start gap-3">
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
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-medium text-sm">{name}</span>
        {(() => {
          const label = formatScheduleLabel(component)
          return label ? (
            <span className="truncate text-muted-foreground text-xs">{label}</span>
          ) : null
        })()}
        {optionSummary ? (
          <span className="truncate text-muted-foreground text-xs">{optionSummary}</span>
        ) : null}
      </div>
      <span className="shrink-0 font-medium text-sm">
        {formatMoney(component.componentTotalAmountCents, component.componentCurrency)}
      </span>
    </div>
  )
}

function BillingPreview({ billing }: { billing: PersonPickerValue }) {
  const t = useAdminMessages().trips.adminComposer.panels
  const personQuery = usePerson(billing.personId || undefined, {
    enabled: billing.mode === "existing" && Boolean(billing.personId),
  })
  const orgQuery = useOrganization(billing.organizationId ?? undefined, {
    enabled: billing.billTo === "organization" && Boolean(billing.organizationId),
  })
  const display = resolveBillingDisplay(billing, personQuery.data, orgQuery.data, t)
  if (!display.primary && !display.secondary) return null
  return (
    <div className="flex flex-col gap-0.5 border-t pt-3">
      <PreviewLabel>{t.billingLabel}</PreviewLabel>
      <span className="truncate text-sm">{display.primary || "—"}</span>
      {display.secondary ? (
        <span className="truncate text-muted-foreground text-xs">{display.secondary}</span>
      ) : null}
    </div>
  )
}

function TravelersPreview({
  travelers,
  billingPersonId,
}: {
  travelers: TripTraveler[]
  billingPersonId: string | null
}) {
  const t = useAdminMessages().trips.adminComposer.panels
  if (travelers.length === 0) return null
  const leadLocalId =
    (billingPersonId &&
      travelers.find((traveler) => traveler.personId === billingPersonId)?.localId) ||
    travelers[0]?.localId ||
    null
  return (
    <div className="flex flex-col gap-1 border-t pt-3">
      <PreviewLabel>
        {formatMessage(t.travelersWithCount, { count: travelers.length })}
      </PreviewLabel>
      <ul className="flex flex-col gap-0.5 text-sm">
        {travelers.map((traveler, idx) => (
          <TravelerPreviewRow
            key={traveler.localId}
            traveler={traveler}
            index={idx}
            isLead={traveler.localId === leadLocalId}
          />
        ))}
      </ul>
    </div>
  )
}

function TravelerPreviewRow({
  traveler,
  index,
  isLead,
}: {
  traveler: TripTraveler
  index: number
  isLead: boolean
}) {
  const t = useAdminMessages().trips.adminComposer.panels
  const personQuery = usePerson(traveler.personId || undefined, {
    enabled: Boolean(traveler.personId),
  })
  const inlineName = [traveler.firstName, traveler.lastName]
    .filter((part) => part.trim().length > 0)
    .join(" ")
    .trim()
  const name =
    inlineName ||
    formatPersonName(personQuery.data) ||
    formatMessage(t.travelerNumberedFallback, { number: index + 1 })
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="truncate">{name}</span>
      <span className="shrink-0 text-muted-foreground text-xs capitalize">
        {isLead ? t.leadBadge : traveler.role}
      </span>
    </li>
  )
}

function CurrencyTotals({ components }: { components: TripComponent[] }) {
  const t = useAdminMessages().trips.adminComposer.panels
  const buckets = React.useMemo(() => aggregateByCurrency(components), [components])
  if (buckets.length === 0) return null
  return (
    <div className="flex flex-col gap-4 border-t pt-3 text-sm">
      {buckets.map((bucket) => (
        <div key={bucket.currency} className="flex flex-col gap-1">
          {buckets.length > 1 ? <PreviewLabel>{bucket.currency}</PreviewLabel> : null}
          <div className="flex items-center justify-between text-muted-foreground">
            <span>{t.subtotal}</span>
            <span>{formatMoney(bucket.subtotal, bucket.currency)}</span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>{t.tax}</span>
            <span>{formatMoney(bucket.tax, bucket.currency)}</span>
          </div>
          <div className="mt-0.5 flex items-center justify-between font-semibold">
            <span>{t.total}</span>
            <span className="text-lg">{formatMoney(bucket.total, bucket.currency)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

interface CurrencyBucket {
  currency: string
  subtotal: number
  tax: number
  total: number
}

function aggregateByCurrency(components: TripComponent[]): CurrencyBucket[] {
  const map = new Map<string, CurrencyBucket>()
  for (const component of components) {
    const code = component.componentCurrency
    if (!code) continue
    const entry = map.get(code) ?? { currency: code, subtotal: 0, tax: 0, total: 0 }
    entry.subtotal += component.componentSubtotalAmountCents ?? 0
    entry.tax += component.componentTaxAmountCents ?? 0
    entry.total += component.componentTotalAmountCents ?? 0
    map.set(code, entry)
  }
  return [...map.values()].sort((a, b) => b.total - a.total)
}

export function PrimaryAction({
  status,
  componentCount,
  isBusy,
  pricePending,
  reservePending,
  reserveValidationReason,
  onReserve,
}: {
  status: string | undefined
  componentCount: number
  isBusy: boolean
  pricePending: boolean
  reservePending: boolean
  reserveValidationReason?: ReservePaymentScheduleValidationReason | null
  onReserve(): void
}) {
  const t = useAdminMessages().trips.adminComposer.panels
  if (status === "checkout_started" || status === "booked") {
    return (
      <div className="rounded-md border bg-card p-3 text-center text-muted-foreground text-sm">
        {status === "booked" ? t.primaryAction.tripBooked : t.primaryAction.tripCheckoutInProgress}
      </div>
    )
  }

  if (status === "reserved") {
    return (
      <div className="rounded-md border bg-card p-3 text-center text-muted-foreground text-sm">
        {t.primaryAction.tripReserved}
      </div>
    )
  }

  if (componentCount === 0) {
    return null
  }

  if (pricePending) {
    return (
      <Button disabled className="w-full">
        <Loader2 className="size-4 animate-spin" />
        {t.primaryAction.pricingTrip}
      </Button>
    )
  }

  if (status === "reserve_in_progress" || reservePending) {
    return (
      <Button disabled className="w-full">
        <Loader2 className="size-4 animate-spin" />
        {t.primaryAction.reservingTrip}
      </Button>
    )
  }

  // `failed` lands here after a reserve attempt errored — allow retry. `priced`
  // is the happy-path entry into reserve. Any other status (e.g. `draft`)
  // means pricing hasn't run yet — gate the button until that catches up.
  const canReserve = status === "priced" || status === "failed"
  const validationMessage = reserveValidationReason
    ? t.primaryAction[reserveValidationReason]
    : null
  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={onReserve}
        disabled={isBusy || !canReserve || Boolean(validationMessage)}
        className="w-full"
      >
        <Check className="size-4" />
        {status === "failed" ? t.primaryAction.retryReserve : t.primaryAction.reserveAndCreateLink}
      </Button>
      {validationMessage ? (
        <p className="text-muted-foreground text-xs">{validationMessage}</p>
      ) : null}
    </div>
  )
}

function PreviewLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-medium text-[11px] text-muted-foreground uppercase tracking-wider">
      {children}
    </span>
  )
}
