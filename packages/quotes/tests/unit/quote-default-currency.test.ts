import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"
import { Hono } from "hono"
import { describe, expect, it } from "vitest"

import { pickDefaultMarketCurrency } from "../../src/markets-ref.js"
import { createQuotesRoutes } from "../../src/routes/index.js"
import { quotesService } from "../../src/service/index.js"

function createInsertDb(rowFor: (values: Record<string, unknown>) => Record<string, unknown>) {
  const insertedValues: Record<string, unknown>[] = []
  const db = {
    insert() {
      return {
        values(values: Record<string, unknown>) {
          insertedValues.push(values)
          return {
            async returning() {
              return [rowFor(values)]
            },
          }
        },
      }
    },
  } as PostgresJsDatabase
  return { db, insertedValues }
}

const quoteRow = (values: Record<string, unknown>) => ({
  id: "quot_1",
  ...values,
})

describe("new-quote default currency", () => {
  it("defaults valueCurrency from the deployment resolver when absent", async () => {
    const { db, insertedValues } = createInsertDb(quoteRow)

    await quotesService.createQuote(
      db,
      { title: "报价", pipelineId: "pipe_1", stageId: "stag_1", status: "open", tags: [] },
      "user-1",
      { resolveDefaultQuoteCurrency: async () => "CNY" },
    )

    expect(insertedValues[0]).toMatchObject({ valueCurrency: "CNY" })
  })

  it("keeps an explicit valueCurrency over the deployment default", async () => {
    const { db, insertedValues } = createInsertDb(quoteRow)

    await quotesService.createQuote(
      db,
      {
        title: "Explicit",
        pipelineId: "pipe_1",
        stageId: "stag_1",
        status: "open",
        tags: [],
        valueCurrency: "EUR",
      },
      "user-1",
      { resolveDefaultQuoteCurrency: async () => "CNY" },
    )

    expect(insertedValues[0]).toMatchObject({ valueCurrency: "EUR" })
  })

  it("stores a null currency when no resolver is configured (previous behavior)", async () => {
    const { db, insertedValues } = createInsertDb(quoteRow)

    await quotesService.createQuote(db, {
      title: "No default",
      pipelineId: "pipe_1",
      stageId: "stag_1",
      status: "open",
      tags: [],
    })

    expect(insertedValues[0]).toMatchObject({ valueCurrency: null })
  })

  it("stores a null currency when the resolver finds no default market", async () => {
    const { db, insertedValues } = createInsertDb(quoteRow)

    await quotesService.createQuote(
      db,
      { title: "No markets", pipelineId: "pipe_1", stageId: "stag_1", status: "open", tags: [] },
      null,
      { resolveDefaultQuoteCurrency: async () => null },
    )

    expect(insertedValues[0]).toMatchObject({ valueCurrency: null })
  })

  it("applies the deployment default through POST /quotes", async () => {
    const { db, insertedValues } = createInsertDb(quoteRow)

    const app = new Hono()
    app.use("*", async (c, next) => {
      c.set("db" as never, db)
      await next()
    })
    app.route("/", createQuotesRoutes({ resolveDefaultQuoteCurrency: async () => "CNY" }))

    const res = await app.request("/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "新报价", pipelineId: "pipe_1", stageId: "stag_1" }),
    })

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.valueCurrency).toBe("CNY")
    expect(insertedValues[0]).toMatchObject({ valueCurrency: "CNY" })
  })
})

describe("pickDefaultMarketCurrency", () => {
  it("uses the first market in admin list order (most recently updated first)", () => {
    expect(
      pickDefaultMarketCurrency([
        { code: "CN", defaultCurrency: "CNY" },
        { code: "UK", defaultCurrency: "GBP" },
      ]),
    ).toBe("CNY")
  })

  it("prefers a synthetic `default` market when present", () => {
    expect(
      pickDefaultMarketCurrency([
        { code: "CN", defaultCurrency: "CNY" },
        { code: "default", defaultCurrency: "EUR" },
      ]),
    ).toBe("EUR")
  })

  it("returns null when no market exists", () => {
    expect(pickDefaultMarketCurrency([])).toBeNull()
  })
})
