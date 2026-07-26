/**
 * Deriving a traveler's pax band from their date of birth.
 *
 * Product principle: anything derivable must not be demanded of the user.
 * A row that already carries a date of birth tells us exactly which band it
 * belongs to, so it must not sit on the default (成人 / Adult) and quietly
 * price as an adult.
 */

/** Whole years between `iso` and today, or `null` when unparseable. */
export function ageFromDateOfBirth(iso: string | null | undefined, now: Date = new Date()): number {
  const dob = iso ? new Date(iso) : null
  if (!dob || Number.isNaN(dob.getTime())) return Number.NaN
  let age = now.getFullYear() - dob.getFullYear()
  const monthDelta = now.getMonth() - dob.getMonth()
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < dob.getDate())) age -= 1
  return age
}

export interface AgeBand {
  code: string
  minAge?: number
  maxAge?: number
}

/** First band whose age window contains `age`, or `null`. */
export function bandForAge(age: number, bands: ReadonlyArray<AgeBand>): AgeBand | null {
  if (!Number.isFinite(age)) return null
  return (
    bands.find((band) => {
      if (band.minAge != null && age < band.minAge) return false
      if (band.maxAge != null && age > band.maxAge) return false
      return true
    }) ?? null
  )
}

interface BandedTraveler {
  band: string
  dateOfBirth?: string
}

/**
 * Re-derives each row's band from its own date of birth.
 *
 * Only rows still sitting on the DEFAULT band (the descriptor's first band,
 * conventionally `adult`) are touched — a band the operator picked by hand
 * is never overwritten, and neither is a row without a date of birth. Bands
 * without an age window (`minAge`/`maxAge` both unset) can't be derived, so
 * those rows are left alone too.
 *
 * Returns the same array reference when nothing changes, so callers can use
 * it inside a state update without forcing a re-render.
 */
export function deriveTravelerBands<T extends BandedTraveler>(
  travelers: ReadonlyArray<T>,
  bands: ReadonlyArray<AgeBand>,
  now: Date = new Date(),
): ReadonlyArray<T> {
  const defaultBand = bands[0]?.code
  if (!defaultBand) return travelers
  // Nothing to derive from when no band declares an age window.
  if (!bands.some((band) => band.minAge != null || band.maxAge != null)) return travelers

  let changed = false
  const next = travelers.map((traveler) => {
    if (traveler.band !== defaultBand || !traveler.dateOfBirth) return traveler
    const derived = bandForAge(ageFromDateOfBirth(traveler.dateOfBirth, now), bands)
    if (!derived || derived.code === traveler.band) return traveler
    changed = true
    return { ...traveler, band: derived.code }
  })
  return changed ? next : travelers
}
