import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { MarketCurrencyDialog } from "./components/market-currency-dialog.js"
import { MarketDialog } from "./components/market-dialog.js"
import { MarketLocaleDialog } from "./components/market-locale-dialog.js"
import {
  getMarketsUiI18n,
  MarketsUiMessagesProvider,
  resolveMarketsUiMessages,
  useMarketsUiMessagesOrDefault,
} from "./i18n/index.js"
import type { MarketCurrencyRecord, MarketLocaleRecord, MarketRecord } from "./index.js"

const market = {
  id: "market-1",
  code: "RO",
  name: "Romania",
  status: "active",
  regionCode: null,
  countryCode: "RO",
  defaultLanguageTag: "ro-RO",
  defaultCurrency: "RON",
  timezone: "Europe/Bucharest",
  taxContext: "EU-VAT",
  metadata: null,
} satisfies MarketRecord

const marketCurrency = {
  id: "market-currency-1",
  marketId: "market-1",
  currencyCode: "RON",
  isDefault: true,
  isSettlement: true,
  isReporting: false,
  sortOrder: 0,
  active: true,
} satisfies MarketCurrencyRecord

const marketLocale = {
  id: "market-locale-1",
  marketId: "market-1",
  languageTag: "ro-RO",
  isDefault: true,
  sortOrder: 0,
  active: true,
} satisfies MarketLocaleRecord

vi.mock("./index.js", () => ({
  useMarketMutation: () => ({
    create: { isPending: false, mutateAsync: async (value: unknown) => value },
    update: { isPending: false, mutateAsync: async (value: unknown) => value },
  }),
  useMarketCurrencyMutation: () => ({
    create: { isPending: false, mutateAsync: async (value: unknown) => value },
    update: { isPending: false, mutateAsync: async (value: unknown) => value },
  }),
  useMarketLocaleMutation: () => ({
    create: { isPending: false, mutateAsync: async (value: unknown) => value },
    update: { isPending: false, mutateAsync: async (value: unknown) => value },
  }),
}))

describe("markets-ui i18n", () => {
  it("resolves localized package messages with fallback and overrides", () => {
    const result = resolveMarketsUiMessages({
      locale: "ro-RO",
      overrides: {
        locales: {
          ro: {
            marketCurrencyDialog: {
              actions: {
                create: "Creeaza Moneda",
              },
            },
          },
        },
      },
    })

    expect(result.marketCurrencyDialog.actions.create).toBe("Creeaza Moneda")
    expect(result.common.marketStatusLabels.archived).toBe("Arhivat")
  })

  it("returns locale-aware formatters from the package helper", () => {
    const result = getMarketsUiI18n({ locale: "ro-RO" })

    expect(result.locale).toBe("ro-RO")
    expect(result.formatNumber(1200)).toBe(new Intl.NumberFormat("ro-RO").format(1200))
  })

  it("renders English copy without a provider", () => {
    const html = renderToStaticMarkup(
      <div>
        <MarketDialog open onOpenChange={() => {}} market={market} />
        <MarketCurrencyDialog
          open
          onOpenChange={() => {}}
          marketId={market.id}
          currency={marketCurrency}
        />
        <MarketLocaleDialog
          open
          onOpenChange={() => {}}
          marketId={market.id}
          locale={marketLocale}
        />
        <MarketsMessageProbe />
      </div>,
    )

    expect(html).toContain("Edit Market")
    expect(html).toContain("Edit Currency")
    expect(html).toContain("Edit Locale")
    expect(html).toContain("Archived")
  })

  it("renders Romanian copy with the package provider", () => {
    const html = renderToStaticMarkup(
      <MarketsUiMessagesProvider locale="ro-RO">
        <div>
          <MarketDialog open onOpenChange={() => {}} market={market} />
          <MarketCurrencyDialog
            open
            onOpenChange={() => {}}
            marketId={market.id}
            currency={marketCurrency}
          />
          <MarketLocaleDialog
            open
            onOpenChange={() => {}}
            marketId={market.id}
            locale={marketLocale}
          />
          <MarketsMessageProbe />
        </div>
      </MarketsUiMessagesProvider>,
    )

    expect(html).toContain("Editeaza Piata")
    expect(html).toContain("Editeaza Moneda")
    expect(html).toContain("Editeaza Limba")
    expect(html).toContain("Arhivat")
  })

  it("renders Chinese copy with the package provider via region fallback", () => {
    const html = renderToStaticMarkup(
      <MarketsUiMessagesProvider locale="zh-CN">
        <div>
          <MarketDialog open onOpenChange={() => {}} market={market} />
          <MarketCurrencyDialog
            open
            onOpenChange={() => {}}
            marketId={market.id}
            currency={marketCurrency}
          />
          <MarketLocaleDialog
            open
            onOpenChange={() => {}}
            marketId={market.id}
            locale={marketLocale}
          />
          <MarketsMessageProbe />
        </div>
      </MarketsUiMessagesProvider>,
    )

    expect(html).toContain("编辑市场")
    expect(html).toContain("编辑货币")
    expect(html).toContain("编辑语言")
    expect(html).toContain("已归档")
  })
})

function MarketsMessageProbe() {
  const messages = useMarketsUiMessagesOrDefault()

  return (
    <div>
      <span>{messages.marketDialog.titles.edit}</span>
      <span>{messages.marketCurrencyDialog.titles.edit}</span>
      <span>{messages.marketLocaleDialog.titles.edit}</span>
      <span>{messages.common.marketStatusLabels.archived}</span>
    </div>
  )
}
