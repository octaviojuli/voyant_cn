import type { DraftDay } from "./draft.js"

/**
 * 推定每日的落脚城市。
 *
 * 曾经取「当日途经点的末站」,这条规则是错的。PDF 类资料的日行标题写的是
 * 路线(乌鲁木齐→库尔勒),末站确实是落脚点;而 Word 类资料写的是当天的
 * **活动**(喀什-白沙湖-塔合曼湿地-塔吉克家访),末站是个体验项目,不是
 * 城市。照旧取末站,总览表里会出现「今日住宿：塔吉克家访」。
 *
 * 可靠的信号是**次日行程的起点**——行程都是从昨晚睡的地方写起的。末日没有
 * 次日可参照,才退回自己的末站。
 */

/** 「出发地」「全国各地」这类不是城市,不能当落脚点。 */
const PLACEHOLDER_PLACES = ["出发地", "全国各地", "家", "温暖的家", "各地", "返程", "返回"]

function isPlaceholder(place: string): boolean {
  return PLACEHOLDER_PLACES.some((word) => place === word || place.endsWith(word))
}

function firstMeaningful(chain: readonly string[]): string | null {
  for (const place of chain) {
    if (!isPlaceholder(place)) return place
  }
  return null
}

function lastMeaningful(chain: readonly string[]): string | null {
  for (let index = chain.length - 1; index >= 0; index -= 1) {
    const place = chain[index]
    if (place && !isPlaceholder(place)) return place
  }
  return null
}

/**
 * 住宿字段里那些不是地名的成分。命中即说明这条写的是酒店而非城市。
 */
const HOTEL_WORDS =
  /酒店|饭店|民宿|客栈|宾馆|度假村|公寓|营地|同级|参考|标间|双床|大床|自理|房型|入住/

/** 落脚城市的最长字数。「乌鲁木齐」四字,「伊尔克什坦」五字,六字足够。 */
const MAX_CITY_LENGTH = 6

/**
 * 住宿字段能否直接当城市名用。
 *
 * Word 类资料的住宿常常就写一个城市(「住宿：喀什」),这时它比任何推断都
 * 准；PDF 类资料写的是酒店全名(「伊宁玛格丽特民宿或同级」),就取不出城市,
 * 交给后面的推断。
 */
function cityFromAccommodation(accommodation: string | null | undefined): string | null {
  if (!accommodation) return null
  const text = accommodation.trim()
  if (!text || text.length > MAX_CITY_LENGTH) return null
  if (HOTEL_WORDS.test(text)) return null
  if (/[·、,，/／]/.test(text)) return null
  if (isPlaceholder(text)) return null
  return text
}

/**
 * 按顺序给出每一天的落脚城市,下标与 `days` 对齐。推不出来的那天为 `null`,
 * 不猜——总览表里宁可空着,也不能填个活动名冒充城市。
 *
 * 取值优先级:
 *   1. 住宿字段(它按定义就是过夜地,写成城市名时最准);
 *   2. 次日行程的起点;
 *   3. 当日途经点的末站。
 */
export function resolveOvernightCities(days: readonly DraftDay[]): Array<string | null> {
  return days.map((day, index) => {
    const stay = cityFromAccommodation(day.accommodation)
    if (stay) return stay

    const next = days[index + 1]
    if (next) {
      const start = firstMeaningful(next.routeChain)
      if (start) return start
    }
    return lastMeaningful(day.routeChain)
  })
}
