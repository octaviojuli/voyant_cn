import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { ExternalCharterBadge } from "./components/external-badge.js"
import { VoyageSuiteGrid } from "./components/voyage-suite-grid.js"
import { PerSuiteQuoteCard, WholeYachtQuoteCard } from "./components/whole-yacht-quote-card.js"
import {
  ChartersUiMessagesProvider,
  getChartersUiI18n,
  resolveChartersUiMessages,
} from "./i18n/index.js"
import type { CharterSuiteRecord, PerSuiteQuote, WholeYachtQuote } from "./index.js"

const wholeYachtQuote: WholeYachtQuote = {
  mode: "whole_yacht",
  voyageId: "voyage-1",
  currency: "USD",
  charterFee: "10000.00",
  apaPercent: "30",
  apaAmount: "3000.00",
  total: "13000.00",
}

const perSuiteQuote: PerSuiteQuote = {
  mode: "per_suite",
  voyageId: "voyage-1",
  suiteId: "suite-1",
  currency: "USD",
  suiteName: "Owner Suite",
  suitePrice: "4500.00",
  portFee: "350.00",
  total: "4850.00",
}

const suite: CharterSuiteRecord = {
  id: "suite-1",
  voyageId: "voyage-1",
  suiteCode: "OS1",
  suiteName: "Owner Suite",
  suiteCategory: "owners",
  maxGuests: 2,
  squareFeet: "420",
  description: "Panoramic suite",
  pricesByCurrency: { USD: "4500.00", EUR: "4100.00" },
  portFeesByCurrency: { USD: "350.00", EUR: "320.00" },
  availability: "available",
  unitsAvailable: 1,
  appointmentOnly: false,
  notes: null,
  extra: null,
  externalRefs: null,
  lastSyncedAt: null,
  floorplanImages: null,
  images: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
}

describe("charters-ui i18n", () => {
  it("resolves localized package messages with fallback and overrides", () => {
    const result = resolveChartersUiMessages({
      locale: "ro-RO",
      overrides: {
        locales: {
          ro: {
            voyageSuiteGrid: {
              empty: "Fara suite disponibile.",
            },
          },
        },
      },
    })

    expect(result.voyageSuiteGrid.empty).toBe("Fara suite disponibile.")
    expect(result.externalCharterBadge.label).toBe("Extern · {sourceProvider}")
  })

  it("returns locale-aware formatters from the package helper", () => {
    const result = getChartersUiI18n({ locale: "ro-RO" })

    expect(result.locale).toBe("ro-RO")
    expect(result.formatCurrency(13000, "USD")).toBe(
      new Intl.NumberFormat("ro-RO", { currency: "USD", style: "currency" }).format(13000),
    )
  })

  it("renders English copy without a provider", () => {
    const html = renderToStaticMarkup(<ExternalCharterBadge sourceProvider="voyant-connect" />)

    expect(html).toContain("External")
    expect(html).toContain("voyant-connect")
  })

  it("renders Romanian badge copy with the package provider", () => {
    const html = renderToStaticMarkup(
      <ChartersUiMessagesProvider locale="ro-RO">
        <ExternalCharterBadge sourceProvider="voyant-connect" />
      </ChartersUiMessagesProvider>,
    )

    expect(html).toContain("Extern")
    expect(html).toContain("voyant-connect")
  })

  it("renders Chinese copy with the package provider via region fallback", () => {
    const html = renderToStaticMarkup(
      <ChartersUiMessagesProvider locale="zh-CN">
        <ExternalCharterBadge sourceProvider="voyant-connect" />
      </ChartersUiMessagesProvider>,
    )

    expect(html).toContain("外采")
    expect(html).toContain("voyant-connect")
  })

  it("renders localized quote and suite copy with the package provider", () => {
    const html = renderToStaticMarkup(
      <ChartersUiMessagesProvider locale="ro-RO">
        <WholeYachtQuoteCard quote={wholeYachtQuote} />
        <PerSuiteQuoteCard quote={perSuiteQuote} />
        <VoyageSuiteGrid suites={[suite]} currency="USD" />
      </ChartersUiMessagesProvider>,
    )

    expect(html).toContain("Oferta charter pentru intregul yacht")
    expect(html).toContain("Total de plata")
    expect(html).toContain("Oferta charter per suita")
    expect(html).toContain("Taxa portuara")
    expect(html).toContain("Disponibil")
    expect(html).toContain("pana la 2 oaspeti")
  })
})
