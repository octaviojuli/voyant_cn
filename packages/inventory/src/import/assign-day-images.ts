/**
 * 把文档内嵌图片归到各自的那一天。
 *
 * 依据是文档顺序:Word 的图片就插在它所描述的那天正文里,所以每张图属于
 * **它前面最近的那个日次标记**。第一个日次标记之前的图是封面、行程总览这
 * 类整条线路的图,归到 `cover`,不挂到任何一天上。
 *
 * 只对 Word 有效。PDF 提取不出图片,这一步自然是空的——界面上已提示操作员
 * 优先让供应商给 Word。
 */

/** HTML 里的图片占位,由 `extractDocx` 写入。 */
const IMAGE_PLACEHOLDER = /voyant-import-image:(\d+)/g

/**
 * 日次标记。与解析器用的是同一套写法,但这里跑在 HTML 上,标记与标签可能
 * 交错(`第<strong>一</strong>天`),因此先把标签剥掉再定位。
 */
const DAY_MARKER = /D(\d{1,2})[ 　\t]|第\s*([一二三四五六七八九十百零〇\d]{1,4})\s*天\s*[:：、.]?/g

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
  const tenIndex = value.indexOf("十")
  if (tenIndex !== -1) {
    const highPart = value.slice(0, tenIndex)
    const lowPart = value.slice(tenIndex + 1)
    const high = highPart ? CN_DIGITS[highPart] : 1
    const low = lowPart ? CN_DIGITS[lowPart] : 0
    if (high == null || low == null) return null
    return high * 10 + low
  }
  return CN_DIGITS[value] ?? null
}

export interface DayImageAssignment {
  /** 第一个日次之前出现的图:封面、线路总览之类。 */
  cover: number[]
  /** 日次 → 该日的图片序号,按文档顺序。 */
  byDay: Map<number, number[]>
}

/**
 * 把标签换成等长的空格,好让剥离后的下标仍与原串对齐——两类标记要在同一
 * 条坐标轴上比较先后,下标一错,图就挂到别的日子上去了。
 */
function stripTagsKeepingOffsets(html: string): string {
  return html.replace(/<[^>]*>/g, (tag) => " ".repeat(tag.length))
}

export function assignDayImages(html: string | null | undefined): DayImageAssignment {
  const empty: DayImageAssignment = { cover: [], byDay: new Map() }
  if (!html) return empty

  // 占位符要在原串上找:它写在 <img src="…"> 属性里,剥标签会把它一起抹掉。
  const images: { index: number; at: number }[] = []
  IMAGE_PLACEHOLDER.lastIndex = 0
  let imageMatch = IMAGE_PLACEHOLDER.exec(html)
  while (imageMatch !== null) {
    images.push({ index: Number.parseInt(imageMatch[1] as string, 10), at: imageMatch.index })
    imageMatch = IMAGE_PLACEHOLDER.exec(html)
  }
  if (images.length === 0) return empty

  const text = stripTagsKeepingOffsets(html)
  const markers: { dayNumber: number; at: number }[] = []
  DAY_MARKER.lastIndex = 0
  let dayMatch = DAY_MARKER.exec(text)
  while (dayMatch !== null) {
    const raw = dayMatch[1] ?? dayMatch[2]
    const dayNumber = raw ? parseDayNumber(raw) : null
    if (dayNumber != null && dayNumber >= 1) markers.push({ dayNumber, at: dayMatch.index })
    dayMatch = DAY_MARKER.exec(text)
  }

  // 与解析器同理:资料里日程可能出现两遍(前面概要、后面详情),只取从 1
  // 开始且递增的最长一段,免得把概要表里的序号也算成正文的日次。
  const run = longestAscendingRun(markers)

  const byDay = new Map<number, number[]>()
  const cover: number[] = []

  for (const image of images) {
    const owner = lastMarkerBefore(run, image.at)
    if (!owner) {
      cover.push(image.index)
      continue
    }
    const existing = byDay.get(owner.dayNumber)
    if (existing) existing.push(image.index)
    else byDay.set(owner.dayNumber, [image.index])
  }

  return { cover, byDay }
}

function longestAscendingRun(
  markers: readonly { dayNumber: number; at: number }[],
): { dayNumber: number; at: number }[] {
  const runs: { dayNumber: number; at: number }[][] = []
  for (const marker of markers) {
    const current = runs.at(-1)
    if (current && marker.dayNumber === (current.at(-1)?.dayNumber ?? 0) + 1) {
      current.push(marker)
    } else if (marker.dayNumber === 1) {
      runs.push([marker])
    }
  }

  let best: { dayNumber: number; at: number }[] = []
  let bestSpan = -1
  for (const run of runs) {
    const span = (run.at(-1)?.at ?? 0) - (run[0]?.at ?? 0)
    if (span > bestSpan || (span === bestSpan && run.length > best.length)) {
      best = run
      bestSpan = span
    }
  }
  return best
}

function lastMarkerBefore(
  markers: readonly { dayNumber: number; at: number }[],
  position: number,
): { dayNumber: number; at: number } | null {
  let found: { dayNumber: number; at: number } | null = null
  for (const marker of markers) {
    if (marker.at > position) break
    found = marker
  }
  return found
}
