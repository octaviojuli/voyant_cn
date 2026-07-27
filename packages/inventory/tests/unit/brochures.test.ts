import type { StorageProvider } from "@voyant-travel/storage"
import { createLocalStorageProvider } from "@voyant-travel/storage/providers/local"
import { describe, expect, it, vi } from "vitest"

vi.mock("../../src/tasks/generate-pdf.js", () => ({
  generateProductPdf: vi.fn(async () => ({
    pdfBytes: new Uint8Array([1, 2, 3]),
    filename: "brochure.pdf",
    sizeBytes: 3,
  })),
}))

vi.mock("../../src/tasks/brochure-templates.js", () => ({
  createDefaultProductBrochureTemplate: vi.fn(() => ({
    bodyFormat: "markdown",
    body: "# Default brochure",
  })),
  loadProductBrochureTemplateContext: vi.fn(async () => ({
    product: {
      id: "prod_123",
      name: "Voyant Brochure Product",
    },
    days: [],
    media: [],
    pricingTiers: [],
    generatedAt: new Date("2026-04-14T09:00:00.000Z"),
  })),
  renderProductBrochureTemplate: vi.fn(async () => ({
    body: "# Printed brochure",
    bodyFormat: "markdown",
    title: "Voyant Brochure Product",
    filename: "template-brochure.pdf",
    variables: {},
    metadataLines: ["Generated in test"],
  })),
}))

vi.mock("../../src/service.js", () => ({
  productsService: {
    upsertBrochure: vi.fn(
      async (_db: unknown, productId: string, input: Record<string, unknown>) => ({
        id: "product_media_brochure",
        productId,
        dayId: null,
        mediaType: "document",
        name: input.name,
        url: input.url,
        storageKey: input.storageKey,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
        altText: input.altText,
        sortOrder: input.sortOrder,
        isCover: false,
        isBrochure: true,
        isBrochureCurrent: true,
        brochureVersion: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ),
  },
}))

describe("generateAndStoreProductBrochure", () => {
  it("uploads generated PDFs and persists them as canonical brochures", async () => {
    const { generateAndStoreProductBrochure } = await import("../../src/tasks/brochures.js")
    const storage = createLocalStorageProvider({ baseUrl: "https://files.example/" })

    const result = await generateAndStoreProductBrochure({} as never, "prod_123", {
      storage,
    })

    expect(result.filename).toBe("brochure.pdf")
    expect(result.storageKey).toBe("brochures/products/prod_123/brochure.pdf")
    expect(result.url).toBe("https://files.example/brochures/products/prod_123/brochure.pdf")
    expect(result.brochure.isBrochure).toBe(true)
    expect(result.brochure.isBrochureCurrent).toBe(true)
    expect(result.brochure.storageKey).toBe(result.storageKey)
  }, 15_000)

  it("renders brochure templates through a custom printer and persists printer metadata", async () => {
    const { generateAndStoreProductBrochure } = await import("../../src/tasks/brochures.js")
    const storage = createLocalStorageProvider({ baseUrl: "https://files.example/" })
    const printer = vi.fn(async () => ({
      body: new Uint8Array([9, 8, 7, 6]),
      mimeType: "application/pdf",
      fileSize: 4,
      metadata: {
        renderer: "custom-printer",
        provider: "browserbase",
      },
    }))

    const result = await generateAndStoreProductBrochure({} as never, "prod_123", {
      storage,
      template: {
        bodyFormat: "markdown",
        body: "# Custom brochure",
      },
      printer,
      filename: ({ filename }) => `custom-${filename}`,
    })

    expect(printer).toHaveBeenCalledOnce()
    expect(result.filename).toBe("custom-template-brochure.pdf")
    expect(result.storageKey).toBe("brochures/products/prod_123/custom-template-brochure.pdf")
    expect(result.url).toBe(
      "https://files.example/brochures/products/prod_123/custom-template-brochure.pdf",
    )
    // 会排版的打印器一律套上宣传册版式,元数据里因此多出版式与内联图数量。
    expect(result.metadata).toEqual({
      renderer: "custom-printer",
      provider: "browserbase",
      layout: "themed-brochure",
      inlinedImages: 0,
    })
    expect(result.brochure.mimeType).toBe("application/pdf")
    expect(result.brochure.fileSize).toBe(4)
  })

  it("wraps storage upload failures with an actionable brochure storage error", async () => {
    const { generateAndStoreProductBrochure, ProductBrochureStorageError } = await import(
      "../../src/tasks/brochures.js"
    )
    const upstreamError = new Error("local R2 bucket is unavailable")
    const storage: StorageProvider = {
      name: "failing",
      upload: vi.fn(async () => {
        throw upstreamError
      }),
      delete: vi.fn(async () => {}),
      signedUrl: vi.fn(async () => "https://files.example/signed.pdf"),
      get: vi.fn(async () => null),
    }

    const promise = generateAndStoreProductBrochure({} as never, "prod_123", { storage })

    await expect(promise).rejects.toThrow(ProductBrochureStorageError)
    await expect(promise).rejects.toThrow(/Configure a usable media storage provider/)
    await expect(promise).rejects.not.toThrow(/local R2 bucket/)
    await expect(promise).rejects.toMatchObject({ cause: upstreamError })
  })

  it("reports storage URL configuration failures before persisting brochure metadata", async () => {
    const { generateAndStoreProductBrochure, ProductBrochureStorageError } = await import(
      "../../src/tasks/brochures.js"
    )
    const storage: StorageProvider = {
      name: "no-url",
      upload: vi.fn(async () => ({ key: "brochures/products/prod_123/brochure.pdf", url: "" })),
      delete: vi.fn(async () => {}),
      signedUrl: vi.fn(async () => "https://files.example/signed.pdf"),
      get: vi.fn(async () => null),
    }

    const promise = generateAndStoreProductBrochure({} as never, "prod_123", { storage })

    await expect(promise).rejects.toThrow(ProductBrochureStorageError)
    await expect(promise).rejects.toThrow(/Configure a usable media storage provider/)
  })
})
