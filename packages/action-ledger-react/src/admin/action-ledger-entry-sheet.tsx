// agent-quality: file-size exception -- owner: action-ledger-react; existing UI surface stays co-located until a dedicated split preserves behavior and tests.
"use client"

import { useQuery } from "@tanstack/react-query"
import type {
  ActionLedgerEntryDetailResponse,
  ActionLedgerEntryResponse,
} from "@voyant-travel/action-ledger"
import { useOperatorAdminMessages as useAdminMessages } from "@voyant-travel/admin"
import { Badge } from "@voyant-travel/ui/components/badge"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@voyant-travel/ui/components/sheet"
import { Eye, KeyRound, ScrollText, ShieldCheck } from "lucide-react"
import type { ReactNode } from "react"

import { useVoyantActionLedgerContext } from "../provider.js"
import { getActionLedgerEntry } from "./admin-api.js"
import { actionLedgerQueryKeys } from "./query-keys.js"

type EntrySheetMessages = ReturnType<typeof useAdminMessages>["actionLedgerPage"]["entrySheet"]

type LedgerBadgeVariant = "default" | "secondary" | "outline" | "destructive"

const STATUS_VARIANT: Partial<Record<ActionLedgerEntryResponse["status"], LedgerBadgeVariant>> = {
  succeeded: "default",
  approved: "default",
  awaiting_approval: "secondary",
  requested: "secondary",
  denied: "destructive",
  failed: "destructive",
  expired: "destructive",
  cancelled: "destructive",
  superseded: "outline",
  reversed: "outline",
  compensated: "outline",
}

const RISK_VARIANT: Partial<
  Record<ActionLedgerEntryResponse["evaluatedRisk"], LedgerBadgeVariant>
> = {
  low: "outline",
  medium: "secondary",
  high: "default",
  critical: "destructive",
}

