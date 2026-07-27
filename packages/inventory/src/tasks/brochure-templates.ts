import {
  renderStructuredTemplate,
  type StructuredTemplateBodyFormat,
} from "@voyant-travel/utils/template-renderer"
import { and, asc, eq } from "drizzle-orm"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"

import {
  productDayServices,
  productDays,
  productItineraries,
  productMedia,
  productPaxPricingTiers,
  products,
} from "../schema.js"
import { resolveBrochureLabels } from "./brochure-labels.js"

type ProductDayRecord = typeof productDays.$inferSelect
type ProductDayServiceRecord = typeof productDayServices.$inferSelect
type ProductMediaRecord = typeof productMedia.$inferSelect
type ProductPaxPricingTierRecord = typeof productPaxPricingTiers.$inferSelect
type ProductRecord = typeof products.$inferSelect

export interface ProductBrochureDayContext extends ProductDayRecord {
  services: Array<ProductDayServiceRecord>
}

export interface ProductBrochureTemplateContext {
  product: ProductRecord
  days: ProductBrochureDayContext[]
  media: ProductMediaRecord[]
  pricingTiers: ProductPaxPricingTierRecord[]
  generatedAt: Date
}

type TemplateResolver<T> = T | ((context: ProductBrochureTemplateContext) => Promise<T> | T)

export interface ProductBrochureTemplateDefinition {
  bodyFormat: StructuredTemplateBodyFormat
  body: TemplateResolver<string>
  variables?:
    | Record<string, unknown>
    | ((
        context: ProductBrochureTemplateContext,
      ) => Promise<Record<string, unknown>> | Record<string, unknown>)
  title?: TemplateResolver<string>
  filename?: TemplateResolver<string>
  metadataLines?: TemplateResolver<string[]>
}

export interface RenderedProductBrochureTemplate {
  body: string
  bodyFormat: StructuredTemplateBodyFormat
  title: string
  filename: string
  variables: Record<string, unknown>
  metadataLines: string[]
}

async function resolveTemplateValue<T>(
  value: TemplateResolver<T> | undefined,
  context: ProductBrochureTemplateContext,
): Promise<T | undefined> {
  if (typeof value === "function") {
    return await (value as (context: ProductBrochureTemplateContext) => Promise<T> | T)(context)
  }

  return value
}

function normalizeFilename(value: string | undefined, productName: string) {
  const fallback = `${productName.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`
  const trimmed = value?.trim()
  return trimmed || fallback
}

export async function loadProductBrochureTemplateContext(
  db: PostgresJsDatabase,
  productId: string,
): Promise<ProductBrochureTemplateContext> {
  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1)

  if (!product) {
    throw new Error(`Product not found: ${productId}`)
  }

  const [media, pricingTiers] = await Promise.all([
    db
      .select()
      .from(productMedia)
      .where(eq(productMedia.productId, productId))
      .orderBy(asc(productMedia.sortOrder), asc(productMedia.createdAt)),
    db
      .select()
      .from(productPaxPricingTiers)
      .where(eq(productPaxPricingTiers.productId, productId))
      .orderBy(asc(productPaxPricingTiers.tierPax), asc(productPaxPricingTiers.createdAt)),
  ])

  const [defaultItinerary] = await db
    .select({ id: productItineraries.id })
    .from(productItineraries)
    .where(and(eq(productItineraries.productId, productId), eq(productItineraries.isDefault, true)))
    .limit(1)

  if (!defaultItinerary) {
    return {
      product,
      days: [],
      media,
      pricingTiers,
      generatedAt: new Date(),
    }
  }

  const days = await db
    .select()
    .from(productDays)
    .where(eq(productDays.itineraryId, defaultItinerary.id))
    .orderBy(asc(productDays.dayNumber))

  const daysWithServices = await Promise.all(
    days.map(async (day) => {
      const services = await db
        .select()
        .from(productDayServices)
        .where(eq(productDayServices.dayId, day.id))
        .orderBy(asc(productDayServices.sortOrder))

      return {
        ...day,
        services,
      }
    }),
  )

  return {
    product,
    days: daysWithServices,
    media,
    pricingTiers,
    generatedAt: new Date(),
  }
}

