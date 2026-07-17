import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { DistributionOverview } from "./components/distribution-overview.js"
import {
  DistributionUiMessagesProvider,
  getDistributionUiI18n,
  resolveDistributionUiMessages,
} from "./i18n/index.js"
import type {
  ChannelContractRow,
  ChannelProductMappingRow,
  ChannelRow,
  ChannelWebhookEventRow,
  SupplierOption,
} from "./index.js"

describe("distribution-ui i18n", () => {
  it("resolves localized package messages with fallback and overrides", () => {
    const result = resolveDistributionUiMessages({
      locale: "ro-RO",
      overrides: {
        locales: {
          ro: {
            overview: {
              webhookQueue: {
                title: "Evenimente Webhook",
              },
            },
          },
        },
      },
    })

    expect(result.overview.webhookQueue.title).toBe("Evenimente Webhook")
    expect(result.common.channelStatusLabels.pending).toBe("In asteptare")
  })

  it("returns locale-aware formatters from the package helper", () => {
    const result = getDistributionUiI18n({ locale: "ro-RO" })

    expect(result.locale).toBe("ro-RO")
    expect(result.formatNumber(1200)).toBe(new Intl.NumberFormat("ro-RO").format(1200))
  })

  it("renders English copy without a provider", () => {
    const html = renderToStaticMarkup(
      <DistributionOverview
        channels={channels}
        suppliers={suppliers}
        filteredChannels={channels}
        filteredContracts={contracts}
        filteredMappings={mappings}
        syncQueue={webhookEvents}
        contractsNeedingReview={contracts}
        search=""
        setSearch={() => {}}
        channelFilter="all"
        setChannelFilter={() => {}}
        hasFilters={false}
        onClearFilters={() => {}}
        onOpenWebhookEvent={() => {}}
        onOpenContract={() => {}}
      />,
    )

    expect(html).toContain("Active Channels")
    expect(html).toContain("Webhook Queue")
    expect(html).toContain("Received")
    expect(html).toContain("Search distribution")
  })

  it("renders Romanian copy with the package provider", () => {
    const html = renderToStaticMarkup(
      <DistributionUiMessagesProvider locale="ro-RO">
        <DistributionOverview
          channels={channels}
          suppliers={suppliers}
          filteredChannels={channels}
          filteredContracts={contracts}
          filteredMappings={mappings}
          syncQueue={webhookEvents}
          contractsNeedingReview={contracts}
          search=""
          setSearch={() => {}}
          channelFilter="all"
          setChannelFilter={() => {}}
          hasFilters
          onClearFilters={() => {}}
          onOpenWebhookEvent={() => {}}
          onOpenContract={() => {}}
        />
      </DistributionUiMessagesProvider>,
    )

    expect(html).toContain("Canale Active")
    expect(html).toContain("Coada Webhook")
    expect(html).toContain("Primit")
    expect(html).toContain("Cauta distributie")
    expect(html).toContain("Sterge Filtrele")
  })

  it("renders Chinese copy with the package provider via region fallback", () => {
    const html = renderToStaticMarkup(
      <DistributionUiMessagesProvider locale="zh-CN">
        <DistributionOverview
          channels={channels}
          suppliers={suppliers}
          filteredChannels={channels}
          filteredContracts={contracts}
          filteredMappings={mappings}
          syncQueue={webhookEvents}
          contractsNeedingReview={contracts}
          search=""
          setSearch={() => {}}
          channelFilter="all"
          setChannelFilter={() => {}}
          hasFilters
          onClearFilters={() => {}}
          onOpenWebhookEvent={() => {}}
          onOpenContract={() => {}}
        />
      </DistributionUiMessagesProvider>,
    )

    expect(html).toContain("活跃渠道")
    expect(html).toContain("Webhook 队列")
    expect(html).toContain("已接收")
    expect(html).toContain("搜索分销")
    expect(html).toContain("清除筛选")
  })
})

const channels: ChannelRow[] = [
  {
    id: "channel-1",
    name: "Booking Partner",
    kind: "affiliate",
    status: "active",
    website: "https://partner.example.com",
    contactName: null,
    contactEmail: null,
    metadata: null,
  },
]

const suppliers: SupplierOption[] = [{ id: "supplier-1", name: "Oceanic" }]

const contracts: ChannelContractRow[] = [
  {
    id: "contract-1",
    channelId: "channel-1",
    supplierId: "supplier-1",
    status: "draft",
    startsAt: "2026-01-15T00:00:00.000Z",
    endsAt: null,
    paymentOwner: "channel",
    cancellationOwner: "channel",
    settlementTerms: null,
    notes: null,
  },
]

const mappings: ChannelProductMappingRow[] = [
  {
    id: "mapping-1",
    channelId: "channel-1",
    productId: "product-1",
    externalProductId: "ext-1",
    externalRateId: null,
    externalCategoryId: null,
    active: true,
  },
]

const webhookEvents: ChannelWebhookEventRow[] = [
  {
    id: "event-1",
    channelId: "channel-1",
    eventType: "booking.updated",
    externalEventId: null,
    payload: {},
    receivedAt: "2026-03-02T12:00:00.000Z",
    processedAt: null,
    status: "pending",
    errorMessage: null,
  },
]
