/// <reference types="node" />

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import {
  detectRouteDocumentFormat,
  extractRouteDocument,
  UnsupportedRouteDocumentError,
} from "../../src/import/extract-document.js"
import { parseRouteDocument } from "../../src/import/parse-route-document.js"

const FIXTURES = join(import.meta.dirname, "../fixtures/route-documents")
const readBytes = (name: string) => new Uint8Array(readFileSync(join(FIXTURES, name)))

describe("detectRouteDocumentFormat", () => {
  it("按文件头认出 docx", () => {
    expect(detectRouteDocumentFormat(readBytes("minimal.docx"))).toBe("docx")
  })

  it("按文件头认出 pdf", () => {
    expect(detectRouteDocumentFormat(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]))).toBe(
      "pdf",
    )
  })

  it("不认识的内容返回 null,不去猜", () => {
    expect(detectRouteDocumentFormat(new Uint8Array([1, 2, 3, 4, 5]))).toBeNull()
  })

  it("扩展名骗不过文件头", () => {
    // 有人把 PDF 改名成 .docx 是常事,判定必须只看内容。
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])
    expect(detectRouteDocumentFormat(pdfBytes)).toBe("pdf")
  })
})

describe("extractRouteDocument", () => {
  it("从 docx 取出文本、结构化 HTML 与内嵌图片", async () => {
    const extracted = await extractRouteDocument({ bytes: readBytes("minimal.docx") })

    expect(extracted.format).toBe("docx")
    expect(extracted.text).toContain("新疆测试线路")
    // 加粗要保留下来,这是 Word 相对 PDF 的核心优势。
    expect(extracted.html).toContain("<strong>")
    expect(extracted.images).toHaveLength(1)
    expect(extracted.images[0]?.contentType).toBe("image/png")
    expect(extracted.images[0]?.bytes.byteLength).toBeGreaterThan(0)
  })

  it("图片在 HTML 里只留序号占位,不塞 base64", async () => {
    const extracted = await extractRouteDocument({ bytes: readBytes("minimal.docx") })
    // 几兆的图片如果内联进 HTML,富文本字段会直接撑爆。
    expect(extracted.html).toContain("voyant-import-image:0")
    expect(extracted.html).not.toContain("base64")
  })

  it("提取结果能直接喂给解析器", async () => {
    const extracted = await extractRouteDocument({ bytes: readBytes("minimal.docx") })
    const draft = parseRouteDocument(extracted.text)

    expect(draft.days).toBe(3)
    expect(draft.itinerary[0]?.dayNumber).toBe(1)
    expect(draft.itinerary[0]?.meals.breakfast).toBe("敬请自理")
    expect(draft.itinerary[0]?.accommodation).toBe("乌鲁木齐")
    expect(draft.startCity).toBe("乌鲁木齐")
    expect(draft.inclusionsHtml).toContain("<li>")
    expect(draft.exclusionsHtml).toContain("<li>")
  })

  it("不支持的格式给出可读错误,而不是解析到一半崩掉", async () => {
    await expect(
      extractRouteDocument({ bytes: new Uint8Array([1, 2, 3]), filename: "线路.txt" }),
    ).rejects.toBeInstanceOf(UnsupportedRouteDocumentError)
  })
})
