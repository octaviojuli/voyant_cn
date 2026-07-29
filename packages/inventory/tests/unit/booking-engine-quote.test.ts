// agent-quality: file-size exception — cohesive booking-engine quote/commit
// suite; splitting would scatter shared product/context fixtures. See #2618.
import type {
  CommitOwnedRequest,
  ComputeQuoteRequest,
  OwnedHandlerContext,
} from "@voyant-travel/catalog/booking-engine"
import { describe, expect, it, vi } from "vitest"

import {
  createProductsBookingHandler,
  type ResolvedOptionPrice,
  type ResolvedPaxPricingTier,
} from "../../src/booking-engine/handler.js"

const product = {
  id: "prod_a",
  name: "Bulgaria Day Trip",
  status: "active" as const,
  sellAmountCents: 14500,
  sellCurrency: "RON",
}

function makeDb(rows: unknown[]) {
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => rows,
        }),
      }),
    }),
  } as OwnedHandlerContext["db"]
}

function makeCtx(rows: unknown[]): OwnedHandlerContext {
  return {
    db: makeDb(rows),
    adapterContext: {} as never,
  }
}

const baseRequest = (draft?: unknown): ComputeQuoteRequest => ({
  entityModule: "products",
  entityId: product.id,
  scope: { locale: "en", audience: "customer", market: "RO" },
  draft: draft ?? {},
})

