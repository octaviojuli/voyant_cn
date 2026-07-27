import type { DraftUnresolved, RouteImportDraft } from "./draft.js"
import { DAYS_NIGHTS, TAG } from "./parse-route-patterns.js"

/**
 * 线路资料头部的解析:品牌、线路名、天数、标签。
 *
 * 单独成文件,是因为「哪一行才是线路名」这件事本身就有一堆真实写法要辨,
 * 而它与逐日行程、尾部章节的解析没有耦合。
 */

export function parseHeader(
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
