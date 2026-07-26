import { describe, expect, it } from "vitest"

import {
  addDaysToDateLocal,
  deriveSlotDuration,
  FALLBACK_SLOT_START_TIME,
  normalizeLocalTime,
  pickStartTime,
  type SlotScope,
  type StartTimeCandidate,
  scoreStartTimeCandidate,
} from "../../../src/availability/slot-derivation.js"

/**
 * Pure derivation rules behind "a generated departure should be complete".
 *
 * Before this, `generateAvailabilitySlots` copied only capacity + timezone and
 * hardcoded 09:00, so every generated slot for a multi-day product landed with
 * no `endsAt` / `nights` / `days` and an operator had to hand-edit all of them.
 * The DB-backed wiring is covered by
 * `tests/availability/integration/rule-generate-slots.test.ts`.
 */

const PRODUCT_SCOPE: SlotScope = { optionId: null, facilityId: null }

function candidate(overrides: Partial<StartTimeCandidate> = {}): StartTimeCandidate {
  return {
    id: "avst_1",
    optionId: null,
    facilityId: null,
    startTimeLocal: "09:00",
    durationMinutes: null,
    ...overrides,
  }
}

describe("scoreStartTimeCandidate", () => {
  it("ranks option+facility above option above product+facility above product", () => {
    const scope: SlotScope = { optionId: "opt_1", facilityId: "fac_1" }

    expect(
      scoreStartTimeCandidate(candidate({ optionId: "opt_1", facilityId: "fac_1" }), scope),
    ).toBe(0)
    expect(scoreStartTimeCandidate(candidate({ optionId: "opt_1" }), scope)).toBe(1)
    expect(scoreStartTimeCandidate(candidate({ facilityId: "fac_1" }), scope)).toBe(2)
    expect(scoreStartTimeCandidate(candidate(), scope)).toBe(3)
  })

  it("never applies a start time scoped to another option", () => {
    expect(
      scoreStartTimeCandidate(candidate({ optionId: "opt_2" }), {
        optionId: "opt_1",
        facilityId: null,
      }),
    ).toBeNull()
  })

  it("never lets a product-level rule borrow an option-scoped start time", () => {
    expect(scoreStartTimeCandidate(candidate({ optionId: "opt_1" }), PRODUCT_SCOPE)).toBeNull()
  })

  it("never applies a start time scoped to another facility", () => {
    expect(
      scoreStartTimeCandidate(candidate({ facilityId: "fac_2" }), {
        optionId: null,
        facilityId: "fac_1",
      }),
    ).toBeNull()
    expect(scoreStartTimeCandidate(candidate({ facilityId: "fac_1" }), PRODUCT_SCOPE)).toBeNull()
  })
})

describe("pickStartTime", () => {
  it("returns null when the catalogue is empty", () => {
    expect(pickStartTime([], PRODUCT_SCOPE)).toBeNull()
  })

  it("keeps the caller's sortOrder/createdAt/id order within a tier", () => {
    const first = candidate({ id: "avst_a", startTimeLocal: "07:30" })
    const second = candidate({ id: "avst_b", startTimeLocal: "17:30" })

    expect(pickStartTime([first, second], PRODUCT_SCOPE)).toBe(first)
  })

  it("prefers the more specific scope even when it sorts later", () => {
    const productLevel = candidate({ id: "avst_a", startTimeLocal: "07:30" })
    const optionLevel = candidate({ id: "avst_b", optionId: "opt_1", startTimeLocal: "17:30" })

    expect(
      pickStartTime([productLevel, optionLevel], { optionId: "opt_1", facilityId: null }),
    ).toBe(optionLevel)
  })

  it("skips every candidate that does not apply", () => {
    const foreign = candidate({ id: "avst_a", optionId: "opt_2" })

    expect(pickStartTime([foreign], { optionId: "opt_1", facilityId: null })).toBeNull()
  })
})

describe("normalizeLocalTime", () => {
  it.each([
    ["09:00", "09:00"],
    ["9:00", "09:00"],
    ["17:30:00", "17:30"],
    [" 08:15 ", "08:15"],
  ])("normalizes %s to %s", (input, expected) => {
    expect(normalizeLocalTime(input, FALLBACK_SLOT_START_TIME)).toBe(expected)
  })

  it.each([
    [null],
    [undefined],
    [""],
    ["morning"],
    ["25:00"],
    ["09:61"],
  ])("falls back for %s", (input) => {
    expect(normalizeLocalTime(input as string | null | undefined, "09:00")).toBe("09:00")
  })
})

