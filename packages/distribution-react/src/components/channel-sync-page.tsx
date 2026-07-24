"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
  Label,
} from "@voyant-travel/ui/components"
import { AsyncCombobox } from "@voyant-travel/ui/components/async-combobox"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@voyant-travel/ui/components/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@voyant-travel/ui/components/table"
import { AlertTriangle, CheckCircle2, Circle, Loader2, X } from "lucide-react"
import { useState } from "react"
import { useDistributionUiMessagesOrDefault } from "../i18n/index.js"
import { defaultFetcher, useVoyantDistributionContext } from "../index.js"
import { AutoRefreshIndicator, ReconcileMenu } from "./channel-sync-controls.js"
import { DeliveriesDrawer } from "./channel-sync-deliveries-drawer.js"
import {
  type BookingRecord,
  type BookingsResponse,
  type ChannelBookingLinkRow,
  type ChannelRecord,
  type ChannelSyncPageProps,
  type ChannelsResponse,
  channelPushAdminPaths,
  classifyRetryResult,
  fetchJson,
  formatChannelKind,
  formatRelative,
  formatTemplate,
  LINKS_REFETCH_MS,
  type LinksResponse,
  type PushStatus,
  type ReconcilerResult,
  type RetryFeedbackKind,
  type RetryPushResult,
  STATUS_TILES,
  STATUS_VARIANTS,
  THROTTLING_REFETCH_MS,
  type ThrottlingResponse,
  unwrapData,
  useDebouncedValue,
} from "./channel-sync-page-utils.js"

export type { ChannelSyncPageProps } from "./channel-sync-page-utils.js"

interface ProductMappingsReadinessResponse {
  data: unknown[]
}

type OperationFeedback = {
  tone: "success" | "error"
  title: string
  body: string
}

// Page

