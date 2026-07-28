import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  capturedOptions: { current: undefined as unknown },
  handler: { entityModule: "products" },
  upsertPersonFromContact: vi.fn(),
  resolveOptionPriceRulesForDate: vi.fn(),
  resolvePriceCatalogCandidates: vi.fn(),
}))

vi.mock("@voyant-travel/bookings/requirements", () => ({
  bookingRequirementsService: {
    listProductContactRequirements: vi.fn(),
  },
}))

vi.mock("@voyant-travel/commerce", () => ({
  extraPriceRules: { __table: "extra_price_rules" },
  optionPriceRules: { __table: "option_price_rules" },
  optionUnitPriceRules: { __table: "option_unit_price_rules" },
  priceCatalogs: { __table: "price_catalogs" },
  pricingCategories: { __table: "pricing_categories" },
  pricingCategoryDependencies: { __table: "pricing_category_dependencies" },
  resolveOptionPriceRulesForDate: mocks.resolveOptionPriceRulesForDate,
}))

vi.mock("@voyant-travel/finance", () => ({
  createBooking: vi.fn(),
  resolveBookingSellTaxRate: vi.fn(),
}))

vi.mock("@voyant-travel/inventory/booking-engine", () => ({
  createProductsBookingHandler: vi.fn((options: unknown) => {
    mocks.capturedOptions.current = options
    return mocks.handler
  }),
}))

vi.mock("@voyant-travel/inventory/extras", () => ({
  productExtras: {},
}))

vi.mock("@voyant-travel/inventory/schema", () => ({
  optionUnits: { __table: "option_units" },
  productOptions: { __table: "product_options" },
  products: { __table: "products" },
}))

vi.mock("@voyant-travel/operations", () => ({
  availabilitySlots: {},
  extendAvailabilityHold: vi.fn(),
  placeAvailabilityHold: vi.fn(),
  releaseAvailabilityHold: vi.fn(),
}))

vi.mock("@voyant-travel/operator-settings", () => ({
  resolveBookingTaxSettings: vi.fn(),
}))

vi.mock("@voyant-travel/relationships", () => ({
  relationshipsService: {
    upsertPersonFromContact: mocks.upsertPersonFromContact,
  },
}))

vi.mock("drizzle-orm", () => ({
  and: vi.fn(),
  asc: vi.fn(),
  desc: vi.fn(),
  eq: vi.fn(),
  inArray: vi.fn(),
  or: vi.fn(),
}))

vi.mock("../../src/booking-engine/product-runtime-support", () => ({
  deriveTravelerCategory: vi.fn(),
  humanizeFieldKey: (key: string) => key,
  persistBookingCreateTaxLines: vi.fn(),
  typeForFieldKey: vi.fn(),
  resolvePriceCatalogCandidates: mocks.resolvePriceCatalogCandidates,
}))

import { registerProductBookingHandler } from "../../src/booking-engine/product-runtime"

describe("registerProductBookingHandler", () => {
  beforeEach(() => {
    mocks.capturedOptions.current = undefined
    mocks.upsertPersonFromContact.mockReset()
  })

  it("wires anonymous owned-product billing resolution through Relationships", async () => {
    const registry = { register: vi.fn() }

    registerProductBookingHandler(registry as never, {
      withDatabase: (operation) => operation("db" as never),
    })

    expect(registry.register).toHaveBeenCalledWith(mocks.handler)
    const options = mocks.capturedOptions.current as {
      resolveBillingPerson?: (
        contact: {
          firstName?: string | null
          lastName?: string | null
          email?: string | null
          phone?: string | null
        },
        ctx: { source: string; sourceRef: string },
      ) => Promise<string | null>
    }
    expect(options.resolveBillingPerson).toEqual(expect.any(Function))

    const contact = {
      firstName: "Guest",
      lastName: "Customer",
      email: "guest@example.com",
      phone: "+40700333444",
    }
    mocks.upsertPersonFromContact.mockResolvedValueOnce({ id: "pers_resolved" })

    const result = await options.resolveBillingPerson?.(contact, {
      source: "storefront-booking",
      sourceRef: "BK-TEST-1",
    })

    expect(result).toBe("pers_resolved")
    expect(mocks.upsertPersonFromContact).toHaveBeenCalledWith("db", contact, {
      source: "storefront-booking",
      sourceRef: "BK-TEST-1",
    })
  })
})

// ---------------------------------------------------------------------------
// Price catalog selection
// ---------------------------------------------------------------------------

/**
 * Minimal stand-in for the drizzle query builder. `.where()` returns a real
 * promise carrying `.orderBy()`/`.limit()`, which is what drizzle does too:
 * the builder is awaitable at any point and the trailing clauses are optional.
 * Whatever the fixture registered for the table passed to `.from()` resolves.
 */
function fakeDb(rowsByTable: Record<string, unknown[]>) {
  const builder = () => {
    let table = ""
    const settle = () => {
      const pending = Promise.resolve(rowsByTable[table] ?? [])
      return Object.assign(pending, { orderBy: () => pending, limit: () => pending })
    }
    return {
      from(t: { __table: string }) {
        table = t.__table
        return this
      },
      where: settle,
    }
  }
  return { select: () => builder() }
}