describe("createProductsBookingHandler.computeQuote", () => {
  it("falls back to product.sellAmountCents × pax when no resolver hooks are wired", async () => {
    const handler = createProductsBookingHandler({
      createBooking: vi.fn(),
    })

    const result = await handler.computeQuote(
      makeCtx([product]),
      baseRequest({ configure: { pax: { adult: 2 } } }),
    )

    expect(result.available).toBe(true)
    const breakdown = result.pricing?.breakdown as Record<string, unknown>
    expect(breakdown?.total).toBe(29000)
    expect(breakdown?.subtotal).toBe(29000)
    const lines = breakdown?.lines as Array<{ totalAmount: number; quantity: number }>
    expect(lines).toHaveLength(1)
    expect(lines[0]?.totalAmount).toBe(29000)
    expect(lines[0]?.quantity).toBe(2)
  })

  it("uses per-band unit prices when the resolver returns matching units", async () => {
    const loadResolvedOptionPrice = vi.fn(
      async (): Promise<ResolvedOptionPrice> => ({
        baseSellAmountCents: 16000,
        unitPrices: [
          {
            unitId: "u_adult",
            unitType: "person",
            travelerCategory: "adult",
            sellAmountCents: 16000,
          },
          {
            unitId: "u_child",
            unitType: "person",
            travelerCategory: "child",
            sellAmountCents: 9500,
          },
          {
            unitId: "u_infant",
            unitType: "person",
            travelerCategory: "infant",
            sellAmountCents: 0,
          },
        ],
      }),
    )
    const loadSlotDate = vi.fn(async () => "2026-06-21")

    const handler = createProductsBookingHandler({
      createBooking: vi.fn(),
      loadResolvedOptionPrice,
      loadSlotDate,
    })

    const result = await handler.computeQuote(
      makeCtx([product]),
      baseRequest({
        configure: {
          variantId: "opt_default",
          departureSlotId: "slot_1",
          pax: { adult: 2, child: 1, infant: 1 },
        },
      }),
    )

    expect(loadSlotDate).toHaveBeenCalledWith(expect.anything(), "slot_1")
    expect(loadResolvedOptionPrice).toHaveBeenCalledWith(expect.anything(), {
      productId: product.id,
      optionId: "opt_default",
      date: "2026-06-21",
    })

    const breakdown = result.pricing?.breakdown as Record<string, unknown>
    // 2 × 16000 + 1 × 9500 = 41500. Infant (sell=0) drops out.
    expect(breakdown?.total).toBe(41500)
    const lines = breakdown?.lines as Array<{ quantity: number; unitAmount: number }>
    expect(lines).toHaveLength(2)
    expect(lines.map((l) => `${l.quantity}×${l.unitAmount}`)).toEqual(["2×16000", "1×9500"])
  })

  it("uses baseSellAmountCents × pax for per-booking rules with no unit prices", async () => {
    const handler = createProductsBookingHandler({
      createBooking: vi.fn(),
      loadSlotDate: async () => "2026-07-15",
      loadResolvedOptionPrice: async () => ({
        baseSellAmountCents: 18000,
        unitPrices: [],
      }),
    })

    const result = await handler.computeQuote(
      makeCtx([product]),
      baseRequest({
        configure: {
          variantId: "opt_default",
          departureSlotId: "slot_1",
          pax: { adult: 3 },
        },
      }),
    )

    const breakdown = result.pricing?.breakdown as Record<string, unknown>
    expect(breakdown?.total).toBe(54000) // 18000 × 3
    const lines = breakdown?.lines as Array<{ unitAmount: number; quantity: number }>
    expect(lines).toHaveLength(1)
    expect(lines[0]?.unitAmount).toBe(18000)
    expect(lines[0]?.quantity).toBe(3)
  })

  it("prices selected product option quantities", async () => {
    const loadResolvedOptionPrice = vi.fn(
      async (): Promise<ResolvedOptionPrice> => ({
        baseSellAmountCents: 25000,
        unitPrices: [
          {
            unitId: "unit_suite",
            unitType: "room",
            travelerCategory: null,
            sellAmountCents: 32000,
          },
        ],
      }),
    )
    const handler = createProductsBookingHandler({
      createBooking: vi.fn(),
      loadSlotDate: async () => "2026-07-15",
      loadProductOptions: async () => [
        {
          id: "opt_suite",
          name: "Junior suite upgrade",
          units: [{ id: "unit_suite", name: "Suite" }],
        },
      ],
      loadResolvedOptionPrice,
    })

    const result = await handler.computeQuote(
      makeCtx([product]),
      baseRequest({
        configure: {
          departureSlotId: "slot_1",
          optionSelections: [{ optionId: "opt_suite", optionUnitId: "unit_suite", quantity: 2 }],
        },
      }),
    )

    expect(loadResolvedOptionPrice).toHaveBeenCalledWith(expect.anything(), {
      productId: product.id,
      optionId: "opt_suite",
      date: "2026-07-15",
    })
    const breakdown = result.pricing?.breakdown as Record<string, unknown>
    expect(breakdown?.total).toBe(64000)
    const lines = breakdown?.lines as Array<{ label: string; quantity: number; unitAmount: number }>
    expect(lines[0]).toEqual(
      expect.objectContaining({
        label: "Junior suite upgrade",
        quantity: 2,
        unitAmount: 32000,
      }),
    )
  })

  it("uses selected option-unit pax tiers before falling back to the product base price", async () => {
    const loadPaxPricingTier = vi.fn(
      async (
        _ctx: OwnedHandlerContext,
        args: {
          productId: string
          optionUnitId: string
          tierPax: number
          date?: string | null
        },
      ): Promise<ResolvedPaxPricingTier | null> => {
        if (args.tierPax !== 2) return null
        if (args.optionUnitId === "unit_standard_adult") return { pricePerPaxCents: 12000 }
        if (args.optionUnitId === "unit_champagne_adult") return { pricePerPaxCents: 18000 }
        return null
      },
    )
    const handler = createProductsBookingHandler({
      createBooking: vi.fn(),
      loadProductOptions: async () => [
        {
          id: "opt_standard",
          name: "Standard",
          units: [{ id: "unit_standard_adult", name: "Adult", unitType: "person" }],
        },
        {
          id: "opt_champagne",
          name: "Champagne",
          units: [{ id: "unit_champagne_adult", name: "Adult", unitType: "person" }],
        },
      ],
      loadPaxPricingTier,
    })

    const standard = await handler.computeQuote(
      makeCtx([product]),
      baseRequest({
        configure: {
          optionSelections: [
            { optionId: "opt_standard", optionUnitId: "unit_standard_adult", quantity: 2 },
          ],
        },
      }),
    )
    const champagne = await handler.computeQuote(
      makeCtx([product]),
      baseRequest({
        configure: {
          optionSelections: [
            { optionId: "opt_champagne", optionUnitId: "unit_champagne_adult", quantity: 2 },
          ],
        },
      }),
    )

    expect(loadPaxPricingTier).toHaveBeenCalledWith(expect.anything(), {
      productId: product.id,
      optionUnitId: "unit_standard_adult",
      tierPax: 2,
      date: null,
    })
    expect(loadPaxPricingTier).toHaveBeenCalledWith(expect.anything(), {
      productId: product.id,
      optionUnitId: "unit_champagne_adult",
      tierPax: 2,
      date: null,
    })
    const standardBreakdown = standard.pricing?.breakdown as Record<string, unknown>
    const champagneBreakdown = champagne.pricing?.breakdown as Record<string, unknown>
    expect(standardBreakdown?.total).toBe(24000)
    expect(champagneBreakdown?.total).toBe(36000)
    expect(standardBreakdown?.total).not.toBe(champagneBreakdown?.total)
  })

  it("uses total person occupancy for mixed option-unit pax tier lookups", async () => {
    const loadPaxPricingTier = vi.fn(
      async (
        _ctx: OwnedHandlerContext,
        args: {
          productId: string
          optionUnitId: string
          tierPax: number
          date?: string | null
        },
      ): Promise<ResolvedPaxPricingTier | null> => {
        if (args.tierPax !== 3) return null
        if (args.optionUnitId === "unit_adult") return { pricePerPaxCents: 11000 }
        if (args.optionUnitId === "unit_child") return { pricePerPaxCents: 7000 }
        return null
      },
    )
    const handler = createProductsBookingHandler({
      createBooking: vi.fn(),
      loadProductOptions: async () => [
        {
          id: "opt_tour",
          name: "Tour",
          units: [
            { id: "unit_adult", name: "Adult", unitType: "person" },
            { id: "unit_child", name: "Child", unitType: "person" },
          ],
        },
      ],
      loadPaxPricingTier,
    })

    const result = await handler.computeQuote(
      makeCtx([product]),
      baseRequest({
        configure: {
          pax: { adult: 2, child: 1 },
          optionSelections: [
            { optionId: "opt_tour", optionUnitId: "unit_adult", quantity: 2 },
            { optionId: "opt_tour", optionUnitId: "unit_child", quantity: 1 },
          ],
        },
      }),
    )

    expect(loadPaxPricingTier).toHaveBeenCalledWith(expect.anything(), {
      productId: product.id,
      optionUnitId: "unit_adult",
      tierPax: 3,
      date: null,
    })
    expect(loadPaxPricingTier).toHaveBeenCalledWith(expect.anything(), {
      productId: product.id,
      optionUnitId: "unit_child",
      tierPax: 3,
      date: null,
    })
    const breakdown = result.pricing?.breakdown as Record<string, unknown>
    expect(breakdown?.total).toBe(29000)
  })

  it("falls through to product.sellAmountCents when the resolver returns null", async () => {
    const handler = createProductsBookingHandler({
      createBooking: vi.fn(),
      loadSlotDate: async () => "2026-12-01",
      loadResolvedOptionPrice: async () => null,
    })

    const result = await handler.computeQuote(
      makeCtx([product]),
      baseRequest({
        configure: {
          variantId: "opt_default",
          departureSlotId: "slot_1",
          pax: { adult: 1 },
        },
      }),
    )

    const breakdown = result.pricing?.breakdown as Record<string, unknown>
    expect(breakdown?.total).toBe(14500) // product.sellAmountCents × 1
  })

  it("skips the resolver when no slot is selected (single-occupant baseline)", async () => {
    const loadResolvedOptionPrice = vi.fn(async (): Promise<ResolvedOptionPrice | null> => null)

    const handler = createProductsBookingHandler({
      createBooking: vi.fn(),
      loadResolvedOptionPrice,
      loadSlotDate: async () => "2026-06-21",
    })

    const result = await handler.computeQuote(
      makeCtx([product]),
      baseRequest({ configure: { variantId: "opt_default" } }),
    )

    expect(loadResolvedOptionPrice).not.toHaveBeenCalled()
    const breakdown = result.pricing?.breakdown as Record<string, unknown>
    expect(breakdown?.total).toBe(14500) // single-occupant fallback
  })

  it("respects an inline draft.configure.departureDate when no loadSlotDate is wired", async () => {
    const loadResolvedOptionPrice = vi.fn(
      async (): Promise<ResolvedOptionPrice> => ({
        baseSellAmountCents: 20000,
        unitPrices: [],
      }),
    )

    const handler = createProductsBookingHandler({
      createBooking: vi.fn(),
      loadResolvedOptionPrice,
    })

    const result = await handler.computeQuote(
      makeCtx([product]),
      baseRequest({
        configure: {
          variantId: "opt_default",
          departureDate: "2026-06-21",
          pax: { adult: 2 },
        },
      }),
    )

    expect(loadResolvedOptionPrice).toHaveBeenCalledWith(expect.anything(), {
      productId: product.id,
      optionId: "opt_default",
      date: "2026-06-21",
    })
    const breakdown = result.pricing?.breakdown as Record<string, unknown>
    expect(breakdown?.total).toBe(40000)
  })

  it("prices the catalog's default option when the draft names none", async () => {
    // How the child-billed-as-adult bug actually reached production. A
    // product with a single default option gives the shopper nothing to pick,
    // so `configure.variantId` is never written — and pricing skipped the
    // resolver entirely for want of an option id, falling all the way back to
    // `product.sellAmountCents × pax`. The flat number looks plausible, so
    // nothing surfaced until an adult and a child shared one booking.
    const loadResolvedOptionPrice = vi.fn(
      async (): Promise<ResolvedOptionPrice> => ({
        baseSellAmountCents: 16000,
        unitPrices: [
          {
            unitId: "u_adult",
            unitType: "person",
            travelerCategory: "adult",
            sellAmountCents: 16000,
          },
          {
            unitId: "u_child",
            unitType: "person",
            travelerCategory: "child",
            sellAmountCents: 9500,
          },
        ],
      }),
    )

    const handler = createProductsBookingHandler({
      createBooking: vi.fn(),
      loadResolvedOptionPrice,
      loadProductOptions: async () => [{ id: "opt_standard", name: "Standard", isDefault: true }],
      loadSlotDate: async () => "2026-06-21",
    })

    const result = await handler.computeQuote(
      makeCtx([product]),
      baseRequest({
        // No `variantId` — exactly what the wizard sends.
        configure: { departureSlotId: "slot_1", pax: { adult: 1, child: 1 } },
      }),
    )

    expect(loadResolvedOptionPrice).toHaveBeenCalledWith(expect.anything(), {
      productId: product.id,
      optionId: "opt_standard",
      date: "2026-06-21",
    })
    const breakdown = result.pricing?.breakdown as Record<string, unknown>
    // 16000 + 9500, not 2 × product.sellAmountCents (29000).
    expect(breakdown?.total).toBe(25500)
    expect(breakdown?.lines).toHaveLength(2)
  })

  it("falls back to the sole option when none is flagged default", async () => {
    const loadResolvedOptionPrice = vi.fn(
      async (): Promise<ResolvedOptionPrice> => ({
        baseSellAmountCents: 20000,
        unitPrices: [],
      }),
    )

    const handler = createProductsBookingHandler({
      createBooking: vi.fn(),
      loadResolvedOptionPrice,
      loadProductOptions: async () => [{ id: "opt_only", name: "Only" }],
      loadSlotDate: async () => "2026-06-21",
    })

    await handler.computeQuote(
      makeCtx([product]),
      baseRequest({ configure: { departureSlotId: "slot_1", pax: { adult: 1 } } }),
    )

    expect(loadResolvedOptionPrice).toHaveBeenCalledWith(expect.anything(), {
      productId: product.id,
      optionId: "opt_only",
      date: "2026-06-21",
    })
  })

  it("does not guess an option when several exist and none is default", async () => {
    // Guessing here would quote one option's price while the wizard shows
    // another's units. Falling back to the product base price is the honest
    // answer until the shopper picks.
    const loadResolvedOptionPrice = vi.fn(async (): Promise<ResolvedOptionPrice | null> => null)

    const handler = createProductsBookingHandler({
      createBooking: vi.fn(),
      loadResolvedOptionPrice,
      loadProductOptions: async () => [
        { id: "opt_a", name: "A" },
        { id: "opt_b", name: "B" },
      ],
      loadSlotDate: async () => "2026-06-21",
    })

    await handler.computeQuote(
      makeCtx([product]),
      baseRequest({ configure: { departureSlotId: "slot_1", pax: { adult: 1 } } }),
    )

    expect(loadResolvedOptionPrice).not.toHaveBeenCalled()
  })

  it("still honours an explicitly picked option over the default", async () => {
    const loadResolvedOptionPrice = vi.fn(
      async (): Promise<ResolvedOptionPrice> => ({
        baseSellAmountCents: 20000,
        unitPrices: [],
      }),
    )

    const handler = createProductsBookingHandler({
      createBooking: vi.fn(),
      loadResolvedOptionPrice,
      loadProductOptions: async () => [
        { id: "opt_standard", name: "Standard", isDefault: true },
        { id: "opt_premium", name: "Premium" },
      ],
      loadSlotDate: async () => "2026-06-21",
    })

    await handler.computeQuote(
      makeCtx([product]),
      baseRequest({
        configure: { variantId: "opt_premium", departureSlotId: "slot_1", pax: { adult: 1 } },
      }),
    )

    expect(loadResolvedOptionPrice).toHaveBeenCalledWith(expect.anything(), {
      productId: product.id,
      optionId: "opt_premium",
      date: "2026-06-21",
    })
  })
})

