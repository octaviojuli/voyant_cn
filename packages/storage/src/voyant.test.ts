import { assertPortConforms } from "@voyant-travel/core/project"
import { describe, expect, it } from "vitest"

import {
  createMediaApiModule,
  createMediaRoutes,
  STORAGE_MEDIA_ROUTE_PATHS,
  STORAGE_OPENAPI_API_IDS,
  storageMediaRuntimePort,
} from "./routes.js"
import { storageObjectRuntimePort } from "./runtime-port.js"
import { storageVoyantModule } from "./voyant.js"

describe("storage deployment manifest", () => {
  it("owns only upload, serve, and video-ticket media routes", () => {
    expect(storageVoyantModule).toMatchObject({
      schemaVersion: "voyant.module.v1",
      id: "@voyant-travel/storage",
      packageName: "@voyant-travel/storage",
      provides: { ports: [{ id: "storage.object" }, { id: "storage.media-runtime" }] },
      providers: [
        expect.objectContaining({
          port: "storage.object",
          selection: { role: "storage", value: "memory" },
        }),
        expect.objectContaining({
          port: "storage.object",
          selection: { role: "storage", value: "filesystem" },
        }),
        expect.objectContaining({
          port: "storage.object",
          selection: { role: "storage", value: "s3-compatible" },
        }),
      ],
      runtimePorts: [{ id: "storage.media-runtime" }],
      resources: [
        {
          id: "@voyant-travel/storage#resource.object-storage",
          kind: "object-storage",
          required: false,
        },
      ],
      lifecycle: { uninstall: { default: "retain-data", purge: "not-supported" } },
    })
    expect(storageVoyantModule.api).toEqual(
      [
        ["uploads", "storage-uploads"],
        ["uploads/video", "storage-video-upload-ticket"],
        ["media", "storage-media"],
      ].map(([mount, document]) =>
        expect.objectContaining({
          id: expect.stringMatching(/^@voyant-travel\/storage#api\.admin\./),
          surface: "admin",
          mount,
          resource: "media",
          openapi: { document },
          runtime: {
            entry: "@voyant-travel/storage/routes",
            export: "createStorageVoyantRuntime",
          },
        }),
      ),
    )

    const module = createMediaApiModule({
      resolveStorage: () => null,
      signVideoUploadTicket: async () => null,
    })
    expect(module.module.name).toBe("media")
    expect(module.lazyRoutes.paths).toEqual(STORAGE_MEDIA_ROUTE_PATHS)
    expect(module.lazyRoutes.paths).not.toContain("/v1/admin/products/:id/brochure/generate")
  })

  it("publishes package-owned OpenAPI operations keyed by graph API id", () => {
    const routes = createMediaRoutes({
      resolveStorage: () => null,
      signVideoUploadTicket: async () => null,
    })
    const document = routes.getOpenAPI31Document({
      openapi: "3.1.0",
      info: { title: "Storage", version: "1" },
    })

    expect(readApiId(document, "/v1/admin/uploads", "post")).toBe(STORAGE_OPENAPI_API_IDS.uploads)
    expect(readApiId(document, "/v1/admin/uploads/video", "post")).toBe(
      STORAGE_OPENAPI_API_IDS.videoUploadTicket,
    )
    expect(readApiId(document, "/v1/admin/media/{key}", "get")).toBe(STORAGE_OPENAPI_API_IDS.media)
    expect(document.paths?.["/v1/admin/media/{key}"]?.get?.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          in: "path",
          name: "key",
          required: true,
          allowReserved: true,
          schema: expect.objectContaining({
            pattern: "^(?:uploads|brochures/products)/.+$",
          }),
        }),
      ]),
    )
  })

  it("ships a conformance kit for deployment media providers", async () => {
    await expect(
      assertPortConforms(storageMediaRuntimePort, {
        resolveStorage: () => null,
        signVideoUploadTicket: async () => null,
      }),
    ).resolves.toBeUndefined()
    await expect(assertPortConforms(storageMediaRuntimePort, {} as never)).rejects.toThrow(
      /resolveStorage/,
    )
  })

  it("validates the deployment-selected object storage resolver", async () => {
    await expect(
      assertPortConforms(storageObjectRuntimePort, { resolve: () => null }),
    ).resolves.toBeUndefined()
    await expect(assertPortConforms(storageObjectRuntimePort, {} as never)).rejects.toThrow(
      /resolve/,
    )
  })
})

function readApiId(document: unknown, path: string, method: string) {
  const paths = (document as { paths?: Record<string, Record<string, unknown>> }).paths
  return (paths?.[path]?.[method] as Record<string, unknown> | undefined)?.["x-voyant-api-id"]
}
