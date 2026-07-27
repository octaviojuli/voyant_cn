/**
 * Operator settings data access — readers/writers + validation for the
 * operator profile, payment instructions/defaults, and booking-tax settings.
 *
 * Transport-agnostic (no Hono): a deployment mounts the HTTP routes over these
 * and injects the readers into the standard modules that need them (legal
 * contract variables, quotes proposal, commerce checkout tax, finance
 * booking-tax). The schema lives in `./schema`.
 */

import type { BookingTaxSettings, PaymentPolicy } from "@voyant-travel/finance"
import { desc, eq } from "drizzle-orm"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"
import { z } from "zod"

import {
  bookingTaxSettings,
  operatorPaymentDefaults,
  operatorPaymentInstructions,
  operatorProfile,
  routeImportSettings,
} from "./schema.js"

const depositRuleSchema = z.object({
  kind: z.enum(["none", "percent", "fixed_cents"]),
  percent: z.number().min(0).max(100).optional(),
  amountCents: z.number().int().min(0).optional(),
})

export const paymentPolicySchema = z.object({
  deposit: depositRuleSchema,
  minDaysBeforeDepartureForDeposit: z.number().int().min(0),
  balanceDueDaysBeforeDeparture: z.number().int().min(0),
  balanceDueMinDaysFromNow: z.number().int().min(0),
})

function parseStoredPaymentPolicy(value: unknown): PaymentPolicy | null {
  if (value == null) return null
  return paymentPolicySchema.parse(value)
}

export const updateOperatorProfileSchema = z.object({
  name: z.string().nullable().optional(),
  legalName: z.string().nullable().optional(),
  vatId: z.string().nullable().optional(),
  registrationNumber: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  website: z.string().url().nullable().optional().or(z.literal("")),
  license: z.string().nullable().optional(),
  licenseAuthority: z.string().nullable().optional(),
  signatoryName: z.string().nullable().optional(),
  signatoryRole: z.string().nullable().optional(),
})

export const updateOperatorPaymentInstructionsSchema = z.object({
  bankTransferBeneficiary: z.string().nullable().optional(),
  iban: z.string().nullable().optional(),
  bank: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export const updateOperatorPaymentDefaultsSchema = z.object({
  customerPaymentPolicy: paymentPolicySchema.nullable().optional(),
  bookingCheckoutUrlTemplate: z.string().trim().nullable().optional(),
  invoicePayUrlTemplate: z.string().trim().nullable().optional(),
})

export const updateOperatorSettingsSchema = updateOperatorProfileSchema
  .merge(updateOperatorPaymentInstructionsSchema)
  .merge(updateOperatorPaymentDefaultsSchema)

export type UpdateOperatorProfileInput = z.infer<typeof updateOperatorProfileSchema>
export type UpdateOperatorPaymentInstructionsInput = z.infer<
  typeof updateOperatorPaymentInstructionsSchema
>
export type UpdateOperatorPaymentDefaultsInput = z.infer<typeof updateOperatorPaymentDefaultsSchema>
export type UpdateOperatorSettingsInput = z.infer<typeof updateOperatorSettingsSchema>

type OperatorProfileRow = typeof operatorProfile.$inferSelect
type OperatorPaymentInstructionsRow = typeof operatorPaymentInstructions.$inferSelect
type OperatorPaymentDefaultsRow = typeof operatorPaymentDefaults.$inferSelect

export async function getOperatorProfile(db: PostgresJsDatabase) {
  const [row] = await db
    .select()
    .from(operatorProfile)
    .orderBy(desc(operatorProfile.createdAt))
    .limit(1)
  return row ?? null
}

export async function upsertOperatorProfile(
  db: PostgresJsDatabase,
  patch: UpdateOperatorProfileInput,
) {
  const existing = await getOperatorProfile(db)
  if (!existing) {
    const [created] = await db.insert(operatorProfile).values(patch).returning()
    return created ?? null
  }

  const [updated] = await db
    .update(operatorProfile)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(operatorProfile.id, existing.id))
    .returning()
  return updated ?? null
}

export async function getOperatorPaymentInstructions(db: PostgresJsDatabase) {
  const [row] = await db
    .select()
    .from(operatorPaymentInstructions)
    .orderBy(desc(operatorPaymentInstructions.createdAt))
    .limit(1)
  return row ?? null
}

export async function upsertOperatorPaymentInstructions(
  db: PostgresJsDatabase,
  patch: UpdateOperatorPaymentInstructionsInput,
) {
  const existing = await getOperatorPaymentInstructions(db)
  if (!existing) {
    const [created] = await db.insert(operatorPaymentInstructions).values(patch).returning()
    return created ?? null
  }

  const [updated] = await db
    .update(operatorPaymentInstructions)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(operatorPaymentInstructions.id, existing.id))
    .returning()
  return updated ?? null
}

