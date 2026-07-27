import type { RouteImportDraft } from "./draft.js"
import { resolveOvernightCities } from "./overnight-city.js"

/**
 * 线路概览图(SVG 示意图)。
 *
 * 画的是**每日落脚城市**的链条,不是全部途经点。12 天线路的途经点有三四十
 * 个,画出来是一团糨糊;落脚城市收敛到十个以内,才是计调手里那张概览图的
 * 抽象层次——途经点属于逐日详情,不属于概览。
 *
 * 连住两晚的城市合并成一个节点,标注上覆盖的日次(D3-D4),不重复画。
 *
 * 刻意不含外部字体与图片:整份 SVG 自包含,既能直接当产品配图展示,也能在
 * 后续的宣传册里内嵌而不引入新的字体依赖。
 */

/** 图上的一个节点:一座落脚城市,可能覆盖连住的多天。 */
export interface RouteMapNode {
  label: string
  dayNumbers: number[]
  /** 抵达该城市当天的里程,画在入边上。 */
  distanceKm?: number | null
  driveMinutes?: number | null
}

const NODE_WIDTH = 128
const NODE_HEIGHT = 44
/**
 * 节点间距要放得下边上的里程标注(「约 245 公里」「车程约 2.5 小时」两行)。
 * 原先 72px 装不下,标注被两侧的节点框压掉了两头。
 */
const GAP_X = 116
const ROW_HEIGHT = 132
const PADDING_X = 32
const HEADER_HEIGHT = 76
const FOOTER_HEIGHT = 28
/** 每行最多几个节点。间距加大后每行减到 4 个,总宽才不至于失控。 */
const MAX_PER_ROW = 4
/** 边上标注的字号与行距。 */
const EDGE_FONT_SIZE = 10
const EDGE_LINE_HEIGHT = 12
/** 末行节点下方「起/终」标注占的高度。 */
const LAST_ROW_CAPTION_HEIGHT = 26

const COLOR_INK = "#1f2933"
const COLOR_MUTED = "#7b8794"
const COLOR_ACCENT = "#b45309"
const COLOR_LINE = "#cbd2d9"
const COLOR_NODE_BG = "#ffffff"
const COLOR_CANVAS = "#fbfaf7"

/**
 * 把逐日行程折叠成城市链。
 *
 * 落脚城市走 `resolveOvernightCities`——与 `draft-to-spec` 里每日 `location`
 * 同一个来源,两处必须同源,否则总览表与示意图会各说一套。
 */
export function buildRouteMapNodes(draft: RouteImportDraft): RouteMapNode[] {
  const nodes: RouteMapNode[] = []
  const cities = resolveOvernightCities(draft.itinerary)

  for (const [index, day] of draft.itinerary.entries()) {
    const city = cities[index]
    if (!city) continue

    const previous = nodes.at(-1)
    if (previous && previous.label === city) {
      // 连住:并进上一个节点,只在日次上体现。
      previous.dayNumbers.push(day.dayNumber)
      continue
    }

    nodes.push({
      label: city,
      dayNumbers: [day.dayNumber],
      distanceKm: day.distanceKm ?? null,
      driveMinutes: day.driveMinutes ?? null,
    })
  }

  return nodes
}

export interface RouteMapOptions {
  /** 图上方的主标题,默认取线路名。 */
  title?: string
}

/**
 * 画图需要的那点线路概况。刻意不收 `RouteImportDraft`——宣传册要拿产品
 * 已落库的行程画同一张图,而产品那边没有草稿对象。两个来源折成同一个窄
 * 结构,图的画法只有一处实现。
 */
export interface RouteMapMeta {
  title?: string | null
  days?: number | null
  nights?: number | null
  startCity?: string | null
  endCity?: string | null
  /** 全程里程;给不出就不画底部那行。 */
  totalDistanceKm?: number | null
}

/**
 * 渲染线路概览图。节点不足两个时返回 `null`——单点画不出线路,
 * 与其产出一张没有信息量的图,不如不挂。
 */
export function renderRouteMapSvg(
  draft: RouteImportDraft,
  options: RouteMapOptions = {},
): string | null {
  const totalDistanceKm = draft.itinerary.reduce((sum, day) => sum + (day.distanceKm ?? 0), 0)

  return renderRouteMapSvgFromNodes(buildRouteMapNodes(draft), {
    title: options.title || draft.title,
    days: draft.days,
    nights: draft.nights,
    startCity: draft.startCity,
    endCity: draft.endCity,
    totalDistanceKm,
  })
}

