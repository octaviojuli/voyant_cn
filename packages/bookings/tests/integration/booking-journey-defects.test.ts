/**
 * Regression coverage for the server-side defects found by the end-to-end
 * booking-journey audit (a real 2-pax booking placed, inspected, deleted).
 *
 *  B1 — booking cost was copied per-unit while sell was the multiplied
 *       total, inflating margin on every multi-pax booking.
 *  B2 — the payment schedule is generated from `bookings.sellAmountCents`,
 *       which held the per-unit price, so the plan covered half the total.
 *  B3 — deleting a booking cascade-dropped its allocations without ever
 *       returning the seats to the departure.
 *  B5 — capacity exhaustion escaped as an untyped error (HTTP 500).
 *  B6 — search only matched western name order, never 张伟.
 *  B7 — the conversion timeline row persisted English prose with no
 *       machine-readable kind.
 */

import { eq } from "drizzle-orm"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import { availabilitySlotsRef } from "../../src/availability-ref.js"
import { optionUnitsRef, productOptionsRef, productsRef } from "../../src/products-ref.js"
import { bookingActivityLog, bookingAllocations, bookingItems, bookings } from "../../src/schema.js"
import { bookingsService, isBookingServiceError } from "../../src/service.js"

const DB_AVAILABLE = !!process.env.TEST_DATABASE_URL

// Mirrors the audited journey: ¥5,980 per seat, ¥4,300 cost per seat, 2 pax.
const UNIT_SELL_CENTS = 598_000
const UNIT_COST_CENTS = 430_000
const PAX = 2

let bookingSeq = 0
function nextBookingNumber() {
  bookingSeq += 1
  return `BK-JRN-${String(bookingSeq).padStart(6, "0")}`
}

