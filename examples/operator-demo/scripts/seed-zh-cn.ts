// @ts-nocheck -- legacy seed fixture typing cleanup is tracked separately from demo data edits.
/**
 * Operator zh-CN demo seed — additive Chinese-market fixtures.
 *
 * Layers a Simplified Chinese demo scenario on top of the base English seed:
 * a CN market (zh-CN / CNY / Asia/Shanghai), one Chinese supplier with a CNY
 * rate, two Chinese products with 成人/儿童 units + CNY pricing + 30 days of
 * availability, one Yangtze river cruise (ship, sailings, cabins, CNY
 * prices), two CRM people + one organization, two bookings (已确认 with a
 * payment schedule, 预留中 hold), and the zh-CN contract/invoice/notification
 * templates from `seed-zh-cn-templates.ts`. Fixture data lives in
 * `seed-zh-cn-data.ts`; fixture keys mirror column names so rows are built by
 * spreading the fixture and adding ids/relations (drizzle ignores extra keys).
 *
 * ADDITIVE ONLY — nothing is truncated. The base seed MUST have run first
 * (`pnpm seed -- --confirm`); this script verifies that cheaply at startup
 * (seed owner user + base markets) and exits with a clear message otherwise.
 *
 * Run:   pnpm seed:zh-cn -- --confirm
 * Target: the DATABASE_URL in starters/operator/.env
 */

import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import {
  bookingItems,
  bookingItemTravelers,
  bookingNotes,
  bookings,
  bookingTravelers,
} from "@voyant-travel/bookings/schema"
import {
  marketCurrencies,
  marketLocales,
  markets,
  optionPriceRules,
  optionUnitPriceRules,
  priceCatalogs,
} from "@voyant-travel/commerce"
import { newId } from "@voyant-travel/db/lib/typeid"
import { authUser } from "@voyant-travel/db/schema/iam"
import { bookingDistributionDetails } from "@voyant-travel/distribution"
import {
  bookingGuarantees,
  bookingPaymentSchedules,
  taxClasses,
} from "@voyant-travel/finance/schema"
import { identityContactPoints } from "@voyant-travel/identity/schema"
import {
  bookingItemProductDetails,
  bookingProductDetails,
} from "@voyant-travel/inventory/booking-extension"
import {
  optionUnits,
  productDays,
  productItineraries,
  productOptions,
  products,
  productVersions,
} from "@voyant-travel/inventory/schema"
import { availabilitySlots, availabilityStartTimes } from "@voyant-travel/operations"
import { bookingQuoteDetails } from "@voyant-travel/quotes/booking-extension"
import { pipelines, quotes, stages } from "@voyant-travel/quotes/schema"
import { organizations, people } from "@voyant-travel/relationships/schema"
import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import {
  type Db,
  daysFromNow,
  seedCnCruise,
  seedCnSupplier,
  yyyyMmDd,
  ZH_BOOKINGS,
  ZH_CRUISE,
  ZH_MARKET,
  ZH_ORG,
  ZH_PEOPLE,
  ZH_PIPELINE_L10N,
  ZH_PRICE_CATALOG,
  ZH_PRODUCTS,
  ZH_SUPPLIER,
  ZH_UNITS,
} from "./seed-zh-cn-data"
import { seedZhCnTemplates } from "./seed-zh-cn-templates"

// ---------- Env & args (mirrors seed.ts) ----------

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const TEMPLATE_DIR = resolve(SCRIPT_DIR, "..")

function parseDotEnv(path: string): Record<string, string> {
  const out: Record<string, string> = {}
  try {
    const body = readFileSync(path, "utf8")
    for (const rawLine of body.split("\n")) {
      const line = rawLine.trim()
      if (!line || line.startsWith("#")) continue
      const eq = line.indexOf("=")
      if (eq === -1) continue
      const key = line.slice(0, eq).trim()
      const value = line
        .slice(eq + 1)
        .trim()
        .replace(/^"(.*)"$/, "$1")
      out[key] = value
    }
  } catch {
    // file missing — fine
  }
  return out
}

function loadEnv(): Record<string, string> {
  const merged: Record<string, string> = {}
  const files = [
    resolve(TEMPLATE_DIR, "../../.env"),
    resolve(TEMPLATE_DIR, "../../.env.local"),
    resolve(TEMPLATE_DIR, ".env"),
  ]
  for (const file of files) {
    const parsed = parseDotEnv(file)
    for (const [k, v] of Object.entries(parsed)) {
      merged[k] = v
    }
  }
  return merged
}

