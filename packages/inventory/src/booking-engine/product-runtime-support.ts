import { bookingItems, bookings } from "@voyant-travel/bookings/schema"
import { paxBandCodeForUnit } from "@voyant-travel/catalog/booking-engine"
import { priceCatalogs, pricingCategories } from "@voyant-travel/commerce"
import { bookingItemTaxLines } from "@voyant-travel/finance"
import { and, asc, desc, eq, inArray, like, type SQL } from "drizzle-orm"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"

import { optionUnits, productOptions, products } from "../schema-core.js"
import { defaultBookingNumber } from "./handler-support.js"

/**
 * Public price catalogs to try for a product, best first.
 *
 * This used to be a single query for "the" default public catalog, and that
 * was wrong in two ways that compounded into silently ignoring every price
 * rule on a product:
 *
 * 1. **`isDefault` is not unique.** Nothing in the schema stops two public
 *    catalogs from both carrying the flag, and the baseline data ships EUR and
 *    GBP catalogs that both do. `.limit(1)` then picked one arbitrarily.
 * 2. **Currency was never considered.** A CNY product resolved against a EUR
 *    catalog, found no rule for its option there, and the caller fell all the
 *    way back to `product.sell_amount_cents × pax` — a flat per-head charge.
 *    Per-unit prices, seasonal schedules and per-departure overrides all became
 *    dead configuration, and nothing surfaced an error: the flat price looks
 *    plausible, so a child was quietly billed the adult fare.
 *
 * So: filter to the product's own sell currency (a rule priced in another
 * currency is never the right answer), and return every remaining candidate
 * ordered `isDefault` first, then by code, so the caller can walk them and use
 * whichever one actually prices the option. Ordering by code rather than
 * insertion time keeps the choice stable across environments.
 *
 * Catalogs matching the product currency come first; if none match, the
 * remaining public catalogs still follow, which preserves the old behavior for
 * products whose currency has no catalog of its own.
 */
export async function resolvePriceCatalogCandidates(
  db: PostgresJsDatabase,
  productId: string,
): Promise<string[]> {
  const [product] = await db
    .select({ sellCurrency: products.sellCurrency })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1)

  const catalogs = await db
    .select({
      id: priceCatalogs.id,
      code: priceCatalogs.code,
      currencyCode: priceCatalogs.currencyCode,
      isDefault: priceCatalogs.isDefault,
    })
    .from(priceCatalogs)
    .where(and(eq(priceCatalogs.catalogType, "public"), eq(priceCatalogs.active, true)))
    .orderBy(desc(priceCatalogs.isDefault), asc(priceCatalogs.code))

  return orderPriceCatalogCandidates(catalogs, product?.sellCurrency ?? null)
}

/** Ordering half of `resolvePriceCatalogCandidates`, split out to be testable
 *  without a database. Input is expected pre-sorted `isDefault` first, then by
 *  code; this only partitions on currency and keeps that order within each
 *  partition. */
export function orderPriceCatalogCandidates(
  catalogs: ReadonlyArray<{ id: string; currencyCode: string | null }>,
  currency: string | null,
): string[] {
  if (!currency) return catalogs.map((catalog) => catalog.id)
  const matching = catalogs.filter((catalog) => catalog.currencyCode === currency)
  const rest = catalogs.filter((catalog) => catalog.currencyCode !== currency)
  return [...matching, ...rest].map((catalog) => catalog.id)
}

/**
 * Build the `OR` scope clauses that select a product's pricing
 * categories. Operators attach traveler types at the product, option, or
 * option-unit level, so all three scopes have to be walked. Shared by
 * `loadPaxBands` and `loadPaxBandDependencies`, which must agree on the
 * category set or the bands and their dependency rules drift apart.
 */
export async function pricingCategoryScopeClauses(
  db: PostgresJsDatabase,
  productId: string,
): Promise<SQL[]> {
  const optionRows = await db
    .select({ id: productOptions.id })
    .from(productOptions)
    .where(and(eq(productOptions.productId, productId), eq(productOptions.status, "active")))
  const optionIds = optionRows.map((row) => row.id)
  const unitRows =
    optionIds.length > 0
      ? await db
          .select({ id: optionUnits.id })
          .from(optionUnits)
          .where(inArray(optionUnits.optionId, optionIds))
      : []
  const unitIds = unitRows.map((row) => row.id)

  const clauses: SQL[] = [eq(pricingCategories.productId, productId)]
  if (optionIds.length > 0) clauses.push(inArray(pricingCategories.optionId, optionIds))
  if (unitIds.length > 0) clauses.push(inArray(pricingCategories.unitId, unitIds))
  return clauses
}

export async function persistBookingCreateTaxLines(
  db: PostgresJsDatabase,
  bookingId: string,
  taxLines:
    | Array<{
        code?: string | null
        name: string
        jurisdiction?: string | null
        scope?: "included" | "excluded" | "withheld"
        currency: string
        amountCents: number
        rateBasisPoints?: number | null
        includedInPrice?: boolean
        remittanceParty?: string | null
        sortOrder?: number
      }>
    | undefined,
) {
  if (!taxLines?.length) return
  const items = await db
    .select({
      id: bookingItems.id,
      totalSellAmountCents: bookingItems.totalSellAmountCents,
    })
    .from(bookingItems)
    .where(eq(bookingItems.bookingId, bookingId))
    .orderBy(asc(bookingItems.createdAt))
  if (!items.length) return

  const total = items.reduce((sum, item) => sum + (item.totalSellAmountCents ?? 0), 0)
  const rows = taxLines.flatMap((taxLine) =>
    distributeTaxLine(taxLine.amountCents, items, total).map(({ itemId, amountCents }) => ({
      bookingItemId: itemId,
      code: taxLine.code ?? null,
      name: taxLine.name,
      jurisdiction: taxLine.jurisdiction ?? null,
      scope: taxLine.scope ?? (taxLine.includedInPrice ? "included" : "excluded"),
      currency: taxLine.currency,
      amountCents,
      rateBasisPoints: taxLine.rateBasisPoints ?? null,
      includedInPrice: taxLine.includedInPrice ?? taxLine.scope === "included",
      remittanceParty: taxLine.remittanceParty ?? null,
      sortOrder: taxLine.sortOrder ?? 0,
    })),
  )
  if (rows.length) await db.insert(bookingItemTaxLines).values(rows)
}

