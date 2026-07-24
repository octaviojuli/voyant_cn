import {
  type AdminExtension,
  type AdminRouteLoaderContext,
  adminRoutePageModule,
  defineAdminExtension,
} from "@voyant-travel/admin/extensions"
import { Users } from "lucide-react"

/** Selected-graph team settings contribution owned by Auth React. */
export function createSelectedAuthTeamAdminExtension(): AdminExtension {
  return defineAdminExtension({
    id: "auth-team",
    settingsPages: [
      {
        id: "team",
        path: "/team",
        // i18n-literal-ok: contractual plain-English route title (AdminSettingsPageContribution.title: string); UI reads the localized `label` below
        title: "Team",
        label: (messages) => messages.settings.team,
        icon: Users,
        group: "general",
        order: 20,
        page: () =>
          import("./components/team-management-page.js").then((module) =>
            adminRoutePageModule(module.TeamManagementPage),
          ),
        routeMessagesProvider: () =>
          import("./i18n/index.js").then((module) => ({ default: module.AuthUiMessagesProvider })),
      },
    ],
    setupSteps: [
      {
        id: "@voyant-travel/auth#setup.team",
        order: 60,
        skippable: true,
        href: "/settings/team",
        messages: {
          en: {
            title: "Invite your team",
            description: "Add colleagues and assign the access they need.",
            action: "Manage team",
          },
          ro: {
            title: "Invita echipa",
            description: "Adauga colegi si atribuie accesul de care au nevoie.",
            action: "Gestioneaza echipa",
          },
          zh: {
            title: "邀请团队成员",
            description: "添加同事并分配所需权限。",
            action: "管理团队",
          },
        },
        isComplete: hasAdditionalTeamMember,
      },
    ],
  })
}

async function hasAdditionalTeamMember({ runtime }: AdminRouteLoaderContext): Promise<boolean> {
  const fetcher = runtime.fetcher ?? fetch
  const [membersResponse, invitationsResponse] = await Promise.all([
    fetcher(`${runtime.baseUrl}/v1/admin/team/members`),
    fetcher(`${runtime.baseUrl}/v1/admin/team/invitations`),
  ])
  if (!membersResponse.ok || !invitationsResponse.ok) return false
  const members = (await membersResponse.json()) as { data?: unknown[] }
  const invitations = (await invitationsResponse.json()) as { data?: unknown[] }
  return (members.data?.length ?? 0) > 1 || (invitations.data?.length ?? 0) > 0
}
