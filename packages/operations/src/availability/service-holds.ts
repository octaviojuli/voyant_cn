/**
 * Soft-hold service for the booking-journey wizard.
 *
 * Per `docs/architecture/booking-journey-architecture.md` §5.7 +
 * §6. Decrements `availability_slots.remainingPax` while a hold is
 * live, restores it on release.
 *
 * Expiry / reclaiming abandoned holds
 * -----------------------------------
 * There is deliberately NO reliance on a background reaper here. This
 * repository declares scheduled work in the deployment graph and expects
 * an *external* scheduler to POST `/__voyant/scheduled`; the Node
 * operator profile ships `providers.scheduledJobs: "none"` and its
 * systemd unit installs no timer, so a stale-hold job would silently
 * never run — which is exactly how abandoned drafts drove a departure
 * from 6 seats to 0 with no way for an operator to see or clear them.
 *
 * Instead expiry is reclaimed on the paths that care:
 *
 *  1. `placeAvailabilityHold` sweeps the slot it is about to lock
 *     (`releaseExpiredHoldsForSlots`) inside the same transaction, so
 *     the capacity check always sees post-expiry numbers and a slot
 *     heals itself the moment anyone tries to book it again.
 *  2. `releaseExpiredHolds` remains the global backstop, driven on
 *     demand by the admin sweep route (`POST .../holds/release-expired`)
 *     and usable by a scheduler if one is ever wired up.
 *
 * Atomicity: every operation runs inside a transaction that
 * locks the slot row, so concurrent placeHold attempts can't
 * over-allocate.
 */

import {
  type AvailabilityHold,
  availabilityHolds,
  availabilitySlots,
} from "@voyant-travel/availability/schema"
import { newId } from "@voyant-travel/db/lib/typeid"
import { and, asc, eq, inArray, isNull, lt, sql } from "drizzle-orm"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"

export interface PlaceAvailabilityHoldInput {
  draftId: string
  productId: string
  slotId: string
  paxCount: number
  ttlMs: number
  /** Caller-supplied hold token; defaults to a fresh typeid. */
  holdToken?: string
}

export type PlaceAvailabilityHoldOutcome =
  | { status: "ok"; hold: AvailabilityHold }
  | { status: "slot_not_found" }
  | { status: "slot_unlimited"; holdToken: string; expiresAt: Date }
  | { status: "insufficient_capacity"; remaining: number; needed: number }

/**
 * Release every expired hold on the given slots, inside a caller-owned
 * transaction. Returns the number of holds released.
 *
 * Lock order is slots-then-holds, matching `placeAvailabilityHold`, so
 * concurrent sweeps and hold placements can't deadlock against each
 * other. Bounded by construction: it only ever touches the slots it was
 * handed, so the work is proportional to the request, not to the size of
 * the holds table.
 */
async function releaseExpiredHoldsForSlotsTx(
  // biome-ignore lint/suspicious/noExplicitAny: drizzle transaction handle -- owner: operations; `tx` is structurally a db but not assignable to PostgresJsDatabase.
  tx: any,
  slotIds: readonly string[],
  cutoff: Date,
): Promise<number> {
  const uniqueSlotIds = [...new Set(slotIds)].sort()
  if (uniqueSlotIds.length === 0) return 0

  const slots = await tx
    .select({ id: availabilitySlots.id, unlimited: availabilitySlots.unlimited })
    .from(availabilitySlots)
    .where(inArray(availabilitySlots.id, uniqueSlotIds))
    .orderBy(asc(availabilitySlots.id))
    .for("update")

  if (slots.length === 0) return 0
  const unlimitedById = new Map<string, boolean>(
    slots.map((slot: { id: string; unlimited: boolean | null }) => [slot.id, !!slot.unlimited]),
  )

  const expired = await tx
    .select()
    .from(availabilityHolds)
    .where(
      and(
        inArray(availabilityHolds.slotId, uniqueSlotIds),
        lt(availabilityHolds.expiresAt, cutoff),
        isNull(availabilityHolds.releasedAt),
        isNull(availabilityHolds.convertedAt),
      ),
    )
    .orderBy(asc(availabilityHolds.slotId), asc(availabilityHolds.createdAt))
    .for("update")

  if (expired.length === 0) return 0

  const paxBySlot = new Map<string, number>()
  for (const hold of expired as AvailabilityHold[]) {
    paxBySlot.set(hold.slotId, (paxBySlot.get(hold.slotId) ?? 0) + hold.paxCount)
  }

  const now = new Date()
  for (const [slotId, paxCount] of paxBySlot) {
    if (unlimitedById.get(slotId) !== false) continue
    await tx
      .update(availabilitySlots)
      .set({
        // agent-quality: raw-sql reviewed -- owner: availability; dynamic SQL interpolation uses Drizzle parameter binding or vetted SQL identifiers.
        remainingPax: sql`${availabilitySlots.remainingPax} + ${paxCount}`,
        updatedAt: now,
      })
      .where(eq(availabilitySlots.id, slotId))
  }

  await tx
    .update(availabilityHolds)
    .set({ releasedAt: now, updatedAt: now })
    .where(
      inArray(
        availabilityHolds.id,
        (expired as AvailabilityHold[]).map((hold) => hold.id),
      ),
    )

  return expired.length
}