/** 按节点链渲染。草稿与已落库的产品行程共用这一段。 */
export function renderRouteMapSvgFromNodes(
  nodes: readonly RouteMapNode[],
  meta: RouteMapMeta = {},
): string | null {
  if (nodes.length < 2) return null

  // 先定行数,再把节点均摊到各行。直接按上限铺会排成 4+1,末尾那个节点
  // 孤零零吊在右边;均摊成 3+2 才看得过去。
  const rows = Math.ceil(nodes.length / MAX_PER_ROW)
  const perRow = Math.ceil(nodes.length / rows)
  const width = PADDING_X * 2 + perRow * NODE_WIDTH + (perRow - 1) * GAP_X
  // 行高里那段余量是留给换行折线的,最后一行不换行,只需容下节点与「起/终」
  // 标注。按整行算会在图底下留一大片空白。
  const height =
    HEADER_HEIGHT + (rows - 1) * ROW_HEIGHT + NODE_HEIGHT + LAST_ROW_CAPTION_HEIGHT + FOOTER_HEIGHT

  const placed = nodes.map((node, index) => ({ ...node, ...positionOf(index, perRow) }))

  const parts: string[] = []
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${escapeXml(routeAriaLabel(meta, nodes))}">`,
  )
  parts.push(defs())
  parts.push(`<rect width="${width}" height="${height}" fill="${COLOR_CANVAS}"/>`)
  parts.push(header(meta, width))

  // 先画连线再画节点,连线才不会压在节点框上。
  for (let index = 1; index < placed.length; index += 1) {
    const from = placed[index - 1]
    const to = placed[index]
    if (!from || !to) continue
    parts.push(connector(from, to))
  }

  for (const node of placed) parts.push(nodeMarkup(node, placed))

  parts.push(footer(meta, width, height))
  parts.push("</svg>")

  return parts.join("")
}

/** 蛇形排布:第一行从左往右,第二行折回从右往左,长线路才不会越画越宽。 */
function positionOf(index: number, perRow: number): { x: number; y: number; row: number } {
  const row = Math.floor(index / perRow)
  const withinRow = index % perRow
  const column = row % 2 === 0 ? withinRow : perRow - 1 - withinRow

  return {
    x: PADDING_X + column * (NODE_WIDTH + GAP_X),
    y: HEADER_HEIGHT + row * ROW_HEIGHT,
    row,
  }
}

function defs(): string {
  return [
    "<defs>",
    `<marker id="rm-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">`,
    `<path d="M 0 0 L 10 5 L 0 10 z" fill="${COLOR_LINE}"/>`,
    "</marker>",
    "</defs>",
  ].join("")
}

function header(meta: RouteMapMeta, width: number): string {
  const title = meta.title || "线路概览"
  const facts: string[] = []
  if (meta.days != null && meta.nights != null) facts.push(`${meta.days} 天 ${meta.nights} 晚`)
  if (meta.startCity && meta.endCity) {
    facts.push(
      meta.startCity === meta.endCity
        ? `${meta.startCity} 起止`
        : `${meta.startCity} 进 ${meta.endCity} 出`,
    )
  }

  const parts = [
    `<text x="${width / 2}" y="34" text-anchor="middle" font-family="${FONT_STACK}" font-size="19" font-weight="700" fill="${COLOR_INK}">${escapeXml(title)}</text>`,
  ]
  if (facts.length > 0) {
    parts.push(
      `<text x="${width / 2}" y="56" text-anchor="middle" font-family="${FONT_STACK}" font-size="12" fill="${COLOR_MUTED}">${escapeXml(facts.join("　·　"))}</text>`,
    )
  }
  return parts.join("")
}

function footer(meta: RouteMapMeta, width: number, height: number): string {
  const total = meta.totalDistanceKm ?? 0
  if (total <= 0) return ""
  return `<text x="${width / 2}" y="${height - 10}" text-anchor="middle" font-family="${FONT_STACK}" font-size="11" fill="${COLOR_MUTED}">全程约 ${Math.round(total)} 公里</text>`
}

type PlacedNode = RouteMapNode & { x: number; y: number; row: number }

/**
 * 节点之间的连线。同一行走直线;换行时走一段绕到下一行的折线,
 * 免得直接斜穿把中间的节点连穿过去。
 */
function connector(from: PlacedNode, to: PlacedNode): string {
  const lines = edgeLabelLines(to)
  const fromCenterY = from.y + NODE_HEIGHT / 2
  const toCenterY = to.y + NODE_HEIGHT / 2

  if (from.row === to.row) {
    const leftToRight = to.x > from.x
    const startX = leftToRight ? from.x + NODE_WIDTH : from.x
    const endX = leftToRight ? to.x : to.x + NODE_WIDTH
    const midX = (startX + endX) / 2

    const line = `<line x1="${startX}" y1="${fromCenterY}" x2="${endX}" y2="${toCenterY}" stroke="${COLOR_LINE}" stroke-width="1.5" marker-end="url(#rm-arrow)"/>`
    // 标注堆在连线上方,最后一行紧贴着线。
    const baseY = fromCenterY - 8 - (lines.length - 1) * EDGE_LINE_HEIGHT
    return line + edgeText(lines, midX, baseY)
  }

  // 换行:从节点底部垂下,横移到下一行对应列,再插进目标节点顶部。
  const dropY = from.y + NODE_HEIGHT + (ROW_HEIGHT - NODE_HEIGHT) / 2
  const fromCenterX = from.x + NODE_WIDTH / 2
  const toCenterX = to.x + NODE_WIDTH / 2
  const path = `M ${fromCenterX} ${from.y + NODE_HEIGHT} V ${dropY} H ${toCenterX} V ${to.y}`
  const line = `<path d="${path}" fill="none" stroke="${COLOR_LINE}" stroke-width="1.5" marker-end="url(#rm-arrow)"/>`
  const baseY = dropY - 6 - (lines.length - 1) * EDGE_LINE_HEIGHT
  return line + edgeText(lines, (fromCenterX + toCenterX) / 2, baseY)
}

