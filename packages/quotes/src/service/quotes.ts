import { RequestValidationError } from "@voyant-travel/hono"
import { and, desc, eq, ilike, or, sql } from "drizzle-orm"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"
import type { z } from "zod"

import type { QuotesRouteRuntime } from "../route-runtime.js"
import { quoteMedia, quoteParticipants, quoteProducts, quotes } from "../schema.js"
import type {
  insertQuoteMediaSchema,
  insertQuoteParticipantSchema,
  insertQuoteProductSchema,
  insertQuoteSchema,
  quoteListQuerySchema,
  updateQuoteProductSchema,
  updateQuoteSchema,
} from "../validation.js"
import { paginate } from "./helpers.js"

type QuoteListQuery = z.infer<typeof quoteListQuerySchema>
type CreateQuoteInput = z.infer<typeof insertQuoteSchema>
type UpdateQuoteInput = z.infer<typeof updateQuoteSchema>
type CreateQuoteParticipantInput = z.infer<typeof insertQuoteParticipantSchema>
type CreateQuoteProductInput = z.infer<typeof insertQuoteProductSchema>
type UpdateQuoteProductInput = z.infer<typeof updateQuoteProductSchema>
type CreateQuoteMediaInput = z.infer<typeof insertQuoteMediaSchema>

export const quotesService = {
  async listQuotes(db: PostgresJsDatabase, query: QuoteListQuery) {
    const conditions = []

    if (query.personId) conditions.push(eq(quotes.personId, query.personId))
    if (query.organizationId) conditions.push(eq(quotes.organizationId, query.organizationId))
    if (query.pipelineId) conditions.push(eq(quotes.pipelineId, query.pipelineId))
    if (query.stageId) conditions.push(eq(quotes.stageId, query.stageId))
    if (query.ownerId) conditions.push(eq(quotes.ownerId, query.ownerId))
    if (query.status) conditions.push(eq(quotes.status, query.status))
    if (query.search) {
      const term = `%${query.search}%`
      conditions.push(
        or(ilike(quotes.title, term), ilike(quotes.source, term), ilike(quotes.sourceRef, term)),
      )
    }

    const where = conditions.length ? and(...conditions) : undefined
    return paginate(
      db
        .select()
        .from(quotes)
        .where(where)
        .limit(query.limit)
        .offset(query.offset)
        .orderBy(desc(quotes.updatedAt)),
      db.select({ count: sql<number>`count(*)::int` }).from(quotes).where(where),
      query.limit,
      query.offset,
    )
  },

  async getQuoteById(db: PostgresJsDatabase, id: string) {
    const [row] = await db.select().from(quotes).where(eq(quotes.id, id)).limit(1)
    return row ?? null
  },

  async createQuote(
    db: PostgresJsDatabase,
    data: CreateQuoteInput,
    actorId?: string | null,
    runtime: QuotesRouteRuntime = {},
  ) {
    // Default the headline currency from the deployment (default market) when
    // the caller did not pick one explicitly — an explicit value always wins.
    const valueCurrency =
      data.valueCurrency ?? (await runtime.resolveDefaultQuoteCurrency?.(db)) ?? null
    const [row] = await db
      .insert(quotes)
      .values({ ...data, valueCurrency, createdBy: actorId ?? null, updatedBy: actorId ?? null })
      .returning()
    return row
  },

  async updateQuote(
    db: PostgresJsDatabase,
    id: string,
    data: UpdateQuoteInput,
    actorId?: string | null,
  ) {
    const patch: UpdateQuoteInput & {
      updatedAt: Date
      updatedBy?: string | null
      stageChangedAt?: Date
      closedAt?: Date | null
    } = {
      ...data,
      updatedAt: new Date(),
      updatedBy: actorId ?? null,
    }

    if (data.stageId) patch.stageChangedAt = new Date()
    if (data.status && data.status !== "open") {
      patch.closedAt = new Date()
    }
    if (data.status === "open") {
      patch.closedAt = null
    }

    const [row] = await db.update(quotes).set(patch).where(eq(quotes.id, id)).returning()
    return row ?? null
  },

  async deleteQuote(db: PostgresJsDatabase, id: string) {
    const [row] = await db.delete(quotes).where(eq(quotes.id, id)).returning({ id: quotes.id })
    return row ?? null
  },

  listQuoteParticipants(db: PostgresJsDatabase, quoteId: string) {
    return db
      .select()
      .from(quoteParticipants)
      .where(eq(quoteParticipants.quoteId, quoteId))
      .orderBy(desc(quoteParticipants.isPrimary), quoteParticipants.createdAt)
  },

  async createQuoteParticipant(
    db: PostgresJsDatabase,
    quoteId: string,
    data: CreateQuoteParticipantInput,
    runtime: QuotesRouteRuntime = {},
  ) {
    await validateQuoteParticipantPerson(db, data.personId, runtime)

    const [row] = await db
      .insert(quoteParticipants)
      .values({ ...data, quoteId })
      .returning()
    return row
  },

  async deleteQuoteParticipant(db: PostgresJsDatabase, id: string) {
    const [row] = await db
      .delete(quoteParticipants)
      .where(eq(quoteParticipants.id, id))
      .returning({ id: quoteParticipants.id })
    return row ?? null
  },

  listQuoteProducts(db: PostgresJsDatabase, quoteId: string) {
    return db
      .select()
      .from(quoteProducts)
      .where(eq(quoteProducts.quoteId, quoteId))
      .orderBy(quoteProducts.createdAt)
  },

  async createQuoteProduct(
    db: PostgresJsDatabase,
    quoteId: string,
    data: CreateQuoteProductInput,
    actorId?: string | null,
  ) {
    const [row] = await db
      .insert(quoteProducts)
      .values({ ...data, quoteId })
      .returning()
    await recomputeQuoteValue(db, quoteId, actorId)
    return row
  },

  async updateQuoteProduct(
    db: PostgresJsDatabase,
    id: string,
    data: UpdateQuoteProductInput,
    actorId?: string | null,
  ) {
    const [row] = await db
      .update(quoteProducts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(quoteProducts.id, id))
      .returning()
    if (row) await recomputeQuoteValue(db, row.quoteId, actorId)
    return row ?? null
  },

  async deleteQuoteProduct(db: PostgresJsDatabase, id: string, actorId?: string | null) {
    const [row] = await db
      .delete(quoteProducts)
      .where(eq(quoteProducts.id, id))
      .returning({ id: quoteProducts.id, quoteId: quoteProducts.quoteId })
    if (row) await recomputeQuoteValue(db, row.quoteId, actorId)
    return row ?? null
  },

  listQuoteMedia(db: PostgresJsDatabase, quoteId: string) {
    return db
      .select()
      .from(quoteMedia)
      .where(eq(quoteMedia.quoteId, quoteId))
      .orderBy(quoteMedia.sortOrder, quoteMedia.createdAt)
  },

  async createQuoteMedia(db: PostgresJsDatabase, quoteId: string, data: CreateQuoteMediaInput) {
    const [row] = await db
      .insert(quoteMedia)
      .values({ ...data, quoteId })
      .returning()
    return row
  },

  async deleteQuoteMedia(db: PostgresJsDatabase, id: string) {
    const [row] = await db
      .delete(quoteMedia)
      .where(eq(quoteMedia.id, id))
      .returning({ id: quoteMedia.id })
    return row ?? null
  },
}

