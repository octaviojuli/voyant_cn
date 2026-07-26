import {
  availabilityRules,
  availabilitySlots,
  availabilityStartTimes,
} from "@voyant-travel/availability/schema"
import { newId } from "@voyant-travel/db/lib/typeid"
import { cleanupTestDb, createTestDb } from "@voyant-travel/db/test-utils"
import { handleApiError } from "@voyant-travel/hono"
import { and, eq } from "drizzle-orm"
import { Hono } from "hono"
import { beforeAll, beforeEach, describe, expect, it } from "vitest"

import { productDays, productItineraries, products } from "../../../../inventory/src/schema.js"
import { availabilityAdminRoutes } from "../../../src/availability/routes.js"
import { generateSlotsForRule } from "../../../src/availability/service-slot-generation.js"

/**
 * `generateAvailabilitySlots` shipped with zero runtime callers, so an operator
 * could define "every Wednesday" and never get a departure. These cover the
 * service that now drives it from
 * `POST /v1/admin/operations/availability/rules/{id}/generate-slots`.
 */

const DB_AVAILABLE = !!process.env.TEST_DATABASE_URL

// 2026-06-01 is a Monday, so the weekly-Wednesday rule below is deterministic.
const NOW = new Date("2026-06-01T12:00:00.000Z")
const WEDNESDAYS_IN_28_DAYS = 4
const WEDNESDAYS_IN_90_DAYS = 13