describe("addDaysToDateLocal", () => {
  it("crosses month and year boundaries", () => {
    expect(addDaysToDateLocal("2026-06-03", 11)).toBe("2026-06-14")
    expect(addDaysToDateLocal("2026-12-28", 11)).toBe("2027-01-08")
    expect(addDaysToDateLocal("2028-02-20", 11)).toBe("2028-03-02")
  })

  it("rejects a malformed date rather than silently drifting", () => {
    expect(() => addDaysToDateLocal("2026-6-3", 1)).toThrow(RangeError)
  })
})

describe("deriveSlotDuration", () => {
  const base = {
    dateLocal: "2026-06-03",
    startTime: "09:00",
    timezone: "Europe/Bucharest",
    startsAt: new Date("2026-06-03T06:00:00.000Z"),
    durationMinutes: null,
  }

  it("turns a 12-day itinerary into 11 nights and an end 11 days later", () => {
    const result = deriveSlotDuration({ ...base, itineraryDayCount: 12 })

    expect(result.days).toBe(12)
    expect(result.nights).toBe(11)
    // 09:00 local on 2026-06-14 in Europe/Bucharest (UTC+3 in summer).
    expect(result.endsAt?.toISOString()).toBe("2026-06-14T06:00:00.000Z")
  })

  it("leaves an unauthored itinerary alone rather than inventing a duration", () => {
    expect(deriveSlotDuration({ ...base, itineraryDayCount: 0 })).toEqual({
      endsAt: null,
      nights: null,
      days: null,
    })
  })

  it("leaves a single-day itinerary alone — there is no end time to derive", () => {
    expect(deriveSlotDuration({ ...base, itineraryDayCount: 1 })).toEqual({
      endsAt: null,
      nights: null,
      days: null,
    })
  })

  it("lets an explicit durationMinutes win over the itinerary-derived end", () => {
    const result = deriveSlotDuration({ ...base, itineraryDayCount: 12, durationMinutes: 180 })

    expect(result.endsAt?.toISOString()).toBe("2026-06-03T09:00:00.000Z")
    // The night/day counts still come from the itinerary — the start time only
    // expresses an end instant, not a trip length.
    expect(result).toMatchObject({ nights: 11, days: 12 })
  })

  it("applies durationMinutes even when the product has no itinerary", () => {
    const result = deriveSlotDuration({ ...base, itineraryDayCount: 0, durationMinutes: 1440 })

    expect(result.endsAt?.toISOString()).toBe("2026-06-04T06:00:00.000Z")
    expect(result).toMatchObject({ nights: null, days: null })
  })

  it("ignores a zero/negative durationMinutes and keeps the itinerary end", () => {
    const zero = deriveSlotDuration({ ...base, itineraryDayCount: 3, durationMinutes: 0 })

    expect(zero.endsAt?.toISOString()).toBe("2026-06-05T06:00:00.000Z")
    expect(zero).toMatchObject({ nights: 2, days: 3 })
  })

  it("keeps the local wall-clock end across a DST switch instead of drifting", () => {
    // Europe/Bucharest leaves DST on 2026-10-25: UTC+3 -> UTC+2.
    const result = deriveSlotDuration({
      dateLocal: "2026-10-21",
      startTime: "09:00",
      timezone: "Europe/Bucharest",
      startsAt: new Date("2026-10-21T06:00:00.000Z"),
      itineraryDayCount: 8,
      durationMinutes: null,
    })

    expect(result).toMatchObject({ nights: 7, days: 8 })
    // 09:00 local on 2026-10-28, now UTC+2 — a naive +7×24h would give 06:00Z.
    expect(result.endsAt?.toISOString()).toBe("2026-10-28T07:00:00.000Z")
  })

  it("falls back to fixed 24h arithmetic when the end wall-clock time is skipped by DST", () => {
    // America/Santiago springs forward at 00:00 local on 2026-09-06, so the
    // whole 00:00–00:59 hour is skipped and 00:30 does not exist that day.
    const result = deriveSlotDuration({
      dateLocal: "2026-09-04",
      startTime: "00:30",
      timezone: "America/Santiago",
      startsAt: new Date("2026-09-04T04:30:00.000Z"),
      itineraryDayCount: 3,
      durationMinutes: null,
    })

    expect(result).toMatchObject({ nights: 2, days: 3 })
    // startsAt + 2×24h — 01:30 local, the first instant the skipped hour maps to.
    expect(result.endsAt?.toISOString()).toBe("2026-09-06T04:30:00.000Z")
  })
})
