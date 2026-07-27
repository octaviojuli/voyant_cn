/**
 * 宣传册的各个版块。
 *
 * 版块顺序即客人翻册子的顺序:封面 → 线路概览图 → 简介 → 行程总览表 →
 * 逐日行程 → 价格 → 费用包含/不含 → 预订须知。
 *
 * 「行程总览表」是这份册子里最像纸质宣传册的一段:一页看完每天住哪、含哪几
 * 餐、用什么车。它取的是**结构化的每日服务**(`product_day_services`),不是
 * 从正文里正则捞——正文里那句「早餐:酒店内」按列取不出来。这也是线路上线
 * 助理当初把餐宿拆成独立记录的原因,不是为了好看。
 */

import { type RouteMapNode, renderRouteMapSvgFromNodes } from "../import/route-map-svg.js"
import { escapeHtml, formatDate, formatMoney, safeUrl } from "./brochure-format.js"
import type { BrochureLabels } from "./brochure-labels.js"
import { brochureBodyToHtmlFragment } from "./brochure-printers.js"
import type {
  ProductBrochureDayContext,
  ProductBrochureTemplateContext,
  RenderedProductBrochureTemplate,
} from "./brochure-templates.js"
import type { ResolvedThemedBrochureTheme } from "./brochure-theme.js"

export interface ThemedBrochureRenderInput {
  template: RenderedProductBrochureTemplate
  context: ProductBrochureTemplateContext
  theme: ResolvedThemedBrochureTheme
  labels: BrochureLabels
  /** `Intl` 用的地区标签,与 `labels` 同源。 */
  locale: string
  /** 媒体 id → `data:` 内联图。取不到的图不画,不留空框。 */
  imageSources: ReadonlyMap<string, string>
}

export interface ThemedBrochureSection {
  id: string
  render: (input: ThemedBrochureRenderInput) => string | null | undefined
}

/** 优先用内联的 `data:`;没内联成功再退回原 URL(公有存储会给出可直取的地址)。 */
function imageSrc(
  input: ThemedBrochureRenderInput,
  media: { id: string; url: string },
): string | null {
  return input.imageSources.get(media.id) ?? safeUrl(media.url)
}

function servicesOfType(day: ProductBrochureDayContext, type: string) {
  return day.services.filter((service) => service.serviceType === type)
}

function joinServiceNames(day: ProductBrochureDayContext, type: string): string | null {
  const names = servicesOfType(day, type)
    .map((service) => service.name.trim())
    .filter(Boolean)
  return names.length > 0 ? names.join("、") : null
}

/**
 * 住宿这一列要的是**酒店**,不是「住宿」两个字。
 *
 * 每日服务的 `name` 是服务类别(「住宿」「早餐」),具体内容在 `notes`
 * (「乌鲁木齐 XX 酒店 或同级」)。按 name 取,整张总览表的住宿列会是一竖行
 * 「住宿」——有表无信息。用餐反过来:客人要知道的是含哪几顿,`name` 正是
 * 「早餐/午餐」,`notes` 反倒是「酒店内」这类细节。
 */
function joinServiceNotes(day: ProductBrochureDayContext, type: string): string | null {
  const values = servicesOfType(day, type)
    .map((service) => service.notes?.trim() || service.name.trim())
    .filter(Boolean)
  return values.length > 0 ? values.join("、") : null
}

function dayImages(input: ThemedBrochureRenderInput, day: ProductBrochureDayContext) {
  return input.context.media
    .filter((item) => item.dayId === day.id && item.mediaType === "image" && !item.isBrochure)
    .map((item) => ({ item, src: imageSrc(input, item) }))
    .filter((entry): entry is { item: (typeof input.context.media)[number]; src: string } =>
      Boolean(entry.src),
    )
}

/** 连住同一城市的多天折成一个节点,与线路上线助理画草稿图的折法一致。 */
function routeNodesFromDays(days: readonly ProductBrochureDayContext[]): RouteMapNode[] {
  const nodes: RouteMapNode[] = []

  for (const day of days) {
    const label = day.location?.trim()
    if (!label) continue

    const previous = nodes.at(-1)
    if (previous && previous.label === label) {
      previous.dayNumbers.push(day.dayNumber)
      continue
    }
    nodes.push({ label, dayNumbers: [day.dayNumber] })
  }

  return nodes
}

