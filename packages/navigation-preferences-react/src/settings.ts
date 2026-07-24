import {
  type AdminExtension,
  type AdminRouteLoaderContext,
  adminRoutePageModule,
  defineAdminExtension,
} from "@voyant-travel/admin/extensions"
import { PanelLeft } from "lucide-react"

import { loadNavigationPreferences, navigationPreferencesQueryKey } from "./client.js"

export function createSelectedNavigationPreferencesAdminExtension(): AdminExtension {
  return defineAdminExtension({
    id: "navigation-preferences",
    navigationPreferences: {
      queryKey: navigationPreferencesQueryKey,
      load: loadNavigationPreferences,
    },
    settingsPages: [
      {
        id: "navigation",
        path: "/navigation",
        title: "Navigation",
        label: (messages) => messages.settings.navigation,
        icon: PanelLeft,
        group: "general",
        order: 15,
        page: () =>
          import("./navigation-preferences-page.js").then((module) =>
            adminRoutePageModule(module.NavigationPreferencesPage),
          ),
        routeMessagesProvider: () =>
          import("./i18n/provider.js").then((module) => ({
            default: module.NavigationPreferencesMessagesProvider,
          })),
      },
    ],
    setupSteps: [
      {
        id: "@voyant-travel/navigation-preferences#setup.organization-navigation",
        order: 50,
        skippable: true,
        href: "/settings/navigation",
        messages: {
          en: {
            title: "Workspace navigation",
            description: "Choose which product areas your team sees in the main navigation.",
            action: "Choose navigation",
          },
          ro: {
            title: "Navigarea spatiului de lucru",
            description: "Alege zonele de produs afisate echipei in navigarea principala.",
            action: "Alege navigarea",
          },
          zh: {
            title: "工作台导航",
            description: "选择团队在主导航中可见的产品板块。",
            action: "选择导航",
          },
        },
        isComplete: hasOrganizationNavigation,
      },
    ],
  })
}

async function hasOrganizationNavigation(context: AdminRouteLoaderContext): Promise<boolean> {
  const preferences = await loadNavigationPreferences({
    baseUrl: context.runtime.baseUrl,
    fetcher: context.runtime.fetcher ?? fetch,
  })
  return Object.keys(preferences.organization).length > 0
}