/**
 * Release expired holds for a specific set of slots in its own
 * transaction. Use this from read paths (slot / departure lookups) so an
 * operator never sees capacity that is only being withheld by holds
 * which already timed out.
 */
export async function releaseExpiredHoldsForSlots(
  db: PostgresJsDatabase,
  slotIds: readonly string[],
  cutoff: Date = new Date(),
): Promise<number> {
  if (slotIds.length === 0) return 0
  return db.transaction(async (tx) => releaseExpiredHoldsForSlotsTx(tx, slotIds, cutoff))
}

/**
 * Place a soft hold on a slot. When the slot is `unlimited`, no
 * capacity decrement is needed but a hold row is still written for
 * audit + later release. The bridge returns a token the caller
 * stores on the draft (typically as `draft.id` for journey
 * convenience).
 *
 * Expired holds on the target slot are reclaimed first, in the same
 * transaction, so the capacity check below can never be starved by
 * abandoned drafts.
 */
export async function placeAvailabilityHold(
  db: PostgresJsDatabase,
  input: PlaceAvailabilityHoldInput,
): Promise<PlaceAvailabilityHoldOutcome> {
  if (input.paxCount <= 0) {
    return { status: "insufficient_capacity", remaining: 0, needed: input.paxCount }
  }

  return db.transaction(async (tx) => {
    // Reclaim abandoned holds on this slot before reading its capacity.
    // This is the sweep that cannot be forgotten: it runs on the very
    // path that would otherwise report the slot as full.
    await releaseExpiredHoldsForSlotsTx(tx, [input.slotId], new Date())

    const [slot] = await tx
      .select({
        id: availabilitySlots.id,
        unlimited: availabilitySlots.unlimited,
        remainingPax: availabilitySlots.remainingPax,
      })
      .from(availabilitySlots)
      .where(eq(availabilitySlots.id, input.slotId))
      .for("update")
      .limit(1)

    if (!slot) return { status: "slot_not_found" as const }

    const expiresAt = new Date(Date.now() + input.ttlMs)
    const holdToken = input.holdToken ?? `hold_${newId("availability_holds")}`

    const [existing] = await tx
      .select()
      .from(availabilityHolds)
      .where(
        and(
          eq(availabilityHolds.holdToken, holdToken),
          eq(availabilityHolds.draftId, input.draftId),
          eq(availabilityHolds.productId, input.productId),
          eq(availabilityHolds.slotId, input.slotId),
          isNull(availabilityHolds.releasedAt),
          isNull(availabilityHolds.convertedAt),
        ),
      )
      .orderBy(asc(availabilityHolds.createdAt))
      .limit(1)

    if (existing) {
      const paxDelta = input.paxCount - existing.paxCount

      if (!slot.unlimited && paxDelta > 0) {
        const remaining = slot.remainingPax ?? 0
        if (remaining < paxDelta) {
          return {
            status: "insufficient_capacity" as const,
            remaining: remaining + existing.paxCount,
            needed: input.paxCount,
          }
        }
      }

      if (!slot.unlimited && paxDelta !== 0) {
        await tx
          .update(availabilitySlots)
          .set({
            // agent-quality: raw-sql reviewed -- owner: availability; dynamic SQL interpolation uses Drizzle parameter binding or vetted SQL identifiers.
            remainingPax: sql`${availabilitySlots.remainingPax} - ${paxDelta}`,
            updatedAt: new Date(),
          })
          .where(eq(availabilitySlots.id, input.slotId))
      }

      const [updated] = await tx
        .update(availabilityHolds)
        .set({ paxCount: input.paxCount, expiresAt, updatedAt: new Date() })
        .where(eq(availabilityHolds.id, existing.id))
        .returning()
      if (!updated) throw new Error("placeAvailabilityHold: update returned no rows")
      return { status: "ok" as const, hold: updated }
    }

    if (slot.unlimited) {
      const [row] = await tx
        .insert(availabilityHolds)
        .values({
          draftId: input.draftId,
          holdToken,
          productId: input.productId,
          slotId: input.slotId,
          paxCount: input.paxCount,
          expiresAt,
        })
        .returning()
      if (!row) throw new Error("placeAvailabilityHold: insert returned no rows")
      return { status: "ok" as const, hold: row }
    }

    const remaining = slot.remainingPax ?? 0
    if (remaining < input.paxCount) {
      return {
        status: "insufficient_capacity" as const,
        remaining,
        needed: input.paxCount,
      }
    }

    await tx
      .update(availabilitySlots)
      .set({
        // agent-quality: raw-sql reviewed -- owner: availability; dynamic SQL interpolation uses Drizzle parameter binding or vetted SQL identifiers.
        remainingPax: sql`${availabilitySlots.remainingPax} - ${input.paxCount}`,
        updatedAt: new Date(),
      })
      .where(eq(availabilitySlots.id, input.slotId))

    const [row] = await tx
      .insert(availabilityHolds)
      .values({
        draftId: input.draftId,
        holdToken,
        productId: input.productId,
        slotId: input.slotId,
        paxCount: input.paxCount,
        expiresAt,
      })
      .returning()
    if (!row) throw new Error("placeAvailabilityHold: insert returned no rows")
    return { status: "ok" as const, hold: row }
  })
}

