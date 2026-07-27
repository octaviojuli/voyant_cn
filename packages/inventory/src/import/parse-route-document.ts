import {
  type DraftDay,
  type DraftMeals,
  type DraftPoi,
  type DraftUnresolved,
  type RouteImportDraft,
  routeImportDraftSchema,
} from "./draft.js"

/**
 * 把线路资料的纯文本解析成结构化草稿。
 *
 * 规则解析,不经模型:同一份文件永远得到同样的结果,可回归测试,更重要的是
 * 绝不会把价格或天数"编"出来。模型只适合润色文案,不适合决定金额。
 *
 * 规则取自真实供应商文件的稳定写法:
 *   - 日行以 `D1`…`Dn` 标记,可能与上一行黏连(见 6 日线路资料)
 *   - 餐宿写作「早餐：酒店内」「住宿：xx 或同级」
 *   - 景点写作「【博斯腾湖】 维吾尔语意为…」
 *   - 费用与须知集中在最后一日之后
 */

/** 天数与晚数,如「12 天 11 晚」;中间可能夹空格或全角空格。 */
const DAYS_NIGHTS = /(\d+)\s*天\s*(\d+)\s*晚/
/** 井号标签,如 #私家出行#1 动#乌起喀止。 */
const TAG = /#([^#\s　]+)/g
/**
 * 日行标记。两套写法都要认:
 *   - `D1 `(PDF 类资料常用),其后必须跟空白;
 *   - `第一天：`/`第 1 天:`(Word 类资料常用),中文数字与阿拉伯数字都有。
 */
const DAY_MARKER = /D(\d{1,2})[ 　\t]|第\s*([一二三四五六七八九十百零〇\d]{1,4})\s*天\s*[:：、.]?/g

/** 中文数字转整数,只需覆盖行程天数的量级(一到百)。 */
const CN_DIGITS: Readonly<Record<string, number>> = {
  零: 0,
  〇: 0,
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
}

function parseDayNumber(value: string): number | null {
  if (/^\d+$/.test(value)) return Number.parseInt(value, 10)

  // 十 / 十二 / 二十 / 二十三 这几种组合足以覆盖行程天数。
  const tenIndex = value.indexOf("十")
  if (tenIndex !== -1) {
    const highPart = value.slice(0, tenIndex)
    const lowPart = value.slice(tenIndex + 1)
    const high = highPart ? CN_DIGITS[highPart] : 1
    const low = lowPart ? CN_DIGITS[lowPart] : 0
    if (high == null || low == null) return null
    return high * 10 + low
  }

  const digit = CN_DIGITS[value]
  return digit ?? null
}
/** 单程里程,如「单程约 300KM」「约 139 公里」。 */
const DISTANCE = /约\s*(\d+(?:\.\d+)?)\s*(?:KM|km|公里)/
/** 行车时长,如「行驶约 4.5H」「车程约 2 小时」。 */
const DRIVE = /(?:行驶|车程)?约\s*(\d+(?:\.\d+)?)\s*(?:H|h|小时)/
/** 景点词条:【名称】+ 说明,直到下一个词条或段落结束。 */
const POI = /【([^】]{1,40})】([^【]*)/g

const MEAL_KEYS: ReadonlyArray<{ key: keyof DraftMeals; label: string }> = [
  { key: "breakfast", label: "早餐" },
  { key: "lunch", label: "午餐" },
  { key: "dinner", label: "晚餐" },
]

/** 尾部章节的关键词。顺序即文档中的常见顺序。 */
const TAIL_SECTIONS = [
  { field: "inclusionsHtml", labels: ["费用包含", "费用包括"] },
  { field: "exclusionsHtml", labels: ["费用不含", "费用不包含"] },
  // 「需知」不是「须知」——真实资料里两种写法都有(「新疆旅游需知」),
  // 少一个字整章须知就丢了。同理「温馨提示」也是常见标题。
  {
    field: "termsHtml",
    labels: ["注意事项", "旅游须知", "预订须知", "旅游需知", "出行须知", "温馨提示", "特别说明"],
  },
] as const

export interface ParseRouteDocumentOptions {
  /** 文件名,仅用于在未识别项里给出定位线索。 */
  filename?: string
}

