// agent-quality: file-size exception -- owner: framework; runtime catalog, selected facet, lazy loading, and validation cases share one lowering harness.
import { createToolRegistry } from "@voyant-travel/tools"
import { describe, expect, it, vi } from "vitest"
import {
  createVoyantGraphRuntime,
  registerVoyantGraphTools,
  VoyantGraphRuntimeLoadError,
  type VoyantGraphRuntimeSelectedIds,
} from "./runtime-lowering.js"

function selectedIds(
  overrides: Partial<VoyantGraphRuntimeSelectedIds> = {},
): VoyantGraphRuntimeSelectedIds {
  return {
    routes: [],
    tools: [],
    workflows: [],
    events: [],
    webhooks: [],
    ...overrides,
  }
}

function runtimeInput(load: () => Promise<unknown>) {
  return {
    graphHash: "sha256:test",
    entries: {
      "@acme/voyant-loyalty/runtime": load,
    },
    modules: [
      {
        id: "@acme/voyant-loyalty",
        kind: "module" as const,
        packageName: "@acme/voyant-loyalty",
        order: 0,
        references: [
          {
            id: "loyalty-admin-route",
            unitId: "@acme/voyant-loyalty",
            facet: "api" as const,
            entityId: "@acme/voyant-loyalty#api.admin",
            runtime: { entry: "./runtime", export: "createLoyaltyModule" },
            importEntry: "@acme/voyant-loyalty/runtime",
          },
          {
            id: "loyalty-public-route",
            unitId: "@acme/voyant-loyalty",
            facet: "api" as const,
            entityId: "@acme/voyant-loyalty#api.public",
            runtime: { entry: "./runtime", export: "createLoyaltyModule" },
            importEntry: "@acme/voyant-loyalty/runtime",
          },
        ],
        selectedIds: selectedIds({
          routes: ["@acme/voyant-loyalty#api.admin", "@acme/voyant-loyalty#api.public"],
        }),
        routes: [
          {
            route: {
              id: "@acme/voyant-loyalty#api.admin",
              surface: "admin" as const,
              openapi: { document: "loyalty" },
              runtime: {
                entry: "./runtime",
                export: "createLoyaltyModule",
              },
            },
            importEntry: "@acme/voyant-loyalty/runtime",
            referenceId: "loyalty-admin-route",
          },
          {
            route: {
              id: "@acme/voyant-loyalty#api.public",
              surface: "public" as const,
              runtime: {
                entry: "./runtime",
                export: "createLoyaltyModule",
              },
            },
            importEntry: "@acme/voyant-loyalty/runtime",
            referenceId: "loyalty-public-route",
          },
        ],
      },
    ],
    plugins: [],
  }
}

