"use client"

export {
  defaultFetcher,
  fetchWithValidation,
  VoyantApiError,
  type VoyantFetcher,
} from "./extras/client.js"
export { SlotExtrasManifestPanel } from "./extras/components/slot-extras-manifest-panel.js"
export {
  useProductExtra,
  useProductExtras,
  useSlotExtraManifest,
  useSlotExtraManifestMutation,
} from "./extras/hooks/index.js"
export type {
  SlotExtraCollectionBulkInput,
  SlotExtraSelectionBulkInput,
  SlotExtraSelectionPatchInput,
} from "./extras/hooks/use-slot-extra-manifest-mutation.js"
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
  useVoyantExtrasContext as useVoyantBookingsExtrasContext,
  type VoyantExtrasContextValue as VoyantBookingsExtrasContextValue,
  VoyantExtrasProvider as VoyantBookingsExtrasProvider,
  type VoyantExtrasProviderProps as VoyantBookingsExtrasProviderProps,
} from "./extras/provider.js"
export {
  extrasQueryKeys as bookingsExtrasQueryKeys,
  type ProductExtrasListFilters,
} from "./extras/query-keys.js"
export {
  getProductExtraQueryOptions,
  getProductExtrasQueryOptions,
  getSlotExtraManifestQueryOptions,
} from "./extras/query-options.js"
export {
  type ProductExtraRecord,
  productExtraListResponse,
  productExtraRecordSchema,
  type SlotExtraManifest,
  type SlotExtraManifestSelection,
  type SlotExtraManifestTraveler,
  slotExtraManifestMutationResponse,
  slotExtraManifestResponse,
  slotExtraManifestSchema,
} from "./extras/schemas.js"