const args = process.argv.slice(2)
const confirmed = args.includes("--confirm") || args.includes("-y")
const env = { ...loadEnv(), ...process.env }
const DATABASE_URL = env.DATABASE_URL

/** True when this file is the executed entry point (not merely imported). */
const isMainEntry =
  typeof process.argv[1] === "string" && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

// ---------- Preflight: base seed must exist, zh-CN seed must not ----------

/** The base seed's fixed owner-user id (see seed.ts USERS). */
const BASE_OWNER_USER_ID = "user_owner"

async function preflight(db: Db): Promise<{ ownerUserId: string; taxClassId: string | null }> {
  const owner = await db
    .select({ id: authUser.id })
    .from(authUser)
    .where(eq(authUser.id, BASE_OWNER_USER_ID))
    .limit(1)
  const baseMarkets = await db.select({ id: markets.id }).from(markets).limit(1)
  if (owner.length === 0 || baseMarkets.length === 0) {
    console.error("✗ Base seed not found (missing seed owner user / markets).")
    console.error("  This script is additive — run `pnpm seed -- --confirm` first, then retry.")
    process.exit(1)
  }

  const cnMarket = await db
    .select({ id: markets.id })
    .from(markets)
    .where(eq(markets.code, ZH_MARKET.code))
    .limit(1)
  if (cnMarket.length > 0) {
    console.error(`✗ Market ${ZH_MARKET.code} already exists — the zh-CN seed appears to have run.`)
    console.error(
      "  Re-run the base seed (`pnpm seed -- --confirm`) for a clean slate, then retry.",
    )
    process.exit(1)
  }

  const [taxClass] = await db.select({ id: taxClasses.id }).from(taxClasses).limit(1)
  return { ownerUserId: owner[0]!.id, taxClassId: taxClass?.id ?? null }
}

// ---------- 1. CN market ----------

async function seedCnMarket(db: Db): Promise<string> {
  console.log("→ seeding CN market (zh-CN / CNY / Asia/Shanghai)…")
  const marketId = newId("markets")
  await db.insert(markets).values({ id: marketId, ...ZH_MARKET, status: "active" })
  await db.insert(marketLocales).values(
    ["zh-CN", "en-GB"].map((languageTag, i) => ({
      id: newId("market_locales"),
      marketId,
      languageTag,
      isDefault: i === 0,
      sortOrder: i,
      active: true,
    })),
  )
  await db.insert(marketCurrencies).values({
    id: newId("market_currencies"),
    marketId,
    currencyCode: "CNY",
    isDefault: true,
    isSettlement: true,
    isReporting: true,
    sortOrder: 0,
    active: true,
  })
  return marketId
}

// ---------- 2. Products + units + CNY pricing + availability ----------
// (supplier + cruise insert helpers live in seed-zh-cn-data.ts)

