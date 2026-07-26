import { describe, expect, it } from "vitest"

import {
  ageYearsFromDateOfBirth,
  paxBandCodeForUnit,
  paxBandForAge,
  paxBandsFromOptionUnits,
  paxCountsFromTravelers,
  resolveTravelerBandCode,
  withResolvedBandUnits,
} from "./pax-bands.js"

// The zh-CN catalog shape the end-to-end audit ran against: one option
// with an adult unit and a child ("不占床") unit, each with its own
// price. Labels are Chinese on purpose — band resolution must never
// key off them.
const zhUnits = [
  {
    id: "ount_adult",
    code: "ADULT",
    name: "成人",
    unitType: "person",
    minAge: 12,
    maxAge: null,
    isRequired: true,
  },
  {
    id: "ount_child",
    code: "CHILD",
    name: "儿童(不占床)",
    unitType: "person",
    minAge: 2,
    maxAge: 11,
    isRequired: false,
  },
]

describe("paxBandCodeForUnit", () => {
  it("resolves from the unit code, not the localized name", () => {
    expect(paxBandCodeForUnit(zhUnits[0]!)).toBe("adult")
    expect(paxBandCodeForUnit(zhUnits[1]!)).toBe("child")
  })

  it("reduces suffixed codes to their band", () => {
    expect(paxBandCodeForUnit({ code: "child_6_12", unitType: "person" })).toBe("child")
    expect(paxBandCodeForUnit({ code: "CHILD-2-11", unitType: "person" })).toBe("child")
    expect(paxBandCodeForUnit({ code: "INFANT_0_1", unitType: "person" })).toBe("infant")
    expect(paxBandCodeForUnit({ code: "SENIOR65", unitType: "person" })).toBe("senior")
  })

  it("falls back to the age window when the code carries no band token", () => {
    expect(paxBandCodeForUnit({ code: "STD", unitType: "person", maxAge: 1 })).toBe("infant")
    expect(paxBandCodeForUnit({ code: null, unitType: "person", maxAge: 11 })).toBe("child")
    expect(paxBandCodeForUnit({ unitType: "person", minAge: 65 })).toBe("senior")
    expect(paxBandCodeForUnit({ unitType: "person" })).toBe("adult")
  })

  it("ignores non-person units", () => {
    expect(paxBandCodeForUnit({ code: "ADULT", unitType: "room" })).toBeNull()
    expect(paxBandCodeForUnit({ code: "ADULT", unitType: "vehicle" })).toBeNull()
    // Unset unitType means the column wasn't projected — don't invent a band.
    expect(paxBandCodeForUnit({ code: "ADULT" })).toBeNull()
  })
})

describe("paxBandsFromOptionUnits", () => {
  it("projects person units into unit-backed bands keeping the operator's labels", () => {
    const bands = paxBandsFromOptionUnits(zhUnits)
    expect(bands).toEqual([
      {
        code: "adult",
        label: "成人",
        unitId: "ount_adult",
        unitCode: "ADULT",
        minAge: 12,
        minCount: 1,
        maxCount: 8,
      },
      {
        code: "child",
        label: "儿童(不占床)",
        unitId: "ount_child",
        unitCode: "CHILD",
        minAge: 2,
        maxAge: 11,
        minCount: 0,
        maxCount: 6,
      },
    ])
  })

  it("offers only the bands the product actually has a unit for", () => {
    const bands = paxBandsFromOptionUnits([zhUnits[0]!])
    expect(bands.map((band) => band.code)).toEqual(["adult"])
  })

  it("drops inventory units and returns nothing when no person unit exists", () => {
    expect(
      paxBandsFromOptionUnits([{ id: "ount_dbl", name: "DBL", unitType: "room" }]),
    ).toHaveLength(0)
  })

  it("keeps the first unit when two resolve to the same band", () => {
    const bands = paxBandsFromOptionUnits([
      { id: "u1", code: "CHILD_2_5", name: "幼儿", unitType: "person", minAge: 2, maxAge: 5 },
      { id: "u2", code: "CHILD_6_11", name: "儿童", unitType: "person", minAge: 6, maxAge: 11 },
    ])
    expect(bands).toHaveLength(1)
    expect(bands[0]?.unitId).toBe("u1")
  })
})

describe("withResolvedBandUnits", () => {
  it("attaches unit ids to bands derived from another source", () => {
    const resolved = withResolvedBandUnits(
      [
        { code: "adult", label: "Adult", minCount: 1, maxCount: 8 },
        { code: "child", label: "Child", minCount: 0, maxCount: 6 },
        { code: "infant", label: "Infant", minCount: 0, maxCount: 4 },
      ],
      zhUnits,
    )
    expect(resolved.map((band) => band.unitId)).toEqual(["ount_adult", "ount_child", undefined])
  })
})

describe("ageYearsFromDateOfBirth / paxBandForAge", () => {
  const now = new Date("2026-07-26T00:00:00Z")

  it("computes whole years and rejects unusable input", () => {
    expect(ageYearsFromDateOfBirth("1990-01-01", now)).toBe(36)
    expect(ageYearsFromDateOfBirth("1990-12-31", now)).toBe(35)
    expect(ageYearsFromDateOfBirth(null, now)).toBeNull()
    expect(ageYearsFromDateOfBirth("not-a-date", now)).toBeNull()
    expect(ageYearsFromDateOfBirth("2030-01-01", now)).toBeNull()
  })

  it("matches an age against the product's own age windows", () => {
    const bands = paxBandsFromOptionUnits(zhUnits)
    expect(paxBandForAge(bands, 30)?.code).toBe("adult")
    expect(paxBandForAge(bands, 8)?.code).toBe("child")
    // Under 2 — the product has no infant unit, so no band matches.
    expect(paxBandForAge(bands, 1)).toBeNull()
    expect(paxBandForAge(bands, null)).toBeNull()
  })
})

describe("resolveTravelerBandCode", () => {
  const bands = paxBandsFromOptionUnits(zhUnits)
  const now = new Date("2026-07-26T00:00:00Z")

  it("derives the band from date of birth instead of the typed value", () => {
    expect(resolveTravelerBandCode({ band: "adult", dateOfBirth: "2018-03-04" }, bands, now)).toBe(
      "child",
    )
  })

  it("keeps the picked band when no date of birth is present", () => {
    expect(resolveTravelerBandCode({ band: "child" }, bands, now)).toBe("child")
  })

  it("falls back to the first offered band for an unknown code", () => {
    expect(resolveTravelerBandCode({ band: "infant" }, bands, now)).toBe("adult")
  })

  it("counts a mixed party per band", () => {
    expect(
      paxCountsFromTravelers(
        [{ band: "adult" }, { band: "adult" }, { dateOfBirth: "2018-03-04" }],
        bands,
        now,
      ),
    ).toEqual({ adult: 2, child: 1 })
  })
})