/** 解析线路资料文本,返回可供人工复核的草稿。 */
export function parseRouteDocument(
  text: string,
  options: ParseRouteDocumentOptions = {},
): RouteImportDraft {
  const unresolved: DraftUnresolved[] = []
  const normalized = normalizeText(text)

  const dayMarkers = findDayMarkers(normalized)
  const header = normalized.slice(0, dayMarkers[0]?.index ?? normalized.length)
  const tailStart =
    dayMarkers.length > 0 ? findTailStart(normalized, dayMarkers) : normalized.length

  const draft: RouteImportDraft = {
    ...parseHeader(header, unresolved),
    itinerary: parseDays(normalized, dayMarkers, tailStart),
    ...parseTailSections(normalized.slice(tailStart), unresolved),
    unresolved,
  }

  if (draft.itinerary.length === 0) {
    unresolved.push({
      field: "itinerary",
      reason: "未找到 D1、D2 这类每日行程标记",
      excerpt: options.filename ?? null,
    })
  } else if (draft.days != null && draft.days !== draft.itinerary.length) {
    // 标题说 12 天却只解析出 10 天,多半是某个 D 标记写法特殊,必须让人看到。
    unresolved.push({
      field: "itinerary",
      reason: `标题标称 ${draft.days} 天,实际解析出 ${draft.itinerary.length} 天`,
      excerpt: null,
    })
  }

  // 首日的终点即出发城市(首日多为「出发地-乌鲁木齐」),末日的终点即结束城市;
  // 两头都要跳过「出发地」「家」这类占位词。
  draft.startCity = meaningfulPlace(draft.itinerary[0]?.routeChain ?? [], "start")
  draft.endCity = meaningfulPlace(draft.itinerary.at(-1)?.routeChain ?? [], "end")

  return routeImportDraftSchema.parse(draft)
}

/** 统一换行与空白,但保留段落分隔(连续空行)。 */
function normalizeText(text: string): string {
  return (
    text
      .replace(/\r\n?/g, "\n")
      // 换页符也当换行:Word/PDF 提取的文本用它表示分页,而分页处往往正好是
      // 新的一天开始,漏掉会让该日的 D 标记显得不在行首、进而整天丢失。
      .replace(/[\f\v]/g, "\n")
      .replace(/[\t\u00a0\u3000 ]/g, " ")
      .replace(/\n{3,}/g, "\n\n")
  )
}

interface DayMarker {
  index: number
  dayNumber: number
}

/**
 * 定位每日标记。
 *
 * 判据:序号递增、且必须另起一行——正文里的「参考 D3 的安排」正是这样被
 * 排除的。唯一例外是首日,有的资料把 D1 直接接在标题后面不换行。
 *
 * 一份资料里日程可能出现两遍(前面一张总览表、后面才是逐日详情),因此把
 * 所有从 1 开始的递增序列都找出来,取正文最长的那一段——总览表只有标题,
 * 详情才有餐宿与正文。
 */
function findDayMarkers(text: string): DayMarker[] {
  const candidates: DayMarker[] = []

  DAY_MARKER.lastIndex = 0
  let match = DAY_MARKER.exec(text)
  while (match !== null) {
    const raw = match[1] ?? match[2]
    const dayNumber = raw ? parseDayNumber(raw) : null
    const atLineStart = match.index === 0 || text[match.index - 1] === "\n"
    if (dayNumber != null && dayNumber >= 1 && (atLineStart || dayNumber === 1)) {
      candidates.push({ index: match.index, dayNumber })
    }
    match = DAY_MARKER.exec(text)
  }

  const runs: DayMarker[][] = []
  for (const candidate of candidates) {
    const current = runs[runs.length - 1]
    if (current && candidate.dayNumber === (current[current.length - 1]?.dayNumber ?? 0) + 1) {
      current.push(candidate)
    } else if (candidate.dayNumber === 1) {
      runs.push([candidate])
    }
  }

  let best: DayMarker[] = []
  let bestSpan = -1
  for (const run of runs) {
    const span = (run[run.length - 1]?.index ?? 0) - (run[0]?.index ?? 0)
    // 同样长度时取天数多的,避免总览表因排在前面而胜出。
    if (span > bestSpan || (span === bestSpan && run.length > best.length)) {
      best = run
      bestSpan = span
    }
  }
  return best
}

