import { PDFDocument } from "pdf-lib"
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
