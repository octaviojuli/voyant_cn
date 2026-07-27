/// <reference types="node" />

/**
 * 把上传的线路资料(Word / PDF)取成纯文本、结构化 HTML 与内嵌图片,
 * 交给 `parseRouteDocument` 做结构化。
 *
 * Node 专用:解析库以动态引入方式加载,模块图因此仍可在 Workers 目标下打包
 * ——只要这条路径不被真正调用。
 *
 * Word 与 PDF 的能力差距很大,界面上应当如实告诉操作员:
 *   - docx 能拿到加粗与段落结构,以及文档内嵌的图片;
 *   - pdf 只能拿到纯文本,排版与配图都会丢失。
 * 同一条线路优先让供应商给 Word。
 */

export type RouteDocumentFormat = "docx" | "pdf"

export interface ExtractedImage {
  /** 在文档中的出现顺序,用于回溯是第几张图。 */
  index: number
  contentType: string
  bytes: Uint8Array
}

export interface ExtractedDocument {
  format: RouteDocumentFormat
  /** 供解析器使用的纯文本。 */
  text: string
  /** 保留加粗与段落结构的 HTML;PDF 没有,为 null。 */
  html: string | null
  images: ExtractedImage[]
  pageCount: number | null
  /** 提取过程中的非致命问题,原样透出给操作员。 */
  warnings: string[]
}

export interface ExtractRouteDocumentInput {
  bytes: Uint8Array
  /** 仅用于报错时给出线索;格式判定不依赖它。 */
  filename?: string
}

export class UnsupportedRouteDocumentError extends Error {
  constructor(readonly filename?: string) {
    super("只支持 Word(.docx)与 PDF 文件")
    this.name = "UnsupportedRouteDocumentError"
  }
}

/**
 * 按文件头判定格式,而不是看扩展名或 Content-Type——两者都可能是错的,
 * 而把 PDF 当 docx 解析只会得到一句难懂的报错。
 */
export function detectRouteDocumentFormat(bytes: Uint8Array): RouteDocumentFormat | null {
  // docx 是 zip 容器,以 "PK\x03\x04" 开头。
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
    return "docx"
  }
  // pdf 以 "%PDF-" 开头。
  if (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  ) {
    return "pdf"
  }
  return null
}

export async function extractRouteDocument(
  input: ExtractRouteDocumentInput,
): Promise<ExtractedDocument> {
  const format = detectRouteDocumentFormat(input.bytes)
  if (!format) throw new UnsupportedRouteDocumentError(input.filename)

  return format === "docx" ? extractDocx(input.bytes) : extractPdf(input.bytes)
}

async function extractDocx(bytes: Uint8Array): Promise<ExtractedDocument> {
  const mammoth = await import("mammoth")
  const buffer = Buffer.from(bytes)
  const images: ExtractedImage[] = []

  // 图片在转 HTML 时顺带取出。src 只写序号,真正的落库由调用方决定,
  // 免得把几兆的 base64 塞进 HTML 里。
  const html = await mammoth.convertToHtml(
    { buffer },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        const index = images.length
        images.push({
          index,
          contentType: image.contentType ?? "application/octet-stream",
          bytes: new Uint8Array(await image.read()),
        })
        return { src: `voyant-import-image:${index}` }
      }),
    },
  )
  const raw = await mammoth.extractRawText({ buffer })

  return {
    format: "docx",
    text: raw.value,
    html: html.value,
    images,
    pageCount: null,
    warnings: [...html.messages, ...raw.messages].map((message) => message.message),
  }
}

async function extractPdf(bytes: Uint8Array): Promise<ExtractedDocument> {
  const { extractText, getDocumentProxy } = await import("unpdf")
  const pdf = await getDocumentProxy(bytes)
  const { text, totalPages } = await extractText(pdf, { mergePages: true })

  return {
    format: "pdf",
    // mergePages 为 true 时 unpdf 直接给出整篇文本。
    text,
    html: null,
    images: [],
    pageCount: totalPages,
    warnings: ["PDF 只能取到纯文本,原文的加粗、分段与配图都会丢失;建议改用 Word 文件上传。"],
  }
}
