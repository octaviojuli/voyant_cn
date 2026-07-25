import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi"
import type { EventBus } from "@voyant-travel/core"
import { openApiValidationHook } from "@voyant-travel/hono"
import { listResponseSchema } from "@voyant-travel/types"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"

import type { QuotesRouteRuntime } from "../route-runtime.js"
import { quotesService } from "../service/index.js"
import {
  insertQuoteMediaSchema,
  insertQuoteParticipantSchema,
  insertQuoteProductSchema,
  insertQuoteSchema,
  quoteListQuerySchema,
  updateQuoteProductSchema,
  updateQuoteSchema,
} from "../validation.js"
import {
  errorResponseSchema,
  idParamSchema,
  quoteMediaSchema,
  quoteParticipantSchema,
  quoteProductSchema,
  quoteSchema,
  successResponseSchema,
} from "./openapi-schemas.js"

type Env = {
  Variables: {
    db: PostgresJsDatabase
    userId?: string
    eventBus?: EventBus
  }
}

const jsonContent = <T extends z.ZodTypeAny>(schema: T) => ({
  content: { "application/json": { schema } },
})

const requiredJsonBody = <T extends z.ZodTypeAny>(schema: T) => ({
  body: { required: true, content: { "application/json": { schema } } },
})

// --- quotes -----------------------------------------------------------------

const listQuotesRoute = createRoute({
  method: "get",
  path: "/quotes",
  request: { query: quoteListQuerySchema },
  responses: {
    200: {
      description: "Paginated list of quotes",
      ...jsonContent(listResponseSchema(quoteSchema)),
    },
  },
})

const createQuoteRoute = createRoute({
  method: "post",
  path: "/quotes",
  request: requiredJsonBody(insertQuoteSchema),
  responses: {
    201: { description: "The created quote", ...jsonContent(z.object({ data: quoteSchema })) },
    400: { description: "invalid_request", ...jsonContent(errorResponseSchema) },
  },
})

const getQuoteRoute = createRoute({
  method: "get",
  path: "/quotes/{id}",
  request: { params: idParamSchema },
  responses: {
    200: { description: "A quote by id", ...jsonContent(z.object({ data: quoteSchema })) },
    404: { description: "Quote not found", ...jsonContent(errorResponseSchema) },
  },
})

const updateQuoteRoute = createRoute({
  method: "patch",
  path: "/quotes/{id}",
  request: { params: idParamSchema, ...requiredJsonBody(updateQuoteSchema) },
  responses: {
    200: { description: "The updated quote", ...jsonContent(z.object({ data: quoteSchema })) },
    400: { description: "invalid_request", ...jsonContent(errorResponseSchema) },
    404: { description: "Quote not found", ...jsonContent(errorResponseSchema) },
  },
})

const deleteQuoteRoute = createRoute({
  method: "delete",
  path: "/quotes/{id}",
  request: { params: idParamSchema },
  responses: {
    200: { description: "Quote deleted", ...jsonContent(successResponseSchema) },
    404: { description: "Quote not found", ...jsonContent(errorResponseSchema) },
  },
})

function createQuotesChild(runtime: QuotesRouteRuntime = {}) {
  return new OpenAPIHono<Env>({ defaultHook: openApiValidationHook })
    .openapi(listQuotesRoute, async (c) =>
      c.json(await quotesService.listQuotes(c.get("db"), c.req.valid("query")), 200),
    )
    .openapi(createQuoteRoute, async (c) => {
      const row = await quotesService.createQuote(
        c.get("db"),
        c.req.valid("json"),
        c.get("userId") ?? null,
        runtime,
      )
      if (row) await c.get("eventBus")?.emit("quote.created", { id: row.id })
      return c.json({ data: row! }, 201)
    })
    .openapi(getQuoteRoute, async (c) => {
      const row = await quotesService.getQuoteById(c.get("db"), c.req.valid("param").id)
      return row ? c.json({ data: row }, 200) : c.json({ error: "Quote not found" }, 404)
    })
    .openapi(updateQuoteRoute, async (c) => {
      const row = await quotesService.updateQuote(
        c.get("db"),
        c.req.valid("param").id,
        c.req.valid("json"),
        c.get("userId") ?? null,
      )
      if (!row) return c.json({ error: "Quote not found" }, 404)
      await c.get("eventBus")?.emit("quote.updated", { id: row.id })
      return c.json({ data: row }, 200)
    })
    .openapi(deleteQuoteRoute, async (c) => {
      const row = await quotesService.deleteQuote(c.get("db"), c.req.valid("param").id)
      if (!row) return c.json({ error: "Quote not found" }, 404)
      await c.get("eventBus")?.emit("quote.deleted", { id: row.id })
      return c.json({ success: true } as const, 200)
    })
}

