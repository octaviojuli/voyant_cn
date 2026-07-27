"use client"

import { useAdminNavigate } from "@voyant-travel/admin"

import { RouteImportPage } from "../components/route-import-page.js"

/**
 * 线路上线助理的列表页宿主。
 *
 * 与 ProductsHost 同样是零 prop:页面自己管本地状态,打开某份草稿走
 * `routeImportDraft.detail` 这个语义目的地,不引入宿主的路由树。
 */
export function RouteImportHost() {
  const navigateTo = useAdminNavigate()

  return (
    <RouteImportPage
      onDraftOpen={(draft) => navigateTo("routeImportDraft.detail", { draftId: draft.id })}
    />
  )
}