/** 尾部章节的起点:最后一天之后,第一个费用/须知类关键词的位置。 */
function findTailStart(text: string, markers: DayMarker[]): number {
  const lastDayIndex = markers[markers.length - 1]?.index ?? 0
  const labels = TAIL_SECTIONS.flatMap((section) => section.labels)
  let earliest = text.length

  for (const label of labels) {
    const index = text.indexOf(label, lastDayIndex)
    if (index !== -1 && index < earliest) earliest = index
  }
  return earliest
}

function parseHeader(
  header: string,
  unresolved: DraftUnresolved[],
): Pick<RouteImportDraft, "brand" | "title" | "tagline" | "tags" | "days" | "nights"> {
  const lines = header
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

  // 只看开头几行。再往后是引言、产品特色这些段落,里面的字样会干扰判断。
  const headLines = lines.slice(0, HEADER_SCAN_LINES)

  const brand = pickBrand(headLines)
  const tagline = pickTagline(headLines, brand)

  // 天数与标题分开找。Word 类资料的标题在首行、而「8天7晚」写在次行的
  // 卖点串上,绑在同一行找会二选一地丢掉一个。
  const dn = matchInLines(headLines, DAYS_NIGHTS)
  const days = dn ? Number.parseInt(dn[1] as string, 10) : null
  const nights = dn ? Number.parseInt(dn[2] as string, 10) : null
  if (!dn) {
    unresolved.push({
      field: "days",
      reason: "开头几行里没找到「N 天 N 晚」",
      excerpt: tagline,
    })
  }

  // 标签同理:PDF 类资料把 #私家出行# 单独写成一行,不在标题行上。
  const tags: string[] = []
  for (const line of headLines) {
    TAG.lastIndex = 0
    let tagMatch = TAG.exec(line)
    while (tagMatch !== null) {
      tags.push((tagMatch[1] as string).trim())
      tagMatch = TAG.exec(line)
    }
  }

  return { brand, title: cleanTitle(tagline), tagline, tags, days, nights }
}

/** 头部扫描行数。真实资料的品牌、标题、标签都落在前四行内。 */
const HEADER_SCAN_LINES = 4

