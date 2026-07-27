/**
 * Operator settings HTTP routes — the admin/public CRUD surface over the
 * settings service. Absolute paths (kept stable from the prior deployment-local
 * routes): `/v1/admin/settings/*`, `/v1/public/operator-profile`,
 * `/v1/public/settings/operator`.
 *
 * Migrated to `@hono/zod-openapi` for the OpenAPI admin backfill (voyant#2114 —
 * operator-settings batch). The legs are authored as `createRoute(...).openapi(...)`
 * on a child `OpenAPIHono<Env>` chain (carrying the shared `openApiValidationHook`),
 * composed onto the supplied mount target via `.route("/", child)`. The module is
 * mounted lazily (see `api-runtime.ts`), which builds an `OpenAPIHono` so the
 * build-time `mergeLazyOpenApiPaths` replay reads these `.openapi()` operations
 * and surfaces them in the operator spec.
 *
 * PATCH legs reuse the package's existing `update*Schema` validation as the
 * request body and read the validated patch via `c.req.valid("json")` (the child
 * chain's `defaultHook` shapes invalid input). Response row schemas are authored
 * here from the Drizzle `$inferSelect` shapes (§17: timestamps → ISO strings;
 * opaque jsonb payment-policy blobs are pass-throughs). Single-row readers return
 * `null` when unset, so every `{ data }` envelope is nullable. Business logic is
 * unchanged.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi"
import { openApiValidationHook } from "@voyant-travel/hono"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"
import type { Context, Hono } from "hono"

import {
  getOperatorPaymentDefaults,
  getOperatorPaymentInstructions,
  getOperatorProfile,
  getOperatorSettings,
  getRouteImportSettings,
  resolveRouteImportDefaults,
  toPublicOperatorProfile,
  toPublicOperatorSettings,
  updateOperatorPaymentDefaultsSchema,
  updateOperatorPaymentInstructionsSchema,
  updateOperatorProfileSchema,
  updateOperatorSettingsSchema,
  updateRouteImportSettingsSchema,
  upsertOperatorPaymentDefaults,
  upsertOperatorPaymentInstructions,
  upsertOperatorProfile,
  upsertOperatorSettings,
  upsertRouteImportSettings,
} from "./service.js"

type Env = { Variables: { db: PostgresJsDatabase } }

/**
 * Structural mount target — just the `.route()` surface this function uses.
 * Decoupled from Hono's full generic signature so the lazy loader can pass its
 * `OpenAPIHono` instance without coupling to its Env/Schema/BasePath params.
 */
export interface OpenApiMountTarget {
  // biome-ignore lint/suspicious/noExplicitAny: intentional — accept any Env-typed sub-app; the mount only composes routes (voyant#2114)
  route(path: string, app: Hono<any, any, any>): unknown
}

const PUBLIC_OPERATOR_SETTINGS_CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=600"

function cachePublicOperatorSettings(c: Context) {
  c.header("Cache-Control", PUBLIC_OPERATOR_SETTINGS_CACHE_CONTROL)
}

// ──────────────────────────────────────────────────────────────────
// Response schemas (Drizzle `$inferSelect` → wire shapes)
// ──────────────────────────────────────────────────────────────────

const isoTimestamp = z.string()
/** Opaque jsonb payment-policy blob (mirrors finance `PaymentPolicy`). */
const opaqueJson = z.unknown().nullable()

/** `operator_profile` row. All identity/contact columns are nullable text. */
const operatorProfileRowSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  legalName: z.string().nullable(),
  vatId: z.string().nullable(),
  registrationNumber: z.string().nullable(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  website: z.string().nullable(),
  license: z.string().nullable(),
  licenseAuthority: z.string().nullable(),
  signatoryName: z.string().nullable(),
  signatoryRole: z.string().nullable(),
  createdAt: isoTimestamp,
  updatedAt: isoTimestamp,
})

