import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"

export type ResolveQuoteParticipantPersonById = (
  db: PostgresJsDatabase,
  personId: string,
) => Promise<boolean>

/**
 * Resolves the deployment's default quote currency (ISO 4217 code), used when
 * a quote is created without an explicit `valueCurrency`. The standard Node
 * runtime resolves it from the deployment's default market (see
 * `markets-ref.ts`); returns `null` when no default can be determined.
 */
export type ResolveDefaultQuoteCurrency = (db: PostgresJsDatabase) => Promise<string | null>

export interface QuotesRouteRuntimeOptions {
  resolveParticipantPersonById?: ResolveQuoteParticipantPersonById
  /**
   * Optional deployment hook: default currency for newly created quotes.
   * When absent (or when it resolves `null`), quotes created without a
   * `valueCurrency` keep a `null` currency — the previous behavior.
   */
  resolveDefaultQuoteCurrency?: ResolveDefaultQuoteCurrency
}

export interface QuotesRouteRuntime extends QuotesRouteRuntimeOptions {}
