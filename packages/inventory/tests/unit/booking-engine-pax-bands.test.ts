/**
 * Regressions for the zh-CN booking-journey audit: a traveler moved to
 * the Child band was still quoted AND committed as an adult, because
 * the journey's occupancy bands were a parallel concept that never
 * resolved onto the product's real `option_units`.
 */
import type {
  CommitOwnedRequest,
  ComputeQuoteRequest,
  OwnedHandlerContext,
  ProductVariantOption,
} from "@voyant-travel/catalog/booking-engine"
import { describe, expect, it, vi } from "vitest"

import {
  type BookingCreateBridgeInput,
  createProductsBookingHandler,
  type ResolvedOptionPrice,
} from "../../src/booking-engine/handler.js"

const product = {
  id: "prod_cn_tour",
  name: "云南深度游",
  status: "active" as const,
  sellAmountCents: 598000,
  sellCurrency: "CNY",
}

const ADULT_UNIT = "ount_adult"
const CHILD_UNIT = "ount_child"
const OPTION_ID = "popt_cn"

/** The audited product: 成人 ¥5,980 / 儿童(不占床) ¥2,990. */
const cnProductOptions: ReadonlyArray<ProductVariantOption> = [
  {
    id: OPTION_ID,
    name: "标准团",
    isDefault: true,
    units: [
      {
        id: ADULT_UNIT,
        name: "成人",
        code: "ADULT",
        unitType: "person",
        minAge: 12,
        isRequired: true,
      },
      {
        id: CHILD_UNIT,
        name: "儿童(不占床)",
        code: "CHILD",
        unitType: "person",
        minAge: 2,
        maxAge: 11,
      },
    ],
  },
]

const cnUnitPrices: ResolvedOptionPrice = {
  baseSellAmountCents: 598000,
  unitPrices: [
    { unitId: ADULT_UNIT, unitType: "person", travelerCategory: "adult", sellAmountCents: 598000 },
    { unitId: CHILD_UNIT, unitType: "person", travelerCategory: "child", sellAmountCents: 299000 },
  ],
}

function makeCtx(rows: unknown[]): OwnedHandlerContext {
  return {
    db: {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => rows,
          }),
        }),
      }),
    } as OwnedHandlerContext["db"],
    adapterContext: {} as never,
  }
}

/** Typed `createBooking` spy so assertions read the real bridge input. */
function makeCreateBooking() {
  return vi.fn(async (_input: BookingCreateBridgeInput) => ({
    status: "ok" as const,
    bookingId: "bkg_1",
    bookingNumber: "VYT-CN-2026-00003",
  }))
}

function makeHandler(overrides: Record<string, unknown> = {}) {
  return createProductsBookingHandler({
    createBooking: makeCreateBooking(),
    loadProductOptions: async () => cnProductOptions,
    loadSlotDate: async () => "2026-09-18",
    loadResolvedOptionPrice: async () => cnUnitPrices,
    ...overrides,
  })
}

const quoteRequest = (draft: unknown): ComputeQuoteRequest => ({
  entityModule: "products",
  entityId: product.id,
  scope: { locale: "zh-CN", audience: "customer", market: "CN" },
  draft,
})

