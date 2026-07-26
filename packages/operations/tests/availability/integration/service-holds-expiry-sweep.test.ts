/**
 * B4 — abandoned booking-journey drafts permanently leaked departure
 * capacity.
 *
 * `releaseExpiredHolds` existed but had zero production call sites: the
 * repo declares scheduled work in the deployment graph for an *external*
 * scheduler to drive, and the Node operator profile ships
 * `scheduledJobs: "none"` with no timer in its systemd unit. So expired
 * holds were never reaped and a departure walked from 6 seats to 0 in an
 * afternoon of testing, with no operator-visible way to see or clear them.
 *
 * The fix reclaims expiry on the paths that care rather than depending on
 * a job that may never run:
 *   - `placeAvailabilityHold` sweeps its own slot inside its transaction
 *   - `releaseExpiredHoldsForSlots` lets read paths do the same
 *   - the admin sweep route drives `releaseExpiredHolds` globally
 */

import { availabilityHolds, availabilitySlots } from "@voyant-travel/availability/schema"
import { newId } from "@voyant-travel/db/lib/typeid"
import { cleanupTestDb, createTestDb } from "@voyant-travel/db/test-utils"
import { eq } from "drizzle-orm"
import { beforeAll, beforeEach, describe, expect, it } from "vitest"

import { products } from "../../../../inventory/src/schema.js"
import {
  listLiveAvailabilityHolds,
  placeAvailabilityHold,
  releaseExpiredHoldsForSlots,
} from "../../../src/availability/service-holds.js"

const DB_AVAILABLE = Boolean(process.env.TEST_DATABASE_URL)

const PAST = new Date(Date.now() - 60 * 60 * 1000)
const FUTURE = new Date(Date.now() + 60 * 60 * 1000)

