import { typeId } from "@voyant-travel/db/lib/typeid-column"
import { desc, eq } from "drizzle-orm"
import { pgTable, text, timestamp } from "drizzle-orm/pg-core"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"

/**
 * Local reference to `commerce.markets`. Quotes reads this table to resolve
 * the deployment's default quote currency, but doesn't pull the commerce
 * package as a hard dep — the FK rule (intra-domain FKs OK, cross-domain MUST
 * use plain text + links) means we mirror the columns we need with a `Ref`
 * (same pattern as `exchangeRatesRef` in `@voyant-travel/bookings`).
 *
 * NOT part of `./schema.ts`, so it never contributes to this package's
 * drizzle migrations — the commerce package owns the real table.
 */
export const marketsRef = pgTable("markets", {
  id: typeId("markets").primaryKey(),
  code: text("code").notNull(),
  /** Mirrors the commerce `market_status` enum; read as text for filtering. */
  status: text("status").notNull(),
  defaultCurrency: text("default_currency").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
})

export interface DefaultMarketCurrencyRow {
  code: string
  defaultCurrency: string
}

/**
 * Picks the deployment default market's currency from rows already in the
 * admin markets-list order (most recently updated first — see `listMarkets`
 * in `@voyant-travel/commerce`). Mirrors the admin default-market selection
 * (`resolveCatalogDefaultMarket` in `@voyant-travel/catalog-react`): a
 * synthetic `default` market wins, otherwise the first row.
 */
export function pickDefaultMarketCurrency(
  rows: readonly DefaultMarketCurrencyRow[],
): string | null {
  const row = rows.find((candidate) => candidate.code === "default") ?? rows[0]
  return row?.defaultCurrency ?? null
}

/**
 * Resolves the deployment's default quote currency from the active markets.
 * Returns `null` when no active market exists (or the table is absent —
 * callers should treat errors as "no default").
 */
export async function resolveDefaultMarketCurrency(db: PostgresJsDatabase): Promise<string | null> {
  const rows = await db
    .select({ code: marketsRef.code, defaultCurrency: marketsRef.defaultCurrency })
    .from(marketsRef)
    .where(eq(marketsRef.status, "active"))
    .orderBy(desc(marketsRef.updatedAt))
  return pickDefaultMarketCurrency(rows)
}