// --- quote participants -----------------------------------------------------

const listQuoteParticipantsRoute = createRoute({
  method: "get",
  path: "/quotes/{id}/participants",
  request: { params: idParamSchema },
  responses: {
    200: {
      description: "Participants for a quote",
      ...jsonContent(z.object({ data: z.array(quoteParticipantSchema) })),
    },
  },
})

const createQuoteParticipantRoute = createRoute({
  method: "post",
  path: "/quotes/{id}/participants",
  request: { params: idParamSchema, ...requiredJsonBody(insertQuoteParticipantSchema) },
  responses: {
    201: {
      description: "The created quote participant",
      ...jsonContent(z.object({ data: quoteParticipantSchema })),
    },
    400: { description: "invalid_request", ...jsonContent(errorResponseSchema) },
  },
})

const deleteQuoteParticipantRoute = createRoute({
  method: "delete",
  path: "/quote-participants/{id}",
  request: { params: idParamSchema },
  responses: {
    200: { description: "Quote participant deleted", ...jsonContent(successResponseSchema) },
    404: { description: "Quote participant not found", ...jsonContent(errorResponseSchema) },
  },
})

function createParticipantsChild(runtime: QuotesRouteRuntime = {}) {
  return new OpenAPIHono<Env>({ defaultHook: openApiValidationHook })
    .openapi(listQuoteParticipantsRoute, async (c) =>
      c.json(
        { data: await quotesService.listQuoteParticipants(c.get("db"), c.req.valid("param").id) },
        200,
      ),
    )
    .openapi(createQuoteParticipantRoute, async (c) => {
      const row = await quotesService.createQuoteParticipant(
        c.get("db"),
        c.req.valid("param").id,
        c.req.valid("json"),
        runtime,
      )
      return c.json({ data: row! }, 201)
    })
    .openapi(deleteQuoteParticipantRoute, async (c) => {
      const row = await quotesService.deleteQuoteParticipant(c.get("db"), c.req.valid("param").id)
      return row
        ? c.json({ success: true } as const, 200)
        : c.json({ error: "Quote participant not found" }, 404)
    })
}

// --- quote products ---------------------------------------------------------

const listQuoteProductsRoute = createRoute({
  method: "get",
  path: "/quotes/{id}/products",
  request: { params: idParamSchema },
  responses: {
    200: {
      description: "Products for a quote",
      ...jsonContent(z.object({ data: z.array(quoteProductSchema) })),
    },
  },
})

const createQuoteProductRoute = createRoute({
  method: "post",
  path: "/quotes/{id}/products",
  request: { params: idParamSchema, ...requiredJsonBody(insertQuoteProductSchema) },
  responses: {
    201: {
      description: "The created quote product",
      ...jsonContent(z.object({ data: quoteProductSchema })),
    },
    400: { description: "invalid_request", ...jsonContent(errorResponseSchema) },
  },
})

const updateQuoteProductRoute = createRoute({
  method: "patch",
  path: "/quote-products/{id}",
  request: { params: idParamSchema, ...requiredJsonBody(updateQuoteProductSchema) },
  responses: {
    200: {
      description: "The updated quote product",
      ...jsonContent(z.object({ data: quoteProductSchema })),
    },
    400: { description: "invalid_request", ...jsonContent(errorResponseSchema) },
    404: { description: "Quote product not found", ...jsonContent(errorResponseSchema) },
  },
})

