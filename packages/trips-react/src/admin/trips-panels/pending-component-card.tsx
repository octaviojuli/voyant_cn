"use client"

import { useOperatorAdminMessages as useAdminMessages } from "@voyant-travel/admin"
import { Button } from "@voyant-travel/ui/components/button"
import { Loader2, Plus, Trash2 } from "lucide-react"

import { CatalogConfigurator } from "./catalog-configurator.js"
import { FlightConfigurator, passengerCountsFromTripTravelers } from "./flight-configurator.js"
import {
  CruiseConfigurator,
  PlaceholderConfigurator,
  pendingComponentIsValid,
} from "./manual-configurators.js"
import { type PendingComponent, verticalIconFor, verticalLabelFor } from "./shared.js"
import type { TripTraveler } from "./travelers-section.js"

export function PendingComponentCard({
  pending,
  onChange,
  onRemove,
  onCommit,
  committing,
  commitDisabled,
  travelers,
}: {
  pending: PendingComponent
  onChange(next: PendingComponent): void
  onRemove(): void
  onCommit(): void
  committing: boolean
  commitDisabled?: boolean
  travelers: TripTraveler[]
}) {
  const t = useAdminMessages().trips.adminComposer.panels
  const Icon = verticalIconFor(pending.kind)
  const label = verticalLabelFor(pending.kind, t)
  const valid = pendingComponentIsValid(pending)

  return (
    <div className="flex flex-col gap-4 rounded-md border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
            <Icon className="size-4" />
          </span>
          <div>
            <h3 className="font-medium text-base">{label}</h3>
            <p className="text-muted-foreground text-xs">{t.configureHint}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onRemove} aria-label={t.removeComponent}>
          <Trash2 className="size-4" />
        </Button>
      </div>

      <PendingBody pending={pending} onChange={onChange} travelers={travelers} />

      {pending.commitError ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-destructive text-sm">
          {pending.commitError}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button onClick={onCommit} disabled={!valid || committing || commitDisabled}>
          {committing ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          {t.addToTrip}
        </Button>
      </div>
    </div>
  )
}

function PendingBody({
  pending,
  onChange,
  travelers,
}: {
  pending: PendingComponent
  onChange(next: PendingComponent): void
  travelers: TripTraveler[]
}) {
  const passengerCounts = passengerCountsFromTripTravelers(travelers)
  if (pending.kind === "product" || pending.kind === "stay") {
    return (
      <CatalogConfigurator
        pending={pending}
        onChange={onChange}
        paxAdult={passengerCounts.adults}
      />
    )
  }
  if (pending.kind === "flight") {
    return <FlightConfigurator pending={pending} travelers={travelers} onChange={onChange} />
  }
  if (pending.kind === "cruise") {
    return <CruiseConfigurator pending={pending} onChange={onChange} />
  }
  return <PlaceholderConfigurator pending={pending} onChange={onChange} />
}
