import {
  type AdminExtension,
  type AdminRouteLoaderContext,
  adminRoutePageModule,
  defineAdminExtension,
} from "@voyant-travel/admin"
import { Paintbrush } from "lucide-react"
import {
  parseStorefrontSetupPrefill,
  STOREFRONT_BRANDING_SETUP_STEP_ID,
} from "./internal/storefront-setup-prefill.js"
import { getAdminStorefrontSettings } from "./operations.js"

export function createSelectedStorefrontAdminExtension(): AdminExtension {
  return defineAdminExtension({
    id: "storefront",
    settingsPages: [
      {
        id: "storefront",
        path: "/storefront",
        title: "Storefront",
        label: (messages) => messages.settings.storefront,
        icon: Paintbrush,
        group: "general",
        order: 25,
        page: () =>
          import("./components/storefront-settings-page.js").then((module) =>
            adminRoutePageModule(module.StorefrontSettingsPage),
          ),
        routeMessagesProvider: () =>
          import("./i18n/provider.js").then((module) => ({
            default: module.StorefrontSettingsUiMessagesProvider,
          })),
      },
    ],
    setupSteps: [
      {
        id: STOREFRONT_BRANDING_SETUP_STEP_ID,
        order: 20,
        skippable: true,
        href: "/settings/storefront",
        messages: {
          en: {
            title: "Storefront branding",
            description: "Add the logo and visual identity customers see on your storefront.",
            action: "Open storefront settings",
          },
          ro: {
            title: "Identitatea magazinului",
            description: "Adauga sigla si identitatea vizuala afisata clientilor in magazin.",
            action: "Deschide setarile magazinului",
          },
          zh: {
            title: "在线商城品牌",
            description: "添加客户在您的在线商城中看到的标志与视觉识别。",
            action: "打开在线商城设置",
          },
        },
        prefill: parseStorefrontSetupPrefill,
        isComplete: hasStorefrontBranding,
      },
    ],
  })
}

async function hasStorefrontBranding({ runtime }: AdminRouteLoaderContext): Promise<boolean> {
  try {
    const { data } = await getAdminStorefrontSettings({
      baseUrl: runtime.baseUrl,
      fetcher: runtime.fetcher ?? fetch,
    })
    return Boolean(data.branding.logoUrl || data.branding.brandMarkUrl)
  } catch {
    return false
  }
}
