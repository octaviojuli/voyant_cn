import {
  type AdminExtension,
  type AdminRouteLoaderContext,
  adminRoutePageModule,
  defineAdminExtension,
  type NavItem,
  type SelectedAdminExtensionFactoryContext,
  withAdminRouteMessagesProvider,
} from "@voyant-travel/admin"
import { Globe2, Tag } from "lucide-react"

import { COMMERCE_MARKET_SETUP_STEP_ID, parseMarketSetupPrefill } from "./markets/setup-prefill.js"

export {
  type CreatePromotionsAdminExtensionOptions,
  createPromotionsAdminExtension,
} from "./promotions/admin/index.js"

export interface CreateCommerceAdminExtensionOptions {
  /** Localized nav/page labels. Defaults are the English operator nav labels. */
  labels?: {
    promotions?: string
  }
  /** Nav icon — icon choice stays with the host (e.g. lucide `Tag`). */
  icon?: NavItem["icon"]
  /** Nav ordering past the host's base items. Default 50. */
  order?: number
  /** Mount path inside the admin workspace. Default `/promotions`. */
  path?: string
}

export function createCommerceAdminExtension(
  options: CreateCommerceAdminExtensionOptions = {},
): AdminExtension {
  const { labels = {}, icon, order = 50, path = "/promotions" } = options
  const { promotions = "Promotions" } = labels

  return defineAdminExtension({
    id: "commerce",
    navigation: [
      {
        order,
        items: [{ id: "promotions", title: promotions, url: path, icon }],
      },
    ],
    routes: [
      {
        id: "promotions-index",
        path,
        title: promotions,
        ssr: "data-only",
        page: () =>
          import("./promotions/promotions-page.js").then((module) =>
            adminRoutePageModule(module.PromotionsPage),
          ),
        loader: async ({ queryClient, runtime }: AdminRouteLoaderContext) => {
          const { loadPromotionsPage } = await import("./promotions/promotions-page.js")
          return loadPromotionsPage(queryClient, {
            baseUrl: runtime.baseUrl,
            fetcher: runtime.fetcher,
          })
        },
      },
    ],
  })
}

export function createSelectedCommerceAdminExtension({
  navMessages,
}: SelectedAdminExtensionFactoryContext): AdminExtension {
  const promotionsLabel = navMessages.promotions ?? "Promotions"
  const extension = withAdminRouteMessagesProvider(
    createCommerceAdminExtension({
      labels: { promotions: promotionsLabel },
      icon: Tag,
      order: 50,
    }),
    () =>
      import("./promotions/i18n/index.js").then((module) => ({
        default: module.PromotionsUiMessagesProvider,
      })),
  )
  return {
    ...extension,
    settingsPages: [
      {
        id: "markets",
        path: "/markets",
        // i18n-literal-ok: contractual plain-English route title (AdminSettingsPageContribution.title: string); UI reads the localized `label` below
        title: "Markets",
        label: (messages) => messages.settings.markets,
        icon: Globe2,
        group: "general",
        order: 35,
        page: () =>
          import("./markets/markets-settings-page.js").then((module) =>
            adminRoutePageModule(module.MarketsSettingsPage),
          ),
        routeMessagesProvider: () =>
          import("./markets/i18n/provider.js").then((module) => ({
            default: module.MarketsUiMessagesProvider,
          })),
      },
    ],
    setupSteps: [
      {
        id: COMMERCE_MARKET_SETUP_STEP_ID,
        order: 30,
        skippable: true,
        href: "/settings/markets",
        messages: {
          en: {
            title: "Locale, currency, and market",
            description: "Define the primary market, language, and selling currency.",
            action: "Configure markets",
          },
          ro: {
            title: "Limba, moneda si piata",
            description: "Defineste piata principala, limba si moneda de vanzare.",
            action: "Configureaza pietele",
          },
          zh: {
            title: "语言、货币与市场",
            description: "设定主市场、语言与销售货币。",
            action: "配置市场",
          },
        },
        prefill: parseMarketSetupPrefill,
        isComplete: hasCommerceMarket,
      },
    ],
  }
}

async function hasCommerceMarket({ runtime }: AdminRouteLoaderContext): Promise<boolean> {
  const response = await (runtime.fetcher ?? fetch)(
    `${runtime.baseUrl}/v1/admin/markets/markets?limit=1`,
  )
  if (!response.ok) return false
  const payload = (await response.json()) as { data?: unknown[]; total?: number }
  return (payload.total ?? payload.data?.length ?? 0) > 0
}
