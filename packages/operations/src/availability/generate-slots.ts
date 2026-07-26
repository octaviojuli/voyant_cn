import { availabilityRules, availabilitySlots } from "@voyant-travel/availability/schema"
import { and, eq, inArray } from "drizzle-orm"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"
import { expandRRule } from "./rrule.js"
import { materializeSlotResourcesFromTemplateDefaults } from "./service-allocation-automation.js"
import {
  deriveSlotDuration,
  FALLBACK_SLOT_START_TIME,
  normalizeLocalTime,
  resolveItineraryLength,
  resolveSlotStartTime,
} from "./slot-derivation.js"
import { localToInstant } from "./slot-timezone.js"

export type GenerateAvailabilitySlotsOptions = {
  /** If provided, only generate slots for this rule. Otherwise, process all active rules. */
  ruleId?: string
  /** How many days ahead from "now" to generate slots for. Defaults to 90. */
  horizonDays?: number
  /**
   * Last-resort start time (HH:MM, 24h), used only when the product has no
   * applicable `availability_start_times` entry. Defaults to "09:00".
   */
  defaultStartTime?: string
  /** Cap on slots expanded per rule. Defaults to 1000. */
  perRuleLimit?: number
  /** Override "now" for deterministic generation. Defaults to new Date(). */
  now?: Date
  /**
   * Auto-seed `allocation_resources` for each freshly-created slot from
   * its option's `product_option_resource_templates.default_count`.
   * Templates without `default_count` are still skipped — those need
   * pax-aware materialisation via the admin route. Defaults to true.
   */
  materializeResources?: boolean
}

export type GenerateAvailabilitySlotsResult = {
  rulesProcessed: number
  slotsCreated: number
  slotsSkipped: number
  resourcesMaterialized: number
}

/**
 * Materialize availability slots from active availability rules.
 *
 * `startsAt` is stored as a true UTC instant for the wall-clock time on
 * `dateLocal` in the rule's `timezone`.
 *
 * A generated departure is meant to be complete enough to publish without
 * hand-editing, so besides the rule's own capacity/timezone it also inherits:
 *
 *  - the product's active `availability_start_times` entry — its
 *    `startTimeLocal` sets the time of day and the slot links back via
 *    `startTimeId` (see `pickStartTime` for the deterministic choice);
 *  - the product's itinerary length — `nights` / `days` / `endsAt`, so a
 *    12-day tour departs and returns without an operator retyping either
 *    (see `deriveSlotDuration`);
 *  - the rule's `maxPickupCapacity` as `initialPickups` / `remainingPickups`.
 */
export async function generateAvailabilitySlots(
  db: PostgresJsDatabase,
  options: GenerateAvailabilitySlotsOptions = {},
): Promise<GenerateAvailabilitySlotsResult> {
  const horizonDays = options.horizonDays ?? 90
  const defaultStartTime = normalizeLocalTime(options.defaultStartTime, FALLBACK_SLOT_START_TIME)
  const perRuleLimit = options.perRuleLimit ?? 1000
  const now = options.now ?? new Date()
  const shouldMaterializeResources = options.materializeResources !== false

  const from = new Date(now)
  from.setUTCHours(0, 0, 0, 0)
  const to = new Date(from)
  to.setUTCDate(to.getUTCDate() + horizonDays)

  const ruleFilters = [eq(availabilityRules.active, true)]
  if (options.ruleId) ruleFilters.push(eq(availabilityRules.id, options.ruleId))

  const rules = await db
    .select()
    .from(availabilityRules)
    .where(and(...ruleFilters))

  let slotsCreated = 0
  let slotsSkipped = 0
  let resourcesMaterialized = 0

  for (const rule of rules) {
    const dates = expandRRule(rule.recurrenceRule, from, to, perRuleLimit)
    if (dates.length === 0) continue

    const existing = await db
      .select({ dateLocal: availabilitySlots.dateLocal })
      .from(availabilitySlots)
      .where(
        and(
          eq(availabilitySlots.productId, rule.productId),
          eq(availabilitySlots.availabilityRuleId, rule.id),
          inArray(availabilitySlots.dateLocal, dates),
        ),
      )

    const existingSet = new Set(existing.map((row) => row.dateLocal))

    const toInsert = dates.filter((d) => !existingSet.has(d))
    slotsSkipped += dates.length - toInsert.length

    if (toInsert.length === 0) continue

    // Resolved once per rule — every date the rule expands to shares the same
    // product, so the catalogue lookups don't belong inside the row loop.
    const scope = { optionId: rule.optionId, facilityId: rule.facilityId }
    const [startTimeEntry, itinerary] = await Promise.all([
      resolveSlotStartTime(db, rule.productId, scope),
      resolveItineraryLength(db, rule.productId),
    ])

    const startTime = normalizeLocalTime(startTimeEntry?.startTimeLocal, defaultStartTime)
    const itineraryDayCount = itinerary?.dayCount ?? 0

    const rows = toInsert.map((dateLocal) => {
      const startsAt = new Date(
        localToInstant({ date: dateLocal, time: startTime, timezone: rule.timezone }),
      )
      const duration = deriveSlotDuration({
        dateLocal,
        startTime,
        timezone: rule.timezone,
        startsAt,
        itineraryDayCount,
        durationMinutes: startTimeEntry?.durationMinutes ?? null,
      })

      return {
        productId: rule.productId,
        itineraryId: itinerary?.itineraryId ?? null,
        optionId: rule.optionId,
        facilityId: rule.facilityId,
        availabilityRuleId: rule.id,
        startTimeId: startTimeEntry?.id ?? null,
        dateLocal,
        startsAt,
        endsAt: duration.endsAt,
        timezone: rule.timezone,
        status: "open" as const,
        unlimited: false,
        initialPax: rule.maxCapacity,
        remainingPax: rule.maxCapacity,
        initialPickups: rule.maxPickupCapacity,
        remainingPickups: rule.maxPickupCapacity,
        nights: duration.nights,
        days: duration.days,
      }
    })

    const inserted = await db
      .insert(availabilitySlots)
      .values(rows)
      .returning({ id: availabilitySlots.id, optionId: availabilitySlots.optionId })
    slotsCreated += inserted.length

    if (shouldMaterializeResources && rule.optionId) {
      for (const created of inserted) {
        if (!created.optionId) continue
        const result = await materializeSlotResourcesFromTemplateDefaults(db, created.id)
        resourcesMaterialized += result.created
      }
    }
  }

  return {
    rulesProcessed: rules.length,
    slotsCreated,
    slotsSkipped,
    resourcesMaterialized,
  }
}
