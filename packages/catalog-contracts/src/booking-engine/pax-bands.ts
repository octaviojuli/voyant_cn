/**
 * Pax-band ↔ `option_unit` resolution — the single rule that ties the
 * journey's occupancy bands to the product's real bookable units.
 *
 * Background: `BookingDraftShape.paxBands` used to be a parallel
 * concept. The journey rendered generic `adult` / `child` / `infant`
 * steppers from {@link DEFAULT_PAX_BANDS} while the product was
 * actually priced per `option_unit` (成人 / 儿童 …, each with its own
 * `option_unit_price_rules` row). Nothing mapped one onto the other,
 * so a traveler moved to the Child band still quoted — and committed —
 * at the adult price under the adult unit.
 *
 * These helpers close that gap. They are deliberately pure and free of
 * any DB/HTTP dependency so the server (owned booking handler) and the
 * client (journey wizard) resolve bands identically.
 *
 * ## The rule
 *
 * A band is derived **from the unit**, never from its display label
 * (labels are operator-authored and localized — 成人 / Adult / Erwachsener
 * all describe the same band):
 *
 *   1. Non-person units (`room` / `vehicle` / `service` / `group` /
 *      `other`) are not travelers → no band.
 *   2. The unit's stable `code` decides when it carries a recognizable
 *      token (`ADULT`, `CHILD`, `child_6_12`, `INFANT`, `SENIOR`, …).
 *   3. Otherwise the unit's age window decides: `maxAge ≤ 1` → infant,
 *      `maxAge ≤ 17` → child, `minAge ≥ 60` → senior, else adult.
 *   4. A unit with neither a recognizable code nor an age window is an
 *      adult band — the universal base traveler.
 *
 * ## Fallback behaviour (explicit, and visible rather than silent)
 *
 * - A product whose option carries **no person units at all** gets no
 *   derived bands; the caller keeps {@link DEFAULT_PAX_BANDS}.
 * - A band the product does **not** cover is simply **not offered** —
 *   `paxBandsFromOptionUnits` only ever returns bands backed by a real
 *   unit, so the journey can't collect a Child count that would
 *   silently bill at the adult price.
 * - Two units resolving to the same band (e.g. `CHILD_2_5` and
 *   `CHILD_6_11`) collapse onto the first in catalog order; the later
 *   duplicate is dropped rather than overwriting it.
 */

import type { PaxBandSpec } from "./draft-shape.js"

/**
 * Canonical pax-band codes. These are the **stable, machine-readable**
 * half of the band contract: servers ship them in
 * `BookingDraftShape.paxBands[].code`, clients key `draft.configure.pax`
 * and `draft.travelers[].band` off them, and the UI localizes its own
 * label from the code. `label` stays on the wire for backward
 * compatibility but must never be parsed.
 */
export const CANONICAL_PAX_BAND_CODES = ["adult", "child", "infant", "senior"] as const

export type CanonicalPaxBandCode = (typeof CANONICAL_PAX_BAND_CODES)[number]

/** Render order + per-band default count ceiling for derived bands. */
const BAND_ORDER: Record<CanonicalPaxBandCode, number> = {
  adult: 0,
  child: 1,
  infant: 2,
  senior: 3,
}
const BAND_DEFAULT_MAX_COUNT: Record<CanonicalPaxBandCode, number> = {
  adult: 8,
  child: 6,
  infant: 4,
  senior: 8,
}
/**
 * English fallback labels, used only when the unit has no name of its
 * own. Real catalogs always name their units (成人 / Adult / …), so this
 * is a last resort — clients should localize from `code`.
 */
const BAND_FALLBACK_LABEL: Record<CanonicalPaxBandCode, string> = {
  adult: "Adult",
  child: "Child",
  infant: "Infant",
  senior: "Senior",
}

/** Age at which an explicit lower bound reads as a senior band. */
const SENIOR_MIN_AGE = 60
/** Inclusive upper age bound that reads as an infant band. */
const INFANT_MAX_AGE = 1
/** Inclusive upper age bound that reads as a child band. */
const CHILD_MAX_AGE = 17

/**
 * Structural shape of an `option_units` row the band rule needs.
 * Mirrors `ProductVariantUnitOption` plus the identity fields, and is
 * kept structural so callers can pass DB rows straight through.
 */
