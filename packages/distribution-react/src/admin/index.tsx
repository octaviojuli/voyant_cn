import {
  type AdminExtension,
  adminRoutePageModule,
  composeAdminRouteMessagesProviders,
  defineAdminExtension,
  type SelectedAdminExtensionFactoryContext,
  withAdminRouteMessagesProvider,
} from "@voyant-travel/admin"
import { Building2, Radio } from "lucide-react"

import {
  type CreateSuppliersAdminExtensionOptions,
  createSuppliersAdminExtension,
} from "../suppliers/admin/index.js"

export { type CreateSuppliersAdminExtensionOptions, createSuppliersAdminExtension }

declare module "@voyant-travel/admin" {
  interface AdminDestinations {
    /** The suppliers list page. */
    "supplier.list": Record<string, never>
    /** A supplier's detail page. */
    "supplier.detail": { supplierId: string }
  }
}

export interface CreateDistributionAdminExtensionOptions
  extends CreateSuppliersAdminExtensionOptions {}

/** Package-owned supplier administration for the base Distribution module. */
export function createDistributionAdminExtension(
  options: CreateDistributionAdminExtensionOptions = {},
): AdminExtension {
  return { ...createSuppliersAdminExtension(options), id: "distribution" }
}

export interface CreateDistributionChannelPushAdminExtensionOptions {
  /** Mount path of the channel synchronization page. */
  basePath?: string
  /** Localized page title. */
  label?: string
}

/** Admin surface owned exclusively by the channel-push extension. */
export function createDistributionChannelPushAdminExtension({
  basePath = "/channel-sync",
  // i18n-literal-ok: default for the host-supplied localized label option (seam-fed fallback)
  label = "Distribution",
}: CreateDistributionChannelPushAdminExtensionOptions = {}): AdminExtension {
  return defineAdminExtension({
    id: "distribution-channel-push",
    routes: [
      {
        id: "distribution-channel-sync",
        path: basePath,
        title: label,
        page: () =>
          import("../components/channel-sync-page.js").then((module) =>
            adminRoutePageModule(module.ChannelSyncPage),
          ),
      },
    ],
  })
}

const suppliersRouteMessagesProvider = composeAdminRouteMessagesProviders(
  () =>
    import("../i18n/index.js").then((module) => ({
      default: module.DistributionUiMessagesProvider,
    })),
  () =>
    import("../suppliers/i18n/index.js").then((module) => ({
      default: module.SuppliersUiMessagesProvider,
    })),
)

export function createSelectedDistributionAdminExtension({
  navMessages,
}: SelectedAdminExtensionFactoryContext): AdminExtension {
  const suppliersLabel = navMessages.suppliers ?? "Suppliers"
  const extension = withAdminRouteMessagesProvider(
    createDistributionAdminExtension({ labels: { suppliers: suppliersLabel } }),
    suppliersRouteMessagesProvider,
  )

  return {
    ...extension,
    navigation: [
      {
        order: -80,
        items: [{ id: "suppliers", title: suppliersLabel, url: "/suppliers", icon: Building2 }],
      },
    ],
  }
}

export function createSelectedDistributionChannelPushAdminExtension({
  navMessages,
}: SelectedAdminExtensionFactoryContext): AdminExtension {
  const channelSyncLabel = navMessages.channelSync ?? "Channel sync"
  const extension = withAdminRouteMessagesProvider(
    createDistributionChannelPushAdminExtension({ label: channelSyncLabel }),
    () =>
      import("../i18n/index.js").then((module) => ({
        default: module.DistributionUiMessagesProvider,
      })),
  )

  return {
    ...extension,
    navigation: [
      {
        order: -30,
        items: [
          {
            id: "channel-sync",
            title: channelSyncLabel,
            url: "/channel-sync",
            icon: Radio,
          },
        ],
      },
    ],
  }
}