function loaders() {
  const registry = { register: vi.fn() }
  registerProductBookingHandler(registry as never, {
    withDatabase: (operation) => operation("db" as never),
  })
  return mocks.capturedOptions.current as {
    loadResolvedOptionPrice: (
      ctx: { db: unknown },
      args: { productId: string; optionId: string; catalogId?: string; date: string },
    ) => Promise<{ baseSellAmountCents: number | null; unitPrices: unknown[] } | null>
  }
}

const triedCatalogs = () =>
  mocks.resolveOptionPriceRulesForDate.mock.calls.map(
    (call: unknown[]) => (call[1] as { catalogId: string }).catalogId,
  )

describe("loadResolvedOptionPrice catalog selection", () => {
  beforeEach(() => {
    mocks.capturedOptions.current = undefined
    mocks.resolveOptionPriceRulesForDate.mockReset()
    mocks.resolvePriceCatalogCandidates.mockReset()
  })

  it("walks candidate catalogs until one actually prices the option", async () => {
    // The shape that broke production: the only rule for these products sat in
    // a non-default CNY catalog while two EUR/GBP catalogs both claimed
    // `isDefault`. Resolving "the" default found no rule, and the caller fell
    // back to a flat `product.sell_amount_cents × pax` — which silently billed
    // a child the adult fare because the flat number still looked plausible.
    mocks.resolvePriceCatalogCandidates.mockResolvedValue(["prca_cny_xj", "prca_eur"])
    mocks.resolveOptionPriceRulesForDate.mockImplementation(
      (_db: unknown, params: { catalogId: string; optionIds: string[] }) =>
        params.catalogId === "prca_cny_xj"
          ? new Map([[params.optionIds[0], { id: "oprr_1" }]])
          : new Map(),
    )

    const db = fakeDb({
      option_price_rules: [{ baseSellAmountCents: 598000 }],
      option_unit_price_rules: [
        { unitId: "ount_adult", sellAmountCents: 598000, pricingCategoryId: null },
        { unitId: "ount_child", sellAmountCents: 398000, pricingCategoryId: null },
      ],
      option_units: [
        { id: "ount_adult", code: "ADULT", unitType: "person", minAge: 12, maxAge: null },
        { id: "ount_child", code: "CHILD", unitType: "person", minAge: 2, maxAge: 11 },
      ],
    })

    const resolved = await loaders().loadResolvedOptionPrice(
      { db },
      { productId: "prod_1", optionId: "popt_1", date: "2026-08-05" },
    )

    expect(resolved?.baseSellAmountCents).toBe(598000)
    // Both units priced separately is the whole point: this is what stops the
    // caller from collapsing to one flat per-head line.
    expect(resolved?.unitPrices).toHaveLength(2)
    expect(triedCatalogs()).toEqual(["prca_cny_xj"])
  })

  it("keeps trying later candidates when the first one has no rule", async () => {
    mocks.resolvePriceCatalogCandidates.mockResolvedValue(["prca_a", "prca_b"])
    mocks.resolveOptionPriceRulesForDate.mockImplementation(
      (_db: unknown, params: { catalogId: string; optionIds: string[] }) =>
        params.catalogId === "prca_b"
          ? new Map([[params.optionIds[0], { id: "oprr_2" }]])
          : new Map(),
    )

    const resolved = await loaders().loadResolvedOptionPrice(
      { db: fakeDb({ option_price_rules: [{ baseSellAmountCents: 12000 }] }) },
      { productId: "prod_2", optionId: "popt_2", date: "2026-08-05" },
    )

    expect(resolved?.baseSellAmountCents).toBe(12000)
    expect(triedCatalogs()).toEqual(["prca_a", "prca_b"])
  })

  it("honours an explicit catalog id without probing the others", async () => {
    mocks.resolvePriceCatalogCandidates.mockResolvedValue(["prca_cny_xj"])
    mocks.resolveOptionPriceRulesForDate.mockResolvedValue(new Map([["popt_3", { id: "oprr_3" }]]))

    await loaders().loadResolvedOptionPrice(
      { db: fakeDb({ option_price_rules: [{ baseSellAmountCents: 100 }] }) },
      { productId: "prod_3", optionId: "popt_3", catalogId: "prca_eur", date: "2026-08-05" },
    )

    expect(mocks.resolvePriceCatalogCandidates).not.toHaveBeenCalled()
    expect(triedCatalogs()).toEqual(["prca_eur"])
  })

  it("returns null when no candidate catalog prices the option", async () => {
    mocks.resolvePriceCatalogCandidates.mockResolvedValue(["prca_a", "prca_b"])
    mocks.resolveOptionPriceRulesForDate.mockResolvedValue(new Map())

    const resolved = await loaders().loadResolvedOptionPrice(
      { db: fakeDb({}) },
      { productId: "prod_4", optionId: "popt_4", date: "2026-08-05" },
    )

    expect(resolved).toBeNull()
    expect(triedCatalogs()).toEqual(["prca_a", "prca_b"])
  })
})
