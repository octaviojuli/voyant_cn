import { availabilityRules, availabilitySlots } from "@voyant-travel/availability/schema"
import { newId } from "@voyant-travel/db/lib/typeid"
import { cleanupTestDb, createTestDb } from "@voyant-travel/db/test-utils"
import { handleApiError } from "@voyant-travel/hono"
import { and, eq } from "drizzle-orm"
import { Hono } from "hono"
import { beforeAll, beforeEach, describe, expect, it } from "vitest"

import { products } from "../../../../inventory/src/schema.js"
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
