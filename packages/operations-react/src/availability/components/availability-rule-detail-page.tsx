"use client"

import type { QueryClient } from "@tanstack/react-query"
import { queryOptions, useQuery } from "@tanstack/react-query"
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  cn,
} from "@voyant-travel/ui/components"
import { ArrowLeft, CalendarDays, Package, RefreshCw, Trash2 } from "lucide-react"
import { useState } from "react"
import { useAvailabilityRuleSlotGeneration } from "../hooks/use-availability-rule-slot-generation.js"
import {
  useAvailabilityUiI18nOrDefault,
  useAvailabilityUiMessagesOrDefault,
} from "../i18n/index.js"
import {
  formatRuleSlotGenerationResult,
  resolveRuleSlotGenerationMessages,
} from "../i18n/rule-slot-generation-messages.js"
import {
  type AvailabilityRuleRow,
  type AvailabilitySlotRow,
  availabilityQueryKeys,
  availabilityRuleSingleResponse,
  fetchWithValidation,
  getProductQueryOptions,
  getSlotsQueryOptions,
  slotLocalStart,
  useAvailabilityRuleMutation,
  useVoyantAvailabilityContext,
  type VoyantAvailabilityContextValue,
} from "../index.js"
import { getSlotStatusLabel } from "./availability-columns.js"
import { AvailabilityRuleDetailSkeleton } from "./availability-skeletons.js"

export interface AvailabilityRuleDetailPageProps {
  id: string
  className?: string
  onBack?: () => void
  onDeleted?: () => void
  onOpenProduct?: (productId: string) => void
  onOpenSlot?: (slotId: string) => void
  confirmAction?: (message: string) => boolean
}

export function getAvailabilityRuleDetailQueryOptions(
  client: VoyantAvailabilityContextValue,
  id: string | null | undefined,
) {
  return queryOptions({
    queryKey: availabilityQueryKeys.ruleDetail(id ?? ""),
    queryFn: async () => {
      if (!id) throw new Error("getAvailabilityRuleDetailQueryOptions requires an id")
      return fetchWithValidation(
        `/v1/admin/operations/availability/rules/${id}`,
        availabilityRuleSingleResponse,
        client,
      )
    },
  })
}

export function getAvailabilityRuleSlotsQueryOptions(
  client: VoyantAvailabilityContextValue,
  id: string | null | undefined,
) {
  return getSlotsQueryOptions(client, { availabilityRuleId: id ?? undefined, limit: 25, offset: 0 })
}

export async function loadAvailabilityRuleDetailPage(
  queryClient: QueryClient,
  client: VoyantAvailabilityContextValue,
  id: string,
) {
  const ruleData = await queryClient.ensureQueryData(
    getAvailabilityRuleDetailQueryOptions(client, id),
  )

  return Promise.all([
    Promise.resolve(ruleData),
    queryClient.ensureQueryData(getAvailabilityRuleSlotsQueryOptions(client, id)),
    queryClient.ensureQueryData(getProductQueryOptions(client, ruleData.data.productId)),
  ])
}