async function validateQuoteParticipantPerson(
  db: PostgresJsDatabase,
  personId: string,
  runtime: QuotesRouteRuntime,
): Promise<void> {
  if (!runtime.resolveParticipantPersonById) {
    return
  }

  const exists = await runtime.resolveParticipantPersonById(db, personId)
  if (!exists) {
    throw new RequestValidationError(
      "Quote participant personId does not reference an existing person",
      {
        fields: {
          fieldErrors: { personId: ["Person not found"] },
          formErrors: [],
        },
      },
    )
  }
}

/**
 * Recompute and persist a quote's headline value from its line items —
 * `Σ (quantity × unit price − discount)`. The quote value is derived from
 * its products, not entered by hand, so it stays in sync everywhere (list,
 * pipeline board, detail) whenever an item changes.
 */
async function recomputeQuoteValue(
  db: PostgresJsDatabase,
  quoteId: string,
  actorId?: string | null,
): Promise<number> {
  const products = await db
    .select({
      quantity: quoteProducts.quantity,
      unitPriceAmountCents: quoteProducts.unitPriceAmountCents,
      discountAmountCents: quoteProducts.discountAmountCents,
    })
    .from(quoteProducts)
    .where(eq(quoteProducts.quoteId, quoteId))

  const total = products.reduce(
    (sum, p) => sum + p.quantity * (p.unitPriceAmountCents ?? 0) - (p.discountAmountCents ?? 0),
    0,
  )

  await db
    .update(quotes)
    .set({
      valueAmountCents: total,
      updatedAt: new Date(),
      ...(actorId !== undefined ? { updatedBy: actorId } : {}),
    })
    .where(eq(quotes.id, quoteId))

  return total
}
