import { describe, expect, it } from "vitest"

import { ageFromDateOfBirth, bandForAge, deriveTravelerBands } from "./traveler-band.js"

const NOW = new Date("2026-07-26T00:00:00Z")

const BANDS = [
  { code: "adult", minAge: 18 },
  { code: "child", minAge: 2, maxAge: 17 },
  { code: "infant", maxAge: 1 },
]

describe("ageFromDateOfBirth", () => {
  it("counts whole years, not calendar-year differences", () => {
    expect(ageFromDateOfBirth("2008-07-26", NOW)).toBe(18)
    // Birthday one day away — still 17.
    expect(ageFromDateOfBirth("2008-07-27", NOW)).toBe(17)
  })

  it("returns NaN for an unparseable value", () => {
    expect(Number.isNaN(ageFromDateOfBirth("not-a-date", NOW))).toBe(true)
    expect(Number.isNaN(ageFromDateOfBirth(undefined, NOW))).toBe(true)
  })
})

describe("bandForAge", () => {
  it("picks the band whose window contains the age", () => {
    expect(bandForAge(30, BANDS)?.code).toBe("adult")
    expect(bandForAge(9, BANDS)?.code).toBe("child")
    expect(bandForAge(0, BANDS)?.code).toBe("infant")
  })

  it("returns null when nothing matches", () => {
    expect(bandForAge(Number.NaN, BANDS)).toBeNull()
  })
})

// Anything derivable must not be demanded of the operator: a traveler row that
// already carries a date of birth must not sit on the default 成人 band and
// quietly price as an adult.
describe("deriveTravelerBands", () => {
  it("derives the band from a date of birth instead of leaving the default", () => {
    const rows = [
      { band: "adult", dateOfBirth: "2019-03-01" },
      { band: "adult", dateOfBirth: "2025-12-01" },
      { band: "adult", dateOfBirth: "1990-01-01" },
    ]

    expect(deriveTravelerBands(rows, BANDS, NOW)).toEqual([
      { band: "child", dateOfBirth: "2019-03-01" },
      { band: "infant", dateOfBirth: "2025-12-01" },
      { band: "adult", dateOfBirth: "1990-01-01" },
    ])
  })

  it("never overwrites a band the operator picked by hand", () => {
    const rows = [{ band: "child", dateOfBirth: "1990-01-01" }]
    expect(deriveTravelerBands(rows, BANDS, NOW)).toEqual(rows)
  })

  it("leaves rows without a date of birth alone", () => {
    const rows = [{ band: "adult" }]
    expect(deriveTravelerBands(rows, BANDS, NOW)).toBe(rows)
  })

  it("returns the same reference when nothing changes, so state stays stable", () => {
    const rows = [{ band: "adult", dateOfBirth: "1990-01-01" }]
    expect(deriveTravelerBands(rows, BANDS, NOW)).toBe(rows)
  })

  it("does nothing when no band declares an age window", () => {
    const rows = [{ band: "adult", dateOfBirth: "2019-03-01" }]
    expect(deriveTravelerBands(rows, [{ code: "adult" }, { code: "child" }], NOW)).toBe(rows)
  })
})