function edgeText(lines: readonly string[], x: number, baseY: number): string {
  return lines
    .map(
      (text, index) =>
        `<text x="${x}" y="${baseY + index * EDGE_LINE_HEIGHT}" text-anchor="middle" font-family="${FONT_STACK}" font-size="${EDGE_FONT_SIZE}" fill="${COLOR_MUTED}">${escapeXml(text)}</text>`,
    )
    .join("")
}

/**
 * 入边标注:里程与车程,各占一行。
 *
 * 曾经并成一行用「·」隔开,一行一百八十来像素,比节点间距还宽,两头都被
 * 节点框压掉了。两者都没有就不画,不留空标签。
 */
function edgeLabelLines(node: RouteMapNode): string[] {
  const lines: string[] = []
  if (node.distanceKm != null && node.distanceKm > 0) lines.push(`约 ${node.distanceKm} 公里`)
  if (node.driveMinutes != null && node.driveMinutes > 0) {
    lines.push(`车程${formatDuration(node.driveMinutes)}`)
  }
  return lines
}

function nodeMarkup(node: PlacedNode, all: PlacedNode[]): string {
  const isFirst = node === all[0]
  const isLast = node === all.at(-1)
  const accent = isFirst || isLast

  const parts = [
    `<rect x="${node.x}" y="${node.y}" width="${NODE_WIDTH}" height="${NODE_HEIGHT}" rx="8" fill="${COLOR_NODE_BG}" stroke="${accent ? COLOR_ACCENT : COLOR_LINE}" stroke-width="${accent ? 1.8 : 1.2}"/>`,
    `<text x="${node.x + NODE_WIDTH / 2}" y="${node.y + NODE_HEIGHT / 2 + 6}" text-anchor="middle" font-family="${FONT_STACK}" font-size="15" font-weight="600" fill="${COLOR_INK}">${escapeXml(node.label)}</text>`,
  ]

  // 日次标签垫一块底色再写字。换行那一段的折线正好从节点顶部插进来,
  // 与标签重叠,不垫底会看到线穿字而过,像是画错了。
  const dayRange = formatDayRange(node.dayNumbers)
  const labelWidth = dayRange.length * 7 + 8
  parts.push(
    `<rect x="${node.x + NODE_WIDTH / 2 - labelWidth / 2}" y="${node.y - 20}" width="${labelWidth}" height="16" fill="${COLOR_CANVAS}"/>`,
    `<text x="${node.x + NODE_WIDTH / 2}" y="${node.y - 8}" text-anchor="middle" font-family="${FONT_STACK}" font-size="11" font-weight="600" fill="${accent ? COLOR_ACCENT : COLOR_MUTED}">${escapeXml(dayRange)}</text>`,
  )

  if (isFirst || isLast) {
    parts.push(
      `<text x="${node.x + NODE_WIDTH / 2}" y="${node.y + NODE_HEIGHT + 16}" text-anchor="middle" font-family="${FONT_STACK}" font-size="10" fill="${COLOR_ACCENT}">${isFirst ? "起" : "终"}</text>`,
    )
  }

  return parts.join("")
}

/** 连住的多天折成区间:D3-D4。不连号则逐个列出,不假装连续。 */
function formatDayRange(days: number[]): string {
  if (days.length === 0) return ""
  const first = days[0] as number
  const last = days.at(-1) as number
  const contiguous = days.every((day, index) => day === first + index)
  if (days.length === 1) return `D${first}`
  return contiguous ? `D${first}-D${last}` : days.map((day) => `D${day}`).join(" ")
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `约 ${minutes} 分钟`
  const hours = minutes / 60
  return Number.isInteger(hours) ? `约 ${hours} 小时` : `约 ${hours.toFixed(1)} 小时`
}

function routeAriaLabel(meta: RouteMapMeta, nodes: readonly RouteMapNode[]): string {
  const chain = nodes.map((node) => node.label).join(" → ")
  return meta.title ? `${meta.title}:${chain}` : chain
}

/**
 * 字体不内嵌,交给渲染环境。列表以中文字体优先,避免落到只有西文字形的
 * 默认字体上把汉字显示成方框。
 */
const FONT_STACK =
  "&quot;PingFang SC&quot;, &quot;Noto Sans SC&quot;, &quot;Microsoft YaHei&quot;, sans-serif"

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}