function renderCoverSection(input: ThemedBrochureRenderInput) {
  const { context, theme, labels, locale } = input
  const { product } = context
  const cover = context.media.find((item) => item.mediaType === "image" && item.isCover)
  const coverSrc = cover ? imageSrc(input, cover) : null
  const logoUrl = safeUrl(theme.logoUrl)
  const dates = [formatDate(product.startDate, locale), formatDate(product.endDate, locale)]
    .filter(Boolean)
    .join(" – ")
  const price = formatMoney(product.sellAmountCents, product.sellCurrency, locale)
  const dayCount = context.days.length
  const duration = dayCount > 1 ? labels.durationDaysNights(dayCount, dayCount - 1) : null

  return [
    // 没有封面图时换一块品牌色版:整页全白的封面看着像内容没渲染出来。
    `<section class="brochure-cover${coverSrc ? "" : " no-cover-image"}">`,
    coverSrc
      ? `<img class="cover-image" src="${escapeHtml(coverSrc)}" alt="${escapeHtml(cover?.altText || cover?.name || product.name)}" />`
      : '<div class="cover-image cover-placeholder"></div>',
    '<div class="cover-copy">',
    '<div class="brand-row">',
    logoUrl
      ? `<img class="brand-logo" src="${escapeHtml(logoUrl)}" alt="${escapeHtml(theme.brandName)}" />`
      : "",
    `<span>${escapeHtml(theme.brandName)}</span>`,
    "</div>",
    `<h1>${escapeHtml(product.name)}</h1>`,
    duration ? `<p class="cover-duration">${escapeHtml(duration)}</p>` : "",
    '<dl class="cover-facts">',
    dates ? `<div><dt>${escapeHtml(labels.dates)}</dt><dd>${escapeHtml(dates)}</dd></div>` : "",
    product.pax
      ? `<div><dt>${escapeHtml(labels.travelers)}</dt><dd>${escapeHtml(String(product.pax))}</dd></div>`
      : "",
    price ? `<div><dt>${escapeHtml(labels.priceFrom)}</dt><dd>${escapeHtml(price)}</dd></div>` : "",
    "</dl>",
    "</div>",
    "</section>",
  ].join("")
}

/**
 * 线路概览图。少于两个落脚城市就不画——一个点画不出线路,与其放一张没有
 * 信息量的图占掉半页,不如不放。
 */
function renderRouteMapSection({ context, labels }: ThemedBrochureRenderInput) {
  const nodes = routeNodesFromDays(context.days)
  const svg = renderRouteMapSvgFromNodes(nodes, {
    title: context.product.name,
    days: context.days.length,
    nights: context.days.length > 0 ? context.days.length - 1 : null,
    startCity: nodes[0]?.label ?? null,
    endCity: nodes.at(-1)?.label ?? null,
  })
  if (!svg) return null

  return [
    '<section class="brochure-section route-map">',
    `<h2>${escapeHtml(labels.routeMap)}</h2>`,
    // SVG 直接内联,不落成文件:存储层刻意封了 SVG(可携带脚本),而这段是
    // 我们自己生成的标记,内联进打印用的文档不经过存储。
    `<div class="route-map-canvas">${svg}</div>`,
    "</section>",
  ].join("")
}

/**
 * 简介取 `product.description`,**不取** `template.body`。
 *
 * 模板正文是给没有浏览器时那条纯文本兜底路径用的一整篇文档,里面已经包含
 * 标题与逐日行程;把它整段塞进「简介」,册子会出现两个标题、两份行程——线上
 * 那份册子标题印了两遍,就是这么来的。
 */
function renderOverviewSection({ context, labels }: ThemedBrochureRenderInput) {
  const description = context.product.description?.trim()
  if (!description) return null
  const body = brochureBodyToHtmlFragment(description, "markdown")
  if (!body.trim()) return null

  return [
    '<section class="brochure-section overview">',
    `<h2>${escapeHtml(labels.overview)}</h2>`,
    `<div class="rich-body">${body}</div>`,
    "</section>",
  ].join("")
}