const deleteQuoteProductRoute = createRoute({
  method: "delete",
  path: "/quote-products/{id}",
  request: { params: idParamSchema },
  responses: {
    200: { description: "Quote product deleted", ...jsonContent(successResponseSchema) },
    404: { description: "Quote product not found", ...jsonContent(errorResponseSchema) },
  },
})

const productsChild = new OpenAPIHono<Env>({ defaultHook: openApiValidationHook })
  .openapi(listQuoteProductsRoute, async (c) =>
    c.json(
      { data: await quotesService.listQuoteProducts(c.get("db"), c.req.valid("param").id) },
      200,
    ),
  )
  .openapi(createQuoteProductRoute, async (c) => {
    const row = await quotesService.createQuoteProduct(
      c.get("db"),
      c.req.valid("param").id,
      c.req.valid("json"),
      c.get("userId") ?? null,
    )
    return c.json({ data: row! }, 201)
  })
  .openapi(updateQuoteProductRoute, async (c) => {
    const row = await quotesService.updateQuoteProduct(
      c.get("db"),
      c.req.valid("param").id,
      c.req.valid("json"),
      c.get("userId") ?? null,
    )
    return row ? c.json({ data: row }, 200) : c.json({ error: "Quote product not found" }, 404)
  })
  .openapi(deleteQuoteProductRoute, async (c) => {
    const row = await quotesService.deleteQuoteProduct(
      c.get("db"),
      c.req.valid("param").id,
      c.get("userId") ?? null,
    )
    return row
      ? c.json({ success: true } as const, 200)
      : c.json({ error: "Quote product not found" }, 404)
  })

// --- quote media ------------------------------------------------------------

const listQuoteMediaRoute = createRoute({
  method: "get",
  path: "/quotes/{id}/media",
  request: { params: idParamSchema },
  responses: {
    200: {
      description: "Media for a quote",
      ...jsonContent(z.object({ data: z.array(quoteMediaSchema) })),
    },
  },
})

const createQuoteMediaRoute = createRoute({
  method: "post",
  path: "/quotes/{id}/media",
  request: { params: idParamSchema, ...requiredJsonBody(insertQuoteMediaSchema) },
  responses: {
    201: {
      description: "The created quote media",
      ...jsonContent(z.object({ data: quoteMediaSchema })),
    },
    400: { description: "invalid_request", ...jsonContent(errorResponseSchema) },
  },
})

const deleteQuoteMediaRoute = createRoute({
  method: "delete",
  path: "/quote-media/{id}",
  request: { params: idParamSchema },
  responses: {
    200: { description: "Quote media deleted", ...jsonContent(successResponseSchema) },
    404: { description: "Quote media not found", ...jsonContent(errorResponseSchema) },
  },
})

const mediaChild = new OpenAPIHono<Env>({ defaultHook: openApiValidationHook })
  .openapi(listQuoteMediaRoute, async (c) =>
    c.json({ data: await quotesService.listQuoteMedia(c.get("db"), c.req.valid("param").id) }, 200),
  )
  .openapi(createQuoteMediaRoute, async (c) => {
    const row = await quotesService.createQuoteMedia(
      c.get("db"),
      c.req.valid("param").id,
      c.req.valid("json"),
    )
    return c.json({ data: row! }, 201)
  })
  .openapi(deleteQuoteMediaRoute, async (c) => {
    const row = await quotesService.deleteQuoteMedia(c.get("db"), c.req.valid("param").id)
    return row
      ? c.json({ success: true } as const, 200)
      : c.json({ error: "Quote media not found" }, 404)
  })

export function createQuoteRoutes(runtime: QuotesRouteRuntime = {}) {
  return new OpenAPIHono<Env>({ defaultHook: openApiValidationHook })
    .route("/", createQuotesChild(runtime))
    .route("/", createParticipantsChild(runtime))
    .route("/", productsChild)
    .route("/", mediaChild)
}

export const quoteRoutes = createQuoteRoutes()
