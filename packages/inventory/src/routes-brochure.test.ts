// @vitest-environment node

import type { StorageProvider } from "@voyant-travel/storage"
import { Hono } from "hono"
import { beforeEach, describe, expect, it, vi } from "vitest"

const brochures = vi.hoisted(() => ({
  generateAndStoreProductBrochure: vi.fn(),
  createDefaultProductBrochureTemplate: vi.fn(() => ({ id: "default" })),
  PRODUCT_BROCHURE_STORAGE_ERROR_MESSAGE:
    "Product brochure storage is unavailable. Configure a usable media storage provider for brochure uploads and retry.",
  ProductBrochureStorageError: class ProductBrochureStorageError extends Error {
    constructor(message: string) {
      super(message)
      this.name = "ProductBrochureStorageError"
    }
  },
}))

vi.mock("./tasks/index.js", () => brochures)

import type { Env } from "./route-env.js"
import { createProductBrochureRoutes } from "./routes-brochure.js"

function storageStub(): StorageProvider {
  return {
    name: "stub",
    upload: vi.fn(async () => ({ key: "k", url: "/u" })),
    delete: vi.fn(async () => {}),
    signedUrl: vi.fn(async () => "/signed"),
    get: vi.fn(async () => null),
  }
}

function mountApp(resolveStorage: () => StorageProvider | null, db: unknown = {}) {
  const app = new Hono<Env>()
  app.use("*", async (c, next) => {
    c.set("db", db as never)
    await next()
  })
  app.route("/v1/admin/products", createProductBrochureRoutes({ resolveStorage }))
  return app
}

describe("product brochure routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("responds 503 when storage is unconfigured", async () => {
    const app = mountApp(() => null)
    const response = await app.request("/v1/admin/products/prod_1/brochure/generate", {
      method: "POST",
    })
    expect(response.status).toBe(503)
    expect(brochures.generateAndStoreProductBrochure).not.toHaveBeenCalled()
  })

  it("generates + stores a brochure and returns metadata", async () => {
    brochures.generateAndStoreProductBrochure.mockResolvedValue({
      brochure: { id: "brch_1" },
      filename: "brochure-prod_1.pdf",
      sizeBytes: 1234,
      storageKey: "brochures/products/prod_1/brochure-prod_1.pdf",
      url: "/api/v1/admin/media/brochures/products/prod_1/brochure-prod_1.pdf",
    })
    const storage = storageStub()
    const app = mountApp(() => storage)

    const response = await app.request("/v1/admin/products/prod_1/brochure/generate", {
      method: "POST",
    })

    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      data: { id: string }
      metadata: { storageKey: string; url: string; sizeBytes: number; filename: string }
    }
    expect(body.data.id).toBe("brch_1")
    expect(body.metadata.sizeBytes).toBe(1234)
    expect(brochures.generateAndStoreProductBrochure).toHaveBeenCalledWith(
      expect.anything(),
      "prod_1",
      expect.objectContaining({
        storage,
        keyPrefix: "brochures/products/prod_1",
        // 带封面与逐日配图的册子远超原来的 5 MiB。
        maxSizeBytes: 16 * 1024 * 1024,
      }),
    )
  })

  it("maps an oversized brochure to 413", async () => {
    brochures.generateAndStoreProductBrochure.mockRejectedValue(
      new Error("Generated brochure is too large (9000000 bytes). Max allowed is 5242880 bytes."),
    )
    const app = mountApp(() => storageStub())

    const response = await app.request("/v1/admin/products/prod_1/brochure/generate", {
      method: "POST",
    })

    expect(response.status).toBe(413)
  })

  it("maps brochure storage failures to 503", async () => {
    brochures.generateAndStoreProductBrochure.mockRejectedValue(
      new brochures.ProductBrochureStorageError(
        "S3 upstream response text: AccessDenied secret bucket policy details",
      ),
    )
    const app = mountApp(() => storageStub())

    const response = await app.request("/v1/admin/products/prod_1/brochure/generate", {
      method: "POST",
    })

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({
      error: brochures.PRODUCT_BROCHURE_STORAGE_ERROR_MESSAGE,
    })
  })

  it("passes an injected printer through to the task", async () => {
    brochures.generateAndStoreProductBrochure.mockResolvedValue({
      brochure: { id: "brch_1" },
      filename: "f.pdf",
      sizeBytes: 1,
      storageKey: "brochures/products/prod_1/f.pdf",
      url: "/u",
    })
    const printer = vi.fn()
    const app = new Hono<Env>()
    app.use("*", async (c, next) => {
      c.set("db", {} as never)
      await next()
    })
    app.route(
      "/v1/admin/products",
      createProductBrochureRoutes({
        resolveStorage: () => storageStub(),
        resolvePrinter: () => printer as never,
      }),
    )

    await app.request("/v1/admin/products/prod_1/brochure/generate", { method: "POST" })

    expect(brochures.generateAndStoreProductBrochure).toHaveBeenCalledWith(
      expect.anything(),
      "prod_1",
      expect.objectContaining({ printer }),
    )
  })
})