export interface ExtendAvailabilityHoldInput {
  holdToken: string
  ttlMs: number
}

export type ExtendAvailabilityHoldOutcome =
  | { status: "ok"; expiresAt: Date }
  | { status: "hold_not_found" }
  | { status: "already_released" }

export async function extendAvailabilityHold(
  db: PostgresJsDatabase,
  input: ExtendAvailabilityHoldInput,
): Promise<ExtendAvailabilityHoldOutcome> {
  const [row] = await db
    .select({
      id: availabilityHolds.id,
      releasedAt: availabilityHolds.releasedAt,
    })
    .from(availabilityHolds)
    .where(
      and(eq(availabilityHolds.holdToken, input.holdToken), isNull(availabilityHolds.convertedAt)),
    )
    .limit(1)

  if (!row) return { status: "hold_not_found" }
  if (row.releasedAt) return { status: "already_released" }

  const expiresAt = new Date(Date.now() + input.ttlMs)
  await db
    .update(availabilityHolds)
    .set({ expiresAt, updatedAt: new Date() })
    .where(eq(availabilityHolds.id, row.id))
  return { status: "ok", expiresAt }
}

/**
 * Release a hold by token. Restores capacity. Idempotent — calling
 * twice is a no-op on the second call.
 */
export async function releaseAvailabilityHold(
  db: PostgresJsDatabase,
  holdToken: string,
): Promise<void> {
  await releaseAvailabilityHoldsByToken(db, holdToken)
}

async function releaseAvailabilityHoldsByToken(
  db: PostgresJsDatabase,
  holdToken: string,
): Promise<number> {
  return db.transaction(async (tx) => {
    const holds = await tx
      .select()
      .from(availabilityHolds)
      .where(
        and(
          eq(availabilityHolds.holdToken, holdToken),
          isNull(availabilityHolds.releasedAt),
          isNull(availabilityHolds.convertedAt),
        ),
      )
      .orderBy(asc(availabilityHolds.slotId), asc(availabilityHolds.createdAt))
      .for("update")

    if (holds.length === 0) return 0

    const paxBySlot = new Map<string, number>()
    for (const hold of holds) {
      paxBySlot.set(hold.slotId, (paxBySlot.get(hold.slotId) ?? 0) + hold.paxCount)
    }

    for (const [slotId, paxCount] of paxBySlot) {
      const [slot] = await tx
        .select({ unlimited: availabilitySlots.unlimited })
        .from(availabilitySlots)
        .where(eq(availabilitySlots.id, slotId))
        .for("update")
        .limit(1)

      if (slot && !slot.unlimited) {
        await tx
          .update(availabilitySlots)
          .set({
            // agent-quality: raw-sql reviewed -- owner: availability; dynamic SQL interpolation uses Drizzle parameter binding or vetted SQL identifiers.
            remainingPax: sql`${availabilitySlots.remainingPax} + ${paxCount}`,
            updatedAt: new Date(),
          })
          .where(eq(availabilitySlots.id, slotId))
      }
    }

    await tx
      .update(availabilityHolds)
      .set({ releasedAt: new Date(), updatedAt: new Date() })
      .where(
        inArray(
          availabilityHolds.id,
          holds.map((hold) => hold.id),
        ),
      )

    return holds.length
  })
}