export async function getOperatorPaymentDefaults(db: PostgresJsDatabase) {
  const [row] = await db
    .select()
    .from(operatorPaymentDefaults)
    .orderBy(desc(operatorPaymentDefaults.createdAt))
    .limit(1)
  return row ?? null
}

export async function upsertOperatorPaymentDefaults(
  db: PostgresJsDatabase,
  patch: UpdateOperatorPaymentDefaultsInput,
) {
  const existing = await getOperatorPaymentDefaults(db)
  const values: Partial<typeof operatorPaymentDefaults.$inferInsert> = {}

  if ("customerPaymentPolicy" in patch) {
    values.customerPaymentPolicy = (patch.customerPaymentPolicy ?? null) as unknown
  }
  if ("bookingCheckoutUrlTemplate" in patch) {
    values.bookingCheckoutUrlTemplate = patch.bookingCheckoutUrlTemplate?.trim() || null
  }
  if ("invoicePayUrlTemplate" in patch) {
    values.invoicePayUrlTemplate = patch.invoicePayUrlTemplate?.trim() || null
  }

  if (!existing) {
    const [created] = await db.insert(operatorPaymentDefaults).values(values).returning()
    return created ?? null
  }

  if (Object.keys(values).length === 0) return existing

  const [updated] = await db
    .update(operatorPaymentDefaults)
    .set({
      ...values,
      updatedAt: new Date(),
    } as Partial<typeof operatorPaymentDefaults.$inferInsert>)
    .where(eq(operatorPaymentDefaults.id, existing.id))
    .returning()
  return updated ?? null
}

export async function resolveOperatorDefaultPaymentPolicy(
  db: PostgresJsDatabase,
): Promise<PaymentPolicy | null> {
  const defaults = await getOperatorPaymentDefaults(db)
  return parseStoredPaymentPolicy(defaults?.customerPaymentPolicy)
}

export async function resolveBookingTaxSettings(
  db: PostgresJsDatabase,
): Promise<BookingTaxSettings> {
  const [settings] = await db
    .select()
    .from(bookingTaxSettings)
    .orderBy(desc(bookingTaxSettings.createdAt))
    .limit(1)

  return {
    taxPriceMode: settings?.taxPriceMode === "exclusive" ? "exclusive" : "inclusive",
    taxPolicyProfileId: settings?.taxPolicyProfileId ?? null,
  }
}

export async function updateBookingTaxSettings(
  db: PostgresJsDatabase,
  patch: BookingTaxSettings,
): Promise<BookingTaxSettings> {
  const [existing] = await db
    .select()
    .from(bookingTaxSettings)
    .orderBy(desc(bookingTaxSettings.createdAt))
    .limit(1)

  if (!existing) {
    const [created] = await db
      .insert(bookingTaxSettings)
      .values({
        taxPriceMode: patch.taxPriceMode === "exclusive" ? "exclusive" : "inclusive",
        taxPolicyProfileId: patch.taxPolicyProfileId ?? null,
      })
      .returning()
    return {
      taxPriceMode: created?.taxPriceMode === "exclusive" ? "exclusive" : "inclusive",
      taxPolicyProfileId: created?.taxPolicyProfileId ?? null,
    }
  }

  const [updated] = await db
    .update(bookingTaxSettings)
    .set({
      taxPriceMode: patch.taxPriceMode === "exclusive" ? "exclusive" : "inclusive",
      taxPolicyProfileId: patch.taxPolicyProfileId ?? null,
      updatedAt: new Date(),
    })
    .where(eq(bookingTaxSettings.id, existing.id))
    .returning()

  return {
    taxPriceMode: updated?.taxPriceMode === "exclusive" ? "exclusive" : "inclusive",
    taxPolicyProfileId: updated?.taxPolicyProfileId ?? null,
  }
}