export function ActionLedgerEntrySheet({
  open,
  onOpenChange,
  entryId,
  locale,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  entryId: string | null
  locale: string
}) {
  const page = useAdminMessages().actionLedgerPage
  const t = page.entrySheet
  const client = useVoyantActionLedgerContext()
  const entryDetailQuery = useQuery({
    queryKey: actionLedgerQueryKeys.entry(entryId ?? ""),
    queryFn: () => getActionLedgerEntry(client, entryId ?? ""),
    enabled: open && Boolean(entryId),
  })
  const entry = entryDetailQuery.data?.data ?? null
  const isLoading = entryDetailQuery.isLoading || entryDetailQuery.isFetching

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-hidden p-0 sm:max-w-2xl lg:max-w-3xl">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle>{t.title}</SheetTitle>
          <SheetDescription>{t.description}</SheetDescription>
          {entry ? (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Badge variant={RISK_VARIANT[entry.evaluatedRisk] ?? "outline"}>
                {page.filtersPopover.riskOptions[entry.evaluatedRisk]}
              </Badge>
              <Badge variant={STATUS_VARIANT[entry.status] ?? "outline"}>
                {page.filtersPopover.statusOptions[entry.status]}
              </Badge>
              <span className="font-mono text-muted-foreground text-xs">{entry.id}</span>
            </div>
          ) : null}
        </SheetHeader>
        <div className="h-[calc(100vh-9rem)] overflow-auto px-6 py-5">
          {isLoading ? (
            <p className="text-muted-foreground text-sm">{t.loading}</p>
          ) : entry ? (
            <ActionLedgerEntryDetail entry={entry} locale={locale} messages={t} />
          ) : (
            <p className="text-muted-foreground text-sm">{t.notFound}</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function ActionLedgerEntryDetail({
  entry,
  locale,
  messages,
}: {
  entry: ActionLedgerEntryDetailResponse
  locale: string
  messages: EntrySheetMessages
}) {
  const typeLabels = useAdminMessages().actionLedgerPage.filtersPopover
  return (
    <div className="space-y-6">
      <DetailGrid>
        <DetailField
          label={messages.baseFields.when}
          value={formatDateTime(entry.occurredAt, locale)}
          noValue={messages.noValue}
        />
        <DetailField
          label={messages.baseFields.action}
          value={entry.actionName}
          noValue={messages.noValue}
        />
        <DetailField
          label={messages.baseFields.version}
          value={entry.actionVersion}
          noValue={messages.noValue}
        />
        <DetailField
          label={messages.baseFields.kind}
          value={entry.actionKind}
          noValue={messages.noValue}
        />
        <DetailField
          label={messages.baseFields.routeOrTool}
          value={entry.routeOrToolName}
          noValue={messages.noValue}
        />
        <DetailField
          label={messages.baseFields.authorization}
          value={entry.authorizationSource}
          noValue={messages.noValue}
        />
      </DetailGrid>

      <DetailSection title={messages.actor.title} icon={<ShieldCheck className="h-4 w-4" />}>
        <DetailGrid>
          <DetailField
            label={messages.actor.principalType}
            value={typeLabels.principalTypeOptions[entry.principalType]}
            noValue={messages.noValue}
          />
          <DetailField
            label={messages.actor.principalId}
            value={entry.principalId}
            mono
            noValue={messages.noValue}
          />
          <DetailField
            label={messages.actor.actorType}
            value={entry.actorType}
            noValue={messages.noValue}
          />
          <DetailField
            label={messages.actor.callerType}
            value={entry.callerType}
            noValue={messages.noValue}
          />
          <DetailField
            label={messages.actor.sessionId}
            value={entry.sessionId}
            mono
            noValue={messages.noValue}
          />
          <DetailField
            label={messages.actor.apiToken}
            value={entry.apiTokenId}
            mono
            noValue={messages.noValue}
          />
          <DetailField
            label={messages.actor.organization}
            value={entry.organizationId}
            mono
            noValue={messages.noValue}
          />
          <DetailField
            label={messages.actor.internal}
            value={entry.internalRequest ? messages.booleanYes : messages.booleanNo}
            noValue={messages.noValue}
          />
        </DetailGrid>
      </DetailSection>

      <DetailSection title={messages.targetFlow.title} icon={<ScrollText className="h-4 w-4" />}>
        <DetailGrid>
          <DetailField
            label={messages.targetFlow.targetType}
            value={targetTypeLabel(entry.targetType, typeLabels.targetTypeOptions)}
            noValue={messages.noValue}
          />
          <DetailField
            label={messages.targetFlow.targetId}
            value={entry.targetId}
            mono
            noValue={messages.noValue}
          />
          <DetailField
            label={messages.targetFlow.workflowRun}
            value={entry.workflowRunId}
            mono
            noValue={messages.noValue}
          />
          <DetailField
            label={messages.targetFlow.workflowStep}
            value={entry.workflowStepId}
            mono
            noValue={messages.noValue}
          />
          <DetailField
            label={messages.targetFlow.correlation}
            value={entry.correlationId}
            mono
            noValue={messages.noValue}
          />
          <DetailField
            label={messages.targetFlow.causationAction}
            value={entry.causationActionId}
            mono
            noValue={messages.noValue}
          />
          <DetailField
            label={messages.targetFlow.capability}
            value={entry.capabilityId}
            mono
            noValue={messages.noValue}
          />
          <DetailField
            label={messages.targetFlow.capabilityVersion}
            value={entry.capabilityVersion}
            noValue={messages.noValue}
          />
        </DetailGrid>
      </DetailSection>

      <DetailSection title={messages.idempotency.title} icon={<KeyRound className="h-4 w-4" />}>
        <DetailGrid>
          <DetailField
            label={messages.idempotency.scope}
            value={entry.idempotencyScope}
            mono
            noValue={messages.noValue}
          />
          <DetailField
            label={messages.idempotency.key}
            value={entry.idempotencyKey}
            mono
            noValue={messages.noValue}
          />
          <DetailField
            label={messages.idempotency.fingerprint}
            value={entry.idempotencyFingerprint}
            mono
            noValue={messages.noValue}
          />
        </DetailGrid>
      </DetailSection>

      {entry.mutationDetail ? <MutationDetail entry={entry} messages={messages} /> : null}
      {entry.sensitiveReadDetail ? <SensitiveReadDetail entry={entry} messages={messages} /> : null}
      <PayloadRefs entry={entry} messages={messages} />
      <RelayRows entry={entry} messages={messages} />
    </div>
  )
}

function MutationDetail({
  entry,
  messages,
}: {
  entry: ActionLedgerEntryDetailResponse
  messages: EntrySheetMessages
}) {
  const detail = entry.mutationDetail
  if (!detail) return null

  return (
    <DetailSection title={messages.mutation.title} icon={<ScrollText className="h-4 w-4" />}>
      <DetailGrid>
        <DetailField
          label={messages.mutation.summary}
          value={detail.summary}
          noValue={messages.noValue}
        />
        <DetailField
          label={messages.mutation.inputRef}
          value={detail.commandInputRef}
          mono
          noValue={messages.noValue}
        />
        <DetailField
          label={messages.mutation.resultRef}
          value={detail.commandResultRef}
          mono
          noValue={messages.noValue}
        />
        <DetailField
          label={messages.mutation.reversalKind}
          value={detail.reversalKind}
          noValue={messages.noValue}
        />
        <DetailField
          label={messages.mutation.reversalState}
          value={detail.reversalStateProjection}
          noValue={messages.noValue}
        />
        <DetailField
          label={messages.mutation.reverses}
          value={detail.reversesActionId}
          mono
          noValue={messages.noValue}
        />
      </DetailGrid>
    </DetailSection>
  )
}

function SensitiveReadDetail({
  entry,
  messages,
}: {
  entry: ActionLedgerEntryDetailResponse
  messages: EntrySheetMessages
}) {
  const detail = entry.sensitiveReadDetail
  if (!detail) return null

  return (
    <DetailSection title={messages.sensitiveRead.title} icon={<Eye className="h-4 w-4" />}>
      <DetailGrid>
        <DetailField
          label={messages.sensitiveRead.reason}
          value={detail.reasonCode}
          noValue={messages.noValue}
        />
        <DetailField
          label={messages.sensitiveRead.decisionPolicy}
          value={detail.decisionPolicy}
          noValue={messages.noValue}
        />
        <DetailField
          label={messages.sensitiveRead.disclosure}
          value={detail.disclosureSummary}
          noValue={messages.noValue}
        />
        <DetailField
          label={messages.sensitiveRead.fields}
          value={detail.disclosedFieldSet?.join(", ")}
          noValue={messages.noValue}
        />
      </DetailGrid>
    </DetailSection>
  )
}

function PayloadRefs({
  entry,
  messages,
}: {
  entry: ActionLedgerEntryDetailResponse
  messages: EntrySheetMessages
}) {
  return (
    <DetailSection title={messages.payloads.title} icon={<ScrollText className="h-4 w-4" />}>
      {entry.payloads.length === 0 ? (
        <p className="text-muted-foreground text-sm">{messages.payloads.empty}</p>
      ) : (
        <div className="space-y-3">
          {entry.payloads.map((payload) => (
            <DetailGrid key={payload.id}>
              <DetailField
                label={messages.payloads.kind}
                value={payload.payloadKind}
                noValue={messages.noValue}
              />
              <DetailField
                label={messages.payloads.schema}
                value={payload.schemaTag}
                noValue={messages.noValue}
              />
              <DetailField
                label={messages.payloads.storageRef}
                value={payload.storageRef}
                mono
                noValue={messages.noValue}
              />
              <DetailField
                label={messages.payloads.redaction}
                value={payload.redactionStatus}
                noValue={messages.noValue}
              />
              <DetailField
                label={messages.payloads.retention}
                value={payload.retentionPolicy}
                noValue={messages.noValue}
              />
              <DetailField
                label={messages.payloads.hash}
                value={payload.hash}
                mono
                noValue={messages.noValue}
              />
            </DetailGrid>
          ))}
        </div>
      )}
    </DetailSection>
  )
}

function RelayRows({
  entry,
  messages,
}: {
  entry: ActionLedgerEntryDetailResponse
  messages: EntrySheetMessages
}) {
  return (
    <DetailSection title={messages.relay.title} icon={<ScrollText className="h-4 w-4" />}>
      {entry.relayOutbox.length === 0 ? (
        <p className="text-muted-foreground text-sm">{messages.relay.empty}</p>
      ) : (
        <div className="space-y-3">
          {entry.relayOutbox.map((row) => (
            <DetailGrid key={row.id}>
              <DetailField
                label={messages.relay.status}
                value={row.relayStatus}
                noValue={messages.noValue}
              />
              <DetailField
                label={messages.relay.payloadRef}
                value={row.payloadRef}
                mono
                noValue={messages.noValue}
              />
              <DetailField
                label={messages.relay.attempts}
                value={String(row.attemptCount)}
                noValue={messages.noValue}
              />
              <DetailField
                label={messages.relay.nextRetry}
                value={row.nextRetryAt}
                noValue={messages.noValue}
              />
              <DetailField
                label={messages.relay.processed}
                value={row.processedAt}
                noValue={messages.noValue}
              />
              <DetailField
                label={messages.relay.lastError}
                value={row.lastError}
                noValue={messages.noValue}
              />
            </DetailGrid>
          ))}
        </div>
      )}
    </DetailSection>
  )
}

function DetailSection({
  title,
  icon,
  children,
}: {
  title: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 font-medium text-sm">
        <span className="text-muted-foreground">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  )
}

function DetailGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 md:grid-cols-2">{children}</div>
}

function DetailField({
  label,
  value,
  mono = false,
  noValue,
}: {
  label: string
  value: string | null | undefined
  mono?: boolean
  noValue: string
}) {
  return (
    <div className="min-w-0 rounded-md border bg-muted/20 px-3 py-2">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div
        className={`mt-1 min-h-5 truncate text-sm ${mono ? "font-mono text-xs" : "font-medium"}`}
        title={value ?? noValue}
      >
        {value || noValue}
      </div>
    </div>
  )
}

type TargetTypeOptionLabels = ReturnType<
  typeof useAdminMessages
>["actionLedgerPage"]["filtersPopover"]["targetTypeOptions"]

/**
 * Target types are freeform strings on the wire — known types render the
 * localized filter-option label, unknown ones fall back to the raw value.
 */
function targetTypeLabel(value: string, labels: TargetTypeOptionLabels) {
  if (value !== "any" && value in labels) {
    return labels[value as keyof TargetTypeOptionLabels]
  }
  return value
}

function formatDateTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}
