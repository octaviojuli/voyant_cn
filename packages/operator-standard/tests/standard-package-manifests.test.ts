import { actionLedgerVoyantModule } from "@voyant-travel/action-ledger/voyant"
import { bookingsVoyantModule } from "@voyant-travel/bookings/voyant"
import { financeVoyantModule } from "@voyant-travel/finance/voyant"
import navigationPreferencesVoyantModule from "@voyant-travel/navigation-preferences/voyant"
import { storefrontVoyantModule } from "@voyant-travel/storefront/voyant"
import { describe, expect, it } from "vitest"
import {
  defineProject,
  resolveDeploymentGraph,
  validateGraphUnitManifest,
} from "../../framework/src/deployment-graph.js"
import {
  STANDARD_OPERATOR_ACCESS,
  STANDARD_OPERATOR_DEPLOYMENT,
  STANDARD_OPERATOR_DISTRIBUTION_POLICY,
} from "../src/index.js"

describe("standard package manifests", () => {
  it("selects durable Postgres outbound webhook enqueueing explicitly", () => {
    expect(STANDARD_OPERATOR_DEPLOYMENT.providers?.outboundWebhooks).toBe("postgres")
  })

  it("resolves a package-owned module manifest without starter synthesis", async () => {
    expect(validateGraphUnitManifest(bookingsVoyantModule, "module")).toEqual([])

    const graph = await resolveDeploymentGraph({
      project: defineProject({ modules: [bookingsVoyantModule] }),
      target: "node",
      mode: "self-hosted",
    })

    expect(graph.modules[0]).toMatchObject({
      id: "@voyant-travel/bookings",
      api: [
        {
          id: "@voyant-travel/bookings#api.admin",
          runtime: { entry: "@voyant-travel/bookings", export: "createBookingsApiModule" },
        },
        {
          id: "@voyant-travel/bookings#api.public",
          runtime: { entry: "@voyant-travel/bookings", export: "createBookingsApiModule" },
        },
      ],
      schema: [{ id: "@voyant-travel/bookings#schema" }],
      migrations: [{ id: "@voyant-travel/bookings#migrations" }],
      links: [{ id: "@voyant-travel/bookings#linkable.booking" }],
    })
  })

  it("keeps the Storefront presentation as selected graph authority", async () => {
    expect(validateGraphUnitManifest(storefrontVoyantModule)).toEqual([])
    expect(validateGraphUnitManifest(financeVoyantModule)).toEqual([])
    expect(storefrontVoyantModule.meta).not.toHaveProperty("presentation")

    const graph = await resolveDeploymentGraph({
      project: defineProject({ modules: [storefrontVoyantModule] }),
      target: "node",
      mode: "self-hosted",
      packageRecords: [
        { packageName: "@voyant-travel/storefront", source: { kind: "workspace" } },
        { packageName: "@voyant-travel/storefront-react", source: { kind: "workspace" } },
      ],
    })
    expect(graph.modules[0]?.presentations).toEqual([
      {
        id: "@voyant-travel/storefront#presentation.customer",
        runtime: {
          entry: "@voyant-travel/storefront-react/storefront",
          export: "createStorefrontPresentationContribution",
        },
      },
    ])
  })

  it("selects durable self-hosted workflow execution by default", () => {
    expect(STANDARD_OPERATOR_DEPLOYMENT).toMatchObject({
      mode: "self-hosted",
      providers: { workflows: "self-hosted" },
    })
  })

  it("selects the composed dashboard with a staff preset that satisfies every source scope", () => {
    expect(STANDARD_OPERATOR_DISTRIBUTION_POLICY.modules).toContainEqual({
      resolve: "@voyant-travel/operations/dashboard",
    })
    expect(STANDARD_OPERATOR_ACCESS.presets.find(({ id }) => id === "agent-staff")).toMatchObject({
      audience: "staff",
      grants: expect.arrayContaining([
        "operations:read",
        "bookings:read",
        "finance:read",
        "products:read",
        "suppliers:read",
      ]),
    })
  })

  it("grants the explicit-wildcard action-ledger scopes to the owner/admin staff roles", () => {
    // The action-ledger resource opts out of `*` wildcard grants
    // (`wildcard: "explicit-resource"` + explicit actions), so the admin Logs
    // page (`/action-ledger`, requiredScopes `action-ledger:read`) is only
    // reachable through a deliberate per-role staff preset grant. Without
    // these presets even the owner's full-access session is denied (403).
    const resource = actionLedgerVoyantModule.access?.resources?.find(
      (candidate) => candidate.resource === "action-ledger",
    )
    expect(resource?.wildcard).toBe("explicit-resource")
    const declaredScopes = (resource?.actions ?? []).map(
      (action) => `action-ledger:${typeof action === "string" ? action : action.action}`,
    )

    const owner = STANDARD_OPERATOR_ACCESS.presets.find(({ id }) => id === "owner")
    expect(owner).toMatchObject({ kind: "staff" })
    expect(owner?.grants).toEqual([
      "action-ledger:approve",
      "action-ledger:read",
      "action-ledger:write",
    ])

    const admin = STANDARD_OPERATOR_ACCESS.presets.find(({ id }) => id === "admin")
    expect(admin).toMatchObject({ kind: "staff" })
    expect(admin?.grants).toContain("action-ledger:read")

    // Every granted scope must exist on the package-owned resource so the
    // graph resolver accepts the preset (undeclared grants are graph errors).
    for (const preset of [owner, admin]) {
      for (const grant of preset?.grants ?? []) {
        expect(declaredScopes).toContain(grant)
      }
    }

    // The admin route's declared requirement stays covered by both roles.
    const adminRoute = actionLedgerVoyantModule.admin?.routes?.find(
      ({ path }) => path === "/action-ledger",
    )
    for (const scope of adminRoute?.requiredScopes ?? []) {
      expect(owner?.grants).toContain(scope)
      expect(admin?.grants).toContain(scope)
    }
    expect(adminRoute?.requiredScopes).toEqual(["action-ledger:read"])
  })

  it("requires navigation preferences in the standard operator graph", () => {
    expect(validateGraphUnitManifest(navigationPreferencesVoyantModule, "module")).toEqual([])
    expect(
      STANDARD_OPERATOR_DISTRIBUTION_POLICY.modules.find(
        (selection) => selection.resolve === "@voyant-travel/navigation-preferences",
      ),
    ).toEqual({ resolve: "@voyant-travel/navigation-preferences", required: true })
    expect(
      STANDARD_OPERATOR_DISTRIBUTION_POLICY.modules.find(
        (selection) => selection.resolve === "@voyant-travel/setup",
      ),
    ).toEqual({ resolve: "@voyant-travel/setup", required: true })
  })
})
