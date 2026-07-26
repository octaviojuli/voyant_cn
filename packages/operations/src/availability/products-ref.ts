import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core"

/** Minimal reference to the products table for LEFT JOIN enrichment. */
export const productsRef = pgTable("products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  bookingMode: text("booking_mode").notNull(),
})

/** Minimal reference to product_options for validating explicit slot option links. */
export const productOptionsRef = pgTable("product_options", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull(),
  name: text("name").notNull(),
  status: text("status").notNull(),
  isDefault: boolean("is_default").notNull(),
  sortOrder: integer("sort_order").notNull(),
})

/**
 * Minimal reference to `product_itineraries` / `product_days`, owned by
 * `@voyant-travel/inventory`.
 *
 * Slot generation needs the product's itinerary length to stamp a departure's
 * `ends_at` / `nights` / `days` instead of leaving the operator to retype them
 * on every generated row. Per `docs/architecture/schema-discipline.md` a
 * cross-package read uses a plain-column `Ref` mirror rather than a real FK or
 * a package dependency — the same pattern as `productsRef` above,
 * `optionUnitsRef`, `bookingsRef`, and `productItinerariesRef` /
 * `productDaysRef` in `@voyant-travel/bookings`. These tables are NOT part of
 * this package's `schema.ts`, so they never contribute to its migrations;
 * inventory owns the real tables.
 *
 * `product_days` is keyed by `itinerary_id` (products re-parented days onto
 * `product_itineraries`), so per-product lookups join through the itinerary.
 */
export const productItinerariesRef = pgTable("product_itineraries", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull(),
  name: text("name").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const productDaysRef = pgTable("product_days", {
  id: text("id").primaryKey(),
  itineraryId: text("itinerary_id").notNull(),
  dayNumber: integer("day_number").notNull(),
})
