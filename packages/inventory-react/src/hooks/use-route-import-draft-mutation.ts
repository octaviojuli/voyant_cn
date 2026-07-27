"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { fetchWithValidation } from "../client.js"
import { useVoyantProductsContext } from "../provider.js"
import { productsQueryKeys } from "../query-keys.js"
import { routeImportCommitResponse, routeImportDraftSingleResponse } from "../schemas.js"

const BASE = "/v1/admin/products/import-drafts"

export interface CommitRouteImportDraftInput {
  sellCurrency?: string
  supplierId?: string | null
  productTypeId?: string | null
  timezone?: string | null
  adultMinAge?: number
  childMinAge?: number
  idempotencyKey?: string
}

/**
 * 线路草稿的四个写操作:上传、保存复核改动、确认上线、放弃。
 *
 * 上传走 multipart,body 直接给 FormData——不能自己设 Content-Type,
 * 浏览器要在里面补 boundary。
 */
export function useRouteImportDraftMutation() {
  const { baseUrl, fetcher } = useVoyantProductsContext()
  const queryClient = useQueryClient()

  const invalidateList = () => {
    void queryClient.invalidateQueries({ queryKey: productsQueryKeys.importDrafts() })
  }

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const body = new FormData()
      body.set("file", file)
      const { data } = await fetchWithValidation(
        BASE,
        routeImportDraftSingleResponse,
        { baseUrl, fetcher },
        { method: "POST", body },
      )
      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(productsQueryKeys.importDraft(data.id), { data })
      invalidateList()
    },
  })

  const save = useMutation({
    mutationFn: async ({ id, draft }: { id: string; draft: unknown }) => {
      const { data } = await fetchWithValidation(
        `${BASE}/${encodeURIComponent(id)}`,
        routeImportDraftSingleResponse,
        { baseUrl, fetcher },
        { method: "PATCH", body: JSON.stringify({ draft }) },
      )
      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(productsQueryKeys.importDraft(data.id), { data })
      invalidateList()
    },
  })

  const commit = useMutation({
    mutationFn: async ({ id, input }: { id: string; input?: CommitRouteImportDraftInput }) => {
      const { data } = await fetchWithValidation(
        `${BASE}/${encodeURIComponent(id)}/commit`,
        routeImportCommitResponse,
        { baseUrl, fetcher },
        { method: "POST", body: JSON.stringify(input ?? {}) },
      )
      return data
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: productsQueryKeys.importDraft(variables.id),
      })
      invalidateList()
      // 确认会建出产品,产品列表也跟着变。
      void queryClient.invalidateQueries({ queryKey: productsQueryKeys.products() })
    },
  })

  const discard = useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      const { data } = await fetchWithValidation(
        `${BASE}/${encodeURIComponent(id)}/discard`,
        routeImportDraftSingleResponse,
        { baseUrl, fetcher },
        { method: "POST", body: JSON.stringify(note ? { note } : {}) },
      )
      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(productsQueryKeys.importDraft(data.id), { data })
      invalidateList()
    },
  })

  return { upload, save, commit, discard }
}
