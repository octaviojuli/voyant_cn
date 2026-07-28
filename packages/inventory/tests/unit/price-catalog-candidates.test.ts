import { describe, expect, it } from "vitest"

import { orderPriceCatalogCandidates } from "../../src/booking-engine/product-runtime-support.js"

// Rows arrive pre-sorted by the query (`isDefault` first, then code); these
// fixtures keep that order so the assertions read as "what the DB handed us".
const EUR_DEFAULT = { id: "prca_eur", currencyCode: "EUR" }
const GBP_DEFAULT = { id: "prca_gbp", currencyCode: "GBP" }
const CNY_BASE = { id: "prca_cny", currencyCode: "CNY" }
const CNY_SEASONAL = { id: "prca_cny_xj", currencyCode: "CNY" }

describe("orderPriceCatalogCandidates", () => {
  it("puts every catalog in the product's currency ahead of the rest", () => {
    expect(
      orderPriceCatalogCandidates([EUR_DEFAULT, GBP_DEFAULT, CNY_BASE, CNY_SEASONAL], "CNY"),
    ).toEqual(["prca_cny", "prca_cny_xj", "prca_eur", "prca_gbp"])
  })

  it("keeps the incoming order within each partition", () => {
    // `isDefault` ordering is applied by the query, not here — reversing the
    // input must reverse the output, otherwise this function is quietly
    // re-sorting and the caller's ORDER BY stops meaning anything.
    expect(
      orderPriceCatalogCandidates([CNY_SEASONAL, CNY_BASE, GBP_DEFAULT, EUR_DEFAULT], "CNY"),
    ).toEqual(["prca_cny_xj", "prca_cny", "prca_gbp", "prca_eur"])
  })

  it("still offers the non-matching catalogs when no catalog uses the currency", () => {
    // A product priced in a currency nobody publishes a catalog for should not
    // become unsellable; the old single-default behavior is the floor here.
    expect(orderPriceCatalogCandidates([EUR_DEFAULT, GBP_DEFAULT], "USD")).toEqual([
      "prca_eur",
      "prca_gbp",
    ])
  })

  it("passes everything through when the product has no sell currency", () => {
    expect(orderPriceCatalogCandidates([EUR_DEFAULT, CNY_BASE], null)).toEqual([
      "prca_eur",
      "prca_cny",
    ])
  })

  it("returns nothing when there are no public catalogs", () => {
    expect(orderPriceCatalogCandidates([], "CNY")).toEqual([])
  })
})
