import { OpenAPIHono } from "@hono/zod-openapi"
import { openApiValidationHook } from "@voyant-travel/hono"
import { Hono } from "hono"

import { availabilityAllocationRoutes } from "./routes-allocation.js"
import { availabilityCoreRoutes } from "./routes-core.js"
import { availabilityHoldRoutes } from "./routes-holds.js"
import { availabilityPickupRoutes } from "./routes-pickups.js"
import type { Env } from "./routes-shared.js"

// Legacy `/v1/operations/availability/*` surface (operator React clients still
// hit these paths). Plain `Hono` is fine here — it mounts the core OpenAPIHono
// sub-app for runtime routing, but this legacy `/v1/*` surface is intentionally
// excluded from the published OpenAPI docs (see hono `selectSurface`).
export const availabilityRoutes = new Hono<Env>()
availabilityRoutes.route("/", availabilityCoreRoutes)
availabilityRoutes.route("/", availabilityPickupRoutes)

// Admin surface (`/v1/admin/operations/availability/*`). `OpenAPIHono` so the
// composed framework app picks up the `.openapi()` operations for
// `framework-admin.json`. The same `availabilityCoreRoutes` instance is mounted
// here (in addition to the legacy surface) so its dashboard + CRUD operations
// are documented under `/v1/admin/operations/availability/*` alongside the
// allocation and pickup routes.
export const availabilityAdminRoutes = new OpenAPIHono<Env>({
  defaultHook: openApiValidationHook,
})
  .route("/", availabilityCoreRoutes)
  .route("/", availabilityAllocationRoutes)
  .route("/", availabilityPickupRoutes)
  // Soft-hold inspection + on-demand expiry sweep.
  .route("/", availabilityHoldRoutes)

export type AvailabilityRoutes = typeof availabilityRoutes
export type AvailabilityAdminRoutes = typeof availabilityAdminRoutes
