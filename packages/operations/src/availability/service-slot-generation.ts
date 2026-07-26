import { availabilityRules } from "@voyant-travel/availability/schema"
import { eq } from "drizzle-orm"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"

import { generateAvailabilitySlots } from "./generate-slots.js"
import { DEFAULT_RULE_SLOT_GENERATION_HORIZON_DAYS } from "./validation.js"

export type GenerateSlotsForRuleOptions = {
  /** Days ahead of `now` to expand. Defaults to 90; callers clamp to 1..365. */
  horizonDays?: number
  /** Override "now" so generation is deterministic in tests. */
  now?: Date
}

export type GenerateSlotsForRuleResult = {
  created: number
  skipped: number
  horizonDays: number
}

/**
 * Materialize departure slots for a single availability rule.
 *
 * This is the runtime entry point for `generateAvailabilitySlots(...)`: before
 * it existed the expander was exported but never called, so an operator could
 * define a recurrence rule and never get a departure out of it.
 *
 * Semantics:
 *
 *  - unknown rule → `null`, which the route serializes as a 404
 *  - inactive rule → `{ created: 0, skipped: 0 }`, NOT a 409. Generation is a
 *    "bring the calendar up to date" operation, and `generateAvailabilitySlots`
 *    already treats `active = false` as "nothing to expand" when it sweeps all
 *    rules. Reporting the same no-op for a targeted call keeps the endpoint
 *    idempotent and lets a caller fan out over a mixed list of rules without
 *    special-casing errors. 409 in this package is reserved for violated
 *    invariants (see the allocation routes), and an inactive rule is not one.
 *  - re-running is a no-op: dates that already have a slot for the rule are
 *    reported under `skipped` rather than duplicated.
 *
 * Created slots inherit the rule's `maxCapacity` (as both `initialPax` and
 * `remainingPax`), its `maxPickupCapacity` (as `initialPickups` /
 * `remainingPickups`) and its `timezone`; the product's active start time
 * (`startTimeId` plus its local time of day); the product's itinerary
 * (`itineraryId`, `nights`, `days`, `endsAt`); and seed allocation resources
 * from the option's resource templates. See `generateAvailabilitySlots` and
 * `slot-derivation.ts` for the exact derivation rules.
 */
export async function generateSlotsForRule(
  db: PostgresJsDatabase,
  ruleId: string,
  options: GenerateSlotsForRuleOptions = {},
): Promise<GenerateSlotsForRuleResult | null> {
  const horizonDays = options.horizonDays ?? DEFAULT_RULE_SLOT_GENERATION_HORIZON_DAYS

  const [rule] = await db
    .select({ id: availabilityRules.id, active: availabilityRules.active })
    .from(availabilityRules)
    .where(eq(availabilityRules.id, ruleId))
    .limit(1)

  if (!rule) return null
  if (!rule.active) return { created: 0, skipped: 0, horizonDays }

  const result = await generateAvailabilitySlots(db, {
    ruleId,
    horizonDays,
    ...(options.now ? { now: options.now } : {}),
  })

  return {
    created: result.slotsCreated,
    skipped: result.slotsSkipped,
    horizonDays,
  }
}
