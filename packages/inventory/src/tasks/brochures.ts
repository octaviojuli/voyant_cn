import type { StorageProvider } from "@voyant-travel/storage"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"

import { productsService } from "../service.js"
import {
  createBasicPdfProductBrochurePrinter,
  isBasicPdfProductBrochurePrinter,
  type ProductBrochurePrinter,
} from "./brochure-printers.js"
import {
  createDefaultProductBrochureTemplate,
  loadProductBrochureTemplateContext,
  type ProductBrochureTemplateDefinition,
  renderProductBrochureTemplate,
} from "./brochure-templates.js"
import type { ThemedBrochureTheme } from "./brochure-theme.js"
import { createThemedBrochurePrinter } from "./brochure-themed.js"
import { generateProductPdf } from "./generate-pdf.js"

export interface GenerateAndStoreProductBrochureOptions {
  storage: StorageProvider
  template?: ProductBrochureTemplateDefinition
  printer?: ProductBrochurePrinter
  /** 品牌与配色。只在有会排版的打印器时才用得上。 */
  theme?: ThemedBrochureTheme | null
  keyPrefix?: string
  filename?: string | ((generated: { productId: string; filename: string }) => string)
  signedUrlExpiresIn?: number
  maxSizeBytes?: number
}

/**
 * 会排版的打印器一律套上宣传册版式;只会画纯文本的内置打印器直接用。
 *
 * 这一步刻意放在这里而不是路由或装配层:版式属于「宣传册怎么做出来」,
 * 而不属于「谁来调用」。放在这里,工作流与路由两条入口才会出同一份册子。
 */
function selectBrochurePrinter(options: GenerateAndStoreProductBrochureOptions) {
  const printer = options.printer
  if (!printer) return createBasicPdfProductBrochurePrinter()
  if (isBasicPdfProductBrochurePrinter(printer)) return printer

  return createThemedBrochurePrinter({
    printer,
    storage: options.storage,
    ...(options.theme ? { theme: options.theme } : {}),
  })
}

export const PRODUCT_BROCHURE_STORAGE_ERROR_MESSAGE =
  "Product brochure storage is unavailable. Configure a usable media storage provider for brochure uploads and retry."

export class ProductBrochureStorageError extends Error {
  readonly publicMessage = PRODUCT_BROCHURE_STORAGE_ERROR_MESSAGE

  constructor(options?: { cause?: unknown }) {
    super(PRODUCT_BROCHURE_STORAGE_ERROR_MESSAGE, options)
    this.name = "ProductBrochureStorageError"
  }
}

export async function generateAndStoreProductBrochure(
  db: PostgresJsDatabase,
  productId: string,
  options: GenerateAndStoreProductBrochureOptions,
) {
  let filename: string
  let pdfBytes: Uint8Array
  let sizeBytes: number
  let mimeType = "application/pdf"
  let metadata: Record<string, unknown> | null = null

  if (options.template || options.printer) {
    const templateContext = await loadProductBrochureTemplateContext(db, productId)
    const rendered = await renderProductBrochureTemplate(
      options.template ?? createDefaultProductBrochureTemplate(),
      templateContext,
    )
    const printer = selectBrochurePrinter(options)
    const printed = await printer({
      template: rendered,
      context: templateContext,
    })

    filename =
      typeof options.filename === "function"
        ? options.filename({ productId, filename: rendered.filename })
        : options.filename?.trim() || rendered.filename
    pdfBytes = printed.body
    sizeBytes = printed.fileSize ?? printed.body.byteLength
    mimeType = printed.mimeType ?? mimeType
    metadata = printed.metadata ?? null
  } else {
    const generated = await generateProductPdf(db, productId)
    filename =
      typeof options.filename === "function"
        ? options.filename({ productId, filename: generated.filename })
        : options.filename?.trim() || generated.filename
    pdfBytes = generated.pdfBytes
    sizeBytes = generated.sizeBytes
  }

  if (options.maxSizeBytes != null && sizeBytes > options.maxSizeBytes) {
    throw new Error(
      `Generated brochure is too large (${sizeBytes} bytes). Max allowed is ${options.maxSizeBytes} bytes.`,
    )
  }

  const keyPrefix = options.keyPrefix?.trim() || `brochures/products/${productId}`
  let uploaded: Awaited<ReturnType<StorageProvider["upload"]>>
  try {
    uploaded = await options.storage.upload(pdfBytes, {
      key: `${keyPrefix.replace(/\/$/, "")}/${filename}`,
      contentType: mimeType,
    })
  } catch (err) {
    throw new ProductBrochureStorageError({ cause: err })
  }

  let url: string | null
  try {
    url =
      uploaded.url ||
      (options.signedUrlExpiresIn && options.storage.signedUrl
        ? await options.storage.signedUrl(uploaded.key, options.signedUrlExpiresIn)
        : null)
  } catch (err) {
    throw new ProductBrochureStorageError({ cause: err })
  }

  if (!url) {
    throw new ProductBrochureStorageError()
  }

  const brochure = await productsService.upsertBrochure(db, productId, {
    name: filename,
    url,
    storageKey: uploaded.key,
    mimeType,
    fileSize: sizeBytes,
    altText: null,
    sortOrder: 0,
  })

  if (!brochure) {
    throw new Error(`Unable to persist brochure for product ${productId}.`)
  }

  return {
    brochure,
    filename,
    metadata,
    sizeBytes,
    storageKey: uploaded.key,
    url,
  }
}