/**
 * 一页看完每天住哪、含哪几餐、用什么车。
 *
 * 两列会**按数据自动收起**,不硬留空列:
 *
 * - **用车**:供应商通常把用车写在费用包含里(「全程空调旅游车」),不逐日写。
 *   整条线路都没有就不出这一列,否则是一整竖行破折号,看着像数据丢了。
 * - **住宿**:不少资料的住宿字段写的就是城市名(「住:喀什」),此时它与
 *   「住宿地」逐行一模一样——两列同样的内容并排,只会让人以为排版出错。
 *   有任意一天写了具体酒店才出这一列。
 */
function renderDayOverviewSection(input: ThemedBrochureRenderInput) {
  const { context, labels } = input
  if (context.days.length === 0) return null

  const hasTransport = context.days.some((day) => joinServiceNotes(day, "transfer") !== null)
  const hasDistinctStay = context.days.some((day) => {
    const stay = joinServiceNotes(day, "accommodation")
    return stay !== null && stay !== day.location?.trim()
  })

  const rows = context.days.map((day) => {
    const cells = [
      escapeHtml(labels.dayLabel(day.dayNumber)),
      escapeHtml(day.location?.trim() || "—"),
      escapeHtml(joinServiceNames(day, "meal") ?? "—"),
      ...(hasDistinctStay ? [escapeHtml(joinServiceNotes(day, "accommodation") ?? "—")] : []),
      ...(hasTransport ? [escapeHtml(joinServiceNotes(day, "transfer") ?? "—")] : []),
    ]
    return `<tr>${cells.map((cell) => `<td>${cell}</td>`).join("")}</tr>`
  })

  const headers = [
    labels.colDay,
    labels.colCity,
    labels.colMeals,
    ...(hasDistinctStay ? [labels.colStay] : []),
    ...(hasTransport ? [labels.colTransport] : []),
  ]

  return [
    '<section class="brochure-section day-overview">',
    `<h2>${escapeHtml(labels.dayOverview)}</h2>`,
    '<table class="overview-table">',
    `<thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>`,
    `<tbody>${rows.join("")}</tbody>`,
    "</table>",
    "</section>",
  ].join("")
}

/** 每天的餐宿用车做成一排小标签,跟正文分开——客人扫一眼就能确认含不含。 */
function renderDayServiceChips(day: ProductBrochureDayContext, labels: BrochureLabels) {
  const chips: Array<[string, string | null]> = [
    [labels.meals, joinServiceNames(day, "meal")],
    [labels.accommodation, joinServiceNotes(day, "accommodation")],
    [labels.transport, joinServiceNotes(day, "transfer")],
    [labels.guide, joinServiceNotes(day, "guide")],
    [labels.experience, joinServiceNames(day, "experience")],
  ]

  const rendered = chips
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(
      ([label, value]) =>
        `<span class="chip"><b>${escapeHtml(label)}</b>${escapeHtml(value)}</span>`,
    )

  return rendered.length > 0 ? `<div class="day-chips">${rendered.join("")}</div>` : ""
}

function renderItinerarySection(input: ThemedBrochureRenderInput) {
  const { context, labels } = input
  if (context.days.length === 0) return null

  return [
    '<section class="brochure-section itinerary">',
    `<h2>${escapeHtml(labels.itinerary)}</h2>`,
    ...context.days.map((day) => {
      const images = dayImages(input, day).slice(0, 2)

      return [
        '<article class="day">',
        `<div class="day-number">${escapeHtml(labels.dayLabel(day.dayNumber))}</div>`,
        '<div class="day-content">',
        `<h3>${escapeHtml(day.title || day.location || labels.dayLabel(day.dayNumber))}</h3>`,
        day.location ? `<p class="muted">${escapeHtml(day.location)}</p>` : "",
        // 每日正文是富文本(段落、加粗的景点名)。转义后当纯文本印,客人看到
        // 的是满屏 `<p>` `</strong>`——线上那份册子正是这个样子。走与费用、
        // 须知同一条清洗管线,标签才会被当标记渲染而不是当字面量。
        day.description
          ? `<div class="day-body rich-body">${brochureBodyToHtmlFragment(day.description, "markdown")}</div>`
          : "",
        renderDayServiceChips(day, labels),
        images.length > 0
          ? `<div class="day-images">${images
              .map(
                ({ item, src }) =>
                  `<img src="${escapeHtml(src)}" alt="${escapeHtml(item.altText || item.name)}" />`,
              )
              .join("")}</div>`
          : "",
        "</div>",
        "</article>",
      ].join("")
    }),
    "</section>",
  ].join("")
}

