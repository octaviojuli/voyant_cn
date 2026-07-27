"use client"

import { useAdminNavigate } from "@voyant-travel/admin"

import { RouteImportReview } from "../../components/route-import-review.js"

export interface RouteImportDetailPageComponentProps {
  id: string
}

/** 单份线路草稿的复核页。 */
export default function RouteImportDetailPage({ id }: RouteImportDetailPageComponentProps) {
  const navigateTo = useAdminNavigate()

  return (
    <RouteImportReview
      draftId={id}
      onBack={() => navigateTo("routeImportDraft.list", {})}
      onProductOpen={(productId) => navigateTo("product.detail", { productId })}
    />
  )
}
