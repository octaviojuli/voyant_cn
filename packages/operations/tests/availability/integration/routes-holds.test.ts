/**
 * B4 — the operator-facing escape hatch for leaked departure capacity.
 *
 * Before these routes there was no way for an operator to see which
 * abandoned drafts were holding seats, nor to reclaim them on demand.
 */

import { availabilityHolds, availabilitySlots } from "@voyant-travel/availability/schema"
import { newId } from "@voyant-travel/db/lib/typeid"
import { eq } from "drizzle-orm"
import { Hono } from "hono"
import { beforeAll, beforeEach, describe, expect, it } from "vitest"

import { products } from "../../../../inventory/src/schema.js"
import { availabilityHoldRoutes } from "../../../src/availability/routes-holds.js"

const DB_AVAILABLE = !!process.env.TEST_DATABASE_URL
const json = (body: Record<string, unknown>) => ({
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
})

const PAST = new Date(Date.now() - 60 * 60 * 1000)
const FUTURE = new Date(Date.now() + 60 * 60 * 1000)

describe.skipIf(!DB_AVAILABLE)("availability holds admin routes", () => {
  let app: Hono
  let db: ReturnType<typeof import("@voyant-travel/db/test-utils").createTestDb>
  let productId: string
  let slotId: string

  beforeAll(async () => {
    const { createTestDb, cleanupTestDb } = await import("@voyant-travel/db/test-utils")
    db = createTestDb()
    await cleanupTestDb(db)

    app = new Hono()
    app.use("*", async (c, next) => {
      c.set("db" as never, db)
      c.set("userId" as never, "test-user-id")
      await next()
    })
    app.route("/", availabilityHoldRoutes)
  })

  beforeEach(async () => {
    const { cleanupTestDb } = await import("@voyant-travel/db/test-utils")
    await cleanupTestDb(db)

    productId = newId("products")
    slotId = newId("availability_slots")
    await db.insert(products).values({
      id: productId,
      name: "Holds route product",
      sellCurrency: "CNY",
      bookingMode: "date",
    })
    await db.insert(availabilitySlots).values({
      id: slotId,
      productId,
      dateLocal: "2026-08-01",
      startsAt: new Date("2026-08-01T08:00:00Z"),
      timezone: "UTC",
      status: "open",
      unlimited: false,
      initialPax: 6,
      remainingPax: 2,
    })
    // Two abandoned drafts holding 2 seats each.
    await db.insert(availabilityHolds).values([
      {
        draftId: "draft_a",
        holdToken: "token_a",
        productId,
        slotId,
        paxCount: 2,
        expiresAt: PAST,
      },
      {
        draftId: "draft_b",
        holdToken: "token_b",
        productId,
        slotId,
        paxCount: 2,
        expiresAt: FUTURE,
      },
    ])
  })

  async function remainingPax() {
    const [slot] = await db
      .select({ remainingPax: availabilitySlots.remainingPax })
      .from(availabilitySlots)
      .where(eq(availabilitySlots.id, slotId))
    return slot?.remainingPax
  }

  it("lists live holds for a slot", async () => {
    const res = await app.request(`/holds?slotId=${slotId}`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: Array<{ draftId: string; paxCount: number }> }
    expect(body.data).toHaveLength(2)
    expect(body.data.map((hold) => hold.draftId).sort()).toEqual(["draft_a", "draft_b"])
  })

  it("filters to expired holds only", async () => {
    const res = await app.request(`/holds?slotId=${slotId}&expiredOnly=true`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: Array<{ draftId: string }> }
    expect(body.data).toHaveLength(1)
    expect(body.data[0].draftId).toBe("draft_a")
  })

  it("forces a global sweep and reports what it reclaimed", async () => {
    const res = await app.request("/holds/release-expired", { method: "POST", ...json({}) })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      data: { released: number; scope: string; cutoff: string }
    }
    expect(body.data.released).toBe(1)
    expect(body.data.scope).toBe("global")
    // The expired 2-seat hold came back; the live one stayed put.
    expect(await remainingPax()).toBe(4)
  })

  it("scopes a sweep to the requested slots", async () => {
    const res = await app.request("/holds/release-expired", {
      method: "POST",
      ...json({ slotIds: [slotId] }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { released: number; scope: string } }
    expect(body.data.released).toBe(1)
    expect(body.data.scope).toBe("slots")
    expect(await remainingPax()).toBe(4)
  })

  it("is idempotent — a repeat sweep reclaims nothing further", async () => {
    await app.request("/holds/release-expired", { method: "POST", ...json({}) })
    const res = await app.request("/holds/release-expired", { method: "POST", ...json({}) })
    const body = (await res.json()) as { data: { released: number } }
    expect(body.data.released).toBe(0)
    expect(await remainingPax()).toBe(4)
  })

  it("honours an explicit cutoff", async () => {
    // A cutoff older than the expired hold reclaims nothing.
    const res = await app.request("/holds/release-expired", {
      method: "POST",
      ...json({ before: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() }),
    })
    const body = (await res.json()) as { data: { released: number } }
    expect(body.data.released).toBe(0)
    expect(await remainingPax()).toBe(2)
  })
})
