import { catalogContentRuntimePort } from "@voyant-travel/catalog/runtime-port"
import { defineGraphRuntimeFactory } from "@voyant-travel/core/project"
import { stampOpenApiRegistryApiId } from "@voyant-travel/hono"
import type { ApiExtension, ApiModule } from "@voyant-travel/hono/module"
import { storageMediaRuntimePort } from "@voyant-travel/storage/runtime-port"

import { inventoryExtrasApiModule } from "./extras.js"
import { inventoryApiModule } from "./interface.js"
import { createProductBrochureApiExtension } from "./routes-brochure.js"
import { createProductContentApiExtension } from "./routes-content.js"
import { createProductImportApiExtension } from "./routes-import.js"
import { inventoryBrochureRuntimePort, inventoryRuntimePort } from "./runtime-ports.js"

function selectedModuleSurfaces(
  configured: ApiModule,
  api: readonly { id: string; surface: string }[],
): ApiModule {
  const adminApiId = api.find(({ surface }) => surface === "admin")?.id
  const publicApiId = api.find(({ surface }) => surface === "public")?.id
  return {
    ...configured,
    ...(adminApiId
      ? { adminRoutes: stampOpenApiRegistryApiId(configured.adminRoutes, adminApiId) }
      : { adminRoutes: undefined }),
    ...(publicApiId
      ? { publicRoutes: stampOpenApiRegistryApiId(configured.publicRoutes, publicApiId) }
      : { publicRoutes: undefined }),
  }
}

function selectedExtensionSurfaces(
  configured: ApiExtension,
  api: readonly { id: string; surface: string }[],
): ApiExtension {
  const adminApiId = api.find(({ surface }) => surface === "admin")?.id
  const publicApiId = api.find(({ surface }) => surface === "public")?.id
  return {
    ...configured,
    ...(adminApiId
      ? { adminRoutes: stampOpenApiRegistryApiId(configured.adminRoutes, adminApiId) }
      : { adminRoutes: undefined }),
    ...(publicApiId
      ? { publicRoutes: stampOpenApiRegistryApiId(configured.publicRoutes, publicApiId) }
      : { publicRoutes: undefined }),
  }
}

export const createInventoryVoyantRuntime = defineGraphRuntimeFactory(async ({ api, getPort }) => {
  const runtime = await getPort(inventoryRuntimePort)
  return selectedModuleSurfaces(
    {
      ...inventoryApiModule,
      module: { ...inventoryApiModule.module, bootstrap: runtime.bootstrap },
    },
    api,
  )
})

export const createInventoryExtrasVoyantRuntime = defineGraphRuntimeFactory(async ({ api }) =>
  selectedModuleSurfaces(inventoryExtrasApiModule, api),
)

export const createInventoryContentVoyantRuntime = defineGraphRuntimeFactory(
  async ({ api, getPort }) => {
    const runtime = await getPort(catalogContentRuntimePort)
    return selectedExtensionSurfaces(
      {
        ...createProductContentApiExtension({
          admin: {
            resolveRegistry: runtime.resolveRegistry,
            defaultAcceptMachineTranslated: false,
          },
          public: {
            resolveRegistry: runtime.resolveRegistry,
            defaultAcceptMachineTranslated: true,
          },
        }),
        extension: { name: "inventory-content", module: "products" },
      },
      api,
    )
  },
)

export const createInventoryBrochureVoyantRuntime = defineGraphRuntimeFactory(
  async ({ api, getPort }) => {
    const [brochure, storage] = await Promise.all([
      getPort(inventoryBrochureRuntimePort),
      getPort(storageMediaRuntimePort),
    ])
    return selectedExtensionSurfaces(
      createProductBrochureApiExtension({
        ...brochure,
        resolveStorage: storage.resolveStorage,
      }),
      api,
    )
  },
)

/**
 * 线路上线助理。只需要存储:原始文件先存一份,复核时可回看原文。
 * 存储没配也能用,只是少了回看入口。
 */
export const createInventoryImportVoyantRuntime = defineGraphRuntimeFactory(
  async ({ api, getPort }) => {
    const storage = await getPort(storageMediaRuntimePort)
    return selectedExtensionSurfaces(
      createProductImportApiExtension({ resolveStorage: storage.resolveStorage }),
      api,
    )
  },
)

export type { InventoryRuntime } from "./runtime-ports.js"
export {
  inventoryBrochureRuntimePort,
  inventoryRuntimePort,
} from "./runtime-ports.js"
