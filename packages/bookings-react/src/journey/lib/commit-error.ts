/**
 * Classifies a failed booking commit so the journey can render a
 * localized, actionable message instead of the server's raw English
 * `Error.message` (which for a capacity clash used to surface as a bare
 * `Internal Server Error`).
 *
 * The engine throws `VoyantApiError`-shaped errors that carry the HTTP
 * `status` plus the parsed JSON `body`. The no-availability arm is
 * *typed* by the server (a `code` plus the offending slot and its
 * remaining seats), but this classifier is deliberately defensive: it
 * probes every plausible nesting of `code` / `remainingPax`, and falls
 * back to matching the known English message text, so it degrades to a
 * sensible localized fallback rather than throwing when the server has
 * not shipped the typed error yet.
 */

/** Server codes that all mean "the slot ran out of seats". */
const NO_AVAILABILITY_CODES = new Set([
  "no_availability",
  "insufficient_capacity",
  "capacity_exhausted",
  "resource_capacity_exhausted",
  "slot_sold_out",
  "sold_out",
])

/** Legacy/untyped English messages for the same condition. */
const NO_AVAILABILITY_MESSAGE_PATTERN =
  /insufficient\s+(?:slot\s+)?capacity|no\s+availability|sold\s*out/i

export type CommitErrorKind = "no_availability" | "unknown"

export interface CommitErrorInfo {
  kind: CommitErrorKind
  /** Seats still bookable on the offending slot, when the server said. */
  remainingPax: number | null
  /** The offending slot's id, when the server said. */
  slotId: string | null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

/** Every object worth probing for `code` / `remainingPax`, breadth-first. */
function candidateScopes(error: unknown): Array<Record<string, unknown>> {
  const scopes: Array<Record<string, unknown>> = []
  const root = asRecord(error)
  if (root) scopes.push(root)
  const body = asRecord(root?.body)
  if (body) scopes.push(body)
  for (const container of [root, body]) {
    if (!container) continue
    for (const key of ["error", "details", "context", "data", "cause"]) {
      const nested = asRecord(container[key])
      if (nested) {
        scopes.push(nested)
        for (const innerKey of ["slot", "availability", "details", "upstreamPayload"]) {
          const inner = asRecord(nested[innerKey])
          if (inner) scopes.push(inner)
        }
      }
    }
    for (const key of ["slot", "availability"]) {
      const nested = asRecord(container[key])
      if (nested) scopes.push(nested)
    }
  }
  return scopes
}

function firstCode(scopes: Array<Record<string, unknown>>): string | null {
  for (const scope of scopes) {
    for (const key of ["code", "reason", "status", "kind"]) {
      const value = scope[key]
      if (typeof value === "string" && NO_AVAILABILITY_CODES.has(value)) return value
    }
  }
  return null
}

function firstNumber(
  scopes: Array<Record<string, unknown>>,
  keys: ReadonlyArray<string>,
): number | null {
  for (const scope of scopes) {
    for (const key of keys) {
      const value = scope[key]
      if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value
      // Some serializers stringify integers — accept a clean numeric string.
      if (typeof value === "string" && /^\d+$/.test(value)) return Number(value)
    }
  }
  return null
}

function firstString(
  scopes: Array<Record<string, unknown>>,
  keys: ReadonlyArray<string>,
): string | null {
  for (const scope of scopes) {
    for (const key of keys) {
      const value = scope[key]
      if (typeof value === "string" && value.trim()) return value.trim()
    }
  }
  return null
}

export function describeCommitError(error: unknown): CommitErrorInfo {
  if (!error) return { kind: "unknown", remainingPax: null, slotId: null }

  const scopes = candidateScopes(error)
  const message =
    error instanceof Error
      ? error.message
      : (firstString(scopes, ["message", "error"]) ?? String(error))

  const matchedCode = firstCode(scopes)
  const matchedMessage =
    typeof message === "string" && NO_AVAILABILITY_MESSAGE_PATTERN.test(message)

  if (!matchedCode && !matchedMessage) {
    return { kind: "unknown", remainingPax: null, slotId: null }
  }

  return {
    kind: "no_availability",
    remainingPax: firstNumber(scopes, [
      "remainingPax",
      "remaining_pax",
      "remaining",
      "remainingSeats",
      "availableSeats",
    ]),
    slotId: firstString(scopes, ["slotId", "slot_id", "availabilitySlotId"]),
  }
}