async function seedCnProducts(
  db: Db,
  ctx: { ownerUserId: string; taxClassId: string | null; supplierId: string },
): Promise<string[]> {
  console.log("→ seeding Chinese products + 成人/儿童 units + CNY pricing…")

  const catalogId = newId("price_catalogs")
  await db
    .insert(priceCatalogs)
    .values({ id: catalogId, ...ZH_PRICE_CATALOG, catalogType: "public", active: true })

  const productIds: string[] = []
  for (const p of ZH_PRODUCTS) {
    const productId = newId("products")
    productIds.push(productId)
    await db.insert(products).values({
      id: productId,
      ...p,
      bookingMode: "date",
      capacityMode: "limited",
      visibility: "public",
      sellCurrency: "CNY",
      marginPercent: Math.round(
        ((p.sellAmountCents - p.costAmountCents) / p.sellAmountCents) * 100,
      ),
      supplierId: ctx.supplierId,
      taxClassId: ctx.taxClassId,
      defaultLanguageTag: "zh-CN",
      timezone: "Asia/Shanghai",
      pax: 2,
      status: "active",
      activated: true,
    })

    await db.insert(productVersions).values({
      id: newId("product_versions"),
      productId,
      versionNumber: 1,
      snapshot: { productId, days: p.days, currency: "CNY" },
      authorId: ctx.ownerUserId,
      notes: "v1 —— 中文演示种子",
    })

    const itineraryId = newId("product_itineraries")
    await db
      .insert(productItineraries)
      .values({ id: itineraryId, productId, name: "默认行程", isDefault: true, sortOrder: 0 })
    await db.insert(productDays).values(
      p.itinerary.map((day, idx) => ({
        id: newId("product_days"),
        itineraryId,
        dayNumber: idx + 1,
        ...day,
      })),
    )

    for (const [idx, opt] of p.options.entries()) {
      const optionId = newId("product_options")
      await db.insert(productOptions).values({
        id: optionId,
        productId,
        ...opt,
        isDefault: idx === 0,
        status: "active",
        sortOrder: idx,
      })

      const unitIds = ZH_UNITS.map(() => newId("option_units"))
      await db.insert(optionUnits).values(
        ZH_UNITS.map((unit, i) => ({
          id: unitIds[i]!,
          optionId,
          ...unit,
          isRequired: unit.code === "ADULT",
        })),
      )

      const ruleId = newId("option_price_rules")
      await db.insert(optionPriceRules).values({
        id: ruleId,
        productId,
        optionId,
        priceCatalogId: catalogId,
        name: "标准售价",
        pricingMode: "per_person",
        baseSellAmountCents: p.sellAmountCents,
        baseCostAmountCents: p.costAmountCents,
        allPricingCategories: true,
        isDefault: true,
        active: true,
      })
      await db.insert(optionUnitPriceRules).values(
        ZH_UNITS.map((unit, i) => ({
          id: newId("option_unit_price_rules"),
          optionPriceRuleId: ruleId,
          optionId,
          unitId: unitIds[i]!,
          pricingMode: "per_unit",
          sellAmountCents: Math.round(p.sellAmountCents * unit.priceMultiplier),
          costAmountCents: Math.round(p.costAmountCents * unit.priceMultiplier),
          active: true,
          sortOrder: unit.sortOrder,
        })),
      )
    }

    // Availability — one start time + 30 days of slots per product
    const startTimeId = newId("availability_start_times")
    await db.insert(availabilityStartTimes).values({
      id: startTimeId,
      productId,
      startTimeLocal: p.startTimeLocal,
      label: p.startTimeLabel,
      durationMinutes: p.days * 24 * 60,
      sortOrder: 0,
      active: true,
    })
    const [hour, minute] = p.startTimeLocal.split(":").map(Number) as [number, number]
    await db.insert(availabilitySlots).values(
      Array.from({ length: 30 }, (_, i) => {
        const startsAt = daysFromNow(i)
        startsAt.setUTCHours(hour, minute, 0, 0)
        const endsAt = new Date(startsAt)
        endsAt.setUTCHours(endsAt.getUTCHours() + p.days * 24)
        return {
          id: newId("availability_slots"),
          productId,
          dateLocal: yyyyMmDd(startsAt),
          startsAt,
          endsAt,
          timezone: "Asia/Shanghai",
          startTimeId,
          initialPax: 30,
          remainingPax: 30 - (i % 6),
          status: i % 13 === 0 ? "sold_out" : "open",
        }
      }),
    )
  }
  return productIds
}

// ---------- 3. CRM people + organization ----------

async function seedCnCrm(
  db: Db,
  ctx: { ownerUserId: string },
): Promise<{ orgId: string; personIds: string[] }> {
  console.log("→ seeding Chinese CRM people + organization…")

  const orgId = newId("organizations")
  await db
    .insert(organizations)
    .values({ id: orgId, ...ZH_ORG, status: "active", ownerId: ctx.ownerUserId })

  const personIds: string[] = []
  for (const person of ZH_PEOPLE) {
    const personId = newId("people")
    personIds.push(personId)
    await db.insert(people).values({
      id: personId,
      firstName: person.firstName,
      lastName: person.lastName,
      organizationId: person.inOrg ? orgId : null,
      jobTitle: person.jobTitle,
      relation: person.relation,
      status: "active",
      ownerId: ctx.ownerUserId,
    })
    await db.insert(identityContactPoints).values(
      [
        { kind: "email", value: person.email, isPrimary: true },
        { kind: "phone", value: person.phone, isPrimary: false },
      ].map((cp) => ({
        id: newId("identity_contact_points"),
        entityType: "person",
        entityId: personId,
        ...cp,
      })),
    )
  }
  return { orgId, personIds }
}

// ---------- 3b. 销售管道本地化(基础种子英文管道 → 中文) ----------
// 只改展示文案(管道名/阶段名/演示报价标题),按英文原名匹配;已改过或
// 用户自行改名的记录匹配不到就跳过,幂等且不会覆盖人工修改。