/**
 * 默认模板。正文是**给没有浏览器时那条纯文本兜底路径**用的一整篇文档:
 * 内置的 pdf-lib 打印器会把它一行行画出来,所以标题、行程、费用都得在里面。
 * 有浏览器时走的是 `brochure-sections.ts` 的版式,不读这段正文。
 *
 * 两处刻意的改动:
 *
 * - **不再印 `Product ID` 与 `Generated`**。这是发给客人的册子,内部主键和
 *   生成时间戳对客人毫无意义,印上去只显得像系统导出的调试件。
 * - **文案跟着产品语言走**。原先固定英文,中文线路的册子上印着 `Travelers`
 *   `Total`——客人看到的就是这个。
 */
export function createDefaultProductBrochureTemplate(): ProductBrochureTemplateDefinition {
  return {
    bodyFormat: "markdown",
    title: ({ product }) => product.name,
    filename: ({ product }) => `${product.name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`,
    metadataLines: () => [],
    body: (context) => renderPlainBrochureBody(context),
  }
}

function renderPlainBrochureBody(context: ProductBrochureTemplateContext): string {
  const { product, days } = context
  const labels = resolveBrochureLabels(product.defaultLanguageTag)
  const locale = product.defaultLanguageTag?.trim() || "en"
  const lines: string[] = [`# ${product.name}`, ""]

  if (days.length > 1) {
    lines.push(labels.durationDaysNights(days.length, days.length - 1), "")
  }
  if (product.startDate || product.endDate) {
    const range = [product.startDate, product.endDate].filter(Boolean).join(" – ")
    lines.push(`${labels.dates}: ${range}`)
  }
  if (product.pax) lines.push(`${labels.travelers}: ${product.pax}`)
  const price = formatBodyMoney(product.sellAmountCents, product.sellCurrency, locale)
  if (price) lines.push(`${labels.priceFrom}: ${price}`)
  if (product.description) lines.push("", product.description)

  for (const day of days) {
    lines.push("", `## ${labels.dayLabel(day.dayNumber)}${day.title ? `:${day.title}` : ""}`)
    if (day.location) lines.push(`${labels.colCity}: ${day.location}`)
    if (day.description) lines.push(day.description)
    for (const service of day.services) {
      const quantity = service.quantity > 1 ? ` ×${service.quantity}` : ""
      lines.push(`- ${service.name}${quantity}`)
    }
  }

  for (const [label, html] of [
    [labels.inclusions, product.inclusionsHtml],
    [labels.exclusions, product.exclusionsHtml],
    [labels.terms, product.termsHtml],
  ] as const) {
    if (!html?.trim()) continue
    lines.push("", `## ${label}`, html)
  }

  return lines.join("\n")
}

function formatBodyMoney(
  amountCents: number | null | undefined,
  currency: string | null | undefined,
  locale: string,
) {
  if (amountCents == null || !currency) return null
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amountCents / 100)
}

export async function renderProductBrochureTemplate(
  template: ProductBrochureTemplateDefinition,
  context: ProductBrochureTemplateContext,
): Promise<RenderedProductBrochureTemplate> {
  const rawBody = (await resolveTemplateValue(template.body, context)) ?? ""
  const variables = (await resolveTemplateValue(template.variables, context)) ?? {
    product: context.product,
    days: context.days,
    media: context.media,
    pricingTiers: context.pricingTiers,
    generatedAt: context.generatedAt.toISOString(),
  }
  const title =
    (await resolveTemplateValue(template.title, context))?.trim() || context.product.name
  const filename = normalizeFilename(
    await resolveTemplateValue(template.filename, context),
    context.product.name,
  )
  const metadataLines = (await resolveTemplateValue(template.metadataLines, context)) ?? []

  return {
    body: renderStructuredTemplate(rawBody, template.bodyFormat, variables),
    bodyFormat: template.bodyFormat,
    title,
    filename,
    variables,
    metadataLines,
  }
}