/** `operator_payment_instructions` row. */
const operatorPaymentInstructionsRowSchema = z.object({
  id: z.string(),
  bankTransferBeneficiary: z.string().nullable(),
  iban: z.string().nullable(),
  bank: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: isoTimestamp,
  updatedAt: isoTimestamp,
})

/** `operator_payment_defaults` row. */
const operatorPaymentDefaultsRowSchema = z.object({
  id: z.string(),
  customerPaymentPolicy: opaqueJson,
  bookingCheckoutUrlTemplate: z.string().nullable(),
  invoicePayUrlTemplate: z.string().nullable(),
  createdAt: isoTimestamp,
  updatedAt: isoTimestamp,
})

/** `route_import_settings` row. */
const routeImportSettingsRowSchema = z.object({
  id: z.string(),
  sellCurrency: z.string().nullable(),
  timezone: z.string().nullable(),
  productTypeId: z.string().nullable(),
  defaultSupplierId: z.string().nullable(),
  adultMinAge: z.number().nullable(),
  childMinAge: z.number().nullable(),
  createdAt: isoTimestamp,
  updatedAt: isoTimestamp,
})

/**
 * 助手实际会用的一组值:设置优先,缺项落到兜底。界面直接显示这个,
 * 免得人对着一堆空值猜「那到底会用什么」。
 */
const routeImportDefaultsSchema = z.object({
  sellCurrency: z.string(),
  timezone: z.string(),
  productTypeId: z.string().nullable(),
  defaultSupplierId: z.string().nullable(),
  adultMinAge: z.number(),
  childMinAge: z.number(),
})

/**
 * Combined settings — `getOperatorSettings` spreads the profile row and folds in
 * the instruction + defaults columns (or returns `null` when nothing is set).
 * Profile fields are optional because the spread is empty when no profile row
 * exists yet.
 */
const combinedOperatorSettingsSchema = operatorProfileRowSchema.partial().extend({
  bankTransferBeneficiary: z.string().nullable(),
  iban: z.string().nullable(),
  bank: z.string().nullable(),
  notes: z.string().nullable(),
  customerPaymentPolicy: opaqueJson,
  bookingCheckoutUrlTemplate: z.string().nullable(),
  invoicePayUrlTemplate: z.string().nullable(),
})

/** Public projection — `toPublicOperatorProfile` / `toPublicOperatorSettings`. */
const publicOperatorProfileSchema = z.object({
  name: z.string(),
  legalName: z.string(),
  address: z.string(),
  phone: z.string(),
  email: z.string(),
  website: z.string(),
  license: z.string(),
  licenseAuthority: z.string(),
  customerPaymentPolicy: opaqueJson,
  bookingCheckoutUrlTemplate: z.string().nullable(),
  invoicePayUrlTemplate: z.string().nullable(),
})

function dataEnvelope<T extends z.ZodTypeAny>(schema: T) {
  return z.object({ data: schema })
}

const jsonContent = <T extends z.ZodTypeAny>(schema: T, description: string) => ({
  description,
  content: { "application/json": { schema } },
})

const jsonBody = <T extends z.ZodTypeAny>(schema: T) => ({
  required: true,
  content: { "application/json": { schema } },
})

/**
 * Bridges a handler's `{ data: Row | null }` payload (Date-bearing Drizzle rows
 * whose wire shape is the declared `z.string()` timestamp) to the `.openapi()`
 * inferred typed-response union. Runtime payloads honor the declared schemas
 * (asserted by the contract tests); this only relaxes the compile-time check.
 */
// biome-ignore lint/suspicious/noExplicitAny: intentional — bridges Date-bearing rows to the inferred typed-response union (voyant#2114)
function asRouteResponse(response: Promise<Response>): Promise<any> {
  return response
}

// ──────────────────────────────────────────────────────────────────
// Route definitions
// ──────────────────────────────────────────────────────────────────