describe("owned product draft shape — bands come from the option's units", () => {
  it("ships unit-backed bands with stable codes and the operator's own labels", async () => {
    const result = await makeHandler().computeQuote(
      makeCtx([product]),
      quoteRequest({ configure: { variantId: OPTION_ID, pax: { adult: 1 } } }),
    )

    expect(result.shape?.paxBands).toEqual([
      {
        code: "adult",
        label: "成人",
        unitId: ADULT_UNIT,
        unitCode: "ADULT",
        minAge: 12,
        minCount: 1,
        maxCount: 8,
      },
      {
        code: "child",
        label: "儿童(不占床)",
        unitId: CHILD_UNIT,
        unitCode: "CHILD",
        minAge: 2,
        maxAge: 11,
        minCount: 0,
        maxCount: 6,
      },
    ])
    // No infant unit on this product → no infant band is offered, so the
    // journey can't collect a count that would bill at the adult price.
    expect(result.shape?.paxBands.map((band) => band.code)).not.toContain("infant")
  })

  it("keeps the generic defaults when the option has no person units", async () => {
    const handler = makeHandler({
      loadProductOptions: async () => [
        { id: "popt_room", name: "Rooms", units: [{ id: "u_dbl", name: "DBL", unitType: "room" }] },
      ],
    })
    const result = await handler.computeQuote(makeCtx([product]), quoteRequest({}))
    expect(result.shape?.paxBands.map((band) => band.code)).toEqual(["adult", "child", "infant"])
  })

  it("still works for a product with a single unit", async () => {
    const handler = makeHandler({
      loadProductOptions: async () => [
        { ...cnProductOptions[0], units: [cnProductOptions[0]?.units?.[0]] },
      ],
    })
    const result = await handler.computeQuote(
      makeCtx([product]),
      quoteRequest({
        configure: { variantId: OPTION_ID, departureSlotId: "slot_1", pax: { adult: 2 } },
      }),
    )
    expect(result.shape?.paxBands.map((band) => band.code)).toEqual(["adult"])
    const breakdown = result.pricing?.breakdown as Record<string, unknown>
    expect(breakdown?.total).toBe(1_196_000)
  })
})

describe("computeQuote — traveler bands reprice", () => {
  const configure = {
    variantId: OPTION_ID,
    departureSlotId: "slot_1",
    pax: { adult: 2 },
  }

  it("prices 2 × 成人 when both travelers are adults", async () => {
    const result = await makeHandler().computeQuote(
      makeCtx([product]),
      quoteRequest({
        configure,
        travelers: [
          { firstName: "王", lastName: "伟", band: "adult" },
          { firstName: "李", lastName: "娜", band: "adult" },
        ],
      }),
    )
    const breakdown = result.pricing?.breakdown as Record<string, unknown>
    expect(breakdown?.total).toBe(1_196_000)
  })

  it("reprices when a traveler is moved to the child band (the audited defect)", async () => {
    const result = await makeHandler().computeQuote(
      makeCtx([product]),
      quoteRequest({
        configure,
        travelers: [
          { firstName: "王", lastName: "伟", band: "adult" },
          { firstName: "王", lastName: "小明", band: "child" },
        ],
      }),
    )
    const breakdown = result.pricing?.breakdown as Record<string, unknown>
    // 5980 + 2990, not 2 × 5980.
    expect(breakdown?.total).toBe(897_000)
    const lines = breakdown?.lines as Array<{ label: string; quantity: number; unitAmount: number }>
    expect(lines).toEqual([
      expect.objectContaining({ label: "成人", quantity: 1, unitAmount: 598_000 }),
      expect.objectContaining({ label: "儿童(不占床)", quantity: 1, unitAmount: 299_000 }),
    ])
  })

  it("derives the band from date of birth when one is supplied", async () => {
    const result = await makeHandler().computeQuote(
      makeCtx([product]),
      quoteRequest({
        configure,
        travelers: [
          { firstName: "王", lastName: "伟", band: "adult", dateOfBirth: "1988-04-02" },
          // Band still says adult; the birthday says otherwise and wins.
          { firstName: "王", lastName: "小明", band: "adult", dateOfBirth: "2018-03-04" },
        ],
      }),
    )
    const breakdown = result.pricing?.breakdown as Record<string, unknown>
    expect(breakdown?.total).toBe(897_000)
  })

  it("prices 2 adults + 1 child across bands", async () => {
    const result = await makeHandler().computeQuote(
      makeCtx([product]),
      quoteRequest({
        configure: { ...configure, pax: { adult: 3 } },
        travelers: [
          { firstName: "A", lastName: "A", band: "adult" },
          { firstName: "B", lastName: "B", band: "adult" },
          { firstName: "C", lastName: "C", band: "child" },
        ],
      }),
    )
    const breakdown = result.pricing?.breakdown as Record<string, unknown>
    expect(breakdown?.total).toBe(1_495_000)
    expect(breakdown?.paxCount).toBe(3)
  })

  it("keeps the Configure counts while the traveler roster is incomplete", async () => {
    const result = await makeHandler().computeQuote(
      makeCtx([product]),
      quoteRequest({
        configure,
        travelers: [{ firstName: "王", lastName: "伟", band: "child" }],
      }),
    )
    const breakdown = result.pricing?.breakdown as Record<string, unknown>
    // 1 of 2 travelers entered — Configure's 2 adults still rule.
    expect(breakdown?.total).toBe(1_196_000)
  })
})