export function toPublicOperatorProfile(
  row: OperatorProfileRow,
  defaults?: OperatorPaymentDefaultsRow | null,
): PublicOperatorProfile {
  return {
    name: row.name ?? "",
    legalName: row.legalName ?? "",
    address: row.address ?? "",
    phone: row.phone ?? "",
    email: row.email ?? "",
    website: row.website ?? "",
    license: row.license ?? "",
    licenseAuthority: row.licenseAuthority ?? "",
    customerPaymentPolicy: parseStoredPaymentPolicy(defaults?.customerPaymentPolicy),
    bookingCheckoutUrlTemplate: defaults?.bookingCheckoutUrlTemplate ?? null,
    invoicePayUrlTemplate: defaults?.invoicePayUrlTemplate ?? null,
  }
}

export interface PublicOperatorProfile {
  name: string
  legalName: string
  address: string
  phone: string
  email: string
  website: string
  license: string
  licenseAuthority: string
  customerPaymentPolicy: PaymentPolicy | null
  bookingCheckoutUrlTemplate: string | null
  invoicePayUrlTemplate: string | null
}

type CombinedOperatorSettings = Partial<OperatorProfileRow> &
  Partial<OperatorPaymentInstructionsRow> & {
    customerPaymentPolicy: PaymentPolicy | null
    bookingCheckoutUrlTemplate: string | null
    invoicePayUrlTemplate: string | null
  }

function combineOperatorSettings(
  profile: OperatorProfileRow | null,
  instructions: OperatorPaymentInstructionsRow | null,
  defaults: OperatorPaymentDefaultsRow | null,
): CombinedOperatorSettings | null {
  if (!profile && !instructions && !defaults) return null
  return {
    ...(profile ?? {}),
    bankTransferBeneficiary: instructions?.bankTransferBeneficiary ?? null,
    iban: instructions?.iban ?? null,
    bank: instructions?.bank ?? null,
    notes: instructions?.notes ?? null,
    customerPaymentPolicy: parseStoredPaymentPolicy(defaults?.customerPaymentPolicy),
    bookingCheckoutUrlTemplate: defaults?.bookingCheckoutUrlTemplate ?? null,
    invoicePayUrlTemplate: defaults?.invoicePayUrlTemplate ?? null,
  }
}

export async function getOperatorSettings(db: PostgresJsDatabase) {
  const [profile, instructions, defaults] = await Promise.all([
    getOperatorProfile(db),
    getOperatorPaymentInstructions(db),
    getOperatorPaymentDefaults(db),
  ])
  return combineOperatorSettings(profile, instructions, defaults)
}

export async function upsertOperatorSettings(
  db: PostgresJsDatabase,
  patch: UpdateOperatorSettingsInput,
) {
  const paymentDefaultsPatch: UpdateOperatorPaymentDefaultsInput = {}
  if ("customerPaymentPolicy" in patch) {
    paymentDefaultsPatch.customerPaymentPolicy = patch.customerPaymentPolicy
  }
  if ("bookingCheckoutUrlTemplate" in patch) {
    paymentDefaultsPatch.bookingCheckoutUrlTemplate = patch.bookingCheckoutUrlTemplate
  }
  if ("invoicePayUrlTemplate" in patch) {
    paymentDefaultsPatch.invoicePayUrlTemplate = patch.invoicePayUrlTemplate
  }

  const [profile, instructions, defaults] = await Promise.all([
    upsertOperatorProfile(db, {
      name: patch.name,
      legalName: patch.legalName,
      vatId: patch.vatId,
      registrationNumber: patch.registrationNumber,
      address: patch.address,
      phone: patch.phone,
      email: patch.email,
      website: patch.website,
      license: patch.license,
      licenseAuthority: patch.licenseAuthority,
      signatoryName: patch.signatoryName,
      signatoryRole: patch.signatoryRole,
    }),
    upsertOperatorPaymentInstructions(db, {
      bankTransferBeneficiary: patch.bankTransferBeneficiary,
      iban: patch.iban,
      bank: patch.bank,
      notes: patch.notes,
    }),
    upsertOperatorPaymentDefaults(db, paymentDefaultsPatch),
  ])
  return combineOperatorSettings(profile, instructions, defaults)
}

