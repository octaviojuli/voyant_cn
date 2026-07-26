/**
 * Availability soft-hold admin routes — the operator-facing surface over
 * `service-holds.ts`. Mounted under `/v1/admin/operations/availability/*`
 * (see `availability/routes.ts`).
 *
 * Why this exists: holds silently decrement `availability_slots.remainingPax`
 * for the lifetime of a booking-journey draft. Before these routes an operator
 * staring at a departure that had dropped from 6 seats to 0 had no way to see
 * which drafts were withholding the seats, and no way to reclaim them — the
 * expiry helper existed but nothing in a Node deployment ever called it (this
 * repo declares scheduled jobs in the deployment graph and expects an external
 * scheduler; the operator profile ships `scheduledJobs: "none"`).
 *
 * `placeAvailabilityHold` now sweeps its own slot on every attempt, so slots
 * self-heal under normal traffic. These routes are the explicit escape hatch:
 * inspect live holds, and force a global sweep on demand.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi"
import { openApiValidationHook } from "@voyant-travel/hono"

import type { Env } from "./routes-shared.js"
import {
  listLiveAvailabilityHolds,
  releaseExpiredHolds,
  releaseExpiredHoldsForSlots,
} from "./service-holds.js"

const errorResponseSchema = z.object({ error: z.string() })

// §17: timestamps serialize to ISO strings on the wire.
const availabilityHoldSchema = z.object({
  id: z.string(),
  draftId: z.string(),
  holdToken: z.string(),
  productId: z.string(),
  slotId: z.string(),
  paxCount: z.number(),
  expiresAt: z.string(),
  releasedAt: z.string().nullable(),
  convertedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const listHoldsQuerySchema = z.object({
  slotId: z.string().optional(),
  expiredOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
  limit: z.coerce.number().int().min(1).max(500).optional(),
})

const releaseExpiredBodySchema = z
  .object({
    /**
     * Release holds that expired before this instant instead of "now".
     * Lets an operator reclaim only holds that have been stale for a
     * while rather than every just-expired one.
     */
    before: z.string().datetime().optional(),
    /** Restrict the sweep to specific slots. Omit to sweep globally. */
    slotIds: z.array(z.string()).min(1).max(200).optional(),
  })
  .optional()

const releaseExpiredResultSchema = z.object({
  data: z.object({
    released: z.number(),
    cutoff: z.string(),
    scope: z.enum(["global", "slots"]),
  }),
})

const listHoldsRoute = createRoute({
  method: "get",
  path: "/holds",
  request: { query: listHoldsQuerySchema },
  responses: {
    200: {
      description: "Live (unreleased, unconverted) availability holds",
      content: {
        "application/json": { schema: z.object({ data: z.array(availabilityHoldSchema) }) },
      },
    },
    400: {
      description: "invalid_request: query failed validation",
      content: { "application/json": { schema: errorResponseSchema } },
    },
  },
})

const releaseExpiredRoute = createRoute({
  method: "post",
  path: "/holds/release-expired",
  request: {
    body: {
      required: false,
      content: { "application/json": { schema: releaseExpiredBodySchema } },
    },
  },
  responses: {
    200: {
      description: "Expired-hold sweep result",
      content: { "application/json": { schema: releaseExpiredResultSchema } },
    },
    400: {
      description: "invalid_request: request body failed validation",
      content: { "application/json": { schema: errorResponseSchema } },
    },
  },
})

export const availabilityHoldRoutes = new OpenAPIHono<Env>({
  defaultHook: openApiValidationHook,
})
  .openapi(listHoldsRoute, async (c) => {
    const query = c.req.valid("query")
    const rows = await listLiveAvailabilityHolds(c.get("db"), {
      slotId: query.slotId,
      expiredOnly: query.expiredOnly,
      limit: query.limit,
    })
    return c.json({ data: rows }, 200)
  })
  .openapi(releaseExpiredRoute, async (c) => {
    const body = c.req.valid("json") ?? {}
    const cutoff = body.before ? new Date(body.before) : new Date()
    const released = body.slotIds
      ? await releaseExpiredHoldsForSlots(c.get("db"), body.slotIds, cutoff)
      : await releaseExpiredHolds(c.get("db"), cutoff)

    return c.json(
      {
        data: {
          released,
          cutoff: cutoff.toISOString(),
          scope: body.slotIds ? ("slots" as const) : ("global" as const),
        },
      },
      200,
    )
  })

export type AvailabilityHoldRoutes = typeof availabilityHoldRoutes
