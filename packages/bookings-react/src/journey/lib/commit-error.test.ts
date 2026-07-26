import { describe, expect, it } from "vitest"

import { describeCommitError } from "./commit-error.js"

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message)
  }
}

// The journey used to print `commit.error.message` verbatim, so a sold-out
// departure surfaced as a bare English `Internal Server Error` under the form.
describe("describeCommitError", () => {
  it("reads the typed no-availability error the server ships", () => {
    const error = new ApiError("Internal Server Error", 409, {
      code: "no_availability",
      details: { slotId: "slot-1", remainingPax: 2 },
    })

    expect(describeCommitError(error)).toEqual({
      kind: "no_availability",
      remainingPax: 2,
      slotId: "slot-1",
    })
  })

  it("accepts the legacy nested shape and the insufficient_capacity code", () => {
    const error = new ApiError("Request failed", 409, {
      error: { code: "insufficient_capacity", slot: { slotId: "slot-9", remainingPax: 0 } },
    })

    expect(describeCommitError(error)).toEqual({
      kind: "no_availability",
      remainingPax: 0,
      slotId: "slot-9",
    })
  })

  // Degrades gracefully while the server still returns the untyped message.
  it("falls back to matching the English message when no code is present", () => {
    const error = new ApiError("Insufficient slot capacity", 409, {
      error: "Insufficient slot capacity",
    })

    expect(describeCommitError(error)).toEqual({
      kind: "no_availability",
      remainingPax: null,
      slotId: null,
    })
  })

  it("classifies everything else as unknown so the UI shows its own fallback", () => {
    expect(describeCommitError(new ApiError("Internal Server Error", 500, undefined))).toEqual({
      kind: "unknown",
      remainingPax: null,
      slotId: null,
    })
    expect(describeCommitError(null)).toEqual({
      kind: "unknown",
      remainingPax: null,
      slotId: null,
    })
    expect(describeCommitError("boom")).toEqual({
      kind: "unknown",
      remainingPax: null,
      slotId: null,
    })
  })
})
