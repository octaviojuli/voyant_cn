/**
 * 把配图读成 `data:` 内联进 HTML。
 *
 * 不能让打印用的浏览器自己去下载图片。自托管部署里 `product_media.url` 是
 * `/v1/admin/media/{key}` 这样的**站内鉴权路径**,打印进程既没有会话也没有
 * 站点根地址,照着 URL 去取只会得到 401,册子里的图会静默全丢——而生成本身
 * 仍然「成功」,最难发现的那种坏法。服务端本来就握着存储句柄,直接读字节。
 *
 * 内联是有代价的:base64 会把体积撑大三分之一,一份图多的册子很容易顶到大小
 * 上限。因此这里有明确的字节预算与优先级——封面、每日配图、其余——预算耗尽
 * 就不再内联,而不是撑爆上限让整次生成失败。
 */

import type { StorageProvider } from "@voyant-travel/storage"

interface InlinableMedia {
  id: string
  mediaType: string
  storageKey: string | null
  mimeType: string | null
  dayId: string | null
  isCover: boolean
  isBrochure: boolean
  sortOrder: number
}

export interface InlineBrochureImagesOptions {
  /** 内联的原始字节预算(编码前)。默认 6 MiB。 */
  budgetBytes?: number
  /** 单张图上限,超过就跳过——一张 8 MB 的原图能把整个预算一次吃光。 */
  maxImageBytes?: number
}

const DEFAULT_BUDGET_BYTES = 6 * 1024 * 1024
const DEFAULT_MAX_IMAGE_BYTES = 2 * 1024 * 1024

/** 存储里没记 MIME 时按魔数认。认不出就不内联——猜错类型浏览器一样不显示。 */
function sniffImageMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg"
  }
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e) {
    return "image/png"
  }
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return "image/gif"
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45
  ) {
    return "image/webp"
  }
  return null
}

function toBase64(bytes: Uint8Array): string {
  const buffer = (
    globalThis as { Buffer?: { from(input: Uint8Array): { toString(encoding: string): string } } }
  ).Buffer
  if (buffer) return buffer.from(bytes).toString("base64")

  // Workers/浏览器目标没有 Buffer。分块喂 btoa,免得整幅图铺成一个超长
  // 参数列表把栈打爆。
  let binary = ""
  const CHUNK = 0x8000
  for (let offset = 0; offset < bytes.length; offset += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + CHUNK))
  }
  return btoa(binary)
}

/**
 * 内联顺序即优先级:封面 → 每日配图(按天、按排序)→ 其余。预算不够时先
 * 保住封面和逐日行程里的图,画廊那一段本来就是可选的。
 */
function inlineOrder(media: readonly InlinableMedia[]): InlinableMedia[] {
  const images = media.filter(
    (item) => item.mediaType === "image" && !item.isBrochure && item.storageKey,
  )
  const rank = (item: InlinableMedia) => (item.isCover ? 0 : item.dayId ? 1 : 2)

  return [...images].sort((a, b) => rank(a) - rank(b) || a.sortOrder - b.sortOrder)
}

export async function inlineBrochureImages(
  media: readonly InlinableMedia[],
  storage: Pick<StorageProvider, "get">,
  options: InlineBrochureImagesOptions = {},
): Promise<Map<string, string>> {
  const budgetBytes = options.budgetBytes ?? DEFAULT_BUDGET_BYTES
  const maxImageBytes = options.maxImageBytes ?? DEFAULT_MAX_IMAGE_BYTES
  const sources = new Map<string, string>()
  let spent = 0

  for (const item of inlineOrder(media)) {
    if (spent >= budgetBytes) break
    if (!item.storageKey) continue

    let buffer: ArrayBuffer | null
    try {
      buffer = await storage.get(item.storageKey)
    } catch {
      // 单张图读不出来不该让整份册子失败:少一张图,其余照常出。
      continue
    }
    if (!buffer) continue

    const bytes = new Uint8Array(buffer)
    if (bytes.byteLength === 0 || bytes.byteLength > maxImageBytes) continue
    if (spent + bytes.byteLength > budgetBytes) continue

    const mime = item.mimeType?.trim() || sniffImageMime(bytes)
    if (!mime?.startsWith("image/")) continue
    // SVG 内联进 `img` 是安全的(按规范不执行脚本),但存储层根本不收 SVG,
    // 出现在这里说明数据有问题,跳过而不是当图渲染。
    if (mime === "image/svg+xml") continue

    sources.set(item.id, `data:${mime};base64,${toBase64(bytes)}`)
    spent += bytes.byteLength
  }

  return sources
}
