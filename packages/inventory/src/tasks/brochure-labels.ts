/**
 * 宣传册的固定文案。
 *
 * 宣传册是**发给客人**的文档,语言必须跟着产品内容走,而不是跟着操作员当时
 * 的界面语言走——同一条中文线路,谁去点「生成」都该出同一份中文册子。取值
 * 因此来自 `products.default_language_tag`(见 `resolveBrochureLabels`),
 * 与合同、发票按文档自身语言排版是同一条规矩。
 *
 * 不放进 `@voyant-travel/i18n` 的 React 词典:那套是界面词典,在服务端渲染
 * PDF 的路径上取不到,也不该为了取几十个词把整套 provider 搬到服务端。
 */

export interface BrochureLabels {
  /** 封面与页眉 */
  durationDays: (days: number) => string
  durationDaysNights: (days: number, nights: number) => string
  travelers: string
  priceFrom: string
  dates: string
  onRequest: string
  /** 章节标题 */
  routeMap: string
  overview: string
  dayOverview: string
  itinerary: string
  gallery: string
  pricing: string
  inclusions: string
  exclusions: string
  terms: string
  /** 每日总览表表头 */
  colDay: string
  colCity: string
  colMeals: string
  colStay: string
  colTransport: string
  /** 逐日行程 */
  dayLabel: (dayNumber: number) => string
  meals: string
  accommodation: string
  transport: string
  guide: string
  experience: string
  /** 价格表表头 */
  colOccupancy: string
  colPricePerTraveler: string
  colPromoPrice: string
  colValid: string
  alwaysValid: string
  /** 兜底 */
  notProvided: string
  toBeArranged: string
}

export const BROCHURE_LABELS_EN: BrochureLabels = {
  durationDays: (days) => `${days} days`,
  durationDaysNights: (days, nights) => `${days} days / ${nights} nights`,
  travelers: "Travelers",
  priceFrom: "From",
  dates: "Dates",
  onRequest: "On request",
  routeMap: "Route",
  overview: "Overview",
  dayOverview: "At a glance",
  itinerary: "Itinerary",
  gallery: "Gallery",
  pricing: "Pricing",
  inclusions: "Inclusions",
  exclusions: "Exclusions",
  terms: "Terms",
  colDay: "Day",
  colCity: "Overnight",
  colMeals: "Meals",
  colStay: "Stay",
  colTransport: "Transport",
  dayLabel: (dayNumber) => `Day ${dayNumber}`,
  meals: "Meals",
  accommodation: "Stay",
  transport: "Transport",
  guide: "Guide",
  experience: "Experiences",
  colOccupancy: "Occupancy",
  colPricePerTraveler: "Price per traveler",
  colPromoPrice: "Promotional price",
  colValid: "Valid",
  alwaysValid: "Always",
  notProvided: "Not included",
  toBeArranged: "To be arranged",
}

export const BROCHURE_LABELS_ZH: BrochureLabels = {
  durationDays: (days) => `${days} 天`,
  durationDaysNights: (days, nights) => `${days} 天 ${nights} 晚`,
  travelers: "人数",
  priceFrom: "参考价",
  dates: "出行日期",
  onRequest: "详询",
  routeMap: "线路概览",
  overview: "线路简介",
  dayOverview: "行程总览",
  itinerary: "逐日行程",
  gallery: "线路掠影",
  pricing: "价格",
  inclusions: "费用包含",
  exclusions: "费用不含",
  terms: "预订须知",
  colDay: "日次",
  colCity: "住宿地",
  colMeals: "用餐",
  colStay: "住宿",
  colTransport: "用车",
  dayLabel: (dayNumber) => `第 ${dayNumber} 天`,
  meals: "用餐",
  accommodation: "住宿",
  transport: "用车",
  guide: "导游",
  experience: "游览",
  colOccupancy: "成团人数",
  colPricePerTraveler: "每人价格",
  colPromoPrice: "促销价",
  colValid: "有效期",
  alwaysValid: "长期有效",
  notProvided: "不含",
  toBeArranged: "待定",
}

/**
 * 按 BCP-47 标签选词典,只看主语言子标签——`zh-CN`/`zh-Hant`/`zh` 都该出
 * 中文册子,为每个地区标签各存一份纯属自找维护。未知语言落英文。
 */
export function resolveBrochureLabels(languageTag: string | null | undefined): BrochureLabels {
  const primary = languageTag?.trim().toLowerCase().split(/[-_]/)[0]
  return primary === "zh" ? BROCHURE_LABELS_ZH : BROCHURE_LABELS_EN
}
