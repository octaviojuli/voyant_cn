import { availabilityStartTimes } from "@voyant-travel/availability/schema"
import { and, asc, desc, eq, max } from "drizzle-orm"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"

import { productDaysRef, productItinerariesRef } from "./products-ref.js"
import { localToInstant } from "./slot-timezone.js"

/** Time-of-day used when a product has no usable `availability_start_times` row. */
export const FALLBACK_SLOT_START_TIME = "09:00"

const MINUTE_MS = 60_000
const DAY_MS = 86_400_000

/** The `availability_start_times` columns slot generation reads. */
export type StartTimeCandidate = {
  id: string
  optionId: string | null
  facilityId: string | null
  startTimeLocal: string
  durationMinutes: number | null
}

/** The scope a generated slot inherits from its rule. */
export type SlotScope = {
  optionId: string | null
  facilityId: string | null
}

/**
 * Ranks an `availability_start_times` row against the rule's scope.
 *
 * Lower is better; `null` means "never applies". The tiers encode
 * most-specific-wins, and the two exclusions are deliberate:
 *
 *  - a start time scoped to a *different* facility never applies (a rule with
 *    no facility only matches facility-less start times);
 *  - a start time scoped to a *different* option never applies, and a
 *    product-level rule never borrows an option-scoped start time — binding an
 *    "all options" departure to one option's clock would be a silent guess.
 */
export function scoreStartTimeCandidate(
  candidate: StartTimeCandidate,
  scope: SlotScope,
): number | null {
  if (candidate.facilityId !== null && candidate.facilityId !== scope.facilityId) return null
  const facilityBonus = candidate.facilityId === null ? 1 : 0

  if (candidate.optionId === null) return 2 + facilityBonus
  if (scope.optionId !== null && candidate.optionId === scope.optionId) return facilityBonus
  return null
}

/**
 * Picks the start time a generated slot should inherit.
 *
 * Deterministic selection rule, in order:
 *
 *  1. most specific scope wins — option+facility, then option, then
 *     product+facility, then product-level;
 *  2. lowest `sortOrder` (the operator's own ordering of the catalogue);
 *  3. earliest `createdAt`;
 *  4. lowest `id` as a final tiebreak, so two rows created in the same
 *     transaction still resolve identically on every run.
 *
 * Callers pass rows already filtered to the product and `active = true`.
 */
export function pickStartTime<T extends StartTimeCandidate>(
  candidates: readonly T[],
  scope: SlotScope,
): T | null {
  let best: T | null = null
  let bestTier = Number.POSITIVE_INFINITY
  for (const candidate of candidates) {
    const tier = scoreStartTimeCandidate(candidate, scope)
    if (tier === null) continue
    if (best === null || tier < bestTier) {
      best = candidate
      bestTier = tier
    }
  }
  return best
}

/**
 * Loads the active start-time catalogue for a product in the tiebreak order
 * `pickStartTime` expects (`sortOrder`, `createdAt`, `id`).
 */
export async function resolveSlotStartTime(
  db: PostgresJsDatabase,
  productId: string,
  scope: SlotScope,
): Promise<StartTimeCandidate | null> {
  const rows = await db
    .select({
      id: availabilityStartTimes.id,
      optionId: availabilityStartTimes.optionId,
      facilityId: availabilityStartTimes.facilityId,
      startTimeLocal: availabilityStartTimes.startTimeLocal,
      durationMinutes: availabilityStartTimes.durationMinutes,
    })
    .from(availabilityStartTimes)
    .where(
      and(eq(availabilityStartTimes.productId, productId), eq(availabilityStartTimes.active, true)),
    )
    .orderBy(
      asc(availabilityStartTimes.sortOrder),
      asc(availabilityStartTimes.createdAt),
      asc(availabilityStartTimes.id),
    )

  return pickStartTime(rows, scope)
}

export type ItineraryLength = {
  itineraryId: string
  /** `max(day_number)` across the itinerary's `product_days` rows; 0 when unauthored. */
  dayCount: number
}

/**
 * Resolves the itinerary a generated departure follows and how long it runs.
 *
 * Itinerary choice mirrors the catalog plane
 * (`estimateItineraryDurationDays` in `@voyant-travel/inventory`): the
 * product's default itinerary, else the lowest `sortOrder`, then earliest
 * `createdAt`, then lowest `id`.
 *
 * Length is `max(day_number)` rather than `count(*)` so a gap in the authored
 * days ("Day 1, Day 2, Day 12") still reports the trip's real span, matching
 * inventory's own duration estimate.
 */
