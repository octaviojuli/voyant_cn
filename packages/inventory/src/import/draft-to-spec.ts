import type { ProductGraphSpec } from "../authoring/spec.js"
import type { DraftDay, RouteImportDraft } from "./draft.js"
import { resolveOvernightCities } from "./overnight-city.js"

/**
 * 把复核过的草稿翻译成产品图规格,交给 composeProduct 建库。
 *
 * 这里是「倒推设计」的落点:宣传册要排的每一块内容,都必须在这一步落到
 * 产品字段上,否则解析得再准也传不下去。
 *   - 费用包含 / 不含 / 须知 → inclusionsHtml / exclusionsHtml / termsHtml
 *   - 每日餐宿 → 每日服务(meal / accommodation),而非塞进正文
 *   - 里程、车程、景点词条 → 每日正文的结构化前言,直到 schema 补上专用字段
 *
 * 金额一律不从文档里猜。文档中的价格写法千变万化(「2人成行」「儿童不占床
 * 减 800」),猜错就是赔钱,因此售价留空由人工在复核界面填写。
 */

export interface DraftToSpecOptions {
  /** 售价币种,来自助手设置,不从文档里猜。 */
  sellCurrency: string
  /** 供应商,复核时选定。 */
  supplierId?: string | null
  /** 产品类型,来自助手设置。 */
  productTypeId?: string | null
  /** 时区,默认取助手设置里的部署时区。 */
  timezone?: string | null
  /** 成人起算年龄,默认 12 岁;不同产品口径不一,应可在助手设置里改。 */
  adultMinAge?: number
  /** 儿童起算年龄,默认 2 岁,2 岁以下按婴儿另计。 */
  childMinAge?: number
  /**
   * 正文语言,默认 `zh-CN`。
   *
   * 解析器认的是「费用包含」「旅游须知」这类中文章节标题,能被它解析出来的
   * 文档正文必然是中文,标成别的语言是错的。这个字段不是装饰:宣传册按它
   * 决定用哪套文案与日期格式,留空的话中文线路的册子上会印出 `Travelers`。
   */
  defaultLanguageTag?: string | null
}

/** 每日服务的成本占位:文档里没有成本数据,建库后由采购另行维护。 */
const UNKNOWN_COST_CENTS = 0

export function draftToProductGraphSpec(
  draft: RouteImportDraft,
  options: DraftToSpecOptions,
): ProductGraphSpec {
  const overnightCities = resolveOvernightCities(draft.itinerary)
  const days = draft.itinerary.map((day, index) => toDaySpec(day, overnightCities[index] ?? null))

  return {
    product: {
      name: draft.title || draft.brand || "未命名线路",
      // 一律建成草稿。助手不允许直接上架,必须由人在产品页确认后发布。
      status: "draft",
      visibility: "private",
      description: buildDescriptionHtml(draft),
      inclusionsHtml: draft.inclusionsHtml ?? null,
      exclusionsHtml: draft.exclusionsHtml ?? null,
      termsHtml: draft.termsHtml ?? null,
      termsShowOnContract: false,
      defaultLanguageTag: options.defaultLanguageTag ?? "zh-CN",
      // 多日线路必须用 itinerary 模式;date 是单日游,校验会直接拒绝。
      bookingMode: days.length > 1 ? "itinerary" : "date",
      capacityMode: "limited",
      timezone: options.timezone ?? null,
      sellCurrency: options.sellCurrency,
      // 售价不从文档猜,复核时人工填写。
      sellAmountCents: null,
      supplierId: options.supplierId ?? null,
      productTypeId: options.productTypeId ?? null,
      tags: draft.tags,
    },
    options: [buildDefaultOption(options)],
    paxPricingTiers: [],
    itineraries:
      days.length > 0
        ? [{ name: draft.title || "默认行程", isDefault: true, sortOrder: 0, days }]
        : [],
  }
}

/**
 * 默认选项与计价单元。
 *
 * 产品必须有可售单元才算合法(composeProduct 会拒绝没有单元的产品),但
 * 单元本身不带价格——价格在价格规则里,而这里刻意不建任何价格规则:
 * 没有价格的产品卖不出去,总好过带着 0 元价格被误发布。定价由人工在
 * 复核后填写。
 *
 * 单元编码与年龄区间必须给准。出行人分档正是按编码与年龄匹配到单元的,
 * 缺了它们,儿童就会被按成人计价——这个坑刚踩过。
 */
