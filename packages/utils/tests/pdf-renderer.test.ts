import { readFile } from "node:fs/promises"
import { inflateSync } from "node:zlib"
import { PDFDict, PDFDocument, PDFName, PDFRawStream, PDFRef } from "pdf-lib"
import { describe, expect, it } from "vitest"

import { renderPdfDocument } from "../src/pdf-renderer.js"

describe("renderPdfDocument", () => {
  it("renders html content into a non-empty pdf byte array", async () => {
    const pdf = await renderPdfDocument({
      title: "Contract",
      content: "<h1>Hello</h1><p>Passenger: Ana</p>",
      format: "html",
      metadataLines: ["Ref: CONT-1"],
    })

    expect(pdf).toBeInstanceOf(Uint8Array)
    expect(pdf.byteLength).toBeGreaterThan(100)
  })

  it("extracts text from lexical json content", async () => {
    const pdf = await renderPdfDocument({
      content: JSON.stringify({
        root: {
          type: "root",
          children: [
            {
              type: "paragraph",
              children: [{ type: "text", text: "Invoice body" }],
            },
          ],
        },
      }),
      format: "lexical_json",
    })

    expect(pdf.byteLength).toBeGreaterThan(100)
  })

  it("renders Chinese content into a parseable pdf", async () => {
    const pdf = await renderPdfDocument({
      title: "旅行服务合同",
      content:
        "账单编号:INV-2026-0001 · 订单:VYT-2026-00001\n\n甲方与乙方根据《中华人民共和国民法典》签订本合同。金额：¥1,234.56（人民币）。",
      format: "text",
      metadataLines: ["参考编号：CONT-1"],
    })

    expect(pdf).toBeInstanceOf(Uint8Array)
    expect(pdf.byteLength).toBeGreaterThan(100)

    const reloaded = await PDFDocument.load(pdf)
    expect(reloaded.getPageCount()).toBeGreaterThan(0)
  })

  it("embeds the Chinese font program intact so viewers can actually load it", async () => {
    // 只断言"PDF 能被解析"抓不到这个缺陷:字体损坏时文件照样解析成功、文本
    // 照样能被提取,只有阅读器渲染时才显示成空心方框。所以这里把嵌入的字形
    // 文件取出来,和随包字体的 CFF 表逐字节比对。
    const pdf = await renderPdfDocument({
      title: "【湖燃之间】南疆胡杨 12 日",
      content: "成人 ¥5,980 · 儿童不占床 ¥4,200\n喀什 · 慕士塔格 · 金草滩石头城",
      format: "text",
    })

    const embedded = await extractEmbeddedFontProgram(pdf)
    // 整体嵌入写成 /FontFile2;一旦有人重新打开子集化,这里会变成 /FontFile3。
    expect(embedded.key).toBe("/FontFile2")

    const asset = await readCjkFontAsset()
    expect(embedded.bytes.byteLength).toBe(asset.byteLength)
    expect(Buffer.from(embedded.bytes).equals(Buffer.from(asset))).toBe(true)
  })

  it("keeps multi-line Latin content with typographic characters on standard fonts", async () => {
    const pdf = await renderPdfDocument({
      title: "Invoice — 2026",
      content:
        "Total: €1,234.56 for the “City Break” package.\n\nBank reference: RO49-AAAA-1B31-0075-9384-0000 — please quote it in full.\n\nThank you!",
      format: "text",
      metadataLines: ["Range: 3–7 August"],
    })

    // Latin-only documents must stay on the built-in WinAnsi fonts even when
    // they span multiple lines or use €, dashes, and curly quotes; the
    // embedded CJK subset would balloon the byte size well past this bound.
    expect(pdf.byteLength).toBeLessThan(20_000)

    const reloaded = await PDFDocument.load(pdf)
    expect(reloaded.getPageCount()).toBeGreaterThan(0)
  })

  it("keeps rendering ascii-only content with standard fonts", async () => {
    const asciiPdf = await renderPdfDocument({
      title: "Invoice",
      content: "Amount due: USD 1,234.56",
      format: "text",
    })
    const chinesePdf = await renderPdfDocument({
      title: "账单",
      content: "应付金额：人民币 1,234.56 元",
      format: "text",
    })

    expect(asciiPdf.byteLength).toBeGreaterThan(100)
    expect(asciiPdf.byteLength).toBeLessThan(20_000)
    expect(chinesePdf.byteLength).toBeGreaterThan(asciiPdf.byteLength)
  })
})

/**
 * 取出 PDF 里唯一那份嵌入字形文件,连同它的键名一并返回。
 * 键名本身就是证据:整体嵌入走 /FontFile2,而 pdf-lib 的 CFF 子集走 /FontFile3。
 * 字形流上不带 /Subtype,只能从字体描述符的引用找过去。
 */
async function extractEmbeddedFontProgram(
  pdf: Uint8Array,
): Promise<{ key: string; bytes: Uint8Array }> {
  const doc = await PDFDocument.load(pdf)
  const programs = new Map<string, { key: string; bytes: Uint8Array }>()

  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFDict)) continue

    for (const name of obj.keys()) {
      const key = name.toString()
      if (!key.startsWith("/FontFile")) continue

      const ref = obj.get(name)
      if (!(ref instanceof PDFRef)) continue
      const stream = doc.context.lookup(ref)
      if (!(stream instanceof PDFRawStream)) continue

      const filter = stream.dict.get(PDFName.of("Filter"))?.toString()
      const raw = stream.getContents()
      programs.set(ref.toString(), {
        key,
        bytes: filter === "/FlateDecode" ? inflateSync(raw) : raw,
      })
    }
  }

  const found = [...programs.values()]
  if (found.length !== 1) {
    throw new Error(
      `\u671f\u671b\u6070\u597d\u4e00\u4efd\u5d4c\u5165\u5b57\u5f62\u6587\u4ef6,\u5b9e\u9645 ${found.length} \u4efd`,
    )
  }
  return found[0] as { key: string; bytes: Uint8Array }
}

/** 随包中文字体的完整字节,作为比对基准。 */
async function readCjkFontAsset(): Promise<Uint8Array> {
  return readFile(new URL("../assets/noto-sans-sc-subset.otf", import.meta.url))
}