export function ChannelSyncPage({ baseUrl, fetcher, className }: ChannelSyncPageProps = {}) {
  const distributionMessages = useDistributionUiMessagesOrDefault()
  const messages = distributionMessages.channelSync
  const context = useVoyantDistributionContext()
  const client = {
    baseUrl: baseUrl ?? context.baseUrl,
    fetcher: fetcher ?? context.fetcher ?? defaultFetcher,
  }
  const [statusFilter, setStatusFilter] = useState<PushStatus | "all">("all")

  const [bookingId, setBookingId] = useState<string | null>(null)
  const [bookingSearch, setBookingSearch] = useState("")
  const [selectedBooking, setSelectedBooking] = useState<BookingRecord | null>(null)

  const [channelId, setChannelId] = useState<string | null>(null)
  const [selectedChannel, setSelectedChannel] = useState<ChannelRecord | null>(null)

  const [drilldown, setDrilldown] = useState<{
    bookingId: string
    bookingItemId: string | null
  } | null>(null)
  const [feedback, setFeedback] = useState<OperationFeedback | null>(null)

  const queryClient = useQueryClient()

  const linksQuery = useQuery<LinksResponse>({
    queryKey: ["channel-push-links", statusFilter, bookingId, channelId],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "100" })
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (bookingId) params.set("bookingId", bookingId)
      if (channelId) params.set("channelId", channelId)
      return fetchJson<LinksResponse>(`${channelPushAdminPaths.links}?${params}`, client)
    },
    refetchInterval: LINKS_REFETCH_MS,
    refetchIntervalInBackground: false,
  })

  const setupLinksQuery = useQuery<LinksResponse>({
    queryKey: ["channel-push-links", "setup-readiness"],
    queryFn: () => fetchJson<LinksResponse>(`${channelPushAdminPaths.links}?limit=1`, client),
    staleTime: 60_000,
  })

  const productMappingsReadinessQuery = useQuery<ProductMappingsReadinessResponse>({
    queryKey: ["channel-sync-product-mapping-readiness"],
    queryFn: () =>
      fetchJson<ProductMappingsReadinessResponse>(
        "/v1/admin/distribution/product-mappings?limit=1",
        client,
      ),
    staleTime: 60_000,
  })

  const throttlingQuery = useQuery<ThrottlingResponse>({
    queryKey: ["channel-push-throttling"],
    queryFn: () => fetchJson<ThrottlingResponse>(channelPushAdminPaths.throttling, client),
    refetchInterval: THROTTLING_REFETCH_MS,
  })

  const debouncedBookingSearch = useDebouncedValue(bookingSearch, 200)
  const bookingsQuery = useQuery<BookingsResponse>({
    queryKey: ["channel-sync-booking-options", debouncedBookingSearch],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "20" })
      if (debouncedBookingSearch.trim()) params.set("search", debouncedBookingSearch.trim())
      return fetchJson<BookingsResponse>(`/v1/admin/bookings?${params}`, client)
    },
    placeholderData: (prev) => prev,
  })

  const channelsQuery = useQuery<ChannelsResponse>({
    queryKey: ["channel-sync-channel-options"],
    queryFn: () => fetchJson<ChannelsResponse>(`/v1/admin/distribution/channels?limit=100`, client),
    staleTime: 60_000,
  })

  const retryMutation = useMutation({
    mutationFn: (row: ChannelBookingLinkRow) =>
      fetchJson<RetryPushResult | { data: RetryPushResult }>(
        channelPushAdminPaths.retry(row.link.bookingId),
        client,
        {
          method: "POST",
        },
      ),
    onSuccess: (body, row) => {
      const result = unwrapData<RetryPushResult>(body)
      setFeedback(buildRetryFeedback(result, row, messages))
      void queryClient.invalidateQueries({ queryKey: ["channel-push-links"] })
    },
    onError: (error, row) => {
      setFeedback({
        tone: "error",
        title: messages.feedback.retry.title,
        body: formatTemplate(messages.feedback.retry.failed, {
          bookingId: row.link.bookingId,
          message: error instanceof Error ? error.message : String(error),
        }),
      })
    },
  })

  const reconcileMutation = useMutation({
    mutationFn: (flow: "bookings" | "availability" | "content") =>
      fetchJson<ReconcilerResult | { data: ReconcilerResult }>(
        channelPushAdminPaths.reconcile(flow),
        client,
        {
          method: "POST",
        },
      ),
    onSuccess: (body) => {
      const result = unwrapData<ReconcilerResult>(body)
      setFeedback({
        tone: "success",
        title: messages.feedback.reconcile.title,
        body: formatTemplate(messages.feedback.reconcile.success, {
          scanned: result.scanned,
          triggered: result.triggered,
        }),
      })
      void queryClient.invalidateQueries({ queryKey: ["channel-push-links"] })
    },
    onError: (error) => {
      setFeedback({
        tone: "error",
        title: messages.feedback.reconcile.title,
        body: formatTemplate(messages.feedback.reconcile.failed, {
          message: error instanceof Error ? error.message : String(error),
        }),
      })
    },
  })

  const counts = linksQuery.data?.counts ?? {}
  const rows = linksQuery.data?.data ?? []
  const setupCounts = setupLinksQuery.data?.counts ?? {}
  const throttledChannels = throttlingQuery.data?.data ?? []
  const bookingOptions = bookingsQuery.data?.data ?? []
  const channelOptions = channelsQuery.data?.data ?? []
  const isThrottled = throttledChannels.length > 0
  const filtersActive = statusFilter !== "all" || bookingId !== null || channelId !== null
  const hasChannels = channelOptions.length > 0
  const hasMappings = (productMappingsReadinessQuery.data?.data.length ?? 0) > 0
  const hasDeliveryEvidence =
    (setupCounts.ok ?? 0) > 0 || (setupCounts.failed ?? 0) > 0 || (setupCounts.compensated ?? 0) > 0
  const setupSteps = [
    {
      key: "connector",
      complete: hasChannels,
      ...messages.setup.connector,
    },
    {
      key: "mapping",
      complete: hasMappings,
      ...messages.setup.mapping,
    },
    {
      key: "delivery",
      complete: hasDeliveryEvidence,
      ...messages.setup.delivery,
    },
  ]

  const clearFilters = () => {
    setStatusFilter("all")
    setBookingId(null)
    setBookingSearch("")
    setSelectedBooking(null)
    setChannelId(null)
    setSelectedChannel(null)
  }

  return (
    <div data-slot="channel-sync-page" className={cn("flex flex-col gap-6 p-6", className)}>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{messages.title}</h2>
          <p className="text-sm text-muted-foreground">{messages.description}</p>
        </div>
        <div className="flex items-center gap-3">
          <AutoRefreshIndicator
            isFetching={linksQuery.isFetching}
            dataUpdatedAt={linksQuery.dataUpdatedAt}
            intervalMs={LINKS_REFETCH_MS}
            messages={messages}
          />
          <ReconcileMenu
            onRun={(flow) => reconcileMutation.mutate(flow)}
            isRunning={reconcileMutation.isPending}
            lastResult={
              reconcileMutation.data ? unwrapData<ReconcilerResult>(reconcileMutation.data) : null
            }
            messages={messages}
          />
        </div>
      </div>

      {feedback ? (
        <div
          role="status"
          className={cn(
            "flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm",
            feedback.tone === "error"
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200",
          )}
        >
          <div className="flex items-start gap-2">
            {feedback.tone === "error" ? (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <div>
              <div className="font-medium">{feedback.title}</div>
              <div>{feedback.body}</div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            aria-label={messages.feedback.dismiss}
            onClick={() => setFeedback(null)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : null}

      {/* Setup/configuration readiness stays separate from operational monitoring. */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{messages.setup.title}</CardTitle>
          <CardDescription>{messages.setup.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            {setupSteps.map((step) => (
              <div key={step.key} className="rounded-md border p-3">
                <div className="flex items-start gap-2">
                  {step.complete ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <div>
                    <div className="text-sm font-medium">{step.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {step.complete ? step.ready : step.missing}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Throttling banner */}
      {isThrottled ? (
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <span className="font-medium">{messages.throttledTitle}</span>{" "}
            <span>
              {formatTemplate(messages.throttledBody, {
                count: throttledChannels.reduce((sum, c) => sum + c.count, 0),
                channels: throttledChannels.length,
                channelLabel: throttledChannels.length === 1 ? "channel" : "channels",
              })}
            </span>
          </div>
        </div>
      ) : null}

      <section className="flex flex-col gap-3">
        <div>
          <h3 className="text-sm font-semibold">{messages.monitoring.title}</h3>
          <p className="text-sm text-muted-foreground">{messages.monitoring.description}</p>
        </div>

        {/* Status tiles drive the primary status filter. */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {STATUS_TILES.map((tile) => {
            const isActive = statusFilter === tile.key
            const value = counts[tile.key] ?? 0
            const tileMessages = messages.statusTiles[tile.key]
            return (
              <button
                key={tile.key}
                type="button"
                onClick={() => setStatusFilter(isActive ? "all" : tile.key)}
                className={cn(
                  "group rounded-md border bg-card p-4 text-left transition-all",
                  "hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive && "border-primary ring-2 ring-primary/30",
                )}
                aria-pressed={isActive}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {tileMessages.label}
                  </span>
                  {tile.key === "failed" && value > 0 ? (
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                  ) : null}
                </div>
                <div className="mt-1 text-3xl font-semibold tabular-nums">{value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{tileMessages.description}</div>
              </button>
            )
          })}
        </div>
      </section>

      {/* Filter row drives booking and channel filters. */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="cs-booking" className="text-xs">
            {messages.filters.booking}
          </Label>
          <AsyncCombobox<BookingRecord>
            value={bookingId}
            onChange={(value) => {
              setBookingId(value)
              if (!value) setSelectedBooking(null)
              else {
                const match = bookingOptions.find((b) => b.id === value)
                if (match) setSelectedBooking(match)
              }
            }}
            items={bookingOptions}
            selectedItem={selectedBooking}
            getKey={(b) => b.id}
            getLabel={(b) => b.bookingNumber}
            getSecondary={(b) => b.status}
            onSearchChange={setBookingSearch}
            placeholder={messages.filters.bookingPlaceholder}
            emptyText={
              bookingsQuery.isFetching
                ? messages.filters.bookingSearching
                : messages.filters.bookingEmpty
            }
            triggerClassName="w-full"
          />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="cs-channel" className="text-xs">
            {messages.filters.channel}
          </Label>
          <AsyncCombobox<ChannelRecord>
            value={channelId}
            onChange={(value) => {
              setChannelId(value)
              if (!value) setSelectedChannel(null)
              else {
                const match = channelOptions.find((c) => c.id === value)
                if (match) setSelectedChannel(match)
              }
            }}
            items={channelOptions}
            selectedItem={selectedChannel}
            getKey={(c) => c.id}
            getLabel={(c) => c.name}
            getSecondary={(c) => formatChannelKind(c.kind)}
            placeholder={messages.filters.channelPlaceholder}
            emptyText={messages.filters.channelEmpty}
            triggerClassName="w-full"
          />
        </div>
        {filtersActive ? (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-1.5 h-3.5 w-3.5" />
            {distributionMessages.common.clearFilters}
          </Button>
        ) : null}
      </div>

      {/* Links table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{messages.table.title}</CardTitle>
          <CardDescription>
            {filtersActive
              ? formatTemplate(messages.table.filteredDescription, { count: rows.length })
              : messages.table.defaultDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {linksQuery.isPending ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <Empty className="border-0">
              <EmptyHeader>
                <EmptyTitle>
                  {filtersActive ? messages.table.noMatchesTitle : messages.table.noLinksTitle}
                </EmptyTitle>
                <EmptyDescription>
                  {filtersActive
                    ? messages.table.noMatchesDescription
                    : messages.table.noLinksDescription}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{messages.table.booking}</TableHead>
                  <TableHead>{messages.table.channel}</TableHead>
                  <TableHead>{messages.table.status}</TableHead>
                  <TableHead className="text-right">{messages.table.attempts}</TableHead>
                  <TableHead>{messages.table.lastPush}</TableHead>
                  <TableHead>{messages.table.externalRef}</TableHead>
                  <TableHead className="text-right">{messages.table.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const isFailed = row.link.pushStatus === "failed"
                  return (
                    <TableRow
                      key={row.link.id}
                      className={cn(isFailed && "bg-destructive/5 hover:bg-destructive/10")}
                    >
                      <TableCell className="font-mono text-xs">
                        <div>{row.link.bookingId}</div>
                        {row.link.bookingItemId ? (
                          <div className="text-muted-foreground">
                            {formatTemplate(messages.table.itemPrefix, {
                              id: row.link.bookingItemId,
                            })}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{row.channelName}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatChannelKind(row.channelKind)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANTS[row.link.pushStatus] ?? "outline"}>
                          {messages.statusLabels[row.link.pushStatus as PushStatus] ??
                            row.link.pushStatus}
                        </Badge>
                        {row.link.lastError ? (
                          <div
                            className="mt-1 max-w-xs truncate text-xs text-destructive"
                            title={row.link.lastError}
                          >
                            {row.link.lastError}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.link.pushAttempts}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {row.link.lastPushAt ? formatRelative(row.link.lastPushAt) : "-"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {row.link.externalBookingId ?? row.link.externalReference ?? "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setDrilldown({
                                bookingId: row.link.bookingId,
                                bookingItemId: row.link.bookingItemId,
                              })
                            }
                          >
                            {messages.table.deliveries}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={
                              retryMutation.isPending &&
                              retryMutation.variables?.link.bookingId === row.link.bookingId
                            }
                            onClick={() => retryMutation.mutate(row)}
                          >
                            {retryMutation.isPending &&
                            retryMutation.variables?.link.bookingId === row.link.bookingId ? (
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            ) : null}
                            {messages.table.retry}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <DeliveriesDrawer
        bookingId={drilldown?.bookingId ?? null}
        bookingItemId={drilldown?.bookingItemId ?? null}
        client={client}
        onClose={() => setDrilldown(null)}
        messages={messages}
      />
    </div>
  )
}

function buildRetryFeedback(
  result: RetryPushResult,
  row: ChannelBookingLinkRow,
  messages: ReturnType<typeof useDistributionUiMessagesOrDefault>["channelSync"],
): OperationFeedback {
  const kind = classifyRetryResult(result)
  const tone = kind === "processed" || kind === "ok" ? "success" : "error"
  const body = retryFeedbackBody(kind, result, row, messages)

  return {
    tone,
    title: messages.feedback.retry.title,
    body,
  }
}

function retryFeedbackBody(
  kind: RetryFeedbackKind,
  result: RetryPushResult,
  row: ChannelBookingLinkRow,
  messages: ReturnType<typeof useDistributionUiMessagesOrDefault>["channelSync"],
): string {
  const bookingId = result.bookingId || row.link.bookingId
  switch (kind) {
    case "processed":
      return formatTemplate(messages.feedback.retry.processed, {
        attempted: result.attempted ?? 0,
        succeeded: result.succeeded ?? 0,
        failed: result.failed ?? 0,
        compensated: result.compensated ?? 0,
      })
    case "booking_missing":
      return formatTemplate(messages.feedback.retry.bookingMissing, { bookingId })
    case "no_pending_links":
      return formatTemplate(messages.feedback.retry.noPendingLinks, { bookingId })
    case "no_targets":
      return formatTemplate(messages.feedback.retry.noTargets, { bookingId })
    case "no_adapter":
      return messages.feedback.retry.noAdapter
    case "no_mapping":
      return messages.feedback.retry.noMapping
    case "failed":
      return formatTemplate(messages.feedback.retry.failed, {
        bookingId,
        message:
          result.outcomes?.find((outcome) => outcome.error)?.error ??
          messages.feedback.retry.unknownError,
      })
    case "ok":
      return formatTemplate(messages.feedback.retry.ok, { bookingId })
  }
}