const getOperatorProfileRoute = createRoute({
  method: "get",
  path: "/v1/admin/settings/operator-profile",
  responses: {
    200: jsonContent(dataEnvelope(operatorProfileRowSchema.nullable()), "The operator profile"),
  },
})

const patchOperatorProfileRoute = createRoute({
  method: "patch",
  path: "/v1/admin/settings/operator-profile",
  request: { body: jsonBody(updateOperatorProfileSchema) },
  responses: {
    200: jsonContent(
      dataEnvelope(operatorProfileRowSchema.nullable()),
      "The updated operator profile",
    ),
  },
})

const getOperatorPaymentInstructionsRoute = createRoute({
  method: "get",
  path: "/v1/admin/settings/operator-payment-instructions",
  responses: {
    200: jsonContent(
      dataEnvelope(operatorPaymentInstructionsRowSchema.nullable()),
      "The operator payment instructions",
    ),
  },
})

const patchOperatorPaymentInstructionsRoute = createRoute({
  method: "patch",
  path: "/v1/admin/settings/operator-payment-instructions",
  request: { body: jsonBody(updateOperatorPaymentInstructionsSchema) },
  responses: {
    200: jsonContent(
      dataEnvelope(operatorPaymentInstructionsRowSchema.nullable()),
      "The updated operator payment instructions",
    ),
  },
})

const getOperatorPaymentDefaultsRoute = createRoute({
  method: "get",
  path: "/v1/admin/settings/operator-payment-defaults",
  responses: {
    200: jsonContent(
      dataEnvelope(operatorPaymentDefaultsRowSchema.nullable()),
      "The operator payment defaults",
    ),
  },
})

const patchOperatorPaymentDefaultsRoute = createRoute({
  method: "patch",
  path: "/v1/admin/settings/operator-payment-defaults",
  request: { body: jsonBody(updateOperatorPaymentDefaultsSchema) },
  responses: {
    200: jsonContent(
      dataEnvelope(operatorPaymentDefaultsRowSchema.nullable()),
      "The updated operator payment defaults",
    ),
  },
})

const getRouteImportSettingsRoute = createRoute({
  method: "get",
  path: "/v1/admin/settings/route-import",
  responses: {
    200: jsonContent(
      z.object({
        data: routeImportSettingsRowSchema.nullable(),
        resolved: routeImportDefaultsSchema,
      }),
      "线路上线助理的默认值,以及实际会用的一组解析结果",
    ),
  },
})

const patchRouteImportSettingsRoute = createRoute({
  method: "patch",
  path: "/v1/admin/settings/route-import",
  request: { body: jsonBody(updateRouteImportSettingsSchema) },
  responses: {
    200: jsonContent(
      z.object({
        data: routeImportSettingsRowSchema.nullable(),
        resolved: routeImportDefaultsSchema,
      }),
      "保存后的默认值",
    ),
  },
})

const getPublicOperatorProfileRoute = createRoute({
  "x-voyant-api-id": "@voyant-travel/operator-settings#api.public.operator-profile",
  method: "get",
  path: "/v1/public/operator-profile",
  responses: {
    200: jsonContent(
      dataEnvelope(publicOperatorProfileSchema.nullable()),
      "The public operator profile (null when unset)",
    ),
  },
})

const getOperatorSettingsRoute = createRoute({
  method: "get",
  path: "/v1/admin/settings/operator",
  responses: {
    200: jsonContent(
      dataEnvelope(combinedOperatorSettingsSchema.nullable()),
      "The combined operator settings",
    ),
  },
})

const patchOperatorSettingsRoute = createRoute({
  method: "patch",
  path: "/v1/admin/settings/operator",
  request: { body: jsonBody(updateOperatorSettingsSchema) },
  responses: {
    200: jsonContent(
      dataEnvelope(combinedOperatorSettingsSchema.nullable()),
      "The updated combined operator settings",
    ),
  },
})