function buildDefaultOption(options: DraftToSpecOptions): ProductGraphSpec["options"][number] {
  const adultFrom = options.adultMinAge ?? 12
  const childFrom = options.childMinAge ?? 2

  return {
    ref: "default",
    name: "标准",
    status: "draft",
    isDefault: true,
    sortOrder: 0,
    units: [
      {
        ref: "adult",
        name: "成人",
        code: "adult",
        unitType: "person",
        minAge: adultFrom,
        isRequired: true,
        isHidden: false,
        sortOrder: 0,
      },
      {
        ref: "child",
        name: "儿童",
        code: "child",
        unitType: "person",
        minAge: childFrom,
        maxAge: adultFrom - 1,
        isRequired: false,
        isHidden: false,
        sortOrder: 1,
      },
    ],
    priceRules: [],
  }
}

function toDaySpec(day: DraftDay, overnightCity: string | null) {
  return {
    dayNumber: day.dayNumber,
    title: day.title || null,
    description: buildDayDescriptionHtml(day),
    // 落脚城市由 resolveOvernightCities 推定,与线路示意图同源。
    location: overnightCity,
    services: buildDayServices(day),
  }
}

/**
 * 餐宿落成结构化服务,而不是留在正文里。宣传册的行程总览表要按列取用,
 * 正文里的一句「早餐：酒店内」是取不出来的。
 */
function buildDayServices(day: DraftDay) {
  const services: ProductGraphSpec["itineraries"][number]["days"][number]["services"] = []
  const meals: ReadonlyArray<[string, string | null | undefined]> = [
    ["早餐", day.meals.breakfast],
    ["午餐", day.meals.lunch],
    ["晚餐", day.meals.dinner],
  ]

  for (const [label, value] of meals) {
    if (!value) continue
    services.push({
      serviceType: "meal",
      name: label,
      notes: value,
      costCurrency: "CNY",
      costAmountCents: UNKNOWN_COST_CENTS,
      quantity: 1,
      sortOrder: services.length,
    })
  }

  if (day.accommodation) {
    services.push({
      serviceType: "accommodation",
      name: "住宿",
      notes: day.accommodation,
      costCurrency: "CNY",
      costAmountCents: UNKNOWN_COST_CENTS,
      quantity: 1,
      sortOrder: services.length,
    })
  }

  return services
}

/**
 * 每日正文。里程与车程暂时以一行前言的形式保留——schema 尚无专用字段,
 * 但这两个数字是行程单的常规信息,丢掉了宣传册就补不回来。
 *
 * **景点词条不再往后追加**。`pois` 与 `bodyHtml` 出自同一段原文
 * (`parse-route-document` 里两者都读 `body`),追加等于把每一条带
 * 【景点】说明的段落原样印第二遍。宣传册上是整页整页的重复,一眼可见。
 * 词条仍留在草稿里供复核界面按条展示,只是不再重复进正文。
 */
function buildDayDescriptionHtml(day: DraftDay): string {
  const parts: string[] = []

  const travel: string[] = []
  if (day.distanceKm != null) travel.push(`约 ${day.distanceKm} 公里`)
  if (day.driveMinutes != null) travel.push(`车程约 ${formatDuration(day.driveMinutes)}`)
  if (travel.length > 0) parts.push(`<p><strong>${travel.join(" · ")}</strong></p>`)

  if (day.bodyHtml) parts.push(day.bodyHtml)

  return parts.join("")
}

/** 产品简介:线路名之外,把天数与标签一并写上,宣传册封面直接可用。 */
function buildDescriptionHtml(draft: RouteImportDraft): string {
  const parts: string[] = []
  const facts: string[] = []

  if (draft.days != null && draft.nights != null) facts.push(`${draft.days} 天 ${draft.nights} 晚`)
  if (draft.startCity && draft.endCity) {
    facts.push(
      draft.startCity === draft.endCity
        ? `${draft.startCity} 起止`
        : `${draft.startCity} 进 ${draft.endCity} 出`,
    )
  }
  if (facts.length > 0) parts.push(`<p><strong>${escapeHtml(facts.join(" · "))}</strong></p>`)
  if (draft.tags.length > 0) parts.push(`<p>${escapeHtml(draft.tags.join(" · "))}</p>`)

  return parts.join("")
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} 分钟`
  const hours = minutes / 60
  return Number.isInteger(hours) ? `${hours} 小时` : `${hours.toFixed(1)} 小时`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