export async function resolveItineraryLength(
  db: PostgresJsDatabase,
  productId: string,
): Promise<ItineraryLength | null> {
  const [itinerary] = await db
    .select({ id: productItinerariesRef.id })
    .from(productItinerariesRef)
    .where(eq(productItinerariesRef.productId, productId))
    // `is_default DESC` puts the default first (Postgres sorts false < true),
    // matching how bookings picks a product's default option.
    .orderBy(
      desc(productItinerariesRef.isDefault),
      asc(productItinerariesRef.sortOrder),
      asc(productItinerariesRef.createdAt),
      asc(productItinerariesRef.id),
    )
    .limit(1)

  if (!itinerary) return null

  const [row] = await db
    .select({ maxDayNumber: max(productDaysRef.dayNumber) })
    .from(productDaysRef)
    .where(eq(productDaysRef.itineraryId, itinerary.id))

  const maxDayNumber = Number(row?.maxDayNumber ?? 0)
  return {
    itineraryId: itinerary.id,
    dayCount: Number.isFinite(maxDayNumber) && maxDayNumber > 0 ? maxDayNumber : 0,
  }
}

/**
 * Normalizes a local `HH:mm` / `HH:mm:ss` time to `HH:mm`.
 *
 * Returns `fallback` for anything unparseable, so a malformed catalogue row
 * degrades to the 09:00 default instead of aborting a whole generation run.
 */
export function normalizeLocalTime(value: string | null | undefined, fallback: string): string {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec((value ?? "").trim())
  if (!match) return fallback
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return fallback
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
}

export type SlotDurationInput = {
  /** Local departure date, `YYYY-MM-DD`. */
  dateLocal: string
  /** Local departure time, `HH:mm`. */
  startTime: string
  timezone: string
  /** UTC instant the slot starts, already resolved from the three fields above. */
  startsAt: Date
  /** `max(day_number)` of the product's itinerary; 0 when there is none. */
  itineraryDayCount: number
  /** `availability_start_times.duration_minutes`, when the catalogue entry carries one. */
  durationMinutes: number | null
}

export type SlotDuration = {
  endsAt: Date | null
  nights: number | null
  days: number | null
}

/**
 * Derives a generated departure's end instant and its night/day counts.
 *
 * Rules:
 *
 *  - `nights` / `days` always come from the itinerary: a 12-day itinerary is
 *    12 days and 11 nights. An itinerary with 0 or 1 authored days carries no
 *    usable span (an unauthored itinerary and a genuine day trip are not
 *    distinguishable enough to guess an end instant from), so both stay
 *    `null` — today's behaviour.
 *  - `endsAt` prefers the start time's `durationMinutes` when the catalogue
 *    entry carries one, because that is an explicit operator-entered figure.
 *    Otherwise it is the same local wall-clock time `nights` days later, which
 *    keeps a departure starting at 09:00 ending at 09:00 across a DST switch
 *    instead of drifting an hour.
 *
 * The two sources can disagree (a start time may declare 3×1440 minutes for a
 * 3-day itinerary). That is intentional: each field stays traceable to a single
 * source of truth, and the explicit `durationMinutes` wins only where it is
 * actually expressed — the end instant.
 */
export function deriveSlotDuration(input: SlotDurationInput): SlotDuration {
  const hasItinerarySpan = input.itineraryDayCount >= 2
  const nights = hasItinerarySpan ? input.itineraryDayCount - 1 : null
  const days = hasItinerarySpan ? input.itineraryDayCount : null

  if (input.durationMinutes !== null && input.durationMinutes > 0) {
    return {
      endsAt: new Date(input.startsAt.getTime() + input.durationMinutes * MINUTE_MS),
      nights,
      days,
    }
  }

  if (nights === null) return { endsAt: null, nights: null, days: null }

  return { endsAt: addLocalDays(input, nights), nights, days }
}

/**
 * Adds whole days to a local date and re-resolves the instant in the slot's
 * timezone, so the end keeps the same wall-clock time across a DST boundary.
 *
 * Falls back to fixed 24h arithmetic if the target wall-clock time does not
 * exist on the end date (a spring-forward gap) — a generated departure must
 * never fail to materialise over a calendar edge case.
 */
function addLocalDays(
  input: Pick<SlotDurationInput, "dateLocal" | "startTime" | "timezone" | "startsAt">,
  days: number,
): Date {
  const endDateLocal = addDaysToDateLocal(input.dateLocal, days)
  try {
    return new Date(
      localToInstant({ date: endDateLocal, time: input.startTime, timezone: input.timezone }),
    )
  } catch {
    return new Date(input.startsAt.getTime() + days * DAY_MS)
  }
}

/** Adds whole days to a `YYYY-MM-DD` string using UTC calendar arithmetic. */
export function addDaysToDateLocal(dateLocal: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateLocal)
  if (!match) throw new RangeError(`Local date must use YYYY-MM-DD: ${dateLocal}`)
  const cursor = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  cursor.setUTCDate(cursor.getUTCDate() + days)
  return cursor.toISOString().slice(0, 10)
}