/** 没挂到具体某天的图才进画廊。已经在逐日行程里露过面的不再重复占版面。 */
function renderMediaSection(input: ThemedBrochureRenderInput) {
  const images = input.context.media
    .filter(
      (item) =>
        item.mediaType === "image" && !item.isBrochure && !item.isCover && item.dayId === null,
    )
    .map((item) => ({ item, src: imageSrc(input, item) }))
    .filter((entry): entry is { item: (typeof input.context.media)[number]; src: string } =>
      Boolean(entry.src),
    )

  if (images.length === 0) return null

  return [
    '<section class="brochure-section media-grid-section">',
    `<h2>${escapeHtml(input.labels.gallery)}</h2>`,
    '<div class="media-grid">',
    ...images
      .slice(0, 6)
      .map(
        ({ item, src }) =>
          `<figure><img src="${escapeHtml(src)}" alt="${escapeHtml(item.altText || item.name)}" /></figure>`,
      ),
    "</div>",
    "</section>",
  ].join("")
}

function renderPricingSection({ context, labels, locale }: ThemedBrochureRenderInput) {
  if (context.pricingTiers.length === 0) return null

  const headers = [
    labels.colOccupancy,
    labels.colPricePerTraveler,
    labels.colPromoPrice,
    labels.colValid,
  ]

  return [
    '<section class="brochure-section pricing">',
    `<h2>${escapeHtml(labels.pricing)}</h2>`,
    "<table>",
    `<thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>`,
    "<tbody>",
    ...context.pricingTiers.map((tier) => {
      const effective = [
        formatDate(tier.effectiveFrom, locale),
        formatDate(tier.effectiveTo, locale),
      ]
        .filter(Boolean)
        .join(" – ")

      return [
        "<tr>",
        `<td>${escapeHtml(String(tier.tierPax))}</td>`,
        `<td>${escapeHtml(formatMoney(tier.pricePerPaxCents, context.product.sellCurrency, locale) ?? labels.onRequest)}</td>`,
        `<td>${escapeHtml(formatMoney(tier.promoPricePerPaxCents, context.product.sellCurrency, locale) ?? "—")}</td>`,
        `<td>${escapeHtml(effective || labels.alwaysValid)}</td>`,
        "</tr>",
      ].join("")
    }),
    "</tbody>",
    "</table>",
    "</section>",
  ].join("")
}

function renderHtmlListSection(title: string, html: string | null | undefined, className: string) {
  if (!html?.trim()) return null

  return [
    `<section class="brochure-section policy ${className}">`,
    `<h2>${escapeHtml(title)}</h2>`,
    `<div class="rich-body">${brochureBodyToHtmlFragment(html, "markdown")}</div>`,
    "</section>",
  ].join("")
}

export const defaultThemedBrochureSections: ReadonlyArray<ThemedBrochureSection> = [
  { id: "cover", render: renderCoverSection },
  { id: "route-map", render: renderRouteMapSection },
  { id: "overview", render: renderOverviewSection },
  { id: "day-overview", render: renderDayOverviewSection },
  { id: "itinerary", render: renderItinerarySection },
  { id: "media", render: renderMediaSection },
  { id: "pricing", render: renderPricingSection },
  {
    id: "inclusions",
    render: ({ context, labels }) =>
      renderHtmlListSection(labels.inclusions, context.product.inclusionsHtml, "inclusions"),
  },
  {
    id: "exclusions",
    render: ({ context, labels }) =>
      renderHtmlListSection(labels.exclusions, context.product.exclusionsHtml, "exclusions"),
  },
  {
    id: "terms",
    render: ({ context, labels }) =>
      renderHtmlListSection(labels.terms, context.product.termsHtml, "terms"),
  },
]