export function toPublicOperatorSettings(
  row: Awaited<ReturnType<typeof getOperatorSettings>>,
): PublicOperatorProfile {
  return {
    name: row?.name ?? "",
    legalName: row?.legalName ?? "",
    address: row?.address ?? "",
    phone: row?.phone ?? "",
    email: row?.email ?? "",
    website: row?.website ?? "",
    license: row?.license ?? "",
    licenseAuthority: row?.licenseAuthority ?? "",
    customerPaymentPolicy: row?.customerPaymentPolicy ?? null,
    bookingCheckoutUrlTemplate: row?.bookingCheckoutUrlTemplate ?? null,
    invoicePayUrlTemplate: row?.invoicePayUrlTemplate ?? null,
  }
}

/** 线路上线助理默认值的可改字段。全部可空:未设置即用系统兜底。 */
export const updateRouteImportSettingsSchema = z.object({
  sellCurrency: z.string().min(3).max(3).nullish(),
  timezone: z.string().max(64).nullish(),
  productTypeId: z.string().max(64).nullish(),
  defaultSupplierId: z.string().max(64).nullish(),
  adultMinAge: z.number().int().min(0).max(99).nullish(),
  childMinAge: z.number().int().min(0).max(99).nullish(),
})

export type UpdateRouteImportSettingsInput = z.infer<typeof updateRouteImportSettingsSchema>

export async function getRouteImportSettings(db: PostgresJsDatabase) {
  const [row] = await db
    .select()
    .from(routeImportSettings)
    .orderBy(desc(routeImportSettings.createdAt))
    .limit(1)
  return row ?? null
}

export async function upsertRouteImportSettings(
  db: PostgresJsDatabase,
  patch: UpdateRouteImportSettingsInput,
) {
  const existing = await getRouteImportSettings(db)
  const values: Partial<typeof routeImportSettings.$inferInsert> = {}

  // 只写请求里出现过的键。缺省与显式置空是两回事:前者保持原值,后者清空。
  if ("sellCurrency" in patch)
    values.sellCurrency = patch.sellCurrency?.trim().toUpperCase() || null
  if ("timezone" in patch) values.timezone = patch.timezone?.trim() || null
  if ("productTypeId" in patch) values.productTypeId = patch.productTypeId?.trim() || null
  if ("defaultSupplierId" in patch) {
    values.defaultSupplierId = patch.defaultSupplierId?.trim() || null
  }
  if ("adultMinAge" in patch) values.adultMinAge = patch.adultMinAge ?? null
  if ("childMinAge" in patch) values.childMinAge = patch.childMinAge ?? null

  if (!existing) {
    const [created] = await db.insert(routeImportSettings).values(values).returning()
    return created ?? null
  }

  const [updated] = await db
    .update(routeImportSettings)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(routeImportSettings.id, existing.id))
    .returning()
  return updated ?? null
}

/** 助手的兜底默认值。设置页没填时用它,不留空导致建库失败。 */
export const ROUTE_IMPORT_FALLBACKS = {
  sellCurrency: "CNY",
  timezone: "Asia/Shanghai",
  adultMinAge: 12,
  childMinAge: 2,
} as const

/**
 * 解析出建产品要用的一组值:设置优先,缺项落到兜底。
 *
 * 单独成函数,是为了让接口与界面看到的是同一套解析结果——两边各算一次
 * 迟早会各说一套。
 */
export async function resolveRouteImportDefaults(db: PostgresJsDatabase) {
  const row = await getRouteImportSettings(db)
  return {
    sellCurrency: row?.sellCurrency ?? ROUTE_IMPORT_FALLBACKS.sellCurrency,
    timezone: row?.timezone ?? ROUTE_IMPORT_FALLBACKS.timezone,
    productTypeId: row?.productTypeId ?? null,
    defaultSupplierId: row?.defaultSupplierId ?? null,
    adultMinAge: row?.adultMinAge ?? ROUTE_IMPORT_FALLBACKS.adultMinAge,
    childMinAge: row?.childMinAge ?? ROUTE_IMPORT_FALLBACKS.childMinAge,
  }
}