const getPublicOperatorSettingsRoute = createRoute({
  "x-voyant-api-id": "@voyant-travel/operator-settings#api.public.settings",
  method: "get",
  path: "/v1/public/settings/operator",
  responses: {
    200: jsonContent(
      dataEnvelope(publicOperatorProfileSchema.nullable()),
      "The public operator settings (null when unset)",
    ),
  },
})

export function mountOperatorSettingsRoutes(hono: OpenApiMountTarget): void {
  const routes = new OpenAPIHono<Env>({ defaultHook: openApiValidationHook })
    .openapi(getOperatorProfileRoute, (c) =>
      asRouteResponse((async () => c.json({ data: await getOperatorProfile(c.get("db")) }, 200))()),
    )
    .openapi(patchOperatorProfileRoute, (c) =>
      asRouteResponse(
        (async () =>
          c.json({ data: await upsertOperatorProfile(c.get("db"), c.req.valid("json")) }, 200))(),
      ),
    )
    .openapi(getOperatorPaymentInstructionsRoute, (c) =>
      asRouteResponse(
        (async () => c.json({ data: await getOperatorPaymentInstructions(c.get("db")) }, 200))(),
      ),
    )
    .openapi(patchOperatorPaymentInstructionsRoute, (c) =>
      asRouteResponse(
        (async () =>
          c.json(
            { data: await upsertOperatorPaymentInstructions(c.get("db"), c.req.valid("json")) },
            200,
          ))(),
      ),
    )
    .openapi(getOperatorPaymentDefaultsRoute, (c) =>
      asRouteResponse(
        (async () => c.json({ data: await getOperatorPaymentDefaults(c.get("db")) }, 200))(),
      ),
    )
    .openapi(patchOperatorPaymentDefaultsRoute, (c) =>
      asRouteResponse(
        (async () =>
          c.json(
            { data: await upsertOperatorPaymentDefaults(c.get("db"), c.req.valid("json")) },
            200,
          ))(),
      ),
    )
    .openapi(getRouteImportSettingsRoute, (c) =>
      asRouteResponse(
        (async () => {
          const db = c.get("db")
          const [data, resolved] = await Promise.all([
            getRouteImportSettings(db),
            resolveRouteImportDefaults(db),
          ])
          return c.json({ data, resolved }, 200)
        })(),
      ),
    )
    .openapi(patchRouteImportSettingsRoute, (c) =>
      asRouteResponse(
        (async () => {
          const db = c.get("db")
          const data = await upsertRouteImportSettings(db, c.req.valid("json"))
          // 保存后连同解析结果一起返回,界面不必再取一次。
          return c.json({ data, resolved: await resolveRouteImportDefaults(db) }, 200)
        })(),
      ),
    )
    .openapi(getPublicOperatorProfileRoute, (c) =>
      asRouteResponse(
        (async () => {
          const db = c.get("db")
          const [profile, defaults] = await Promise.all([
            getOperatorProfile(db),
            getOperatorPaymentDefaults(db),
          ])
          cachePublicOperatorSettings(c)
          if (!profile) return c.json({ data: null }, 200)
          return c.json({ data: toPublicOperatorProfile(profile, defaults) }, 200)
        })(),
      ),
    )
    .openapi(getOperatorSettingsRoute, (c) =>
      asRouteResponse(
        (async () => c.json({ data: await getOperatorSettings(c.get("db")) }, 200))(),
      ),
    )
    .openapi(patchOperatorSettingsRoute, (c) =>
      asRouteResponse(
        (async () =>
          c.json({ data: await upsertOperatorSettings(c.get("db"), c.req.valid("json")) }, 200))(),
      ),
    )
    .openapi(getPublicOperatorSettingsRoute, (c) =>
      asRouteResponse(
        (async () => {
          const row = await getOperatorSettings(c.get("db"))
          cachePublicOperatorSettings(c)
          if (!row) return c.json({ data: null }, 200)
          return c.json({ data: toPublicOperatorSettings(row) }, 200)
        })(),
      ),
    )

  hono.route("/", routes)
}