/**
 * Global backstop — releases ALL holds past `expires_at` that haven't
 * already been released, across every slot. Returns the count of
 * newly-released holds.
 *
 * Reached on demand through the admin sweep route
 * (`POST /v1/admin/operations/availability/holds/release-expired`); a
 * scheduler may also drive it, but nothing in this repository guarantees
 * one is running, which is why `placeAvailabilityHold` sweeps its own
 * slot rather than depending on this.
 */
export async function releaseExpiredHolds(
  db: PostgresJsDatabase,
  cutoff: Date = new Date(),
): Promise<number> {
  return db.transaction(async (tx) => {
    const expired = await tx
      .select()
      .from(availabilityHolds)
      .where(
        and(
          lt(availabilityHolds.expiresAt, cutoff),
          isNull(availabilityHolds.releasedAt),
          isNull(availabilityHolds.convertedAt),
        ),
      )
      .orderBy(asc(availabilityHolds.slotId), asc(availabilityHolds.createdAt))
      .for("update")

    if (expired.length === 0) return 0

    const paxBySlot = new Map<string, number>()
    for (const hold of expired) {
      paxBySlot.set(hold.slotId, (paxBySlot.get(hold.slotId) ?? 0) + hold.paxCount)
    }

    for (const [slotId, paxCount] of paxBySlot) {
      const [slot] = await tx
        .select({ unlimited: availabilitySlots.unlimited })
        .from(availabilitySlots)
        .where(eq(availabilitySlots.id, slotId))
        .for("update")
        .limit(1)

      if (slot && !slot.unlimited) {
        await tx
          .update(availabilitySlots)
          .set({
            // agent-quality: raw-sql reviewed -- owner: availability; dynamic SQL interpolation uses Drizzle parameter binding or vetted SQL identifiers.
            remainingPax: sql`${availabilitySlots.remainingPax} + ${paxCount}`,
            updatedAt: new Date(),
          })
          .where(eq(availabilitySlots.id, slotId))
      }
    }

    const now = new Date()
    await tx
      .update(availabilityHolds)
      .set({ releasedAt: now, updatedAt: now })
      .where(
        inArray(
          availabilityHolds.id,
          expired.map((hold) => hold.id),
        ),
      )

    return expired.length
  })
}

/**
 * Looks up the hold(s) for a draft id. Multiple holds per draft
 * are possible (e.g. a multi-day product touching several slots);
 * releasing by token clears them all at once.
 */
export async function findHoldsByDraft(
  db: PostgresJsDatabase,
  draftId: string,
): Promise<AvailabilityHold[]> {
  return await db.select().from(availabilityHolds).where(eq(availabilityHolds.draftId, draftId))
}

export interface ListAvailabilityHoldsFilter {
  /** Restrict to a single slot. */
  slotId?: string
  /** Only holds already past `expires_at`. */
  expiredOnly?: boolean
  limit?: number
}

/**
 * Live (unreleased, unconverted) holds, newest first — the read behind
 * the admin holds view. Without this an operator could see a departure
 * sitting at 0 remaining seats with no way to find out which drafts were
 * withholding them.
 */
export async function listLiveAvailabilityHolds(
  db: PostgresJsDatabase,
  filter: ListAvailabilityHoldsFilter = {},
): Promise<AvailabilityHold[]> {
  const conditions = [
    isNull(availabilityHolds.releasedAt),
    isNull(availabilityHolds.convertedAt),
    ...(filter.slotId ? [eq(availabilityHolds.slotId, filter.slotId)] : []),
    ...(filter.expiredOnly ? [lt(availabilityHolds.expiresAt, new Date())] : []),
  ]

  return await db
    .select()
    .from(availabilityHolds)
    .where(and(...conditions))
    .orderBy(asc(availabilityHolds.expiresAt))
    .limit(Math.min(Math.max(filter.limit ?? 100, 1), 500))
}