export function AvailabilityRuleDetailPage({
  id,
  className,
  onBack,
  onDeleted,
  onOpenProduct,
  onOpenSlot,
  confirmAction = (message) => globalThis.confirm?.(message) ?? true,
}: AvailabilityRuleDetailPageProps) {
  const client = useVoyantAvailabilityContext()
  const messages = useAvailabilityUiMessagesOrDefault()
  const { locale } = useAvailabilityUiI18nOrDefault()
  const generationMessages = resolveRuleSlotGenerationMessages(locale)
  const detailMessages = messages.details
  const noValue = detailMessages.noValue
  const ruleMutation = useAvailabilityRuleMutation()
  const slotGeneration = useAvailabilityRuleSlotGeneration()
  const [generationResult, setGenerationResult] = useState<string | null>(null)
  const { data: ruleData, isPending } = useQuery(getAvailabilityRuleDetailQueryOptions(client, id))
  const rule = ruleData?.data
  const productQuery = useQuery({
    ...getProductQueryOptions(client, rule?.productId ?? ""),
    enabled: Boolean(rule?.productId),
  })
  const slotsQuery = useQuery(getAvailabilityRuleSlotsQueryOptions(client, id))

  if (isPending) {
    return <AvailabilityRuleDetailSkeleton />
  }

  if (!rule) {
    return (
      <DetailEmptyState
        message={detailMessages.rule.notFound}
        backLabel={detailMessages.backToAvailability}
        onBack={onBack}
      />
    )
  }

  async function deleteRule(currentRule: AvailabilityRuleRow) {
    if (!confirmAction(detailMessages.rule.deleteConfirm)) return
    await ruleMutation.remove.mutateAsync(currentRule.id)
    if (onDeleted) onDeleted()
    else onBack?.()
  }

  async function generateSlots(currentRule: AvailabilityRuleRow) {
    setGenerationResult(null)
    try {
      const result = await slotGeneration.mutateAsync({ id: currentRule.id })
      setGenerationResult(
        formatRuleSlotGenerationResult(generationMessages, result, { active: currentRule.active }),
      )
    } catch {
      setGenerationResult(generationMessages.failed)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6 p-6", className)}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          {onBack ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              aria-label={detailMessages.backToAvailability}
            >
              <ArrowLeft data-icon aria-hidden="true" />
            </Button>
          ) : null}
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">{detailMessages.rule.pageTitle}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant={rule.active ? "default" : "secondary"}>
                {rule.active ? messages.statusActive : messages.statusInactive}
              </Badge>
              <Badge variant="outline">{rule.timezone}</Badge>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onOpenProduct ? (
            <Button variant="outline" onClick={() => onOpenProduct(rule.productId)}>
              <Package data-icon="inline-start" aria-hidden="true" />
              {detailMessages.openProduct}
            </Button>
          ) : null}
          <Button
            variant="outline"
            onClick={() => void generateSlots(rule)}
            disabled={slotGeneration.isPending}
          >
            <RefreshCw data-icon="inline-start" aria-hidden="true" />
            {slotGeneration.isPending ? generationMessages.pending : generationMessages.action}
          </Button>
          <Button
            variant="destructive"
            onClick={() => void deleteRule(rule)}
            disabled={ruleMutation.remove.isPending}
          >
            <Trash2 data-icon="inline-start" aria-hidden="true" />
            {detailMessages.delete}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{detailMessages.rule.detailsTitle}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <DetailLine label={messages.productLabel}>
              {productQuery.data?.data.name ?? rule.productId}
            </DetailLine>
            <div>
              <span className="text-muted-foreground">{messages.recurrenceLabel}:</span>
              <pre className="mt-1 overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">
                {rule.recurrenceRule}
              </pre>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{detailMessages.rule.capacityPolicyTitle}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <DetailLine label={messages.maxPaxLabel}>{rule.maxCapacity}</DetailLine>
            <DetailLine label={detailMessages.rule.maxPickupCapacityLabel}>
              {rule.maxPickupCapacity ?? noValue}
            </DetailLine>
            <DetailLine label={detailMessages.rule.minTotalPaxLabel}>
              {rule.minTotalPax ?? noValue}
            </DetailLine>
            <DetailLine label={detailMessages.rule.cutoffMinutesLabel}>
              {rule.cutoffMinutes ?? noValue}
            </DetailLine>
            <DetailLine label={detailMessages.rule.earlyBookingLimitLabel}>
              {rule.earlyBookingLimitMinutes ?? noValue}
            </DetailLine>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <CalendarDays className="size-4" aria-hidden="true" />
          <CardTitle>{detailMessages.rule.generatedSlotsTitle}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          {generationResult ? (
            <p aria-live="polite" className="text-muted-foreground">
              {generationResult}
            </p>
          ) : null}
          {(slotsQuery.data?.data.length ?? 0) === 0 ? (
            <p className="text-muted-foreground">{detailMessages.rule.generatedSlotsEmpty}</p>
          ) : (
            slotsQuery.data?.data.map((slot) => (
              <SlotButton key={slot.id} slot={slot} onOpenSlot={onOpenSlot} />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SlotButton({
  slot,
  onOpenSlot,
}: {
  slot: AvailabilitySlotRow
  onOpenSlot?: (slotId: string) => void
}) {
  const messages = useAvailabilityUiMessagesOrDefault()
  const noValue = messages.details.noValue

  return (
    <button
      type="button"
      className="block w-full rounded-md border p-3 text-left hover:bg-muted/40"
      onClick={() => onOpenSlot?.(slot.id)}
    >
      <div className="flex items-center gap-2">
        <Badge variant="outline">{getSlotStatusLabel(slot.status, messages)}</Badge>
        <span>{formatSlotLocalDateTime(slotLocalStart(slot))}</span>
      </div>
      <div className="mt-2 text-muted-foreground">
        {messages.remainingPaxLabel}: {slot.remainingPax ?? noValue}
      </div>
    </button>
  )
}

function formatSlotLocalDateTime(value: { date: string; time: string }) {
  return `${value.date} ${value.time}`
}

function DetailLine({ label, children }: { label: string; children: import("react").ReactNode }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}:</span> <span>{children}</span>
    </div>
  )
}

function DetailEmptyState({
  message,
  backLabel,
  onBack,
}: {
  message: string
  backLabel: string
  onBack?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <p className="text-muted-foreground">{message}</p>
      {onBack ? (
        <Button variant="outline" onClick={onBack}>
          {backLabel}
        </Button>
      ) : null}
    </div>
  )
}