export interface PaxBandUnitLike {
  id?: string
  /** Stable catalog code (`ADULT`, `child_6_12`, …) when configured. */
  code?: string | null
  /** Operator-authored display name (成人, "Child 6-12", …). */
  name?: string | null
  /** `person` units are travelers; everything else is inventory. */
  unitType?: string | null
  minAge?: number | null
  maxAge?: number | null
  minQuantity?: number | null
  maxQuantity?: number | null
  isRequired?: boolean | null
}

function bandCodeFromUnitCode(raw: string | null | undefined): CanonicalPaxBandCode | null {
  if (!raw) return null
  // Strip digits/separators so `child_6_12` and `CHILD-2-11` both
  // reduce to the leading token.
  const token = raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
  if (token.length === 0) return null
  if (token.startsWith("INFANT") || token.startsWith("BABY") || token === "INF") return "infant"
  if (
    token.startsWith("CHILD") ||
    token.startsWith("KID") ||
    token.startsWith("JUNIOR") ||
    token.startsWith("YOUTH") ||
    token.startsWith("TEEN")
  ) {
    return "child"
  }
  if (token.startsWith("SENIOR") || token.startsWith("ELDER") || token === "OAP") return "senior"
  if (token.startsWith("ADULT")) return "adult"
  return null
}

/**
 * Resolve the canonical pax band a bookable unit represents, or `null`
 * when the unit is not a traveler (rooms, vehicles, services, …).
 *
 * Matching is by `code` then age window — never by display label — so
 * a localized catalog (成人 / 儿童) resolves exactly like an English one.
 * Units with an unset `unitType` are treated as inventory, not people:
 * `option_units.unit_type` is NOT NULL in the catalog, so an absent
 * value means the caller didn't project the column and guessing
 * "person" would invent bands.
 */
export function paxBandCodeForUnit(unit: PaxBandUnitLike): CanonicalPaxBandCode | null {
  if (unit.unitType !== "person") return null
  const fromCode = bandCodeFromUnitCode(unit.code)
  if (fromCode) return fromCode
  if (unit.maxAge != null && unit.maxAge <= INFANT_MAX_AGE) return "infant"
  if (unit.maxAge != null && unit.maxAge <= CHILD_MAX_AGE) return "child"
  if (unit.minAge != null && unit.minAge >= SENIOR_MIN_AGE) return "senior"
  return "adult"
}

/**
 * Project a product option's units into the journey's occupancy bands.
 *
 * Every returned band is backed by a real `option_unit` (`unitId`), so
 * quantities, unit attribution and per-band prices all key off the same
 * row. Returns an empty array when the option has no person units —
 * callers then keep their own defaults.
 */
export function paxBandsFromOptionUnits(
  units: ReadonlyArray<PaxBandUnitLike>,
): ReadonlyArray<PaxBandSpec> {
  const bands: PaxBandSpec[] = []
  const seen = new Set<string>()
  for (const unit of units) {
    const code = paxBandCodeForUnit(unit)
    if (!code) continue
    // First unit in catalog order wins the band; a second `CHILD_*`
    // unit is dropped rather than silently replacing the first.
    if (seen.has(code)) continue
    seen.add(code)
    const label = unit.name?.trim() || BAND_FALLBACK_LABEL[code]
    const minCount = unit.isRequired === true ? Math.max(1, unit.minQuantity ?? 1) : 0
    const maxCount =
      unit.maxQuantity != null && unit.maxQuantity > 0
        ? unit.maxQuantity
        : BAND_DEFAULT_MAX_COUNT[code]
    bands.push({
      code,
      label,
      ...(unit.id ? { unitId: unit.id } : {}),
      ...(unit.code ? { unitCode: unit.code } : {}),
      ...(unit.minAge != null ? { minAge: unit.minAge } : {}),
      ...(unit.maxAge != null ? { maxAge: unit.maxAge } : {}),
      minCount,
      maxCount: Math.max(minCount, maxCount),
    })
  }
  return bands.sort((a, b) => paxBandOrder(a.code) - paxBandOrder(b.code))
}