async function localizeQuotePipeline(db: Db): Promise<number> {
  console.log("→ localizing base quote pipeline to Chinese…")
  let touched = 0
  const { pipeline, stages: stageNames, quoteTitles } = ZH_PIPELINE_L10N
  const [pipelineRow] = await db
    .update(pipelines)
    .set({ name: pipeline.to })
    .where(eq(pipelines.name, pipeline.from))
    .returning({ id: pipelines.id })
  if (pipelineRow) touched++
  for (const s of stageNames) {
    const rows = await db
      .update(stages)
      .set({ name: s.to })
      .where(eq(stages.name, s.from))
      .returning({ id: stages.id })
    touched += rows.length
  }
  for (const q of quoteTitles) {
    const rows = await db
      .update(quotes)
      .set({ title: q.to })
      .where(eq(quotes.title, q.from))
      .returning({ id: quotes.id })
    touched += rows.length
  }
  return touched
}

// ---------- 4. Bookings (已确认 + 预留中) ----------

async function seedCnBookings(
  db: Db,
  ctx: { ownerUserId: string; orgId: string; personIds: string[]; productIds: string[] },
): Promise<string[]> {
  console.log("→ seeding Chinese bookings (已确认 + 预留中)…")

  const bookingIds: string[] = []
  for (const b of ZH_BOOKINGS) {
    const bookingId = newId("bookings")
    bookingIds.push(bookingId)
    const productId = ctx.productIds[b.productIdx]!
    const product = ZH_PRODUCTS[b.productIdx]!
    const personId = ctx.personIds[b.personIdx]!
    const person = ZH_PEOPLE[b.personIdx]!
    const serviceDate = daysFromNow(b.daysFromNow)
    const endServiceDate = daysFromNow(b.daysFromNow + product.days)

    await db.insert(bookings).values({
      id: bookingId,
      bookingNumber: b.number,
      status: b.status,
      sourceType: "manual",
      personId,
      organizationId: b.withOrg ? ctx.orgId : null,
      sellCurrency: b.currency,
      baseCurrency: b.currency,
      sellAmountCents: b.sellCents,
      baseSellAmountCents: b.sellCents,
      costAmountCents: b.costCents,
      baseCostAmountCents: b.costCents,
      marginPercent: Math.round(((b.sellCents - b.costCents) / b.sellCents) * 100),
      startDate: yyyyMmDd(serviceDate),
      endDate: yyyyMmDd(endServiceDate),
      pax: b.pax,
      internalNotes: b.internalNotes,
      confirmedAt: b.status === "confirmed" ? daysFromNow(-2) : null,
      holdExpiresAt: b.status === "on_hold" ? daysFromNow(5) : null,
    })

    await db.insert(bookingQuoteDetails).values({ bookingId, quoteId: null, quoteVersionId: null })
    await db.insert(bookingProductDetails).values({ bookingId, productId })
    await db
      .insert(bookingDistributionDetails)
      .values({ bookingId, channelId: null, paymentOwner: "operator" })

    const travelerIds = b.travelers.map(() => newId("booking_travelers"))
    await db.insert(bookingTravelers).values(
      b.travelers.map((t, idx) => ({
        id: travelerIds[idx]!,
        bookingId,
        personId: idx === 0 ? personId : null,
        participantType: "traveler",
        travelerCategory: t.category,
        firstName: t.firstName,
        lastName: t.lastName,
        email: idx === 0 ? person.email : null,
        phone: idx === 0 ? person.phone : null,
        isPrimary: idx === 0,
      })),
    )

    const itemId = newId("booking_items")
    await db.insert(bookingItems).values({
      id: itemId,
      bookingId,
      itemType: "unit",
      status: "confirmed",
      title: product.name,
      sellCurrency: b.currency,
      unitSellAmountCents: Math.round(b.sellCents / b.pax),
      totalSellAmountCents: b.sellCents,
      costCurrency: b.currency,
      unitCostAmountCents: Math.round(b.costCents / b.pax),
      totalCostAmountCents: b.costCents,
      quantity: b.pax,
      productId,
      serviceDate: yyyyMmDd(serviceDate),
      startsAt: serviceDate,
      endsAt: endServiceDate,
    })
    await db.insert(bookingItemProductDetails).values({ bookingItemId: itemId, productId })
    await db.insert(bookingItemTravelers).values({
      id: newId("booking_item_travelers"),
      bookingItemId: itemId,
      travelerId: travelerIds[0]!,
      role: "traveler",
      isPrimary: true,
    })
    await db
      .insert(bookingNotes)
      .values({ id: newId("booking_notes"), bookingId, authorId: ctx.ownerUserId, content: b.note })

    // 付款计划 — the confirmed booking carries a deposit-paid / balance-pending
    // schedule plus a bank-transfer guarantee; the hold has no schedule yet.
    if (b.status === "confirmed") {
      const depositCents = Math.round(b.sellCents * 0.25)
      await db.insert(bookingPaymentSchedules).values(
        [
          {
            type: "deposit",
            dueDate: yyyyMmDd(daysFromNow(-3)),
            amountCents: depositCents,
            status: "paid",
          },
          {
            type: "balance",
            dueDate: yyyyMmDd(daysFromNow(b.daysFromNow - 14)),
            amountCents: b.sellCents - depositCents,
            status: "pending",
          },
        ].map((row) => ({
          id: newId("booking_payment_schedules"),
          bookingId,
          currency: b.currency,
          ...row,
        })),
      )
      await db.insert(bookingGuarantees).values({
        id: newId("booking_guarantees"),
        bookingId,
        guaranteeType: "bank_transfer",
        currency: b.currency,
        amountCents: depositCents,
        status: "active",
        notes: "已收定金(银行转账)",
      })
    }
  }
  return bookingIds
}

