import { handleApiError } from "@voyant-travel/hono"
import { Hono } from "hono"
import { afterEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

import { availabilityAdminRoutes } from "../../../src/availability/routes.js"
import { availabilityService } from "../../../src/availability/service.js"
import { generateRuleSlotsSchema } from "../../../src/availability/validation.js"

/**
 * Route contract for `POST /rules/{id}/generate-slots` (the runtime entry point
 * that finally makes availability rules produce departures).
 *
 * The service is stubbed here so the test isolates the HTTP contract —
 * validation, the 404 mapping, the response envelope, and the horizon
 * pass-through. The service's own behaviour (idempotency, capacity/timezone
 * inheritance, inactive rules) is covered by the DB-backed integration suite in
 * `tests/availability/integration/rule-generate-slots.test.ts`.
 */

const RULE_ID = "availability_rules_00000000000000000000"

// The declared 200 response schema from `routes-core.ts`.
const generateSlotsResponseSchema = z.object({
  data: z.object({
    created: z.number().int(),
    skipped: z.number().int(),
    horizonDays: z.number().int(),
  }),
})

function createApp() {
  const app = new Hono()
  app.use("*", async (c, next) => {
    c.set("db" as never, {} as never)
    await next()
  })
  app.onError((err, c) => handleApiError(err, c))
  app.route("/", availabilityAdminRoutes)
  return app
}

const json = (body: unknown) => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("POST /rules/{id}/generate-slots", () => {
  it("defaults to a 90-day horizon when no body is sent", async () => {
    const spy = vi
      .spyOn(availabilityService, "generateSlotsForRule")
      .mockResolvedValue({ created: 13, skipped: 0, horizonDays: 90 })

    const res = await createApp().request(`/rules/${RULE_ID}/generate-slots`, { method: "POST" })

    expect(res.status).toBe(200)
    expect(generateSlotsResponseSchema.parse(await res.json())).toEqual({
      data: { created: 13, skipped: 0, horizonDays: 90 },
    })
    expect(spy).toHaveBeenCalledWith(expect.anything(), RULE_ID, {})
  })

  it("accepts an empty JSON body as 'use the default horizon'", async () => {
    const spy = vi
      .spyOn(availabilityService, "generateSlotsForRule")
      .mockResolvedValue({ created: 0, skipped: 13, horizonDays: 90 })

    const res = await createApp().request(`/rules/${RULE_ID}/generate-slots`, json({}))

    expect(res.status).toBe(200)
    expect(spy).toHaveBeenCalledWith(expect.anything(), RULE_ID, {})
  })

  it("passes a custom horizon through to the service", async () => {
    const spy = vi
      .spyOn(availabilityService, "generateSlotsForRule")
      .mockResolvedValue({ created: 52, skipped: 0, horizonDays: 365 })

    const res = await createApp().request(
      `/rules/${RULE_ID}/generate-slots`,
      json({ horizonDays: 365 }),
    )

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ data: { created: 52, skipped: 0, horizonDays: 365 } })
    expect(spy).toHaveBeenCalledWith(expect.anything(), RULE_ID, { horizonDays: 365 })
  })

  it.each([
    ["below the minimum", 0],
    ["negative", -7],
    ["above the maximum", 366],
    ["fractional", 30.5],
  ])("rejects a horizonDays that is %s", async (_label, horizonDays) => {
    const spy = vi.spyOn(availabilityService, "generateSlotsForRule")

    const res = await createApp().request(`/rules/${RULE_ID}/generate-slots`, json({ horizonDays }))

    expect(res.status).toBe(400)
    expect(spy).not.toHaveBeenCalled()
  })

  it("rejects a non-numeric horizonDays instead of coercing it", async () => {
    const res = await createApp().request(
      `/rules/${RULE_ID}/generate-slots`,
      json({ horizonDays: "90" }),
    )

    expect(res.status).toBe(400)
  })

  it("returns 404 with the package error shape when the rule does not exist", async () => {
    vi.spyOn(availabilityService, "generateSlotsForRule").mockResolvedValue(null)

    const res = await createApp().request(`/rules/${RULE_ID}/generate-slots`, json({}))

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: "Availability rule not found" })
  })

  it("reports an inactive rule as a no-op rather than an error", async () => {
    vi.spyOn(availabilityService, "generateSlotsForRule").mockResolvedValue({
      created: 0,
      skipped: 0,
      horizonDays: 90,
    })

    const res = await createApp().request(`/rules/${RULE_ID}/generate-slots`, json({}))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ data: { created: 0, skipped: 0, horizonDays: 90 } })
  })
})

describe("generateRuleSlotsSchema", () => {
  it("leaves horizonDays absent so the service default applies", () => {
    expect(generateRuleSlotsSchema.parse({})).toEqual({})
  })

  it("accepts the inclusive bounds", () => {
    expect(generateRuleSlotsSchema.parse({ horizonDays: 1 })).toEqual({ horizonDays: 1 })
    expect(generateRuleSlotsSchema.parse({ horizonDays: 365 })).toEqual({ horizonDays: 365 })
  })

  it("rejects out-of-range horizons rather than silently clamping them", () => {
    expect(generateRuleSlotsSchema.safeParse({ horizonDays: 0 }).success).toBe(false)
    expect(generateRuleSlotsSchema.safeParse({ horizonDays: 366 }).success).toBe(false)
  })
})
