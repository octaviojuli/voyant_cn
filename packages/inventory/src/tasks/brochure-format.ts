/** 宣传册各段共用的转义与格式化。段落渲染与外壳都从这里取,避免各写一份。 */

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

export function safeCssValue(value: string) {
  return value.replace(/[<>{};]/g, "").trim()
}

/**
 * 只放行 http(s)、站内绝对路径与 `data:image/*`。
 *
 * `data:` 是配图内联进来的形态(见 `brochure-images.ts`):浏览器打印时不
 * 走网络,才不会因为媒体接口要鉴权而把图全部漏掉。放行范围限定在图片,
 * 不给 `data:text/html` 之类留口子。
 */
export function safeUrl(value: string | null | undefined) {
  const trimmed = value?.trim()
  if (!trimmed) return null

  if (trimmed.startsWith("/") || trimmed.startsWith("#")) {
    return trimmed
  }

  if (/^data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+$/i.test(trimmed)) {
    return trimmed
  }

  try {
    const url = new URL(trimmed)
    return url.protocol === "http:" || url.protocol === "https:" ? trimmed : null
  } catch {
    return null
  }
}

export function formatDate(value: Date | string | null | undefined, locale: string) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.valueOf())) return null

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date)
}

export function formatMoney(
  amountCents: number | null | undefined,
  currency: string | null | undefined,
  locale: string,
) {
  if (amountCents == null || !currency) return null

  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amountCents / 100)
}