describe("graph runtime lowering", () => {
  it("exposes a selected-owner event catalog to graph runtime factories", () => {
    const input = runtimeInput(async () => ({ createLoyaltyModule: () => ({}) }))
    const runtime = createVoyantGraphRuntime({
      ...input,
      modules: input.modules.map((module) => ({
        ...module,
        selectedIds: selectedIds({
          routes: ["@acme/voyant-loyalty#api.admin", "@acme/voyant-loyalty#api.public"],
          events: [
            "@acme/voyant-loyalty#event.changed-v1",
            "@acme/voyant-loyalty#event.changed-v2",
          ],
        }),
      })),
      eventCatalog: {
        schemaVersion: "voyant.event-catalog.v1",
        events: [
          {
            key: "loyalty.changed@1.0.0",
            id: "@acme/voyant-loyalty#event.changed-v1",
            unitId: "@acme/voyant-loyalty",
            packageName: "@acme/voyant-loyalty",
            eventType: "loyalty.changed",
            version: "1.0.0",
            payloadSchema: { type: "object", properties: {} },
            visibility: "internal",
            audit: { sourceModule: "loyalty", category: "domain" },
            redactedFields: [],
          },
          {
            key: "loyalty.changed@2.0.0",
            id: "@acme/voyant-loyalty#event.changed-v2",
            unitId: "@acme/voyant-loyalty",
            packageName: "@acme/voyant-loyalty",
            eventType: "loyalty.changed",
            version: "2.0.0",
            payloadSchema: { type: "object", properties: {} },
            visibility: "internal",
            audit: { sourceModule: "loyalty", category: "domain" },
            redactedFields: [],
          },
        ],
      },
    })

    expect(runtime.eventCatalog.events.map(({ key }) => key)).toEqual([
      "loyalty.changed@1.0.0",
      "loyalty.changed@2.0.0",
    ])
  })

  it("rejects event catalog entries without a selected manifest owner", () => {
    expect(() =>
      createVoyantGraphRuntime({
        ...runtimeInput(async () => ({})),
        eventCatalog: {
          schemaVersion: "voyant.event-catalog.v1",
          events: [
            {
              key: "other.changed@1.0.0",
              id: "@acme/other#event.changed",
              unitId: "@acme/other",
              packageName: "@acme/other",
              eventType: "other.changed",
              version: "1.0.0",
              payloadSchema: { type: "object" },
              visibility: "internal",
              audit: { sourceModule: "other", category: "domain" },
              redactedFields: [],
            },
          ],
        },
      }),
    ).toThrow(/not declared by selected owner/)
  })

  it("exposes only selected outbound webhook event types as delivery-eligible", () => {
    const runtime = createVoyantGraphRuntime({
      graphHash: "sha256:webhooks",
      entries: { "@acme/hooks": async () => ({ createHooksModule: () => ({}) }) },
      modules: [
        {
          id: "@acme/hooks",
          kind: "module",
          packageName: "@acme/hooks",
          order: 0,
          references: [
            {
              id: "hooks-inbound-route",
              unitId: "@acme/hooks",
              facet: "api",
              entityId: "@acme/hooks#api.inbound",
              runtime: { entry: "@acme/hooks", export: "createHooksModule" },
              importEntry: "@acme/hooks",
            },
          ],
          selectedIds: selectedIds({
            routes: ["@acme/hooks#api.inbound"],
            events: ["@acme/hooks#event.changed"],
            webhooks: ["@acme/hooks#webhook.inbound", "@acme/hooks#webhook.changed"],
          }),
          routes: [
            {
              route: {
                id: "@acme/hooks#api.inbound",
                surface: "webhook",
                runtime: { entry: "@acme/hooks", export: "createHooksModule" },
              },
              importEntry: "@acme/hooks",
              referenceId: "hooks-inbound-route",
            },
          ],
        },
      ],
      plugins: [],
      webhookPlan: {
        inbound: [
          {
            id: "@acme/hooks#webhook.inbound",
            unitId: "@acme/hooks",
            packageName: "@acme/hooks",
            apiId: "@acme/hooks#api.inbound",
            apiUnitId: "@acme/hooks",
            mountPath: "/v1/hooks",
            secretIds: [],
          },
        ],
        outbound: [
          {
            id: "@acme/hooks#webhook.changed",
            unitId: "@acme/hooks",
            packageName: "@acme/hooks",
            eventId: "@acme/hooks#event.changed",
            eventUnitId: "@acme/hooks",
            eventType: "hooks.changed",
            eventVersion: "1.0.0",
            payloadSchema: { type: "object", properties: {} },
            visibility: "external",
            audit: { sourceModule: "hooks", category: "domain" },
            secretIds: [],
          },
        ],
      },
    })

    expect(runtime.webhooks.inboundApiIds).toEqual(["@acme/hooks#api.inbound"])
    expect(runtime.webhooks.isInboundApi("@acme/hooks#api.inbound")).toBe(true)
    expect(runtime.webhooks.outboundEventTypes).toEqual(["hooks.changed"])
    expect(runtime.webhooks.isOutboundEventEligible("hooks.changed")).toBe(true)
    expect(runtime.webhooks.isOutboundEventEligible("hooks.deleted")).toBe(false)
  })

  it("exposes selected setup steps on unit loaders and the runtime aggregate", () => {
    const input = runtimeInput(async () => ({ createLoyaltyModule: () => ({}) }))
    const setupSteps = [
      { id: "@acme/voyant-loyalty#setup.first-reward", skippable: true },
      { id: "@acme/voyant-loyalty#setup.tiers", skippable: false },
    ]
    const runtime = createVoyantGraphRuntime({
      ...input,
      modules: input.modules.map((module) => ({ ...module, setupSteps })),
    })

    expect(runtime.modules[0]?.setupSteps).toEqual(setupSteps)
    expect(runtime.setupSteps).toEqual(setupSteps)
  })

  it("keeps package imports lazy and memoized across route and unit loaders", async () => {
    const factory = () => ({ module: { name: "loyalty" } })
    const importRuntime = vi.fn(async () => ({ createLoyaltyModule: factory }))
    const runtime = createVoyantGraphRuntime(runtimeInput(importRuntime))

    expect(importRuntime).not.toHaveBeenCalled()
    expect(runtime.modules[0]?.routes[0]?.route.openapi).toEqual({ document: "loyalty" })
    await expect(runtime.modules[0]?.routes[0]?.load()).resolves.toBe(factory)
    await expect(runtime.modules[0]?.load()).resolves.toEqual([factory])
    await expect(runtime.modules[0]?.routes[1]?.load()).resolves.toBe(factory)
    expect(importRuntime).toHaveBeenCalledTimes(1)
  })

  it("prefers a unit runtime over route runtime factories", async () => {
    const unitFactory = () => ({ module: { name: "loyalty" } })
    const routeFactory = () => ({ module: { name: "legacy-loyalty" } })
    const importRuntime = vi.fn(async () => ({ unitFactory, routeFactory }))
    const runtime = createVoyantGraphRuntime({
      graphHash: "sha256:test",
      accessCatalog: {
        resources: [
          {
            id: "loyalty",
            unitId: "@acme/loyalty",
            resource: "loyalty",
            label: "Loyalty",
            description: "Loyalty",
            wildcard: "allow",
            actions: [
              { action: "read", label: "Read", description: "Read" },
              { action: "write", label: "Write", description: "Write" },
            ],
          },
        ],
        presets: [],
      },
      entries: { "@acme/loyalty/runtime": importRuntime },
      modules: [
        {
          id: "@acme/loyalty",
          kind: "module",
          packageName: "@acme/loyalty",
          order: 0,
          accessScopes: ["loyalty:read", "loyalty:write"],
          runtimeReferenceId: "loyalty-runtime",
          references: [
            {
              id: "loyalty-runtime",
              unitId: "@acme/loyalty",
              facet: "runtime",
              entityId: "@acme/loyalty",
              runtime: { entry: "./runtime", export: "unitFactory" },
              importEntry: "@acme/loyalty/runtime",
            },
            {
              id: "loyalty-admin-route",
              unitId: "@acme/loyalty",
              facet: "api",
              entityId: "@acme/loyalty#api.admin",
              runtime: { entry: "./runtime", export: "routeFactory" },
              importEntry: "@acme/loyalty/runtime",
            },
          ],
          selectedIds: selectedIds({ routes: ["@acme/loyalty#api.admin"] }),
          routes: [
            {
              route: {
                id: "@acme/loyalty#api.admin",
                surface: "admin",
                runtime: { entry: "./runtime", export: "routeFactory" },
              },
              importEntry: "@acme/loyalty/runtime",
              referenceId: "loyalty-admin-route",
            },
          ],
        },
      ],
      plugins: [],
    })

    expect(importRuntime).not.toHaveBeenCalled()
    await expect(runtime.modules[0]?.load()).resolves.toEqual([unitFactory])
    await expect(runtime.modules[0]?.routes[0]?.load()).resolves.toBe(routeFactory)
    expect(importRuntime).toHaveBeenCalledTimes(1)
  })

  it("loads workflow exports independently from the unit runtime", async () => {
    const unitFactory = () => ({ module: { name: "commerce" } })
    const workflow = { id: "commerce.reconcile", config: { id: "commerce.reconcile" } }
    const importRuntime = vi.fn(async () => ({ unitFactory, workflow }))
    const runtime = createVoyantGraphRuntime({
      graphHash: "sha256:workflow-runtime",
      entries: { "@acme/commerce/runtime": importRuntime },
      modules: [
        {
          id: "@acme/commerce",
          kind: "module",
          packageName: "@acme/commerce",
          order: 0,
          runtimeReferenceId: "commerce-runtime",
          references: [
            {
              id: "commerce-runtime",
              unitId: "@acme/commerce",
              facet: "runtime",
              entityId: "@acme/commerce",
              runtime: { entry: "./runtime", export: "unitFactory" },
              importEntry: "@acme/commerce/runtime",
            },
            {
              id: "commerce-workflow",
              unitId: "@acme/commerce",
              facet: "workflows.runtime",
              entityId: workflow.id,
              runtime: { entry: "./runtime", export: "workflow" },
              importEntry: "@acme/commerce/runtime",
            },
          ],
          workflows: [
            {
              unitId: "@acme/commerce",
              declaration: {
                id: workflow.id,
                runtime: { entry: "./runtime", export: "workflow" },
              },
              referenceId: "commerce-workflow",
            },
          ],
          selectedIds: selectedIds({ workflows: [workflow.id] }),
          routes: [],
        },
      ],
      plugins: [],
    })

    expect(importRuntime).not.toHaveBeenCalled()
    await expect(runtime.modules[0]?.load()).resolves.toEqual([unitFactory])
    await expect(runtime.modules[0]?.workflows[0]?.load()).resolves.toBe(workflow)
    await expect(runtime.workflows[0]?.load()).resolves.toBe(workflow)
    expect(importRuntime).toHaveBeenCalledTimes(1)
  })

  it("rejects workflow exports whose id differs from the graph declaration", async () => {
    const runtime = createVoyantGraphRuntime({
      graphHash: "sha256:mismatched-workflow-runtime",
      entries: {
        "@acme/commerce/workflows": async () => ({
          workflow: { id: "commerce.wrong-workflow", config: {} },
        }),
      },
      modules: [
        {
          id: "@acme/commerce",
          kind: "module",
          packageName: "@acme/commerce",
          order: 0,
          references: [
            {
              id: "commerce-workflow",
              unitId: "@acme/commerce",
              facet: "workflows.runtime",
              entityId: "commerce.reconcile",
              runtime: { entry: "./workflows", export: "workflow" },
              importEntry: "@acme/commerce/workflows",
            },
          ],
          workflows: [
            {
              unitId: "@acme/commerce",
              declaration: {
                id: "commerce.reconcile",
                runtime: { entry: "./workflows", export: "workflow" },
              },
              referenceId: "commerce-workflow",
            },
          ],
          selectedIds: selectedIds({ workflows: ["commerce.reconcile"] }),
          routes: [],
        },
      ],
      plugins: [],
    })

    await expect(runtime.modules[0]?.workflows[0]?.load()).rejects.toMatchObject({
      code: "VOYANT_GRAPH_RUNTIME_EXPORT_INVALID",
      context: {
        referenceId: "commerce-workflow",
        unitId: "@acme/commerce",
        facet: "workflows.runtime",
        entityId: "commerce.reconcile",
        entry: "@acme/commerce/workflows",
        exportName: "workflow",
      },
    })
    await expect(runtime.modules[0]?.workflows[0]?.load()).rejects.toThrow(
      'loaded workflow must declare id "commerce.reconcile"',
    )
  })

  it("loads typed package exports for non-route facets by stable reference id", async () => {
    const provider = { kind: "ledger-provider" }
    const tool = () => "adjusted"
    const importRuntime = vi.fn(async () => ({ provider, tool }))
    const runtime = createVoyantGraphRuntime({
      graphHash: "sha256:test",
      entries: { "@acme/loyalty/runtime": importRuntime },
      modules: [
        {
          id: "@acme/loyalty",
          kind: "module",
          packageName: "@acme/loyalty",
          order: 0,
          references: [
            {
              id: "loyalty-provider",
              unitId: "@acme/loyalty",
              facet: "providers.runtime",
              entityId: "provider",
              runtime: { entry: "./runtime", export: "provider" },
              importEntry: "@acme/loyalty/runtime",
            },
            {
              id: "loyalty-tool",
              unitId: "@acme/loyalty",
              facet: "tools.runtime",
              entityId: "tool",
              runtime: { entry: "./runtime", export: "tool" },
              importEntry: "@acme/loyalty/runtime",
            },
          ],
          selectedIds: selectedIds(),
          routes: [],
        },
      ],
      plugins: [],
    })

    expect(importRuntime).not.toHaveBeenCalled()
    await expect(runtime.loadReference<typeof provider>("loyalty-provider")).resolves.toBe(provider)
    await expect(runtime.loadReference<typeof tool>("loyalty-tool")).resolves.toBe(tool)
    expect(runtime.references.map((reference) => reference.facet)).toEqual([
      "providers.runtime",
      "tools.runtime",
    ])
    expect(importRuntime).toHaveBeenCalledTimes(1)
  })

  it("exposes selected access scopes and lazily registers selected graph tools", async () => {
    const tool = {
      name: "adjust_loyalty",
      description: "Adjust loyalty points",
      inputSchema: {},
      outputSchema: {},
      requiredScopes: ["loyalty:write"],
      tier: "write",
      riskPolicy: {
        destructive: false,
        reversible: true,
        dryRunSupported: false,
        sideEffects: ["data-write"],
      },
      handler: async () => ({ ok: true }),
    }
    const importRuntime = vi.fn(async () => ({ adjustLoyalty: tool }))
    const runtime = createVoyantGraphRuntime({
      graphHash: "sha256:test",
      accessCatalog: {
        resources: [
          {
            id: "loyalty",
            unitId: "@acme/loyalty",
            resource: "loyalty",
            label: "Loyalty",
            description: "Loyalty",
            wildcard: "allow",
            actions: [
              { action: "read", label: "Read", description: "Read" },
              { action: "write", label: "Write", description: "Write" },
            ],
          },
        ],
        presets: [],
      },
      entries: { "@acme/loyalty/tools": importRuntime },
      modules: [
        {
          id: "@acme/loyalty",
          kind: "module",
          packageName: "@acme/loyalty",
          order: 0,
          accessScopes: ["loyalty:read", "loyalty:write"],
          references: [
            {
              id: "loyalty-tool-runtime",
              unitId: "@acme/loyalty",
              facet: "tools.runtime",
              entityId: "loyalty-tool",
              runtime: { entry: "./tools", export: "adjustLoyalty" },
              importEntry: "@acme/loyalty/tools",
            },
          ],
          tools: [
            {
              id: "loyalty-tool",
              unitId: "@acme/loyalty",
              name: "adjust_loyalty",
              referenceId: "loyalty-tool-runtime",
              requiredScopes: ["loyalty:write"],
              context: ["loyalty"],
              risk: "medium",
            },
          ],
          selectedIds: selectedIds({ tools: ["loyalty-tool"] }),
          routes: [],
        },
      ],
      plugins: [],
    })

    expect(runtime.accessScopes).toEqual(["loyalty:read", "loyalty:write"])
    expect(runtime.tools.map(({ id }) => id)).toEqual(["loyalty-tool"])
    expect(importRuntime).not.toHaveBeenCalled()

    const registry = createToolRegistry()
    await registerVoyantGraphTools(runtime, registry)

    expect(registry.names()).toEqual(["adjust_loyalty"])
    expect(importRuntime).toHaveBeenCalledTimes(1)
  })

  it("rejects undeclared tool scopes before evaluating package imports", () => {
    const importRuntime = vi.fn(async () => ({}))

    expect(() =>
      createVoyantGraphRuntime({
        graphHash: "sha256:test",
        accessCatalog: {
          resources: [
            {
              id: "loyalty",
              unitId: "@acme/loyalty",
              resource: "loyalty",
              label: "Loyalty",
              description: "Loyalty",
              wildcard: "allow",
              actions: [{ action: "read", label: "Read", description: "Read" }],
            },
          ],
          presets: [],
        },
        entries: { "@acme/loyalty/tools": importRuntime },
        modules: [
          {
            id: "@acme/loyalty",
            kind: "module",
            packageName: "@acme/loyalty",
            order: 0,
            accessScopes: ["loyalty:read"],
            references: [
              {
                id: "loyalty-tool-runtime",
                unitId: "@acme/loyalty",
                facet: "tools.runtime",
                entityId: "loyalty-tool",
                runtime: { entry: "./tools", export: "adjustLoyalty" },
                importEntry: "@acme/loyalty/tools",
              },
            ],
            tools: [
              {
                id: "loyalty-tool",
                unitId: "@acme/loyalty",
                name: "adjust_loyalty",
                referenceId: "loyalty-tool-runtime",
                requiredScopes: ["loyalty:write"],
              },
            ],
            selectedIds: selectedIds({ tools: ["loyalty-tool"] }),
            routes: [],
          },
        ],
        plugins: [],
      }),
    ).toThrow(/tool "loyalty-tool" requires undeclared access scope "loyalty:write"/)
    expect(importRuntime).not.toHaveBeenCalled()
  })

  it("rejects selected scopes when the graph access catalog is absent", () => {
    expect(() =>
      createVoyantGraphRuntime({
        graphHash: "sha256:test",
        entries: {},
        modules: [
          {
            id: "@acme/loyalty",
            kind: "module",
            packageName: "@acme/loyalty",
            order: 0,
            accessScopes: ["loyalty:read"],
            selectedIds: selectedIds(),
            routes: [],
          },
        ],
        plugins: [],
      }),
    ).toThrow(/accessCatalog is required/)
  })

  it("rejects duplicate actions and undeclared action bindings before imports", () => {
    const importRuntime = vi.fn(async () => ({}))
    const action = {
      id: "loyalty.adjust",
      unitId: "@acme/loyalty",
      version: "v1",
      kind: "execute" as const,
      targetType: "loyalty-account",
      requiredScopes: [],
      risk: "medium" as const,
      ledger: "required" as const,
      from: {
        routes: [],
        tools: ["loyalty.missing"],
        workflows: [],
        events: [],
        webhooks: [],
      },
    }

    expect(() =>
      createVoyantGraphRuntime({
        graphHash: "sha256:test",
        entries: { "@acme/loyalty": importRuntime },
        modules: [
          {
            id: "@acme/loyalty",
            kind: "module",
            packageName: "@acme/loyalty",
            order: 0,
            actions: [action],
            selectedIds: selectedIds(),
            routes: [],
          },
        ],
        plugins: [],
      }),
    ).toThrow(/action "loyalty.adjust" selects undeclared tools reference "loyalty.missing"/)
    expect(importRuntime).not.toHaveBeenCalled()

    expect(() =>
      createVoyantGraphRuntime({
        graphHash: "sha256:test",
        entries: {},
        modules: [
          {
            id: "@acme/loyalty",
            kind: "module",
            packageName: "@acme/loyalty",
            order: 0,
            actions: [
              { ...action, from: { ...action.from, tools: [] } },
              { ...action, from: { ...action.from, tools: [] } },
            ],
            selectedIds: selectedIds(),
            routes: [],
          },
        ],
        plugins: [],
      }),
    ).toThrow(/duplicate action id "loyalty.adjust"/)
  })

  it("rejects unknown reference ids before evaluating package imports", async () => {
    const importRuntime = vi.fn(async () => ({ createLoyaltyModule: {} }))
    const runtime = createVoyantGraphRuntime(runtimeInput(importRuntime))

    await expect(runtime.loadReference("not-admitted")).rejects.toMatchObject({
      code: "VOYANT_GRAPH_RUNTIME_REFERENCE_UNKNOWN",
      context: { referenceId: "not-admitted" },
    })
    expect(importRuntime).not.toHaveBeenCalled()
  })

  it("does not mutate reusable generated runtime definitions", () => {
    const input = runtimeInput(async () => ({ createLoyaltyModule: {} }))
    const modules = structuredClone(input.modules)

    expect(() => createVoyantGraphRuntime(input)).not.toThrow()
    expect(() => createVoyantGraphRuntime(input)).not.toThrow()
    expect(input.modules).toEqual(modules)
  })

  it("reports a missing package export with graph unit and route context", async () => {
    const runtime = createVoyantGraphRuntime(runtimeInput(async () => ({ otherExport: {} })))

    const error = await runtime.modules[0]?.load().catch((cause: unknown) => cause)
    expect(error).toBeInstanceOf(VoyantGraphRuntimeLoadError)
    expect(error).toMatchObject({
      code: "VOYANT_GRAPH_RUNTIME_EXPORT_MISSING",
      context: {
        unitId: "@acme/voyant-loyalty",
        routeId: "@acme/voyant-loyalty#api.admin",
        entry: "@acme/voyant-loyalty/runtime",
        exportName: "createLoyaltyModule",
      },
    })
    expect(String(error)).toContain('export "createLoyaltyModule" was not found')
  })

  it("reports invalid exports and package import failures distinctly", async () => {
    const invalid = createVoyantGraphRuntime(
      runtimeInput(async () => ({ createLoyaltyModule: "not-a-runtime-unit" })),
    )
    await expect(invalid.modules[0]?.load()).rejects.toMatchObject({
      code: "VOYANT_GRAPH_RUNTIME_EXPORT_INVALID",
    })

    const failed = createVoyantGraphRuntime(
      runtimeInput(async () => {
        throw new Error("package initialization failed")
      }),
    )
    await expect(failed.modules[0]?.load()).rejects.toMatchObject({
      code: "VOYANT_GRAPH_RUNTIME_IMPORT_FAILED",
      cause: expect.objectContaining({ message: "package initialization failed" }),
    })
  })
})
