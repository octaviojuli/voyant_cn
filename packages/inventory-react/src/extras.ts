"use client"

export {
  defaultFetcher,
  fetchWithValidation,
  VoyantApiError,
  type VoyantFetcher,
} from "./extras/client.js"
export { ProductCombobox } from "./extras/components/product-combobox.js"
export {
  useProductExtra,
  useProductExtraMutation,
  useProductExtras,
} from "./extras/hooks/index.js"
export type {
  CreateProductExtraInput,
  UpdateProductExtraInput,
} from "./extras/hooks/use-product-extra-mutation.js"
export {
  type ExtrasUiMessageOverrides,
  type ExtrasUiMessages,
  ExtrasUiMessagesProvider,
  extrasUiEn,
  extrasUiMessageDefinitions,
  extrasUiRo,
  extrasUiZh,
  getExtrasUiI18n,
  resolveExtrasUiMessages,
  useExtrasUiI18n,
  useExtrasUiI18nOrDefault,
  useExtrasUiMessages,
  useExtrasUiMessagesOrDefault,
} from "./extras/i18n/index.js"
export {
  useVoyantExtrasContext as useVoyantInventoryExtrasContext,
  type VoyantExtrasContextValue as VoyantInventoryExtrasContextValue,
  VoyantExtrasProvider as VoyantInventoryExtrasProvider,
  type VoyantExtrasProviderProps as VoyantInventoryExtrasProviderProps,
} from "./extras/provider.js"
export { extrasQueryKeys, type ProductExtrasListFilters } from "./extras/query-keys.js"
export {
  getProductExtraQueryOptions,
  getProductExtrasQueryOptions,
} from "./extras/query-options.js"
export {
  type ProductExtraRecord,
  productExtraListResponse,
  productExtraRecordSchema,
  productExtraSingleResponse,
} from "./extras/schemas.js"
