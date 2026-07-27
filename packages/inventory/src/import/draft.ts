import { z } from "zod"

/**
 * 线路上线助理的解析产物。
 *
 * 字段是按宣传册的版面倒推定义的:封面要的、总览表要的、每日详情要的,
 * 都必须在这里有位置。解析不出来就进 `unresolved`,不静默留空——宣传册
 * 排不出好看的版,十有八九是这里少了料。
 */

/** 一天的用餐安排。原件写作「早餐：酒店内 / 午餐：自理」。 */
export const draftMealsSchema = z.object({
  breakfast: z.string().nullish(),
  lunch: z.string().nullish(),
  dinner: z.string().nullish(),
})

/** 景点词条。原件写作「【博斯腾湖】 维吾尔语意为...」。 */
export const draftPoiSchema = z.object({
  name: z.string().min(1),
  descriptionHtml: z.string().default(""),
})

export const draftDaySchema = z.object({
  dayNumber: z.number().int().min(1),
  /** 未加工的日行标题,如「库尔勒-罗布人村寨-塔塔秘境-库尔勒」。 */
  title: z.string().default(""),
  /** 拆开的途经点,供总览表与线路示意图使用。 */
  routeChain: z.array(z.string()).default([]),
  /** 单程里程(公里)。原件写在标题括号里。 */
  distanceKm: z.number().nonnegative().nullish(),
  /** 行车时长(分钟)。原件以小时计。 */
  driveMinutes: z.number().int().nonnegative().nullish(),
  meals: draftMealsSchema.default({}),
  /** 住宿,含「或同级」这类表述,原样保留。 */
  accommodation: z.string().nullish(),
  /** 行程正文,保留分段。 */
  bodyHtml: z.string().default(""),
  pois: z.array(draftPoiSchema).default([]),
})

/** 未能识别的字段。带上原文片段,便于人工复核时定位。 */
export const draftUnresolvedSchema = z.object({
  field: z.string(),
  reason: z.string(),
  excerpt: z.string().nullish(),
})

export const routeImportDraftSchema = z.object({
  /** 品牌/产品线名,原件首行,如「湖燃之间」。 */
  brand: z.string().nullish(),
  /** 线路名,已去掉星号与井号装饰。 */
  title: z.string().default(""),
  /** 未加工的标题装饰行,保留给人工核对。 */
  tagline: z.string().nullish(),
  /** 井号标签,如 私家出行 / 1动 / 乌起喀止。 */
  tags: z.array(z.string()).default([]),
  days: z.number().int().positive().nullish(),
  nights: z.number().int().nonnegative().nullish(),
  /** 出发与结束城市,取自首末日行程,供封面与总览表使用。 */
  startCity: z.string().nullish(),
  endCity: z.string().nullish(),
  itinerary: z.array(draftDaySchema).default([]),
  inclusionsHtml: z.string().nullish(),
  exclusionsHtml: z.string().nullish(),
  termsHtml: z.string().nullish(),
  unresolved: z.array(draftUnresolvedSchema).default([]),
})

export type DraftMeals = z.infer<typeof draftMealsSchema>
export type DraftPoi = z.infer<typeof draftPoiSchema>
export type DraftDay = z.infer<typeof draftDaySchema>
export type DraftUnresolved = z.infer<typeof draftUnresolvedSchema>
export type RouteImportDraft = z.infer<typeof routeImportDraftSchema>
