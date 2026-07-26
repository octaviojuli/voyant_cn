import { useQueries } from "@tanstack/react-query"
import { Button } from "@voyant-travel/ui/components"
import { useMemo } from "react"
import { ProductsUiMessagesProvider } from "../../i18n/index.js"
import { ProductOptionsSection } from "../product-options-section.js"
import {
  useProductDetailApi,
  useProductDetailHost,
  useProductDetailMessages,
  useProductLocale,
} from "./host.js"
import { ProductActivitySection } from "./product-activity-section.js"
import { DepartureDialog } from "./product-departure-dialog.js"
import { DeparturePricingOverrideDialog } from "./product-departure-pricing-override-dialog.js"
import { ProductDialog } from "./product-detail-dialog.js"
import { ProductDetailHeader } from "./product-detail-header.js"
import { ProductDetailItinerarySection } from "./product-detail-itinerary-section.js"
import {
  ProductBrochureSection,
  ProductChannelsSection,
  ProductDeparturesSection,
  ProductDetailsSection,
  ProductMediaSection,
  ProductOrganizeSection,
  ProductSchedulesSection,
} from "./product-detail-sections.js"
import { ProductDetailSkeleton } from "./product-detail-skeleton.js"
import { ProductMarketRulesSection } from "./product-market-rules-section.js"
import { PricingPanel } from "./product-options-pricing.js"
import {
  deriveOptionPricingLayout,
  getProductDetailDeparturePriceOverridesQueryOptions,
} from "./product-options-shared.js"
import { ProductPaymentPolicySection } from "./product-payment-policy-section.js"
import { ScheduleDialog } from "./product-schedule-dialog.js"
import { useProductDetailData } from "./use-product-detail-data.js"
import { useProductDetailDialogs } from "./use-product-detail-dialogs.js"

