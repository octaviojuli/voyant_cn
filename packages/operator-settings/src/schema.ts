/**
 * `@voyant-travel/operator-settings` drizzle schema — the operator-tenant
 * identity + payment + booking-tax configuration tables.
 *
 * Generic to any deployment (every operator has a profile, payment
 * instructions/defaults, and tax settings); the rows are per-deployment data.
 * A deployment lists this package in `voyant.config` `additionalSchemas` so its
 * tables fold into the combined migration history. Table names + TypeID
 * prefixes are unchanged from the prior starter-local schema (migration parity).
 */

import { typeId } from "@voyant-travel/db/lib/typeid-column"
import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core"

/**
 * Original catch-all table from the first booking-journey settings
 * pass. Runtime code reads/writes the narrower tables below:
 * `operator_profile`, `operator_payment_instructions`,
 * `operator_payment_defaults`, and `booking_tax_settings`.
 */
export const operatorSettings = pgTable("operator_settings", {
  id: typeId("operator_settings"),

  // Identity
  name: text("name"),
  legalName: text("legal_name"),
  vatId: text("vat_id"),
  registrationNumber: text("registration_number"),

  // Contact
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),

  // Banking
  iban: text("iban"),
  bank: text("bank"),

  // Travel licensing — generic enough to cover tourism authority
  // numbers (ANPC, ABTA, IATA), hotel star-rating registries, and
  // cruise flag-state numbers.
  license: text("license"),
  licenseAuthority: text("license_authority"),

  // Signing officer for contracts (the human whose name appears on
  // the operator-side signature line of a staff-issued contract).
  signatoryName: text("signatory_name"),
  signatoryRole: text("signatory_role"),

  /**
   * Default customer-facing payment policy applied when no per-supplier
   * / per-category / per-listing / per-booking override exists.
   *
   * Shape mirrors the `PaymentPolicy` interface in `@voyant-travel/finance`.
   * Stored as jsonb so the shape can evolve (multi-installment plans,
   * grace-period overrides per pax band, etc.) without a migration
   * for every change.
   *
   * `null` means "no policy configured yet — fall through to
   * hard-coded `noDepositPolicy` (100% upfront)".
   */
  customerPaymentPolicy: jsonb("customer_payment_policy"),

  // Columns retained for migrations from pre-booking-tax-settings
  // beta databases. Runtime code reads/writes `booking_tax_settings`.
  taxPriceMode: text("tax_price_mode").notNull().default("inclusive"),
  taxPolicyProfileId: text("tax_policy_profile_id"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export type OperatorSettings = typeof operatorSettings.$inferSelect
export type NewOperatorSettings = typeof operatorSettings.$inferInsert

/**
 * Single-row operator profile: the legal/trading identity that
 * contracts with the customer. Used by contract variables and public
 * checkout / booking-preview legal blocks.
 */
export const operatorProfile = pgTable("operator_profile", {
  id: typeId("operator_profile"),
  name: text("name"),
  legalName: text("legal_name"),
  vatId: text("vat_id"),
  registrationNumber: text("registration_number"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  license: text("license"),
  licenseAuthority: text("license_authority"),
  signatoryName: text("signatory_name"),
  signatoryRole: text("signatory_role"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export type OperatorProfile = typeof operatorProfile.$inferSelect
export type NewOperatorProfile = typeof operatorProfile.$inferInsert

/**
 * Single-row operator payment instructions for customer-facing
 * collection rails such as bank transfer.
 */
export const operatorPaymentInstructions = pgTable("operator_payment_instructions", {
  id: typeId("operator_payment_instructions"),
  bankTransferBeneficiary: text("bank_transfer_beneficiary"),
  iban: text("iban"),
  bank: text("bank"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export type OperatorPaymentInstructions = typeof operatorPaymentInstructions.$inferSelect
export type NewOperatorPaymentInstructions = typeof operatorPaymentInstructions.$inferInsert

/**
 * Single-row operator-level customer payment default. The booking
 * payment-policy cascade uses this only when supplier/category/listing
 * and booking-level policies do not override it.
 */
export const operatorPaymentDefaults = pgTable("operator_payment_defaults", {
  id: typeId("operator_payment_defaults"),
  customerPaymentPolicy: jsonb("customer_payment_policy"),
  bookingCheckoutUrlTemplate: text("booking_checkout_url_template"),
  invoicePayUrlTemplate: text("invoice_pay_url_template"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export type OperatorPaymentDefaults = typeof operatorPaymentDefaults.$inferSelect
export type NewOperatorPaymentDefaults = typeof operatorPaymentDefaults.$inferInsert

/**
 * Single-row booking tax configuration for booking-create previews,
 * quote recomputation, and booking item tax-line materialization.
 *
 * Kept separate from operator identity and payment instructions:
 * these fields are finance/booking tax policy knobs.
 */
export const bookingTaxSettings = pgTable("booking_tax_settings", {
  id: typeId("booking_tax_settings"),
  taxPriceMode: text("tax_price_mode").notNull().default("inclusive"),
  taxPolicyProfileId: text("tax_policy_profile_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export type BookingTaxSettings = typeof bookingTaxSettings.$inferSelect
export type NewBookingTaxSettings = typeof bookingTaxSettings.$inferInsert

/**
 * 线路上线助理的默认值(单行表)。
 *
 * 只放「全公司一个值、几乎不变」的参数。供应商刻意不放在这里——它随每份
 * 资料变,做成纯设置项会逼着操作员「改设置 → 上传 → 改回来」,早晚挂错;
 * 这里存的是复核界面的默认选中项,人可在确认前当场改。
 */
export const routeImportSettings = pgTable("route_import_settings", {
  id: typeId("route_import_settings"),
  /** 建出产品的售价币种。助手不从文档里猜金额,但币种要有个准。 */
  sellCurrency: text("sell_currency"),
  /** 建出产品的时区。 */
  timezone: text("timezone"),
  /** 默认产品类型。跨包软引用,不建外键。 */
  productTypeId: text("product_type_id"),
  /** 复核界面默认选中的供应商。跨包软引用,不建外键。 */
  defaultSupplierId: text("default_supplier_id"),
  /** 成人起算年龄,默认 12 岁。不同产品口径不一。 */
  adultMinAge: integer("adult_min_age"),
  /** 儿童起算年龄,默认 2 岁,2 岁以下按婴儿另计。 */
  childMinAge: integer("child_min_age"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export type RouteImportSettings = typeof routeImportSettings.$inferSelect
export type NewRouteImportSettings = typeof routeImportSettings.$inferInsert