function distributeTaxLine(
  amountCents: number,
  items: Array<{ id: string; totalSellAmountCents: number | null }>,
  totalCents: number,
) {
  if (items.length === 1 || totalCents <= 0) {
    return [{ itemId: items[0]!.id, amountCents }]
  }
  let remaining = amountCents
  return items.map((item, index) => {
    const isLast = index === items.length - 1
    const allocated = isLast
      ? remaining
      : Math.round(amountCents * ((item.totalSellAmountCents ?? 0) / totalCents))
    remaining -= allocated
    return { itemId: item.id, amountCents: allocated }
  })
}

/**
 * Map an `optionUnits` row to one of the booking-engine's pax-band
 * codes. Delegates to the shared contract rule (`paxBandCodeForUnit`)
 * so the price resolver, the draft shape's bands, and the committed
 * item lines can never drift apart: the unit's stable `code` decides
 * when it carries a recognizable token (`ADULT`, `child_6_12`, …),
 * otherwise the age window does, never the localized display name.
 */
export function deriveTravelerCategory(unit: {
  unitType: string
  code?: string | null
  minAge: number | null
  maxAge: number | null
}): "adult" | "child" | "infant" | "senior" | null {
  return paxBandCodeForUnit(unit)
}

/** Booking-number series shape shared with the rest of the workspace. */
const BOOKING_NUMBER_SERIES =
  /^(?<prefix>[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)-(?<year>\d{4})-(?<seq>\d+)$/

/**
 * Allocate the next booking number in whatever series the workspace
 * already issues (`VYT-CN-2026-00002` → `VYT-CN-2026-00003`).
 *
 * The journey's owned commit previously fell through to
 * `defaultBookingNumber()` because no deployment ever wired
 * `generateBookingNumber`, so journey bookings landed as `BK-MS1XCLUS`
 * while every other booking in the system used the workspace series.
 * There is no booking-number *series table* (only invoice + contract
 * series exist), so the series is inferred from issued numbers:
 *
 *   1. Take the most recently created booking number matching
 *      `<PREFIX>-<YYYY>-<NNNN>`; that fixes the prefix and pad width.
 *   2. Roll to the current calendar year and take the highest sequence
 *      already issued for that prefix + year.
 *   3. Probe upward until the candidate is unused (bounded), mirroring
 *      the retry loop the public booking path already uses.
 *
 * Already-issued numbers are never rewritten. Falls back to
 * `defaultBookingNumber()` when no series can be inferred (a fresh
 * workspace) or the lookup fails.
 */
export async function allocateBookingNumber(db: PostgresJsDatabase): Promise<string> {
  try {
    const recent = await db
      .select({ bookingNumber: bookings.bookingNumber })
      .from(bookings)
      .orderBy(desc(bookings.createdAt))
      .limit(50)
    const template = recent
      .map((row) => BOOKING_NUMBER_SERIES.exec(row.bookingNumber)?.groups)
      .find((groups) => Boolean(groups?.prefix && groups?.seq))
    const prefix = template?.prefix
    const seq = template?.seq
    if (!prefix || !seq) return defaultBookingNumber()

    const padLength = seq.length
    const year = String(new Date().getUTCFullYear())
    const seriesPrefix = `${prefix}-${year}-`

    const [highest] = await db
      .select({ bookingNumber: bookings.bookingNumber })
      .from(bookings)
      .where(like(bookings.bookingNumber, `${seriesPrefix}%`))
      .orderBy(desc(bookings.bookingNumber))
      .limit(1)
    const highestSeq = highest
      ? Number.parseInt(highest.bookingNumber.slice(seriesPrefix.length), 10)
      : 0
    let next = (Number.isFinite(highestSeq) ? highestSeq : 0) + 1

    for (let attempt = 0; attempt < 10; attempt += 1, next += 1) {
      const candidate = `${seriesPrefix}${String(next).padStart(padLength, "0")}`
      const [taken] = await db
        .select({ id: bookings.id })
        .from(bookings)
        .where(and(eq(bookings.bookingNumber, candidate)))
        .limit(1)
      if (!taken) return candidate
    }
    return defaultBookingNumber()
  } catch (error) {
    console.warn("[booking-engine] allocateBookingNumber failed; using fallback number", error)
    return defaultBookingNumber()
  }
}

export function humanizeFieldKey(key: string): string {
  switch (key) {
    case "first_name":
      return "First name"
    case "last_name":
      return "Last name"
    case "date_of_birth":
      return "Date of birth"
    case "passport_number":
      return "Passport number"
    case "passport_expiry":
      return "Passport expiry"
    case "dietary_requirements":
      return "Dietary requirements"
    case "accessibility_needs":
      return "Accessibility needs"
    case "special_requests":
      return "Special requests"
    default:
      return key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())
  }
}

export function typeForFieldKey(key: string): string {
  switch (key) {
    case "date_of_birth":
    case "passport_expiry":
      return "date"
    case "email":
      return "email"
    case "phone":
      return "phone"
    case "address":
      return "text"
    default:
      return "text"
  }
}
