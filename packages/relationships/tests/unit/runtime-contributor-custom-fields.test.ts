import type { VoyantRuntimeHostPrimitives } from "@voyant-travel/core"
import { createCustomFieldRegistry } from "@voyant-travel/core/custom-fields"
import { handleApiError } from "@voyant-travel/hono"
import { Hono } from "hono"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { RelationshipsRouteRuntimeOptions } from "../../src/route-runtime.js"
import { RELATIONSHIPS_ROUTE_RUNTIME_CONTAINER_KEY } from "../../src/route-runtime.js"
import { accountRoutes } from "../../src/routes/accounts.js"
import { createRelationshipsRuntimePortContribution } from "../../src/runtime-contributor.js"
import { relationshipsRouteRuntimePort } from "../../src/runtime-port.js"
import { relationshipsService } from "../../src/service/index.js"

/** A minimal drizzle-shaped db whose only query is the definitions load. */
function fakeDb(definitionRows: Array<Record<string, unknown>> = []) {
  return { select: () => ({ from: async () => definitionRows }) }
}

function contributionOptions(config: Record<string, unknown> = {}) {
  const host = {
    primitives: {
      config: { read: (_bindings: unknown, key: string) => config[key] },
    } as unknown as VoyantRuntimeHostPrimitives,
  }
  const contribution = createRelationshipsRuntimePortContribution(host)
  return contribution[relationshipsRouteRuntimePort.id] as RelationshipsRouteRuntimeOptions
}

describe("relationships runtime contributor custom-fields resolver", () => {
  it("defaults to the runtime (DB) definitions when no customFields config is supplied", async () => {
    const { customFields } = contributionOptions()
    const registry = await customFields!(
      fakeDb([
        {
          entityType: "person",
          key: "loyalty_tier",
          fieldType: "enum",
          label: "Tier",
          isRequired: false,
          options: [{ value: "gold" }, { value: "silver" }],
          isSearchable: true,
        },
      ]),
    )
    expect(registry.forEntity("person").map((f) => f.key)).toEqual(["loyalty_tier"])
    expect(registry.field("person", "loyalty_tier")).toMatchObject({
      type: "select",
      options: ["gold", "silver"],
    })
  })

  it("resolves an empty registry when no config and no DB definitions exist", async () => {
    const { customFields } = contributionOptions()
    const registry = await customFields!(fakeDb())
    expect(registry.entities()).toEqual([])
    expect(registry.all()).toEqual([])
  })

  it("delegates to a deployment-supplied resolver when one is configured", async () => {
    const supplied = createCustomFieldRegistry([
      { entity: "person", key: "code_field", type: "text", label: "Code field" },
    ])
    const { customFields } = contributionOptions({ customFields: () => supplied })
    const registry = await customFields!(fakeDb())
    expect(registry.field("person", "code_field")).toBeDefined()
  })

  it("still rejects a non-function customFields config value", async () => {
    const { customFields } = contributionOptions({ customFields: { not: "a resolver" } })
    await expect(customFields!(fakeDb())).rejects.toThrow(
      "Relationships customFields config must be a resolver function.",
    )
  })
})

/** Routes wired exactly as a deployment without customFields config gets them. */
function appWithoutCustomFieldsConfig() {
  const { customFields } = contributionOptions()
  return new Hono()
    .onError(handleApiError)
    .use("*", async (c, next) => {
      c.set("db" as never, fakeDb())
      c.set("userId" as never, "u")
      c.set("container" as never, {
        resolve: (key: string) =>
          key === RELATIONSHIPS_ROUTE_RUNTIME_CONTAINER_KEY ? { customFields } : undefined,
      })
      await next()
    })
    .route("/", accountRoutes)
}

const json = (body: Record<string, unknown>) => ({
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
})

describe("person/organization create without explicit customFields config", () => {
  afterEach(() => vi.restoreAllMocks())

  it("creates a person (201) instead of failing on missing config", async () => {
    const spy = vi
      .spyOn(relationshipsService, "createPerson")
      .mockResolvedValue({ id: "pers_new" } as never)
    const res = await appWithoutCustomFieldsConfig().request("/people", {
      method: "POST",
      ...json({ firstName: "Jo", lastName: "Doe" }),
    })
    expect(res.status).toBe(201)
    expect(spy).toHaveBeenCalled()
  })

  it("creates an organization (201) instead of failing on missing config", async () => {
    const spy = vi
      .spyOn(relationshipsService, "createOrganization")
      .mockResolvedValue({ id: "org_new" } as never)
    const res = await appWithoutCustomFieldsConfig().request("/organizations", {
      method: "POST",
      ...json({ name: "Acme Travel" }),
    })
    expect(res.status).toBe(201)
    expect(spy).toHaveBeenCalled()
  })

  it("searches people without a 500 (empty searchable set)", async () => {
    const spy = vi
      .spyOn(relationshipsService, "listPeople")
      .mockResolvedValue({ data: [], pagination: { page: 1, limit: 20, total: 0 } } as never)
    const res = await appWithoutCustomFieldsConfig().request("/people?search=jo")
    expect(res.status).toBe(200)
    expect(spy).toHaveBeenCalledWith(expect.anything(), expect.anything(), [])
  })
})