describe.skipIf(!DB_AVAILABLE)("expired availability-hold sweep", () => {
  // biome-ignore lint/suspicious/noExplicitAny: owner: availability; shared integration DB helper returns the configured Drizzle client.
  let db: any
  let productId: string
  let slotId: string
  let otherSlotId: string

  beforeAll(() => {
    db = createTestDb()
  })

  beforeEach(async () => {
    await cleanupTestDb(db)
    productId = newId("products")
    slotId = newId("availability_slots")
    otherSlotId = newId("availability_slots")
    await db.insert(products).values({
      id: productId,
      name: "Sweep product",
      sellCurrency: "CNY",
      bookingMode: "date",
    })
    for (const id of [slotId, otherSlotId]) {
      await db.insert(availabilitySlots).values({
        id,
        productId,
        dateLocal: "2026-08-01",
        startsAt: new Date("2026-08-01T08:00:00Z"),
        timezone: "UTC",
        status: "open",
        unlimited: false,
        initialPax: 6,
        remainingPax: 6,
      })
    }
  })

  async function remainingPax(id = slotId) {
    const [slot] = await db
      .select({ remainingPax: availabilitySlots.remainingPax })
      .from(availabilitySlots)
      .where(eq(availabilitySlots.id, id))
    return slot?.remainingPax
  }

  /** Simulate abandoned drafts: live hold rows whose TTL has already passed. */
  async function seedAbandonedHolds(count: number, paxEach: number, targetSlot = slotId) {
    for (let i = 0; i < count; i += 1) {
      await db.insert(availabilityHolds).values({
        draftId: `draft_abandoned_${targetSlot}_${i}`,
        holdToken: `abandoned_${targetSlot}_${i}`,
        productId,
        slotId: targetSlot,
        paxCount: paxEach,
        expiresAt: PAST,
      })
    }
    await db
      .update(availabilitySlots)
      .set({ remainingPax: 6 - count * paxEach })
      .where(eq(availabilitySlots.id, targetSlot))
  }

  it("reclaims a departure that abandoned drafts drove to zero when someone tries to hold it again", async () => {
    // Three abandoned 2-pax drafts took the departure from 6 to 0.
    await seedAbandonedHolds(3, 2)
    expect(await remainingPax()).toBe(0)

    const outcome = await placeAvailabilityHold(db, {
      draftId: "draft_live",
      productId,
      slotId,
      paxCount: 2,
      ttlMs: 15 * 60 * 1000,
    })

    // Before the fix this returned insufficient_capacity forever.
    expect(outcome.status).toBe("ok")
    // 6 reclaimed, minus the 2 the new hold legitimately takes.
    expect(await remainingPax()).toBe(4)
  })

  it("does not disturb capacity when there is nothing expired to sweep", async () => {
    await db.insert(availabilityHolds).values({
      draftId: "draft_live_only",
      holdToken: "live_only",
      productId,
      slotId,
      paxCount: 2,
      expiresAt: FUTURE,
    })
    await db
      .update(availabilitySlots)
      .set({ remainingPax: 4 })
      .where(eq(availabilitySlots.id, slotId))

    const outcome = await placeAvailabilityHold(db, {
      draftId: "draft_second",
      productId,
      slotId,
      paxCount: 1,
      ttlMs: 15 * 60 * 1000,
    })

    expect(outcome.status).toBe("ok")
    // Live hold untouched: 4 - 1.
    expect(await remainingPax()).toBe(3)
  })

  it("sweeping is idempotent — a second sweep does not re-credit released holds", async () => {
    await seedAbandonedHolds(2, 2)
    expect(await remainingPax()).toBe(2)

    const first = await releaseExpiredHoldsForSlots(db, [slotId])
    expect(first).toBe(2)
    expect(await remainingPax()).toBe(6)

    const second = await releaseExpiredHoldsForSlots(db, [slotId])
    expect(second).toBe(0)
    expect(await remainingPax()).toBe(6)
  })

  it("a per-slot sweep only touches the slots it was given", async () => {
    await seedAbandonedHolds(2, 2, slotId)
    await seedAbandonedHolds(2, 2, otherSlotId)
    expect(await remainingPax(slotId)).toBe(2)
    expect(await remainingPax(otherSlotId)).toBe(2)

    const released = await releaseExpiredHoldsForSlots(db, [slotId])

    expect(released).toBe(2)
    expect(await remainingPax(slotId)).toBe(6)
    expect(await remainingPax(otherSlotId)).toBe(2)
  })

  it("placing a hold on one slot does not reclaim another slot's expired holds", async () => {
    await seedAbandonedHolds(1, 2, otherSlotId)

    await placeAvailabilityHold(db, {
      draftId: "draft_elsewhere",
      productId,
      slotId,
      paxCount: 1,
      ttlMs: 15 * 60 * 1000,
    })

    // Bounded: the hold-placement sweep is scoped to its own slot.
    expect(await remainingPax(otherSlotId)).toBe(4)
  })

  it("an empty slot list is a no-op", async () => {
    await seedAbandonedHolds(1, 2)
    expect(await releaseExpiredHoldsForSlots(db, [])).toBe(0)
    expect(await remainingPax()).toBe(4)
  })

  it("lists live holds so an operator can see what is withholding seats", async () => {
    await seedAbandonedHolds(2, 2)
    await db.insert(availabilityHolds).values({
      draftId: "draft_still_live",
      holdToken: "still_live",
      productId,
      slotId,
      paxCount: 1,
      expiresAt: FUTURE,
    })

    const all = await listLiveAvailabilityHolds(db, { slotId })
    expect(all).toHaveLength(3)

    const expiredOnly = await listLiveAvailabilityHolds(db, { slotId, expiredOnly: true })
    expect(expiredOnly).toHaveLength(2)
    expect(expiredOnly.every((hold) => hold.releasedAt === null && hold.convertedAt === null)).toBe(
      true,
    )

    // Released holds drop out of the live view.
    await releaseExpiredHoldsForSlots(db, [slotId])
    expect(await listLiveAvailabilityHolds(db, { slotId })).toHaveLength(1)
  })

  it("leaves converted holds alone even when past their expiry", async () => {
    await db.insert(availabilityHolds).values({
      draftId: "draft_converted",
      holdToken: "converted_token",
      productId,
      slotId,
      paxCount: 2,
      expiresAt: PAST,
      convertedAt: new Date(),
    })
    await db
      .update(availabilitySlots)
      .set({ remainingPax: 4 })
      .where(eq(availabilitySlots.id, slotId))

    const released = await releaseExpiredHoldsForSlots(db, [slotId])

    // A converted hold became a real booking — its seats are legitimately gone.
    expect(released).toBe(0)
    expect(await remainingPax()).toBe(4)
  })
})
