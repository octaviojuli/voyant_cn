import {
  type AdminExtension,
  type AdminRouteLoaderContext,
  adminRoutePageModule,
  defineAdminExtension,
} from "@voyant-travel/admin/extensions"
import type { AdminCoreSettingsExtraPage } from "@voyant-travel/admin-app/core-extension"
import { Building } from "lucide-react"

import {
  OPERATOR_PROFILE_SETUP_STEP_ID,
  parseOperatorProfileSetupPrefill,
} from "./operator-profile-setup-prefill.js"

/**
 * Options for {@link createOperatorProfileSettingsExtraPage}. All optional —
 * the defaults reproduce the operator starter's placement (General group,
 * leading order 10, Building icon) so a source-free admin renders the page
 * identically.
 */
export interface OperatorProfileSettingsExtraPageOptions {
  /** Path relative to the settings base path. Default `"/operator"`. */
  path?: string
  /** Position within the General group. Default `10` (leads the group). */
  order?: number
}

/**
 * The packaged Operator Profile settings page as an
 * {@link AdminCoreSettingsExtraPage} descriptor. Spread the result into
 * `createAdminCoreExtension({ settings: { extraPages: [...] } })` to mount the
 * page — the same shape the operator starter uses, but source-free so the
 * managed (package-only) admin can render it.
 *
 * The `page` thunk lazy-imports the heavy React page so it stays out of the
 * chunk that evaluates the extension registry.
 */
export function createOperatorProfileSettingsExtraPage(
  options: OperatorProfileSettingsExtraPageOptions = {},
): AdminCoreSettingsExtraPage {
  return {
    id: "operator",
    path: options.path ?? "/operator",
    title: "Operator Profile",
    label: (messages) => messages.settings.operator,
    icon: Building,
    group: "general",
    order: options.order ?? 10,
    page: () =>
      import("./operator-profile-settings-page.js").then((module) =>
        adminRoutePageModule(module.OperatorProfileSettingsPage),
      ),
  }
}

/** Selected-graph admin contribution owned by the operator-settings package. */
export function createSelectedOperatorSettingsAdminExtension(): AdminExtension {
  return defineAdminExtension({
    id: "operator-settings",
    settingsPages: [createOperatorProfileSettingsExtraPage()],
    setupSteps: [
      {
        id: OPERATOR_PROFILE_SETUP_STEP_ID,
        order: 10,
        skippable: true,
        href: "/settings/operator",
        messages: {
          en: {
            title: "Business profile",
            description:
              "Add the business name and contact details used across customer documents.",
            action: "Open operator settings",
          },
          ro: {
            title: "Profilul companiei",
            description: "Adauga numele si datele de contact folosite in documentele clientilor.",
            action: "Deschide setarile operatorului",
          },
          zh: {
            title: "企业资料",
            description: "填写用于客户文书的企业名称与联系方式。",
            action: "打开运营方设置",
          },
        },
        prefill: parseOperatorProfileSetupPrefill,
        isComplete: hasBusinessProfile,
      },
    ],
  })
}

async function hasBusinessProfile({ runtime }: AdminRouteLoaderContext): Promise<boolean> {
  const response = await (runtime.fetcher ?? fetch)(
    `${runtime.baseUrl}/v1/admin/settings/operator-profile`,
  )
  if (!response.ok) return false
  const profile = ((await response.json()) as { data?: Record<string, unknown> | null }).data
  return Boolean(profile?.name && (profile.email || profile.phone || profile.address))
}