describe("commit — per-band item lines + traveler categories", () => {
  const commitRequest = (draft: unknown): CommitOwnedRequest => ({
    entityModule: "products",
    entityId: product.id,
    draft,
    party: {
      personId: "pers_1",
      billing: { contact: { firstName: "王", lastName: "伟", email: "wang@example.cn" } },
    },
    pricing: { base_amount: 897_000, currency: "CNY", breakdown: { total: 897_000 } },
  })

  const mixedDraft = {
    configure: { variantId: OPTION_ID, departureSlotId: "slot_1", pax: { adult: 2 } },
    travelers: [
      { firstName: "王", lastName: "伟", band: "adult" },
      { firstName: "王", lastName: "小明", band: "child" },
    ],
  }

  it("writes one item line per band instead of a single 成人 × 2 row", async () => {
    const createBooking = makeCreateBooking()
    const handler = makeHandler({ createBooking })

    await handler.commit(makeCtx([product]), commitRequest(mixedDraft))

    const input = createBooking.mock.calls[0]?.[0]
    expect(input?.itemLines).toEqual([
      {
        optionId: OPTION_ID,
        optionUnitId: ADULT_UNIT,
        quantity: 1,
        title: "成人",
        unitSellAmountCents: 598_000,
        totalSellAmountCents: 598_000,
      },
      {
        optionId: OPTION_ID,
        optionUnitId: CHILD_UNIT,
        quantity: 1,
        title: "儿童(不占床)",
        unitSellAmountCents: 299_000,
        totalSellAmountCents: 299_000,
      },
    ])
    expect(input?.travelers?.map((t) => t.travelerCategory)).toEqual(["adult", "child"])
  })

  it("derives the committed traveler category from date of birth", async () => {
    const createBooking = makeCreateBooking()
    const handler = makeHandler({ createBooking })

    await handler.commit(
      makeCtx([product]),
      commitRequest({
        ...mixedDraft,
        travelers: [
          { firstName: "王", lastName: "伟", band: "adult", dateOfBirth: "1988-04-02" },
          { firstName: "王", lastName: "小明", band: "adult", dateOfBirth: "2018-03-04" },
        ],
      }),
    )

    const input = createBooking.mock.calls[0]?.[0]
    expect(input?.travelers?.map((t) => t.travelerCategory)).toEqual(["adult", "child"])
    expect(input?.itemLines?.map((line) => line.optionUnitId)).toEqual([ADULT_UNIT, CHILD_UNIT])
  })

  it("leaves item lines to the converter when per-unit prices can't be resolved", async () => {
    const createBooking = makeCreateBooking()
    const handler = makeHandler({
      createBooking,
      loadResolvedOptionPrice: async () => null,
    })

    await handler.commit(makeCtx([product]), commitRequest(mixedDraft))

    const input = createBooking.mock.calls[0]?.[0]
    expect(input?.itemLines).toBeUndefined()
  })
})

describe("commit — booking numbers", () => {
  it("uses the deployment's series generator, awaiting async allocators", async () => {
    const createBooking = makeCreateBooking()
    const handler = makeHandler({
      createBooking,
      generateBookingNumber: async () => "VYT-CN-2026-00003",
    })

    await handler.commit(makeCtx([product]), {
      entityModule: "products",
      entityId: product.id,
      draft: { configure: { variantId: OPTION_ID, pax: { adult: 1 } } },
      party: { personId: "pers_1" },
    } as CommitOwnedRequest)

    const input = createBooking.mock.calls[0]?.[0]
    expect(input?.bookingNumber).toBe("VYT-CN-2026-00003")
  })
})