function paxBandOrder(code: string): number {
  return BAND_ORDER[code as CanonicalPaxBandCode] ?? 9
}

/**
 * Attach `unitId` / `unitCode` to bands that were derived from another
 * source (e.g. Commerce pricing categories) by matching each band's
 * `code` against the option's units. Bands that don't resolve to a unit
 * are returned unchanged — pricing then falls back to its per-category
 * path instead of guessing a unit.
 */
export function withResolvedBandUnits(
  bands: ReadonlyArray<PaxBandSpec>,
  units: ReadonlyArray<PaxBandUnitLike>,
): ReadonlyArray<PaxBandSpec> {
  if (bands.length === 0 || units.length === 0) return bands
  const unitByCode = new Map<string, PaxBandUnitLike>()
  for (const unit of units) {
    const code = paxBandCodeForUnit(unit)
    if (!code || unitByCode.has(code)) continue
    unitByCode.set(code, unit)
  }
  if (unitByCode.size === 0) return bands
  return bands.map((band) => {
    if (band.unitId) return band
    const unit = unitByCode.get(band.code)
    if (!unit?.id) return band
    return {
      ...band,
      unitId: unit.id,
      ...(unit.code ? { unitCode: unit.code } : {}),
    }
  })
}

/**
 * Integer age in full years from an ISO `yyyy-mm-dd` date of birth.
 * Returns `null` for a missing, unparseable, or future birth date.
 */
export function ageYearsFromDateOfBirth(
  dateOfBirth: string | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!dateOfBirth) return null
  const birth = new Date(dateOfBirth)
  if (Number.isNaN(birth.getTime())) return null
  let age = now.getUTCFullYear() - birth.getUTCFullYear()
  const beforeBirthday =
    now.getUTCMonth() < birth.getUTCMonth() ||
    (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate())
  if (beforeBirthday) age -= 1
  return age >= 0 ? age : null
}

/**
 * Pick the band whose age window contains `age`. Bands carrying at
 * least one explicit bound are considered first (narrowest floor
 * first), so an unbounded catch-all band can't swallow every age.
 * Returns `null` when no band matches.
 */
export function paxBandForAge(
  bands: ReadonlyArray<PaxBandSpec>,
  age: number | null,
): PaxBandSpec | null {
  if (age == null || bands.length === 0) return null
  const bounded = bands
    .filter((band) => band.minAge != null || band.maxAge != null)
    .sort((a, b) => (a.minAge ?? 0) - (b.minAge ?? 0))
  const matches = (band: PaxBandSpec) =>
    (band.minAge == null || age >= band.minAge) && (band.maxAge == null || age <= band.maxAge)
  return bounded.find(matches) ?? null
}

/** Traveler fields the band derivation reads. */
export interface PaxBandTravelerLike {
  band?: string | null
  dateOfBirth?: string | null
}

/**
 * Resolve the band a traveler is billed as.
 *
 * Date of birth wins whenever it resolves to one of the product's
 * bands — the band is derivable, so an operator should never have to
 * type it (and a stale hand-picked band should never outrank a real
 * birthday). Falls back to the explicitly picked band, then to the
 * product's first band, then to `"adult"`.
 */
export function resolveTravelerBandCode(
  traveler: PaxBandTravelerLike,
  bands: ReadonlyArray<PaxBandSpec>,
  now: Date = new Date(),
): string {
  const fromDob = paxBandForAge(bands, ageYearsFromDateOfBirth(traveler.dateOfBirth, now))
  if (fromDob) return fromDob.code
  const declared = traveler.band?.trim()
  if (declared && bands.some((band) => band.code === declared)) return declared
  if (declared && bands.length === 0) return declared
  return bands[0]?.code ?? "adult"
}

/**
 * Count travelers per band using {@link resolveTravelerBandCode}.
 * Bands with no travelers are omitted.
 */
export function paxCountsFromTravelers(
  travelers: ReadonlyArray<PaxBandTravelerLike>,
  bands: ReadonlyArray<PaxBandSpec>,
  now: Date = new Date(),
): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const traveler of travelers) {
    const code = resolveTravelerBandCode(traveler, bands, now)
    counts[code] = (counts[code] ?? 0) + 1
  }
  return counts
}