describe("createProductsBookingHandler.commit", () => {
  it("converts the draft hold into an on-hold booking for the held pax", async () => {
    const createBooking = vi.fn(async () => ({
      status: "ok" as const,
      bookingId: "book_held",
      bookingNumber: "BK-HELD",
    }))
    const handler = createProductsBookingHandler({ createBooking })

    const result = await handler.commit(makeCtx([product]), {
      entityModule: "products",
      entityId: product.id,
      bookingId: "catalog_booking_held",
      parameters: { availabilityHoldToken: "draft_held" },
      draft: {
        configure: {
          departureSlotId: "slot_held",
          pax: { adult: 2 },
        },
      },
    })

    expect(result.status).toBe("held")
    expect(createBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        slotId: "slot_held",
        pax: 2,
        availabilityHoldToken: "draft_held",
        initialStatus: "on_hold",
      }),
    )
  })

  it("uses the gross inclusive-tax total for the booking sell amount override", async () => {
    const createBooking = vi.fn(async () => ({
      status: "ok" as const,
      bookingId: "book_1",
      bookingNumber: "BK-1",
    }))
    const handler = createProductsBookingHandler({ createBooking })

    const request: CommitOwnedRequest = {
      entityModule: "products",
      entityId: product.id,
      bookingId: "catalog_booking_1",
      draft: {
        configure: {
          optionSelections: [{ optionId: "opt_suite", optionUnitId: "unit_suite", quantity: 2 }],
        },
        travelCreditRedemption: {
          travelCreditId: "trc_123",
          amountCents: 2_500,
        },
      },
      pricing: {
        base_amount: 8333,
        taxes: 1667,
        fees: 0,
        surcharges: 0,
        currency: "RON",
        breakdown: {
          currency: "RON",
          subtotal: 8333,
          taxTotal: 1667,
          total: 10000,
          taxes: [
            {
              label: "VAT",
              rate: 0.2,
              amount: 1667,
              includedInPrice: true,
              scope: "included",
            },
          ],
        },
      },
    }

    const result = await handler.commit(makeCtx([product]), request)

    expect(result.status).toBe("held")
    expect(createBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: product.id,
        itemLines: [
          {
            optionId: "opt_suite",
            optionUnitId: "unit_suite",
            quantity: 2,
          },
        ],
        optionId: "opt_suite",
        sellAmountCentsOverride: 10000,
        travelCreditRedemption: {
          travelCreditId: "trc_123",
          amountCents: 2_500,
        },
      }),
    )
  })

  it("commits multiple selected option quantities as item lines without a single option id", async () => {
    const createBooking = vi.fn(async () => ({
      status: "ok" as const,
      bookingId: "book_1",
      bookingNumber: "BK-1",
    }))
    const handler = createProductsBookingHandler({ createBooking })

    const request: CommitOwnedRequest = {
      entityModule: "products",
      entityId: product.id,
      bookingId: "catalog_booking_1",
      draft: {
        configure: {
          optionSelections: [
            { optionId: "opt_standard", optionUnitId: "unit_standard", quantity: 1 },
            { optionId: "opt_suite", optionUnitId: "unit_suite", quantity: 1 },
          ],
        },
      },
      pricing: {
        base_amount: 29000,
        taxes: 0,
        fees: 0,
        surcharges: 0,
        currency: "RON",
      },
    }

    const result = await handler.commit(makeCtx([product]), request)

    expect(result.status).toBe("held")
    expect(createBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        optionId: null,
        itemLines: [
          { optionId: "opt_standard", optionUnitId: "unit_standard", quantity: 1 },
          { optionId: "opt_suite", optionUnitId: "unit_suite", quantity: 1 },
        ],
      }),
    )
  })

  it("threads trips billing and traveler records into the booking bridge", async () => {
    const createBooking = vi.fn(async () => ({
      status: "ok" as const,
      bookingId: "book_1",
      bookingNumber: "BK-1",
    }))
    const handler = createProductsBookingHandler({ createBooking })

    const request: CommitOwnedRequest = {
      entityModule: "products",
      entityId: product.id,
      bookingId: "catalog_booking_1",
      party: {
        travelerParty: {
          billing: {
            personId: "pers_billing",
            contact: {
              firstName: "Diego",
              lastName: "Muller",
              email: "diego@example.com",
              phone: "+40700111222",
            },
          },
          travelers: [{ personId: "pers_billing" }, { personId: "pers_companion" }],
        },
      },
      draft: {
        configure: { pax: { adult: 2 } },
        travelers: [
          { firstName: "Diego", lastName: "Muller", band: "adult" },
          { firstName: "Anya", lastName: "Costa", band: "adult" },
        ],
      },
      pricing: {
        base_amount: 29000,
        taxes: 0,
        fees: 0,
        surcharges: 0,
        currency: "RON",
      },
    }

    const result = await handler.commit(makeCtx([product]), request)

    expect(result.status).toBe("held")
    expect(createBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        personId: "pers_billing",
        contactFirstName: "Diego",
        contactLastName: "Muller",
        contactEmail: "diego@example.com",
        contactPhone: "+40700111222",
        travelers: [
          expect.objectContaining({ firstName: "Diego", personId: "pers_billing" }),
          expect.objectContaining({ firstName: "Anya", personId: "pers_companion" }),
        ],
      }),
    )
  })

  it("resolves a CRM person from the billing contact when an anonymous commit has no person/org", async () => {
    const createBooking = vi.fn(async () => ({
      status: "ok" as const,
      bookingId: "book_1",
      bookingNumber: "BK-1",
    }))
    const resolveBillingPerson = vi.fn(async () => "pers_resolved")
    const handler = createProductsBookingHandler({
      createBooking,
      resolveBillingPerson,
      generateBookingNumber: () => "BK-TEST-1",
    })

    const request: CommitOwnedRequest = {
      entityModule: "products",
      entityId: product.id,
      bookingId: "catalog_booking_1",
      // Anonymous storefront: billing contact only, no personId/organizationId.
      party: {
        billing: {
          contact: {
            firstName: "Guest",
            lastName: "Customer",
            email: "guest@example.com",
            phone: "+40700333444",
          },
        },
      },
      draft: {
        configure: { pax: { adult: 1 } },
        travelers: [{ firstName: "Guest", lastName: "Customer", band: "adult" }],
      },
      pricing: {
        base_amount: 14500,
        taxes: 0,
        fees: 0,
        surcharges: 0,
        currency: "RON",
      },
    }

    const result = await handler.commit(makeCtx([product]), request)

    expect(result.status).toBe("held")
    expect(resolveBillingPerson).toHaveBeenCalledWith(
      {
        firstName: "Guest",
        lastName: "Customer",
        email: "guest@example.com",
        phone: "+40700333444",
      },
      // Provenance ref is the persisted booking NUMBER, not the provisional
      // `request.bookingId` (which the finance bridge discards for its own id).
      expect.objectContaining({
        bookingId: "BK-TEST-1",
        sourceRef: "BK-TEST-1",
        source: "storefront-booking",
      }),
    )
    expect(createBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingNumber: "BK-TEST-1",
        personId: "pers_resolved",
        organizationId: null,
        contactFirstName: "Guest",
        contactEmail: "guest@example.com",
      }),
    )
  })

  it("resolves the billing person from the saved draft when the storefront commit sends no party", async () => {
    // The anonymous storefront POSTs only a draftId to /book, so `request.party`
    // is empty and the billing contact lives in `draft.billing.contact`.
    const createBooking = vi.fn(async () => ({
      status: "ok" as const,
      bookingId: "book_1",
      bookingNumber: "BK-1",
    }))
    const resolveBillingPerson = vi.fn(async () => "pers_from_draft")
    const handler = createProductsBookingHandler({ createBooking, resolveBillingPerson })

    const request: CommitOwnedRequest = {
      entityModule: "products",
      entityId: product.id,
      bookingId: "catalog_booking_1",
      // No party — mirrors the storefront /book payload (draftId only).
      draft: {
        configure: { pax: { adult: 1 } },
        travelers: [{ firstName: "Guest", lastName: "Customer", band: "adult" }],
        billing: {
          contact: {
            firstName: "Guest",
            lastName: "Customer",
            email: "guest@example.com",
            phone: "+40700333444",
          },
        },
      },
      pricing: { base_amount: 14500, taxes: 0, fees: 0, surcharges: 0, currency: "RON" },
    }

    const result = await handler.commit(makeCtx([product]), request)

    expect(result.status).toBe("held")
    expect(resolveBillingPerson).toHaveBeenCalledWith(
      expect.objectContaining({ email: "guest@example.com", phone: "+40700333444" }),
      expect.objectContaining({ source: "storefront-booking" }),
    )
    expect(createBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        personId: "pers_from_draft",
        contactEmail: "guest@example.com",
        contactFirstName: "Guest",
      }),
    )
  })

  it("skips the billing-person resolver when the commit already carries a person id", async () => {
    const createBooking = vi.fn(async () => ({
      status: "ok" as const,
      bookingId: "book_1",
      bookingNumber: "BK-1",
    }))
    const resolveBillingPerson = vi.fn(async () => "pers_should_not_be_used")
    const handler = createProductsBookingHandler({ createBooking, resolveBillingPerson })

    const request: CommitOwnedRequest = {
      entityModule: "products",
      entityId: product.id,
      bookingId: "catalog_booking_1",
      party: {
        billing: {
          personId: "pers_existing",
          contact: { firstName: "Ana", lastName: "Pop", email: "ana@example.com" },
        },
      },
      draft: { configure: { pax: { adult: 1 } } },
      pricing: { base_amount: 14500, taxes: 0, fees: 0, surcharges: 0, currency: "RON" },
    }

    const result = await handler.commit(makeCtx([product]), request)

    expect(result.status).toBe("held")
    expect(resolveBillingPerson).not.toHaveBeenCalled()
    expect(createBooking).toHaveBeenCalledWith(
      expect.objectContaining({ personId: "pers_existing" }),
    )
  })

  it("skips the resolver when the billing contact has a name but no email or phone", async () => {
    const createBooking = vi.fn(async () => ({
      status: "ok" as const,
      bookingId: "book_1",
      bookingNumber: "BK-1",
    }))
    const resolveBillingPerson = vi.fn(async () => "pers_should_not_be_used")
    const handler = createProductsBookingHandler({ createBooking, resolveBillingPerson })

    const request: CommitOwnedRequest = {
      entityModule: "products",
      entityId: product.id,
      bookingId: "catalog_booking_1",
      party: {
        // Name only, no contact point — resolving would create a CRM person
        // that still can't satisfy createBooking's email/phone requirement.
        billing: { contact: { firstName: "Guest", lastName: "Customer" } },
      },
      draft: { configure: { pax: { adult: 1 } } },
      pricing: { base_amount: 14500, taxes: 0, fees: 0, surcharges: 0, currency: "RON" },
    }

    const result = await handler.commit(makeCtx([product]), request)

    expect(result.status).toBe("held")
    expect(resolveBillingPerson).not.toHaveBeenCalled()
    expect(createBooking).toHaveBeenCalledWith(expect.objectContaining({ personId: null }))
  })

  it("skips the resolver when the billing contact point is whitespace-only", async () => {
    const createBooking = vi.fn(async () => ({
      status: "ok" as const,
      bookingId: "book_1",
      bookingNumber: "BK-1",
    }))
    const resolveBillingPerson = vi.fn(async () => "pers_should_not_be_used")
    const handler = createProductsBookingHandler({ createBooking, resolveBillingPerson })

    const request: CommitOwnedRequest = {
      entityModule: "products",
      entityId: product.id,
      bookingId: "catalog_booking_1",
      draft: {
        configure: { pax: { adult: 1 } },
        billing: {
          // Whitespace-only email/phone must not trigger a name-only CRM person.
          contact: { firstName: "Guest", lastName: "Customer", email: "   ", phone: "  " },
        },
      },
      pricing: { base_amount: 14500, taxes: 0, fees: 0, surcharges: 0, currency: "RON" },
    }

    const result = await handler.commit(makeCtx([product]), request)

    expect(result.status).toBe("held")
    expect(resolveBillingPerson).not.toHaveBeenCalled()
    expect(createBooking).toHaveBeenCalledWith(
      expect.objectContaining({ personId: null, contactEmail: null, contactPhone: null }),
    )
  })

  it("skips the resolver when the billing contact has a contact point but no full name", async () => {
    // createBooking requires first AND last name once a personId is set, so
    // resolving on a nameless contact would create a person it then rejects.
    const createBooking = vi.fn(async () => ({
      status: "ok" as const,
      bookingId: "book_1",
      bookingNumber: "BK-1",
    }))
    const resolveBillingPerson = vi.fn(async () => "pers_should_not_be_used")
    const handler = createProductsBookingHandler({ createBooking, resolveBillingPerson })

    const request: CommitOwnedRequest = {
      entityModule: "products",
      entityId: product.id,
      bookingId: "catalog_booking_1",
      draft: {
        configure: { pax: { adult: 1 } },
        billing: {
          // Email present, but only a first name — no last name.
          contact: { firstName: "Guest", email: "guest@example.com" },
        },
      },
      pricing: { base_amount: 14500, taxes: 0, fees: 0, surcharges: 0, currency: "RON" },
    }

    const result = await handler.commit(makeCtx([product]), request)

    expect(result.status).toBe("held")
    expect(resolveBillingPerson).not.toHaveBeenCalled()
    expect(createBooking).toHaveBeenCalledWith(expect.objectContaining({ personId: null }))
  })

  it("clears a placeholder billing email but still resolves on a real phone", async () => {
    // createBooking rejects a placeholder email even alongside a phone, so the
    // handler must treat it as absent — otherwise it resolves a CRM person that
    // createBooking then rejects, orphaning the row.
    const createBooking = vi.fn(async () => ({
      status: "ok" as const,
      bookingId: "book_1",
      bookingNumber: "BK-1",
    }))
    const resolveBillingPerson = vi.fn(async () => "pers_from_phone")
    const handler = createProductsBookingHandler({ createBooking, resolveBillingPerson })

    const request: CommitOwnedRequest = {
      entityModule: "products",
      entityId: product.id,
      bookingId: "catalog_booking_1",
      draft: {
        configure: { pax: { adult: 1 } },
        travelers: [{ firstName: "Guest", lastName: "Customer", band: "adult" }],
        billing: {
          contact: {
            firstName: "Guest",
            lastName: "Customer",
            email: "traveler@example.com",
            phone: "+40700333444",
          },
        },
      },
      pricing: { base_amount: 14500, taxes: 0, fees: 0, surcharges: 0, currency: "RON" },
    }

    const result = await handler.commit(makeCtx([product]), request)

    expect(result.status).toBe("held")
    expect(resolveBillingPerson).toHaveBeenCalledWith(
      expect.objectContaining({ email: null, phone: "+40700333444" }),
      expect.objectContaining({ source: "storefront-booking" }),
    )
    expect(createBooking).toHaveBeenCalledWith(
      expect.objectContaining({ personId: "pers_from_phone", contactEmail: null }),
    )
  })

  it("skips the resolver when the draft has a complete billing contact but no travelers", async () => {
    // createBooking's requireCompleteBookingParty rejects a party with zero
    // travelers, so resolving a person first would orphan it.
    const createBooking = vi.fn(async () => ({
      status: "ok" as const,
      bookingId: "book_1",
      bookingNumber: "BK-1",
    }))
    const resolveBillingPerson = vi.fn(async () => "pers_should_not_be_used")
    const handler = createProductsBookingHandler({ createBooking, resolveBillingPerson })

    const request: CommitOwnedRequest = {
      entityModule: "products",
      entityId: product.id,
      bookingId: "catalog_booking_1",
      draft: {
        configure: { pax: { adult: 1 } },
        // Complete billing contact, but no traveler rows.
        billing: {
          contact: {
            firstName: "Guest",
            lastName: "Customer",
            email: "guest@example.com",
            phone: "+40700333444",
          },
        },
      },
      pricing: { base_amount: 14500, taxes: 0, fees: 0, surcharges: 0, currency: "RON" },
    }

    const result = await handler.commit(makeCtx([product]), request)

    expect(result.status).toBe("held")
    expect(resolveBillingPerson).not.toHaveBeenCalled()
    expect(createBooking).toHaveBeenCalledWith(expect.objectContaining({ personId: null }))
  })
})