// ---------- Run ----------

async function main() {
  console.log(`zh-CN additive seed → ${DATABASE_URL}`)
  console.time("seed:zh-cn")

  const sql = postgres(DATABASE_URL, { max: 1, onnotice: () => {} })
  const db = drizzle(sql)
  try {
    const { ownerUserId, taxClassId } = await preflight(db)

    const marketId = await seedCnMarket(db)
    const supplierId = await seedCnSupplier(db)
    const productIds = await seedCnProducts(db, { ownerUserId, taxClassId, supplierId })
    const cruiseId = await seedCnCruise(db, { supplierId })
    const { orgId, personIds } = await seedCnCrm(db, { ownerUserId })
    const pipelineTouched = await localizeQuotePipeline(db)
    const bookingIds = await seedCnBookings(db, { ownerUserId, orgId, personIds, productIds })
    const templates = await seedZhCnTemplates(db, {})

    console.timeEnd("seed:zh-cn")
    const summary = [
      `市场:${ZH_MARKET.name}(${ZH_MARKET.code} · zh-CN · CNY)→ ${marketId}`,
      `供应商:${ZH_SUPPLIER.supplier.name} → ${supplierId}`,
      ...ZH_PRODUCTS.map(
        (p, i) => `产品:${p.name}(30 天班期 · 成人/儿童 CNY 价目)→ ${productIds[i]}`,
      ),
      `邮轮:${ZH_CRUISE.cruise.name}(${ZH_CRUISE.ship.name} · ${ZH_CRUISE.sailingOffsets.length} 个班期)→ ${cruiseId}`,
      `销售管道:${ZH_PIPELINE_L10N.pipeline.to}(含阶段/演示报价改中文,更新 ${pipelineTouched} 条)`,
      `组织:${ZH_ORG.name} → ${orgId}`,
      ...ZH_PEOPLE.map((person, i) => `联系人:${person.fullName} → ${personIds[i]}`),
      ...ZH_BOOKINGS.map(
        (b, i) =>
          `订单:${b.number}(${b.status === "confirmed" ? "已确认 · 含付款计划" : "预留中"})→ ${bookingIds[i]}`,
      ),
      `模板:合同 ${templates.contractTemplateId} · 账单 ${templates.invoiceTemplateId} · 通知 ${templates.notificationTemplateIds.join(", ")}`,
    ]
    console.log(
      [
        "",
        "✓ zh-CN 演示数据已就绪(叠加在基础种子之上):",
        ...summary.map((line) => `    ${line}`),
      ].join("\n"),
    )
  } finally {
    await sql.end()
  }
}

if (isMainEntry) {
  if (!DATABASE_URL) {
    console.error("DATABASE_URL not set (checked .env and process.env)")
    process.exit(1)
  }
  if (!confirmed) {
    console.error("Refusing to seed without --confirm (additive zh-CN demo data).")
    console.error("Target:", DATABASE_URL)
    process.exit(1)
  }
  main().catch((err) => {
    console.error("\n✗ zh-CN seed failed:", err)
    process.exit(1)
  })
}
