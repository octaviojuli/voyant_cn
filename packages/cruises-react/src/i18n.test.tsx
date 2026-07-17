import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { ExternalCruiseBadge } from "./components/external-badge.js"
import { QuoteDisplay } from "./components/quote-display.js"
import {
  CruisesUiMessagesProvider,
  getCruisesUiI18n,
  resolveCruisesUiMessages,
} from "./i18n/index.js"
import type { Quote } from "./index.js"

const quote: Quote = {
  fareCode: "SAVER",
  fareCodeName: "Saver fare",
  currency: "USD",
  occupancy: 2,
  guestCount: 2,
  basePerPerson: "1200.00",
  components: [
    {
      kind: "gratuity",
      label: null,
      amount: "150.00",
      currency: "USD",
      direction: "addition",
      perPerson: true,
    },
  ],
  totalPerPerson: "1350.00",
  totalForCabin: "2700.00",
}

describe("cruises-ui i18n", () => {
  it("resolves localized package messages with fallback and overrides", () => {
    const result = resolveCruisesUiMessages({
      locale: "ro-RO",
      overrides: {
        locales: {
          ro: {
            quoteDisplay: {
              heading: "Oferta personalizata",
            },
          },
        },
      },
    })

    expect(result.quoteDisplay.heading).toBe("Oferta personalizata")
    expect(result.pricingGrid.empty).toBe("Nu exista tarife publicate pentru aceasta plecare.")
  })

  it("returns locale-aware formatters from the package helper", () => {
    const result = getCruisesUiI18n({ locale: "ro-RO" })

    expect(result.locale).toBe("ro-RO")
    expect(result.formatCurrency(1200, "USD")).toBe(
      new Intl.NumberFormat("ro-RO", { currency: "USD", style: "currency" }).format(1200),
    )
  })

  it("renders English copy without a provider", () => {
    const html = renderToStaticMarkup(<ExternalCruiseBadge sourceProvider="voyant-connect" />)

    expect(html).toContain("External")
    expect(html).toContain("voyant-connect")
  })

  it("renders Romanian copy with the package provider", () => {
    const html = renderToStaticMarkup(
      <CruisesUiMessagesProvider locale="ro-RO">
        <ExternalCruiseBadge sourceProvider="voyant-connect" />
      </CruisesUiMessagesProvider>,
    )

    expect(html).toContain("Extern")
    expect(html).toContain("voyant-connect")
  })

  it("renders Chinese copy with the package provider via region fallback", () => {
    const html = renderToStaticMarkup(
      <CruisesUiMessagesProvider locale="zh-CN">
        <ExternalCruiseBadge sourceProvider="voyant-connect" />
      </CruisesUiMessagesProvider>,
    )

    expect(html).toContain("外采")
    expect(html).toContain("voyant-connect")
  })

  it("renders localized quote copy with the package provider", () => {
    const html = renderToStaticMarkup(
      <CruisesUiMessagesProvider locale="ro-RO">
        <QuoteDisplay quote={quote} />
      </CruisesUiMessagesProvider>,
    )

    expect(html).toContain("Oferta ta")
    expect(html).toContain("Total pentru cabina")
    expect(html).toContain("Costuri suplimentare")
  })
})
