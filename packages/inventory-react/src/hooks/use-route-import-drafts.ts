"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchWithValidation } from "../client.js"
import { useVoyantProductsContext } from "../provider.js"
import { productsQueryKeys } from "../query-keys.js"
import { routeImportDraftListResponse, routeImportDraftSingleResponse } from "../schemas.js"

export interface UseRouteImportDraftsOptions {
  enabled?: boolean
}

/** 待复核的线路草稿列表。 */
export function useRouteImportDrafts(options: UseRouteImportDraftsOptions = {}) {
  const { baseUrl, fetcher } = useVoyantProductsContext()
  const { enabled = true } = options

  return useQuery({
    queryKey: productsQueryKeys.importDraftsList(),
    queryFn: () =>
      fetchWithValidation("/v1/admin/products/import-drafts", routeImportDraftListResponse, {
        baseUrl,
        fetcher,
      }),
    enabled,
  })
}

export interface UseRouteImportDraftOptions {
  enabled?: boolean
}

/** 单份草稿的详情,含线路概览图。 */
export function useRouteImportDraft(id: string, options: UseRouteImportDraftOptions = {}) {
  const { baseUrl, fetcher } = useVoyantProductsContext()
  const { enabled = true } = options

  return useQuery({
    queryKey: productsQueryKeys.importDraft(id),
    queryFn: () =>
      fetchWithValidation(
        `/v1/admin/products/import-drafts/${encodeURIComponent(id)}`,
        routeImportDraftSingleResponse,
        { baseUrl, fetcher },
      ),
    enabled: enabled && id.length > 0,
  })
}