describe.skipIf(!DB_AVAILABLE)("booking-journey server defects", () => {
  // biome-ignore lint/suspicious/noExplicitAny: test db typing -- owner: bookings; matches the existing integration-suite convention.
  let db: any

  beforeAll(async () => {
    const { createTestDb, cleanupTestDb } = await import("@voyant-travel/db/test-utils")
    db = createTestDb()
    await cleanupTestDb(db)
  })

  beforeEach(async () => {
    const { cleanupTestDb } = await import("@voyant-travel/db/test-utils")
    await cleanupTestDb(db)
    bookingSeq = 0
  })

  afterAll(async () => {
    const { closeTestDb } = await import("@voyant-travel/db/test-utils")
    await closeTestDb()
  })

  async function seedDeparture({ remainingPax = 6 }: { remainingPax?: number } = {}) {
    const [product] = await db
      .insert(productsRef)
      .values({
        name: "多瑙河日落之旅",
        sellCurrency: "CNY",
        sellAmountCents: UNIT_SELL_CENTS,
        costAmountCents: UNIT_COST_CENTS,
        marginPercent: 28,
        pax: PAX,
      })
      .returning()

    const [option] = await db
      .insert(productOptionsRef)
      .values({ productId: product.id, name: "标准", status: "active", isDefault: true })
      .returning()

    const [unit] = await db
      .insert(optionUnitsRef)
      .values({
        optionId: option.id,
        name: "成人",
        unitType: "person",
        isRequired: true,
        minQuantity: 1,
      })
      .returning()

    const [slot] = await db
      .insert(availabilitySlotsRef)
      .values({
        productId: product.id,
        optionId: option.id,
        dateLocal: "2026-06-01",
        startsAt: new Date("2026-06-01T09:00:00.000Z"),
        endsAt: new Date("2026-06-01T11:00:00.000Z"),
        timezone: "Asia/Shanghai",
        status: "open",
        unlimited: false,
        initialPax: remainingPax,
        remainingPax,
      })
      .returning()

    return { product, option, unit, slot }
  }

  function convertInput(
    seed: Awaited<ReturnType<typeof seedDeparture>>,
    overrides: Record<string, unknown> = {},
  ) {
    return {
      productId: seed.product.id,
      optionId: seed.option.id,
      slotId: seed.slot.id,
      bookingNumber: nextBookingNumber(),
      initialStatus: "confirmed" as const,
      pax: PAX,
      ...overrides,
    }
  }

  // ---------------------------------------------------------------- B1

  it("B1: multiplies cost by the same basis as sell for a multi-pax booking", async () => {
    const seed = await seedDeparture()

    const booking = await bookingsService.createBookingFromProduct(
      db,
      convertInput(seed),
      "usr_test",
    )

    expect(booking).not.toBeNull()
    // Before the fix: sell 1_196_000 with cost 430_000 (the per-seat cost),
    // which reported a ~64% margin instead of the real ~28%.
    expect(booking?.sellAmountCents).toBe(UNIT_SELL_CENTS * PAX)
    expect(booking?.costAmountCents).toBe(UNIT_COST_CENTS * PAX)
  })

  it("B1: keeps item-level unit/total cost consistent with unit/total sell", async () => {
    const seed = await seedDeparture()
    const booking = await bookingsService.createBookingFromProduct(
      db,
      convertInput(seed),
      "usr_test",
    )

    const items = await db
      .select()
      .from(bookingItems)
      .where(eq(bookingItems.bookingId, booking?.id))

    expect(items).toHaveLength(1)
    const [item] = items
    expect(item.quantity).toBe(PAX)
    expect(item.unitSellAmountCents).toBe(UNIT_SELL_CENTS)
    expect(item.unitCostAmountCents).toBe(UNIT_COST_CENTS)
    expect(item.totalSellAmountCents).toBe(UNIT_SELL_CENTS * PAX)
    expect(item.totalCostAmountCents).toBe(UNIT_COST_CENTS * PAX)
  })

  // ---------------------------------------------------------------- B2

  it("B2: booking total equals the sum of item totals, so a schedule built from it covers the whole booking", async () => {
    const seed = await seedDeparture()
    const booking = await bookingsService.createBookingFromProduct(
      db,
      convertInput(seed),
      "usr_test",
    )

    const items = await db
      .select()
      .from(bookingItems)
      .where(eq(bookingItems.bookingId, booking?.id))
    const itemTotal = items.reduce(
      (sum: number, row: { totalSellAmountCents: number | null }) =>
        sum + (row.totalSellAmountCents ?? 0),
      0,
    )

    // `generatePaymentScheduleForBooking` (finance) reads exactly this
    // column as `totalCents`. It used to be the per-unit 598_000, which is
    // why the committed booking showed one 尾款 row of half the total.
    expect(booking?.sellAmountCents).toBe(UNIT_SELL_CENTS * PAX)
    expect(itemTotal).toBe(booking?.sellAmountCents)

    // The finance generator's no-deposit path emits a single row for the
    // whole `totalCents`; whatever the split, the plan must sum to the total.
    const scheduledAmounts = [booking?.sellAmountCents ?? 0]
    expect(scheduledAmounts.reduce((a, b) => a + b, 0)).toBe(UNIT_SELL_CENTS * PAX)
  })

  it("B2: recomputing totals from items does not change the booking total", async () => {
    const seed = await seedDeparture()
    const booking = await bookingsService.createBookingFromProduct(
      db,
      convertInput(seed),
      "usr_test",
    )

    // A later item mutation runs `recomputeBookingTotal`. If the seeded item
    // rows disagreed with the header, the header would silently move after
    // the payment plan had already been generated.
    await bookingsService.recomputeBookingTotal(db, booking?.id)
    const [fresh] = await db.select().from(bookings).where(eq(bookings.id, booking?.id))

    expect(fresh.sellAmountCents).toBe(UNIT_SELL_CENTS * PAX)
    expect(fresh.costAmountCents).toBe(UNIT_COST_CENTS * PAX)
  })

  // ---------------------------------------------------------------- B3

  it("B3: deleting a booking returns its seats to the departure", async () => {
    const seed = await seedDeparture({ remainingPax: 6 })
    const booking = await bookingsService.createBookingFromProduct(
      db,
      convertInput(seed),
      "usr_test",
    )

    const [afterCreate] = await db
      .select()
      .from(availabilitySlotsRef)
      .where(eq(availabilitySlotsRef.id, seed.slot.id))
    expect(afterCreate.remainingPax).toBe(4)

    const deleted = await bookingsService.deleteBooking(db, booking?.id)
    expect(deleted?.id).toBe(booking?.id)

    const [afterDelete] = await db
      .select()
      .from(availabilitySlotsRef)
      .where(eq(availabilitySlotsRef.id, seed.slot.id))
    // Was stuck at 4 — the allocations cascade-deleted without releasing.
    expect(afterDelete.remainingPax).toBe(6)
    expect(afterDelete.status).toBe("open")
  })

  it("B3: delete is a no-op on capacity for a booking that never consumed any", async () => {
    const seed = await seedDeparture({ remainingPax: 6 })
    const [booking] = await db
      .insert(bookings)
      .values({ bookingNumber: nextBookingNumber(), sellCurrency: "CNY", status: "draft" })
      .returning()

    const deleted = await bookingsService.deleteBooking(db, booking.id)
    expect(deleted?.id).toBe(booking.id)

    const [slot] = await db
      .select()
      .from(availabilitySlotsRef)
      .where(eq(availabilitySlotsRef.id, seed.slot.id))
    expect(slot.remainingPax).toBe(6)
  })

  it("B3: deleting an already-cancelled booking does not double-release seats", async () => {
    const seed = await seedDeparture({ remainingPax: 6 })
    const booking = await bookingsService.createBookingFromProduct(
      db,
      convertInput(seed),
      "usr_test",
    )

    await bookingsService.cancelBooking(db, booking?.id, {}, "usr_test")
    const [afterCancel] = await db
      .select()
      .from(availabilitySlotsRef)
      .where(eq(availabilitySlotsRef.id, seed.slot.id))
    expect(afterCancel.remainingPax).toBe(6)

    await bookingsService.deleteBooking(db, booking?.id)
    const [afterDelete] = await db
      .select()
      .from(availabilitySlotsRef)
      .where(eq(availabilitySlotsRef.id, seed.slot.id))
    // Cancel already released; delete must not push it to 8.
    expect(afterDelete.remainingPax).toBe(6)
  })

  it("B3: returns null (and releases nothing) for an unknown booking id", async () => {
    const seed = await seedDeparture({ remainingPax: 6 })
    const missing = await bookingsService.deleteBooking(db, "book_01hzzzzzzzzzzzzzzzzzzzzzzz")
    expect(missing).toBeNull()

    const [slot] = await db
      .select()
      .from(availabilitySlotsRef)
      .where(eq(availabilitySlotsRef.id, seed.slot.id))
    expect(slot.remainingPax).toBe(6)
  })

  // ---------------------------------------------------------------- B5

  it("B5: capacity exhaustion throws a typed error carrying the slot and seat counts", async () => {
    // Only 1 seat left, booking asks for 2.
    const seed = await seedDeparture({ remainingPax: 1 })

    let caught: unknown
    try {
      await bookingsService.createBookingFromProduct(db, convertInput(seed), "usr_test")
    } catch (error) {
      caught = error
    }

    expect(isBookingServiceError(caught)).toBe(true)
    const error = caught as import("../../src/service.js").BookingServiceError
    expect(error.code).toBe("insufficient_capacity")
    expect(error.details).toEqual({
      slotId: seed.slot.id,
      remainingPax: 1,
      requestedPax: PAX,
    })
    // Enough detail to render "该班次仅剩 1 个座位" without a stack trace.
    expect(error.message).toContain("1")
    expect(error.message).toContain("2")
  })

  // ---------------------------------------------------------------- B6

  it("B6: finds a Chinese contact by the un-spaced family-then-given form", async () => {
    await db.insert(bookings).values([
      {
        bookingNumber: nextBookingNumber(),
        sellCurrency: "CNY",
        status: "confirmed",
        // 姓=张 / 名=伟 — written and searched as 张伟.
        contactLastName: "张",
        contactFirstName: "伟",
      },
      {
        bookingNumber: nextBookingNumber(),
        sellCurrency: "EUR",
        status: "confirmed",
        contactFirstName: "Ada",
        contactLastName: "Lovelace",
      },
    ])

    const zh = await bookingsService.listBookings(db, { search: "张伟", page: 1, limit: 20 })
    expect(zh.data).toHaveLength(1)
    expect(zh.data[0].contactLastName).toBe("张")

    // Each name part alone still matches.
    const familyOnly = await bookingsService.listBookings(db, { search: "张", page: 1, limit: 20 })
    expect(familyOnly.data).toHaveLength(1)
  })

  it("B6: western full-name search keeps working in both orders", async () => {
    await db.insert(bookings).values({
      bookingNumber: nextBookingNumber(),
      sellCurrency: "EUR",
      status: "confirmed",
      contactFirstName: "Ada",
      contactLastName: "Lovelace",
    })

    const given = await bookingsService.listBookings(db, {
      search: "Ada Lovelace",
      page: 1,
      limit: 20,
    })
    expect(given.data).toHaveLength(1)

    const reversed = await bookingsService.listBookings(db, {
      search: "Lovelace Ada",
      page: 1,
      limit: 20,
    })
    expect(reversed.data).toHaveLength(1)
  })

  it("B6: search still excludes non-matching rows", async () => {
    await db.insert(bookings).values([
      {
        bookingNumber: nextBookingNumber(),
        sellCurrency: "CNY",
        status: "confirmed",
        contactLastName: "张",
        contactFirstName: "伟",
      },
      {
        bookingNumber: nextBookingNumber(),
        sellCurrency: "CNY",
        status: "confirmed",
        contactLastName: "李",
        contactFirstName: "娜",
      },
    ])

    const result = await bookingsService.listBookings(db, { search: "张伟", page: 1, limit: 20 })
    expect(result.data).toHaveLength(1)
    expect(result.data[0].contactFirstName).toBe("伟")
  })

  // ---------------------------------------------------------------- B7

  it("B7: the conversion timeline row carries a machine-readable kind + params", async () => {
    const seed = await seedDeparture()
    const booking = await bookingsService.createBookingFromProduct(
      db,
      convertInput(seed),
      "usr_test",
    )

    const [row] = await db
      .select()
      .from(bookingActivityLog)
      .where(eq(bookingActivityLog.bookingId, booking?.id))

    expect(row.activityType).toBe("booking_converted")
    const metadata = row.metadata as Record<string, unknown>
    expect(metadata.kind).toBe("booking_converted_from_product")
    expect(metadata.params).toEqual({
      productName: "多瑙河日落之旅",
      optionName: "标准",
    })
    // Back-compat: `description` stays populated so rows written before the
    // change (which only have prose) and un-updated renderers still work.
    expect(typeof row.description).toBe("string")
    expect(row.description.length).toBeGreaterThan(0)
  })

  it("B7: allocations still record the consumed seats after conversion", async () => {
    const seed = await seedDeparture()
    const booking = await bookingsService.createBookingFromProduct(
      db,
      convertInput(seed),
      "usr_test",
    )

    const allocations = await db
      .select()
      .from(bookingAllocations)
      .where(eq(bookingAllocations.bookingId, booking?.id))

    expect(allocations).toHaveLength(1)
    expect(allocations[0].quantity).toBe(PAX)
    expect(allocations[0].availabilitySlotId).toBe(seed.slot.id)
  })
})
