import { renderPdfDocument } from "@voyant-travel/utils/pdf-renderer"
import type { StructuredTemplateBodyFormat } from "@voyant-travel/utils/template-renderer"
import { marked } from "marked"
import sanitizeHtml from "sanitize-html"

import type {
  ProductBrochureTemplateContext,
  RenderedProductBrochureTemplate,
} from "./brochure-templates.js"

export interface ProductBrochurePrinterContext {
  template: RenderedProductBrochureTemplate
  context: ProductBrochureTemplateContext
}

export interface PrintedProductBrochureArtifact {
  body: Uint8Array
  mimeType?: string | null
  fileSize?: number | null
  metadata?: Record<string, unknown> | null
}

export type ProductBrochurePrinter = (
  input: ProductBrochurePrinterContext,
) => Promise<PrintedProductBrochureArtifact>

const BASIC_PDF_PRODUCT_BROCHURE_PRINTER_KIND = "voyant-basic-pdf"

type ProductBrochurePrinterWithKind = ProductBrochurePrinter & {
  __voyantProductBrochurePrinterKind?: string
}

export interface CloudflareBrowserBrochurePrinterOptions {
  accountId: string
  apiToken: string
  apiBaseUrl?: string
  addStyleTag?: Array<{ content?: string; url?: string }>
  pdfOptions?: Record<string, unknown>
  gotoOptions?: Record<string, unknown>
  viewport?: Record<string, unknown>
  setExtraHTTPHeaders?: Record<string, string>
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function renderMarkdownBrochureBody(body: string) {
  return sanitizeHtml(marked(body, { async: false }), {
    allowedTags: [
      "a",
      "b",
      "blockquote",
      "br",
      "code",
      "del",
      "div",
      "em",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "hr",
      "i",
      "li",
      "ol",
      "p",
      "pre",
      "s",
      "span",
      "strong",
      "table",
      "tbody",
      "td",
      "tfoot",
      "th",
      "thead",
      "tr",
      "u",
      "ul",
    ],
    allowedAttributes: {
      a: ["href", "name", "rel", "target", "title"],
      "*": ["class", "title"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesAppliedToAttributes: ["href"],
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
  })
}

export function brochureBodyToHtmlFragment(body: string, bodyFormat: StructuredTemplateBodyFormat) {
  if (bodyFormat === "html") {
    return body
  }

  if (bodyFormat === "markdown") {
    return renderMarkdownBrochureBody(body)
  }

  return `<pre style="white-space: pre-wrap; font-family: system-ui, sans-serif;">${escapeHtml(body)}</pre>`
}

export function brochureBodyToHtml(
  body: string,
  bodyFormat: StructuredTemplateBodyFormat,
  title: string,
) {
  const content = brochureBodyToHtmlFragment(body, bodyFormat)

  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8" />',
    `<title>${escapeHtml(title)}</title>`,
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    "</head>",
    `<body>${content}</body>`,
    "</html>",
  ].join("")
}

export function isBasicPdfProductBrochurePrinter(printer: ProductBrochurePrinter) {
  return (
    (printer as ProductBrochurePrinterWithKind).__voyantProductBrochurePrinterKind ===
    BASIC_PDF_PRODUCT_BROCHURE_PRINTER_KIND
  )
}

export function createBasicPdfProductBrochurePrinter(): ProductBrochurePrinter {
  const printer: ProductBrochurePrinterWithKind = async ({ template }) => {
    const body = await renderPdfDocument({
      title: template.title,
      content: template.body,
      format: template.bodyFormat,
      // 模板给什么就印什么。这里原本还硬塞一行 `Product ID`,与默认模板里
      // 那行重复,册子上因此出现两遍内部主键——客人拿到的文件里不该有它,
      // 更不该有两次。要印内部信息就由模板明确写出来。
      metadataLines: template.metadataLines,
    })

    return {
      body,
      mimeType: "application/pdf",
      fileSize: body.byteLength,
      metadata: {
        renderer: "voyant-basic-pdf",
        bodyFormat: template.bodyFormat,
      },
    }
  }

  printer.__voyantProductBrochurePrinterKind = BASIC_PDF_PRODUCT_BROCHURE_PRINTER_KIND
  return printer
}

export function createCloudflareBrowserProductBrochurePrinter(
  options: CloudflareBrowserBrochurePrinterOptions,
): ProductBrochurePrinter {
  const apiBaseUrl =
    options.apiBaseUrl?.replace(/\/$/, "") || "https://api.cloudflare.com/client/v4"

  return async ({ template, context }) => {
    const response = await fetch(
      `${apiBaseUrl}/accounts/${options.accountId}/browser-rendering/pdf`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${options.apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          html: brochureBodyToHtml(template.body, template.bodyFormat, template.title),
          addStyleTag: options.addStyleTag,
          pdfOptions: options.pdfOptions,
          gotoOptions: options.gotoOptions,
          viewport: options.viewport,
          setExtraHTTPHeaders: options.setExtraHTTPHeaders,
        }),
      },
    )

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "")
      throw new Error(
        `Cloudflare Browser brochure print failed: ${response.status} ${response.statusText}${errorBody ? ` - ${errorBody}` : ""}`,
      )
    }

    const body = new Uint8Array(await response.arrayBuffer())

    return {
      body,
      mimeType: "application/pdf",
      fileSize: body.byteLength,
      metadata: {
        renderer: "cloudflare-browser",
        bodyFormat: template.bodyFormat,
        browserMsUsed: response.headers.get("X-Browser-Ms-Used"),
        productId: context.product.id,
      },
    }
  }
}

export function createCloudflareBrowserProductBrochurePrinterFromEnv(
  env?: Record<string, string | undefined>,
): ProductBrochurePrinter {
  const resolvedEnv =
    env ??
    (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ??
    {}
  const accountId = resolvedEnv.CLOUDFLARE_ACCOUNT_ID?.trim()
  const apiToken = resolvedEnv.CLOUDFLARE_API_TOKEN?.trim()

  if (!accountId || !apiToken) {
    throw new Error(
      "createCloudflareBrowserProductBrochurePrinterFromEnv requires CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN.",
    )
  }

  return createCloudflareBrowserProductBrochurePrinter({
    accountId,
    apiToken,
  })
}