describe.skipIf(!DB_AVAILABLE)("availability rule slot generation (integration)", () => {
  // biome-ignore lint/suspicious/noExplicitAny: owner: availability; createTestDb returns a driver-specific drizzle test client
  let db: any
  let productId: string

  beforeAll(() => {
    db = createTestDb()
  })

  beforeEach(async () => {
    await cleanupTestDb(db)
    productId = newId("products")
    await db.insert(products).values({
      id: productId,
      name: "Bucharest Day Trip",
      sellCurrency: "EUR",
      bookingMode: "date",
    })
  })

  async function insertRule(overrides: Record<string, unknown> = {}) {
    const id = newId("availability_rules")
    await db.insert(availabilityRules).values({
      id,
      productId,
      timezone: "Europe/Bucharest",
      recurrenceRule: "FREQ=WEEKLY;BYDAY=WE",
      maxCapacity: 24,
      active: true,
      ...overrides,
    })
    return id as string
  }

  function slotsForRule(ruleId: string) {
    return db
      .select()
      .from(availabilitySlots)
      .where(
        and(
          eq(availabilitySlots.productId, productId),
          eq(availabilitySlots.availabilityRuleId, ruleId),
        ),
      )
      .orderBy(availabilitySlots.dateLocal)
  }

  /** Authors an itinerary with `dayCount` day rows (Day 1..N). */
  async function insertItinerary(dayCount: number, overrides: Record<string, unknown> = {}) {
    const itineraryId = newId("product_itineraries")
    await db.insert(productItineraries).values({
      id: itineraryId,
      productId,
      name: "Default itinerary",
      isDefault: true,
      sortOrder: 0,
      ...overrides,
    })
    if (dayCount > 0) {
      await db.insert(productDays).values(
        Array.from({ length: dayCount }, (_, index) => ({
          id: newId("product_days"),
          itineraryId,
          dayNumber: index + 1,
          title: `Day ${index + 1}`,
        })),
      )
    }
    return itineraryId as string
  }

  async function insertStartTime(overrides: Record<string, unknown> = {}) {
    const id = newId("availability_start_times")
    await db.insert(availabilityStartTimes).values({
      id,
      productId,
      startTimeLocal: "07:30",
      sortOrder: 0,
      active: true,
      ...overrides,
    })
    return id as string
  }

  /** Local wall-clock reading of an instant, for timezone-safe assertions. */
  function localParts(instant: Date, timezone: string) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(instant)
  }

  it("generates over the default 90-day horizon", async () => {
    const ruleId = await insertRule()

    const result = await generateSlotsForRule(db, ruleId, { now: NOW })

    expect(result).toEqual({
      created: WEDNESDAYS_IN_90_DAYS,
      skipped: 0,
      horizonDays: 90,
    })
    expect(await slotsForRule(ruleId)).toHaveLength(WEDNESDAYS_IN_90_DAYS)
  })

  it("honours a custom horizon", async () => {
    const ruleId = await insertRule()

    const result = await generateSlotsForRule(db, ruleId, { horizonDays: 28, now: NOW })

    expect(result).toEqual({
      created: WEDNESDAYS_IN_28_DAYS,
      skipped: 0,
      horizonDays: 28,
    })
    expect(await slotsForRule(ruleId)).toHaveLength(WEDNESDAYS_IN_28_DAYS)
  })

  it("is idempotent — a second run creates nothing and reports the dates as skipped", async () => {
    const ruleId = await insertRule()

    const first = await generateSlotsForRule(db, ruleId, { horizonDays: 28, now: NOW })
    const second = await generateSlotsForRule(db, ruleId, { horizonDays: 28, now: NOW })

    expect(first?.created).toBe(WEDNESDAYS_IN_28_DAYS)
    expect(second).toEqual({ created: 0, skipped: WEDNESDAYS_IN_28_DAYS, horizonDays: 28 })
    expect(await slotsForRule(ruleId)).toHaveLength(WEDNESDAYS_IN_28_DAYS)
  })

  it("copies the rule's capacity and timezone onto every generated slot", async () => {
    const ruleId = await insertRule({ maxCapacity: 42, timezone: "Asia/Shanghai" })

    await generateSlotsForRule(db, ruleId, { horizonDays: 28, now: NOW })

    const rows = await slotsForRule(ruleId)
    expect(rows).toHaveLength(WEDNESDAYS_IN_28_DAYS)
    for (const row of rows) {
      expect(row.timezone).toBe("Asia/Shanghai")
      expect(row.initialPax).toBe(42)
      expect(row.remainingPax).toBe(42)
      expect(row.status).toBe("open")
      expect(row.unlimited).toBe(false)
    }
  })

  it("copies the rule's pickup capacity onto every generated slot", async () => {
    const ruleId = await insertRule({ maxPickupCapacity: 12 })

    await generateSlotsForRule(db, ruleId, { horizonDays: 28, now: NOW })

    const rows = await slotsForRule(ruleId)
    expect(rows).toHaveLength(WEDNESDAYS_IN_28_DAYS)
    for (const row of rows) {
      expect(row.initialPickups).toBe(12)
      expect(row.remainingPickups).toBe(12)
    }
  })

  describe("derived duration", () => {
    it("derives endsAt/nights/days from a multi-day itinerary", async () => {
      const itineraryId = await insertItinerary(12)
      const ruleId = await insertRule()

      await generateSlotsForRule(db, ruleId, { horizonDays: 28, now: NOW })

      const rows = await slotsForRule(ruleId)
      expect(rows).toHaveLength(WEDNESDAYS_IN_28_DAYS)
      for (const row of rows) {
        expect(row.days).toBe(12)
        expect(row.nights).toBe(11)
        expect(row.itineraryId).toBe(itineraryId)
        expect(row.endsAt).toBeInstanceOf(Date)
        // 11 nights later, same 09:00 local wall clock.
        const endDate = new Date(row.startsAt)
        endDate.setUTCDate(endDate.getUTCDate() + 11)
        expect(localParts(row.endsAt, "Europe/Bucharest")).toBe(
          localParts(endDate, "Europe/Bucharest"),
        )
        expect(localParts(row.endsAt, "Europe/Bucharest")).toMatch(/09:00$/)
      }
    })

    it("leaves a single-day itinerary exactly as it was — no end, no counts", async () => {
      await insertItinerary(1)
      const ruleId = await insertRule()

      await generateSlotsForRule(db, ruleId, { horizonDays: 28, now: NOW })

      const rows = await slotsForRule(ruleId)
      expect(rows).toHaveLength(WEDNESDAYS_IN_28_DAYS)
      for (const row of rows) {
        expect(row.endsAt).toBeNull()
        expect(row.nights).toBeNull()
        expect(row.days).toBeNull()
      }
    })

    it("leaves a product with no itinerary at all exactly as it was", async () => {
      const ruleId = await insertRule()

      await generateSlotsForRule(db, ruleId, { horizonDays: 28, now: NOW })

      const rows = await slotsForRule(ruleId)
      expect(rows).toHaveLength(WEDNESDAYS_IN_28_DAYS)
      for (const row of rows) {
        expect(row.endsAt).toBeNull()
        expect(row.nights).toBeNull()
        expect(row.days).toBeNull()
        expect(row.itineraryId).toBeNull()
      }
    })

    it("uses the default itinerary when the product has several", async () => {
      await insertItinerary(4, { isDefault: false, sortOrder: 0 })
      const defaultItineraryId = await insertItinerary(9, { isDefault: true, sortOrder: 5 })
      const ruleId = await insertRule()

      await generateSlotsForRule(db, ruleId, { horizonDays: 28, now: NOW })

      for (const row of await slotsForRule(ruleId)) {
        expect(row.itineraryId).toBe(defaultItineraryId)
        expect(row.days).toBe(9)
        expect(row.nights).toBe(8)
      }
    })
  })

  describe("derived start time", () => {
    it("uses the product's active start time and links the slot to it", async () => {
      const startTimeId = await insertStartTime({ startTimeLocal: "07:30" })
      const ruleId = await insertRule()

      await generateSlotsForRule(db, ruleId, { horizonDays: 28, now: NOW })

      const rows = await slotsForRule(ruleId)
      expect(rows).toHaveLength(WEDNESDAYS_IN_28_DAYS)
      for (const row of rows) {
        expect(row.startTimeId).toBe(startTimeId)
        expect(localParts(row.startsAt, "Europe/Bucharest")).toMatch(/07:30$/)
      }
    })

    it("falls back to 09:00 with no start-time link when the catalogue is empty", async () => {
      const ruleId = await insertRule()

      await generateSlotsForRule(db, ruleId, { horizonDays: 28, now: NOW })

      for (const row of await slotsForRule(ruleId)) {
        expect(row.startTimeId).toBeNull()
        expect(localParts(row.startsAt, "Europe/Bucharest")).toMatch(/09:00$/)
      }
    })

    it("ignores inactive start times", async () => {
      await insertStartTime({ startTimeLocal: "06:00", active: false })
      const ruleId = await insertRule()

      await generateSlotsForRule(db, ruleId, { horizonDays: 28, now: NOW })

      for (const row of await slotsForRule(ruleId)) {
        expect(row.startTimeId).toBeNull()
        expect(localParts(row.startsAt, "Europe/Bucharest")).toMatch(/09:00$/)
      }
    })

    it("picks the lowest sortOrder, then the earliest created", async () => {
      await insertStartTime({ startTimeLocal: "17:30", sortOrder: 3 })
      const winner = await insertStartTime({ startTimeLocal: "06:15", sortOrder: 1 })
      await insertStartTime({ startTimeLocal: "20:00", sortOrder: 1 })
      const ruleId = await insertRule()

      await generateSlotsForRule(db, ruleId, { horizonDays: 28, now: NOW })

      for (const row of await slotsForRule(ruleId)) {
        expect(row.startTimeId).toBe(winner)
        expect(localParts(row.startsAt, "Europe/Bucharest")).toMatch(/06:15$/)
      }
    })

    it("lets the start time's durationMinutes win over the itinerary-derived end", async () => {
      await insertItinerary(3)
      await insertStartTime({ startTimeLocal: "09:00", durationMinutes: 180 })
      const ruleId = await insertRule()

      await generateSlotsForRule(db, ruleId, { horizonDays: 28, now: NOW })

      for (const row of await slotsForRule(ruleId)) {
        expect(row.endsAt.getTime() - row.startsAt.getTime()).toBe(180 * 60_000)
        // Night/day counts still track the itinerary, which is their only source.
        expect(row.days).toBe(3)
        expect(row.nights).toBe(2)
      }
    })
  })

  it("stays idempotent once every derived field is populated", async () => {
    await insertItinerary(12)
    await insertStartTime({ startTimeLocal: "07:30" })
    const ruleId = await insertRule()

    const first = await generateSlotsForRule(db, ruleId, { horizonDays: 28, now: NOW })
    const second = await generateSlotsForRule(db, ruleId, { horizonDays: 28, now: NOW })

    expect(first?.created).toBe(WEDNESDAYS_IN_28_DAYS)
    expect(second).toEqual({ created: 0, skipped: WEDNESDAYS_IN_28_DAYS, horizonDays: 28 })
    expect(await slotsForRule(ruleId)).toHaveLength(WEDNESDAYS_IN_28_DAYS)
  })

  it("treats an inactive rule as a no-op instead of an error", async () => {
    const ruleId = await insertRule({ active: false })

    const result = await generateSlotsForRule(db, ruleId, { horizonDays: 28, now: NOW })

    expect(result).toEqual({ created: 0, skipped: 0, horizonDays: 28 })
    expect(await slotsForRule(ruleId)).toHaveLength(0)
  })

  it("returns null for an unknown rule", async () => {
    expect(await generateSlotsForRule(db, newId("availability_rules"), { now: NOW })).toBeNull()
  })

  describe("POST /rules/{id}/generate-slots", () => {
    let app: Hono

    beforeAll(() => {
      app = new Hono()
      app.use("*", async (c, next) => {
        c.set("db" as never, db)
        c.set("userId" as never, "test-user-id")
        await next()
      })
      app.onError((err, c) => handleApiError(err, c))
      app.route("/", availabilityAdminRoutes)
    })

    const post = (path: string, body?: unknown) =>
      app.request(
        path,
        body === undefined
          ? { method: "POST" }
          : {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            },
      )

    it("generates and then reports skips on a repeat call", async () => {
      const ruleId = await insertRule()

      const first = await post(`/rules/${ruleId}/generate-slots`, { horizonDays: 28 })
      expect(first.status).toBe(200)
      expect(await first.json()).toEqual({
        data: { created: expect.any(Number), skipped: 0, horizonDays: 28 },
      })

      const second = await post(`/rules/${ruleId}/generate-slots`, { horizonDays: 28 })
      expect(second.status).toBe(200)
      const secondBody = await second.json()
      expect(secondBody.data.created).toBe(0)
      expect(secondBody.data.skipped).toBeGreaterThan(0)
    })

    it("defaults the horizon to 90 days when no body is sent", async () => {
      const ruleId = await insertRule()

      const res = await post(`/rules/${ruleId}/generate-slots`)

      expect(res.status).toBe(200)
      expect((await res.json()).data.horizonDays).toBe(90)
    })

    it("rejects an out-of-range horizon", async () => {
      const ruleId = await insertRule()

      expect((await post(`/rules/${ruleId}/generate-slots`, { horizonDays: 0 })).status).toBe(400)
      expect((await post(`/rules/${ruleId}/generate-slots`, { horizonDays: 366 })).status).toBe(400)
      expect(await slotsForRule(ruleId)).toHaveLength(0)
    })

    it("returns 404 for an unknown rule", async () => {
      const res = await post(`/rules/${newId("availability_rules")}/generate-slots`, {})

      expect(res.status).toBe(404)
      expect(await res.json()).toEqual({ error: "Availability rule not found" })
    })
  })
})