export function ProductDetailPage({ id }: { id: string }) {
  const messages = useProductDetailMessages()
  const productMessages = messages.products.core
  const { navigate, renderOptionExtras } = useProductDetailHost()
  const resolvedLocale = useProductLocale()
  const api = useProductDetailApi()

  const data = useProductDetailData(id)
  const dialogs = useProductDetailDialogs()

  const { product, isPending, slots, rules, channels, mappings, media, itineraryNameById } = data
  const { mutations, refetch, invalidateProduct } = data

  const overrideQueries = useQueries({
    queries: slots.map((slot) => ({
      ...getProductDetailDeparturePriceOverridesQueryOptions(api, slot.id),
      enabled: !!slot.id,
    })),
  })

  const slotIdsWithOverrides = useMemo(() => {
    const set = new Set<string>()
    slots.forEach((slot, index) => {
      const result = overrideQueries[index]
      const items = result?.data?.data ?? []
      if (items.some((o) => o.active)) set.add(slot.id)
    })
    return set
  }, [slots, overrideQueries])
  const brochure =
    media.find((item) => item.isBrochure && item.isBrochureCurrent) ??
    media.find((item) => item.isBrochure) ??
    null
  const galleryMedia = media.filter((item) => !item.isBrochure)

  if (isPending) {
    return <ProductDetailSkeleton />
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <p className="text-muted-foreground">{productMessages.detailNotFound}</p>
        <Button variant="outline" onClick={() => navigate.toProducts()}>
          {productMessages.backToProducts}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <ProductDetailHeader
        product={product}
        isDuplicating={mutations.duplicateProduct.isPending}
        isDeleting={mutations.deleteProduct.isPending}
        onEdit={dialogs.edit.openNow}
        onAddBooking={() => navigate.toNewBooking(id)}
        onDuplicate={() => {
          mutations.duplicateProduct.mutate(undefined, {
            onSuccess: (result) => {
              navigate.toProduct(result.data.id)
            },
          })
        }}
        onDelete={() => {
          if (confirm(productMessages.deleteConfirm)) {
            mutations.deleteProduct.mutate(undefined, {
              onSuccess: () => navigate.toProducts(),
            })
          }
        }}
      />

      {/* Content — two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* ── Left column (main) ── */}
        <div className="flex min-w-0 flex-col gap-6">
          <ProductDetailsSection product={product} onEdit={dialogs.edit.openNow} />

          <ProductMediaSection
            productId={id}
            media={galleryMedia}
            isUploading={mutations.uploadMedia.isPending}
            onUpload={(file) => mutations.uploadMedia.mutate({ file })}
            onSetCover={(mediaId) => mutations.setCover.mutate(mediaId)}
            onDelete={(mediaId) => {
              if (confirm(productMessages.deleteMediaConfirm)) {
                mutations.deleteMedia.mutate(mediaId)
              }
            }}
          />

          <ProductDeparturesSection
            slots={slots}
            itineraryNameById={itineraryNameById}
            slotIdsWithOverrides={slotIdsWithOverrides}
            onCreate={dialogs.departure.openNew}
            onEdit={dialogs.departure.openEdit}
            onOverridePrice={dialogs.departureOverride.openEdit}
            onManageAvailability={(slot) => navigate.toAvailability(slot.id)}
            onDelete={(slotId) => {
              if (confirm(productMessages.deleteDepartureConfirm)) {
                mutations.deleteSlot.mutate(slotId)
              }
            }}
          />

          <ProductSchedulesSection
            rules={rules}
            generatingRuleId={
              mutations.generateRuleSlots.isPending
                ? (mutations.generateRuleSlots.variables ?? null)
                : null
            }
            onCreate={dialogs.schedule.openNew}
            onEdit={dialogs.schedule.openEdit}
            onGenerateSlots={(rule) => mutations.generateRuleSlots.mutate(rule.id)}
            onDelete={(ruleId) => {
              if (confirm(productMessages.deleteScheduleConfirm)) {
                mutations.deleteRule.mutate(ruleId)
              }
            }}
          />

          <ProductDetailItinerarySection productId={id} />

          <ProductsUiMessagesProvider locale={resolvedLocale}>
            <ProductOptionsSection
              productId={id}
              renderOptionDetails={(option) => (
                <PricingPanel
                  productId={id}
                  optionId={option.id}
                  optionName={option.name}
                  productCurrency={product.sellCurrency}
                  layout={deriveOptionPricingLayout(product.bookingMode)}
                  extras={renderOptionExtras?.(id, option.id)}
                />
              )}
            />
          </ProductsUiMessagesProvider>

          <ProductPaymentPolicySection product={product} onSuccess={invalidateProduct} />
          <ProductMarketRulesSection productId={id} />
        </div>

        {/* ── Right column (sidebar) ── */}
        <div className="flex flex-col gap-6">
          <ProductChannelsSection
            allChannels={channels}
            mappings={mappings}
            onAddChannel={(channelId) => mutations.addChannelMapping.mutate(channelId)}
            onRemoveChannel={(mappingId) => mutations.removeChannelMapping.mutate(mappingId)}
          />

          <ProductOrganizeSection product={product} onEdit={dialogs.edit.openNow} />

          <ProductBrochureSection
            brochure={brochure}
            isGenerating={mutations.generateBrochure.isPending}
            generateError={
              mutations.generateBrochure.error
                ? mutations.generateBrochure.error.message || productMessages.brochureGenerateFailed
                : null
            }
            onGenerate={() => mutations.generateBrochure.mutate()}
          />

          <ProductActivitySection productId={id} />
        </div>
      </div>

      {/* Dialogs */}
      <ProductDialog
        open={dialogs.edit.open}
        onOpenChange={dialogs.edit.setOpen}
        product={product}
        onSuccess={() => {
          dialogs.edit.close()
          invalidateProduct()
        }}
      />

      <DepartureDialog
        open={dialogs.departure.open}
        onOpenChange={dialogs.departure.setOpen}
        productId={id}
        slot={dialogs.departure.editing}
        onSuccess={() => {
          dialogs.departure.close()
          refetch.slots()
        }}
      />

      <ScheduleDialog
        open={dialogs.schedule.open}
        onOpenChange={dialogs.schedule.setOpen}
        productId={id}
        rule={dialogs.schedule.editing}
        onSuccess={(result) => {
          dialogs.schedule.close()
          refetch.rules()
          // Keep the panel's promise honest: a freshly created rule immediately
          // materializes its departures (and refreshes the list) instead of
          // leaving the operator with a rule that generates nothing.
          if (result.isNew && result.ruleId) {
            mutations.generateRuleSlots.mutate(result.ruleId)
          }
        }}
      />

      <DeparturePricingOverrideDialog
        open={dialogs.departureOverride.open}
        onOpenChange={dialogs.departureOverride.setOpen}
        departureId={dialogs.departureOverride.editing?.id ?? null}
        optionId={dialogs.departureOverride.editing?.optionId ?? null}
        onSuccess={() => {
          dialogs.departureOverride.close()
        }}
      />
    </div>
  )
}
