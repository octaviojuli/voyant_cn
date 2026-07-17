import type { ProductsUiMessages } from "./messages.js"
import { productsUiCatalogZh } from "./zh-catalog.js"
import { productsUiCoreZh } from "./zh-core.js"
import { productsUiOperationsZh } from "./zh-operations.js"

export const productsUiZh = {
  ...productsUiCoreZh,
  ...productsUiCatalogZh,
  ...productsUiOperationsZh,
} satisfies ProductsUiMessages