/** 「引言：」「产品特色：」「简版行程」这类段落标记不是标题。 */
const SECTION_MARKER = /^[【[]?(引言|产品特色|行程亮点|简版行程|详细行程|费用|报价)/

/**
 * 卖点串:「S101+沙湾大盘鸡+独山子大峡谷+…」。
 *
 * 这行常常也带着「8天7晚」,原先因此被当成标题,产品名就成了一长串菜名。
 * 加号数量是个足够强的信号——真实线路名不会连着堆三个以上加号。
 */
function isSellingPoints(line: string): boolean {
  return (line.match(/\+/g)?.length ?? 0) >= 3
}

function isTitleCandidate(line: string): boolean {
  if (SECTION_MARKER.test(line)) return false
  if (isSellingPoints(line)) return false
  // 纯标签行(#私家出行#1 动)去掉标签就没剩什么了。
  return line.replace(TAG, "").replace(/[★☆*\-—–\s]/g, "").length > 0
}

/**
 * 品牌/产品线名(如「湖燃之间」)。
 *
 * 只认「短、无装饰、无天数、无括号」的首行。Word 类资料的首行是标题本身
 * (【伊犁奇遇】夏日风光8日游),误判成品牌会把真标题让给下一行的卖点串。
 */
const MAX_BRAND_LENGTH = 8

function pickBrand(lines: readonly string[]): string | null {
  const first = lines[0]
  if (!first) return null
  if (first.length > MAX_BRAND_LENGTH) return null
  if (/[-★#+【[]/.test(first)) return null
  if (DAYS_NIGHTS.test(first) || /\d\s*日游/.test(first)) return null
  return first
}

function pickTagline(lines: readonly string[], brand: string | null): string | null {
  for (const line of lines) {
    if (line === brand) continue
    if (isTitleCandidate(line)) return line
  }
  return lines.find((line) => line !== brand) ?? lines[0] ?? null
}

function matchInLines(lines: readonly string[], pattern: RegExp): RegExpMatchArray | null {
  for (const line of lines) {
    const match = line.match(pattern)
    if (match) return match
  }
  return null
}

/** 去掉 ★ - # 之类装饰与天数片段,留下可用作产品名的线路名。 */
function cleanTitle(tagline: string | null): string {
  if (!tagline) return ""
  return (
    tagline
      .replace(TAG, " ")
      .replace(DAYS_NIGHTS, " ")
      .replace(/[★☆*]+/g, " ")
      // 抠掉天数后会留下「喀纳斯禾木- -夜雪探寻」这样的空档,把连续的
      // 连接号并成一个,否则产品名里带着一串悬空的横杠。
      .replace(/[-—–]\s*[-—–]+/g, "-")
      .replace(/^[-—–\s]+|[-—–\s]+$/g, "")
      .replace(/\s{2,}/g, " ")
      .trim()
  )
}

function parseDays(text: string, markers: DayMarker[], tailStart: number): DraftDay[] {
  return markers.map((marker, i) => {
    const end = markers[i + 1]?.index ?? tailStart
    const segment = text.slice(marker.index, end)
    return parseDay(segment, marker.dayNumber)
  })
}

function parseDay(segment: string, dayNumber: number): DraftDay {
  const newline = segment.indexOf("\n")
  const headerLine = (newline === -1 ? segment : segment.slice(0, newline)).trim()
  const rest = newline === -1 ? "" : segment.slice(newline + 1)

  // 去掉「D3 」前缀,余下即路线链与括号里的里程车程。
  const withoutMarker = headerLine
    .replace(/^D\d{1,2}[ 　\t]+/, "")
    .replace(/^第\s*[一二三四五六七八九十百零〇\d]{1,4}\s*天\s*[:：、.]?\s*/, "")
  const bracket = withoutMarker.match(/[（(]([^）)]*)[）)]/)
  const title = withoutMarker.replace(/[（(][^）)]*[）)]/g, "").trim()

  const distanceMatch = bracket?.[1]?.match(DISTANCE)
  const driveMatch = bracket?.[1]?.match(DRIVE)

  const { meals, accommodation, body } = splitDayBody(rest)

  return {
    dayNumber,
    title,
    routeChain: splitRouteChain(title),
    distanceKm: distanceMatch ? Number.parseFloat(distanceMatch[1] as string) : null,
    driveMinutes: driveMatch ? Math.round(Number.parseFloat(driveMatch[1] as string) * 60) : null,
    meals,
    accommodation,
    bodyHtml: toParagraphHtml(body),
    pois: extractPois(body),
  }
}

/** 途经点:原件用 - → ✈ 等连接,统一拆开。 */
function splitRouteChain(title: string): string[] {
  return (
    title
      // 「住：乌鲁木齐」有时跟在日行标题末尾,不是途经点。
      .replace(/(?:住宿|住)\s*[:：].*$/, "")
      // 【和田二街的烤肉…】这类是卖点文案,不是地名。
      .replace(/【[^】]*】/g, " ")
      // 连字符有半角、全角、连接号、减号多种写法,真实资料里都出现过;
      // 漏掉全角 －(U+FF0D) 会让「伊宁－赛里木湖－温泉县」整块不拆。
      .split(/[-—–－‐−~～〜→⇒>／/✈✚+]/)
      .map((part) => part.trim())
      .filter(Boolean)
  )
}

/** 「出发地」「全国各地」「家」这类不是城市,不能出现在封面上。 */
const PLACEHOLDER_PLACES = ["出发地", "全国各地", "家", "温暖的家", "各地", "返程"]

function meaningfulPlace(chain: readonly string[], from: "start" | "end"): string | null {
  const ordered = from === "start" ? [...chain].reverse() : [...chain].reverse()
  for (const place of ordered) {
    if (!PLACEHOLDER_PLACES.some((word) => place === word || place.endsWith(word))) return place
  }
  return null
}

/**
 * 从日正文里剥出餐、宿两类结构化信息,其余作为正文。
 *
 * 两种写法都要认:每餐各占一行(PDF 类资料),以及三餐挤在同一行
 * (Word 类资料,如「早餐：酒店包含  午餐：敬请自理  晚餐：敬请自理」)。
 * 住宿写作「住宿：」或「住：」。
 */
function splitDayBody(rest: string): {
  meals: DraftMeals
  accommodation: string | null
  body: string
} {
  const meals: DraftMeals = {}
  let accommodation: string | null = null
  const bodyLines: string[] = []

  for (const rawLine of rest.split("\n")) {
    const line = rawLine.trim()
    if (!line) {
      bodyLines.push("")
      continue
    }

    const consumed = extractMealsInline(line, meals)
    const stay = line.match(/(?:住宿|住)\s*[:：]\s*([^\s].*)$/)
    if (stay && !accommodation) {
      accommodation = (stay[1] as string).trim()
      if (consumed || /^(?:住宿|住)\s*[:：]/.test(line)) continue
    }
    if (consumed) continue

    bodyLines.push(line)
  }

  return { meals, accommodation, body: bodyLines.join("\n") }
}

/**
 * 就地抽取一行里的餐食。返回该行是否已被餐食信息占满——占满才丢弃整行,
 * 否则正文会被误删(有的资料把住宿和正文写在同一行)。
 */
function extractMealsInline(line: string, meals: DraftMeals): boolean {
  let matched = false
  let remainder = line

  for (const meal of MEAL_KEYS) {
    // 值取到下一个餐别标签或行尾为止。
    const pattern = new RegExp(
      `${meal.label}\\s*[:：]\\s*([^\\s]{0,30}?)(?=\\s{2,}|\\s*(?:早餐|午餐|晚餐|住宿|住)\\s*[:：]|$)`,
    )
    const found = line.match(pattern)
    if (!found) continue
    matched = true
    if (!meals[meal.key]) meals[meal.key] = (found[1] as string).trim()
    remainder = remainder.replace(found[0], "")
  }

  if (!matched) return false
  // 去掉餐食片段后若只剩标点空白,这一行就是纯餐食行。
  return remainder.replace(/[\s:：,,、]/g, "").length === 0
}

/** 景点词条。说明文字里的换行压平,避免正文里出现断行。 */
function extractPois(body: string): DraftPoi[] {
  const pois: DraftPoi[] = []
  POI.lastIndex = 0
  let match = POI.exec(body)
  while (match !== null) {
    const description = (match[2] as string).replace(/\s*\n\s*/g, "").trim()
    // 只有带说明的才算词条;正文里顺带提到的【景点】不单独成条。
    if (description.length >= 12) {
      pois.push({
        name: (match[1] as string).trim(),
        descriptionHtml: toParagraphHtml(description),
      })
    }
    match = POI.exec(body)
  }
  return pois
}

function parseTailSections(
  tail: string,
  unresolved: DraftUnresolved[],
): Pick<RouteImportDraft, "inclusionsHtml" | "exclusionsHtml" | "termsHtml"> {
  const hits = TAIL_SECTIONS.map((section) => {
    let index = -1
    for (const label of section.labels) {
      const found = tail.indexOf(label)
      if (found !== -1 && (index === -1 || found < index)) index = found
    }
    return { field: section.field, index }
  })

  const ordered = hits.filter((hit) => hit.index !== -1).sort((a, b) => a.index - b.index)
  const result: Record<string, string | null> = {
    inclusionsHtml: null,
    exclusionsHtml: null,
    termsHtml: null,
  }

  ordered.forEach((hit, i) => {
    const end = ordered[i + 1]?.index ?? tail.length
    // 连同标题一起截取,再去掉标题行本身。
    const block = tail.slice(hit.index, end)
    const body = block.replace(/^[^\n]*\n/, "").trim()
    result[hit.field] = body ? toListHtml(body) : null
  })

  for (const section of TAIL_SECTIONS) {
    if (!result[section.field]) {
      unresolved.push({
        field: section.field,
        reason: `未找到「${section.labels[0]}」章节`,
        excerpt: null,
      })
    }
  }

  return result as Pick<RouteImportDraft, "inclusionsHtml" | "exclusionsHtml" | "termsHtml">
}

/** 按空行分段,输出 <p>。富文本编辑器与宣传册模板都吃 HTML。 */
function toParagraphHtml(text: string): string {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((block) =>
      block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .join(""),
    )
    .filter(Boolean)
  return paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("")
}

/**
 * 费用与须知在原件里是编号条目(「1、含…」「❤ 请…」)。转成 <ul>,
 * 宣传册才能按条排版,而不是糊成一段。
 */
function toListHtml(text: string): string {
  const items = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce<string[]>((acc, line) => {
      // 新条目以「1、」「1.」「❤」「•」开头;否则视为上一条的续行。
      if (/^(?:\d+[、.．)]|[❤●•·▲◆*])/.test(line) || acc.length === 0) {
        acc.push(line.replace(/^(?:\d+[、.．)]|[❤●•·▲◆*])\s*/, ""))
      } else {
        acc[acc.length - 1] = `${acc[acc.length - 1]}${line}`
      }
      return acc
    }, [])
    .filter(Boolean)

  if (items.length === 0) return ""
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
