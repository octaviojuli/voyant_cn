// @ts-nocheck -- legacy seed fixture typing cleanup is tracked separately from demo data edits.
/**
 * Fixture data + self-contained insert helpers for the zh-CN operator demo
 * seed (`seed-zh-cn.ts`).
 *
 * Display strings are Simplified Chinese following docs/i18n-zh-glossary.md
 * (订单=Booking, 出行人=Traveler, 成人/儿童=Option Units, 付款计划=Payment
 * Schedule, 班期=Slot). Codes, slugs, and identifiers stay ASCII
 * (pinyin/english) per the glossary's identifier rule. Fixture keys mirror
 * column names so rows are built by spreading the fixture and adding
 * ids/relations (drizzle ignores non-column keys).
 */

import {
  cruiseCabinCategories,
  cruisePrices,
  cruiseSailings,
  cruiseShips,
  cruises,
} from "@voyant-travel/cruises/schema"
import { newId } from "@voyant-travel/db/lib/typeid"
import { supplierRates, supplierServices, suppliers } from "@voyant-travel/distribution"
import type { drizzle } from "drizzle-orm/postgres-js"

export type Db = ReturnType<typeof drizzle>

// ---------- Date helpers (shared with seed-zh-cn.ts) ----------

export function daysFromNow(days: number): Date {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

export function yyyyMmDd(date: Date): string {
  return date.toISOString().slice(0, 10)
}

// ---------- Market ----------

export const ZH_MARKET = {
  code: "CN",
  name: "中国大陆",
  regionCode: "CN",
  countryCode: "CN",
  defaultLanguageTag: "zh-CN",
  defaultCurrency: "CNY",
  timezone: "Asia/Shanghai",
} as const

// ---------- Supplier ----------

/** Keys mirror the suppliers / supplier_services / supplier_rates columns. */
export const ZH_SUPPLIER = {
  supplier: {
    name: "华东旅运(上海)有限公司",
    type: "transfer" as const,
    defaultCurrency: "CNY",
  },
  service: { name: "华东专线旅游巴士(含司导)", serviceType: "transfer" as const },
  rate: {
    name: "协议价 — 华东专线旅游巴士(含司导)",
    currency: "CNY",
    amountCents: 280000, // ¥2,800 per vehicle per day
    unit: "per_vehicle" as const,
  },
} as const

/** Insert the Chinese supplier + service + CNY rate; returns the supplier id. */
export async function seedCnSupplier(db: Db): Promise<string> {
  console.log("→ seeding Chinese supplier + service + CNY rate…")
  const supplierId = newId("suppliers")
  await db.insert(suppliers).values({
    id: supplierId,
    ...ZH_SUPPLIER.supplier,
    status: "active",
    paymentTermsDays: 30,
    tags: [],
  })
  const serviceId = newId("supplier_services")
  await db
    .insert(supplierServices)
    .values({ id: serviceId, supplierId, ...ZH_SUPPLIER.service, active: true, tags: [] })
  await db.insert(supplierRates).values({
    id: newId("supplier_rates"),
    serviceId,
    ...ZH_SUPPLIER.rate,
    validFrom: yyyyMmDd(daysFromNow(-30)),
    validTo: yyyyMmDd(daysFromNow(365)),
    minPax: 1,
    maxPax: 45,
  })
  return supplierId
}

// ---------- Products ----------

export interface ZhProductFixture {
  name: string
  days: number
  sellAmountCents: number
  costAmountCents: number
  description: string
  tags: string[]
  startTimeLocal: string
  startTimeLabel: string
  itinerary: Array<{ title: string; description: string; location: string }>
  options: Array<{ code: string; name: string; description: string }>
}

export const ZH_PRODUCTS: ZhProductFixture[] = [
  {
    name: "华东五市经典 6 日游",
    days: 6,
    sellAmountCents: 458800, // ¥4,588 per adult
    costAmountCents: 298800,
    description:
      "上海、苏州、无锡、南京、杭州五市联游,涵盖江南园林、太湖风光与西湖美景。" +
      "全程四星酒店住宿,含旅游巴士、专业导游讲解与每日早餐,适合首次到访华东的出行人。",
    tags: ["华东", "多日游", "经典跟团", "江南"],
    startTimeLocal: "08:30",
    startTimeLabel: "上午出发",
    itinerary: [
      {
        title: "上海集合 · 外滩夜景",
        description: "全国各地抵达上海,专人接站后入住酒店;傍晚自由漫步外滩,欣赏浦江两岸夜景。",
        location: "上海",
      },
      {
        title: "上海 → 苏州 · 拙政园与平江路",
        description: "上午乘车前往苏州,游览拙政园;下午漫步平江路历史街区,夜宿苏州。",
        location: "苏州",
      },
      {
        title: "苏州 → 无锡 · 鼋头渚太湖风光",
        description: "上午前往无锡鼋头渚景区乘船游太湖;下午南禅寺小吃街自由活动,夜宿无锡。",
        location: "无锡",
      },
      {
        title: "无锡 → 南京 · 中山陵与夫子庙",
        description: "上午乘车前往南京,参观中山陵;傍晚游览夫子庙秦淮河风光带,夜宿南京。",
        location: "南京",
      },
      {
        title: "南京 → 杭州 · 西湖游船",
        description: "上午乘车前往杭州,午后西湖游船、花港观鱼;晚间河坊街自由活动,夜宿杭州。",
        location: "杭州",
      },
      {
        title: "杭州 → 上海 · 灵隐飞来峰后送站",
        description: "上午游览灵隐飞来峰景区,午后返回上海,专车送站,行程圆满结束。",
        location: "杭州 → 上海",
      },
    ],
    options: [
      {
        code: "STD",
        name: "标准团",
        description: "25 人标准团,全程四星酒店与旅游巴士,含每日早餐。",
      },
      {
        code: "VIP",
        name: "尊享小团",
        description: "12 人精致小团,升级五星酒店,含全程导游讲解与接送站服务。",
      },
    ],
  },
  {
    name: "上海城市文化一日游",
    days: 1,
    sellAmountCents: 68800, // ¥688 per adult
    costAmountCents: 42800,
    description:
      "一天时间纵览上海的传统与摩登:上午游览豫园与城隍庙,午餐品尝地道本帮菜," +
      "下午漫步武康路梧桐街区与外滩源历史建筑群,傍晚在外滩观景平台结束行程。",
    tags: ["上海", "一日游", "人文", "城市漫步"],
    startTimeLocal: "09:00",
    startTimeLabel: "上午出发",
    itinerary: [
      {
        title: "豫园、本帮菜与外滩人文漫步",
        description:
          "上午豫园与城隍庙,午餐品尝本帮菜;下午漫步武康路与外滩源,傍晚外滩观景平台自由拍照后结束行程。",
        location: "上海",
      },
    ],
    options: [
      {
        code: "STD",
        name: "标准拼团",
        description: "小团拼团出行,含午餐、门票与中文讲解。",
      },
      {
        code: "PRIV",
        name: "私家团",
        description: "独立成团,专属导游与商务车接送,行程节奏可灵活调整。",
      },
    ],
  },
]

/** 计价单元 —— 成人/儿童 price dimensions, mirroring seed.ts's SEED_UNITS shape. */
export const ZH_UNITS = [
  {
    code: "ADULT",
    name: "成人",
    unitType: "person" as const,
    minAge: 18,
    minQuantity: 1,
    priceMultiplier: 1,
    sortOrder: 0,
  },
  {
    code: "CHILD",
    name: "儿童",
    unitType: "person" as const,
    minAge: 2,
    maxAge: 17,
    priceMultiplier: 0.5,
    sortOrder: 1,
  },
] as const

export const ZH_PRICE_CATALOG = {
  code: "CAT-CNY",
  name: "人民币价目表",
  currencyCode: "CNY",
} as const

// ---------- Cruise ----------

export const ZH_CRUISE = {
  ship: {
    name: "东方之星号",
    slug: "dongfang-zhixing",
    shipType: "river" as const,
    capacityGuests: 380,
    capacityCrew: 160,
    cabinCount: 190,
    deckCount: 6,
    yearBuilt: 2018,
    description: "长江内河游轮,设阳台标准间与豪华套房,配观景甲板、中西餐厅与茶室。",
  },
  cruise: {
    slug: "changjiang-sanxia-xiuxian-4nt",
    name: "长江三峡休闲 4 晚",
    cruiseType: "river" as const,
    nights: 4,
    description:
      "重庆朝天门码头登船,顺江而下穿越瞿塘峡、巫峡与西陵峡,途经丰都、白帝城与三峡大坝," +
      "在宜昌离船。全程含一日三餐与岸上精华游览,节奏舒缓,适合家庭与长者出行。",
    shortDescription: "重庆至宜昌,4 晚长江三峡精华航线。",
    highlights: ["穿越长江三峡三大峡谷", "白帝城与三峡大坝岸上游览", "全程含餐与中文讲解"],
    inclusionsHtml: "<ul><li>全程一日三餐</li><li>指定岸上游览</li><li>船上中文讲解</li></ul>",
    exclusionsHtml: "<ul><li>登船前后交通</li><li>个人消费</li><li>自费岸上项目</li></ul>",
    regions: ["长江", "三峡"],
    themes: ["休闲", "风光", "家庭"],
    status: "live" as const,
    lowestPriceCached: "3280.00",
    lowestPriceCurrencyCached: "CNY",
  },
  cabinCategories: [
    {
      code: "BAL",
      name: "阳台标准间",
      roomType: "balcony" as const,
      description: "标准双人间,私人观景阳台,独立卫浴。",
      minOccupancy: 1,
      maxOccupancy: 2,
      basePriceMajor: 3280,
    },
    {
      code: "STE",
      name: "豪华套房",
      roomType: "suite" as const,
      description: "大面积套房,独立起居区与加宽观景阳台。",
      minOccupancy: 1,
      maxOccupancy: 3,
      basePriceMajor: 5880,
    },
  ],
  /** Days-from-now offsets for the demo sailings. */
  sailingOffsets: [35, 63],
  fareCode: "CN-DEMO",
  fareCodeName: "国内演示票价",
  currency: "CNY",
} as const

/**
 * Insert the Chinese river cruise — ship, cruise, cabin categories, sailings
 * and per-occupancy CNY prices. Returns the cruise id.
 */
export async function seedCnCruise(db: Db, ctx: { supplierId: string }): Promise<string> {
  console.log("→ seeding Chinese river cruise (东方之星号 · 长江三峡)…")

  const shipId = newId("cruise_ships")
  await db
    .insert(cruiseShips)
    .values({ id: shipId, lineSupplierId: ctx.supplierId, ...ZH_CRUISE.ship })

  const departures = ZH_CRUISE.sailingOffsets.map((offset) => yyyyMmDd(daysFromNow(offset)))
  const cruiseId = newId("cruises")
  await db.insert(cruises).values({
    id: cruiseId,
    ...ZH_CRUISE.cruise,
    lineSupplierId: ctx.supplierId,
    defaultShipId: shipId,
    earliestDepartureCached: departures[0]!,
    latestDepartureCached: departures[departures.length - 1]!,
  })

  const cabinIds = ZH_CRUISE.cabinCategories.map(() => newId("cruise_cabin_categories"))
  await db
    .insert(cruiseCabinCategories)
    .values(ZH_CRUISE.cabinCategories.map((cabin, i) => ({ id: cabinIds[i]!, shipId, ...cabin })))

  for (const [idx, departureDate] of departures.entries()) {
    const sailingId = newId("cruise_sailings")
    await db.insert(cruiseSailings).values({
      id: sailingId,
      cruiseId,
      shipId,
      departureDate,
      returnDate: yyyyMmDd(daysFromNow(ZH_CRUISE.sailingOffsets[idx]! + ZH_CRUISE.cruise.nights)),
      salesStatus: "open",
      availabilityNote: "中文演示班期 —— 自营邮轮预订。",
    })
    await db.insert(cruisePrices).values(
      ZH_CRUISE.cabinCategories.flatMap((cabin, i) =>
        Array.from({ length: cabin.maxOccupancy }, (_, o) => ({
          id: newId("cruise_prices"),
          sailingId,
          cabinCategoryId: cabinIds[i]!,
          occupancy: o + 1,
          fareCode: ZH_CRUISE.fareCode,
          fareCodeName: ZH_CRUISE.fareCodeName,
          fareVariant: "cruise_only",
          currency: ZH_CRUISE.currency,
          pricePerPerson: (cabin.basePriceMajor * (o === 0 ? 1.3 : o >= 2 ? 0.9 : 1)).toFixed(2),
          availability: "available",
          availabilityCount: 6,
        })),
      ),
    )
  }
  return cruiseId
}

// ---------- CRM ----------

export const ZH_ORG = {
  name: "上海环宇商务咨询有限公司",
  industry: "商务咨询",
  website: "https://huanyu-consulting.example.com",
  relation: "client" as const,
  defaultCurrency: "CNY",
} as const

export const ZH_PEOPLE = [
  {
    key: "zhangwei",
    firstName: "伟",
    lastName: "张",
    fullName: "张伟",
    relation: "client" as const,
    jobTitle: null,
    inOrg: false,
    email: "zhangwei@example.com",
    phone: "+86 138 0013 8000",
  },
  {
    key: "wangfang",
    firstName: "芳",
    lastName: "王",
    fullName: "王芳",
    relation: "client" as const,
    jobTitle: "行政经理",
    inOrg: true,
    email: "wangfang@example.com",
    phone: "+86 139 0013 9000",
  },
] as const

// ---------- Bookings ----------

export const ZH_BOOKINGS = [
  {
    key: "zh-confirmed",
    number: "VYT-CN-2026-00001",
    status: "confirmed" as const,
    personIdx: 0, // 张伟
    productIdx: 0, // 华东五市经典 6 日游
    withOrg: false,
    currency: "CNY",
    sellCents: 917600, // 2 × ¥4,588
    costCents: 597600,
    pax: 2,
    daysFromNow: 40,
    internalNotes: "中文演示订单 —— 已确认,定金已收,尾款待收。",
    note: "出行人确认两位成人,已通过银行转账收取定金。",
    travelers: [
      { firstName: "伟", lastName: "张", category: "adult" as const },
      { firstName: "娜", lastName: "李", category: "adult" as const },
    ],
  },
  {
    key: "zh-hold",
    number: "VYT-CN-2026-00002",
    status: "on_hold" as const,
    personIdx: 1, // 王芳
    productIdx: 1, // 上海城市文化一日游
    withOrg: true,
    currency: "CNY",
    sellCents: 172000, // 2 成人 + 1 儿童(半价)
    costCents: 107000,
    pax: 3,
    daysFromNow: 21,
    internalNotes: "中文演示订单 —— 预留中,待客户确认后转为已确认。",
    note: "公司团建预留,含一名儿童;预留到期前需回访确认。",
    travelers: [
      { firstName: "芳", lastName: "王", category: "adult" as const },
      { firstName: "强", lastName: "刘", category: "adult" as const },
      { firstName: "小明", lastName: "王", category: "child" as const },
    ],
  },
] as const
