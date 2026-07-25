"use client"

import { useMarkets } from "@voyant-travel/commerce-react/markets"

// Lives under `admin/` on purpose: `@voyant-travel/commerce-react` is an
// OPTIONAL peer (same discipline as `@voyant-travel/relationships-react`), so
// it must only be imported from the admin page modules that hosts load
// dynamically — never from the package's main or hooks barrels.

export interface DefaultCrmCurrencyMarket {
  code: string
  defaultCurrency: string
}

/**
 * Picks the deployment default market's currency from markets already in the
 * admin list order (most recently updated first). Mirrors the admin
 * default-market selection (`resolveCatalogDefaultMarket` in
 * `@voyant-travel/catalog-react` and `pickDefaultMarketCurrency` in
 * `@voyant-travel/quotes`): a synthetic `default` market wins, otherwise the
 * first market.
 */
export function resolveDefaultCrmCurrency(
  markets: readonly DefaultCrmCurrencyMarket[],
): string | null {
  const market = markets.find((candidate) => candidate.code === "default") ?? markets[0]
  return market?.defaultCurrency ?? null
}

/**
 * The deployment's default quote currency — the default market's currency,
 * used as the display/entry fallback for quotes that carry no `valueCurrency`
 * of their own. `null` while the markets query is loading or when the
 * deployment has no active market; callers keep their last-resort fallback.
 */
export function useDefaultCrmCurrency(): string | null {
  const marketsQuery = useMarkets({ status: "active", limit: 100 })
  return resolveDefaultCrmCurrency(marketsQuery.data?.data ?? [])
}
