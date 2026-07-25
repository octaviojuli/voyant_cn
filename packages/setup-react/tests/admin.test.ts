import { QueryClient } from "@tanstack/react-query"
import {
  consumeAdminSetupPrefill,
  createAdminSetupPrefillHref,
  storeAdminSetupPrefill,
} from "@voyant-travel/admin"
import { describe, expect, it, vi } from "vitest"

import {
  canInitializeSelectedSetup,
  createSelectedSetupAdminExtension,
  initializeSelectedSetup,
  loadSelectedSetupState,
} from "../src/admin.js"

describe("selected setup admin extension", () => {
  it("owns the setup route and flow controller", () => {
    const extension = createSelectedSetupAdminExtension({ navMessages: { setup: "Configurare" } })
    expect(extension.routes?.[0]?.path).toBe("/setup")
    expect(extension.routes?.[0]?.title).toBe("Configurare")
    expect(extension.setupFlow?.id).toBe("@voyant-travel/setup#flow.organization-setup")
    expect(extension.setupFlow?.canInitialize).toBe(canInitializeSelectedSetup)
  })

  it.each([
    "editor",
    "viewer",
  ])("loads persisted setup for a %s without posting initialization", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({ data: { state: setupState(), canManage: false } }),
    )

    await expect(
      loadSelectedSetupState({ baseUrl: "/api", fetcher }, ["acme.step"]),
    ).resolves.toEqual({ state: setupState(), canManage: false })
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher).toHaveBeenCalledWith("/api/v1/admin/setup", { method: "GET" })
  })

  it("redirects only when the persisted initialize response requests it", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(response(true)), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(response(false)), { status: 200 }))
    const context = {
      queryClient: new QueryClient(),
      runtime: { baseUrl: "/api", fetcher },
      params: {},
    }

    await expect(initializeSelectedSetup(context, { stepIds: [], fresh: true })).resolves.toEqual({
      redirectTo: "/setup",
    })
    await expect(initializeSelectedSetup(context, { stepIds: [], fresh: true })).resolves.toEqual(
      {},
    )
  })

  it("writes only setup state", async () => {
    const fetcher = vi.fn(
      async () => new Response(JSON.stringify(response(false)), { status: 200 }),
    )
    await initializeSelectedSetup(
      { queryClient: new QueryClient(), runtime: { baseUrl: "/api", fetcher }, params: {} },
      { stepIds: ["acme.step"], fresh: false },
    )
    expect(fetcher.mock.calls[0]?.[0]).toBe("/api/v1/admin/setup/initialize")
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      body: JSON.stringify({ stepIds: ["acme.step"], fresh: false }),
    })
  })

  it("initializes a manager with the exact selected graph step ids", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ data: { state: setupState(), canManage: true } }))
      .mockResolvedValueOnce(Response.json(response(false)))

    await loadSelectedSetupState({ baseUrl: "/api", fetcher }, ["selected.one", "selected.two"])

    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(fetcher.mock.calls[1]?.[0]).toBe("/api/v1/admin/setup/initialize")
    expect(fetcher.mock.calls[1]?.[1]).toMatchObject({
      body: JSON.stringify({
        stepIds: ["selected.one", "selected.two"],
        fresh: false,
      }),
    })
  })

  it("falls back to the persisted snapshot when manager initialization fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ data: { state: setupState(), canManage: true } }))
      .mockResolvedValueOnce(
        Response.json(
          { error: "Setup initialization step ids do not match the selected project graph" },
          { status: 500 },
        ),
      )

    await expect(
      loadSelectedSetupState({ baseUrl: "/api", fetcher }, ["acme.step"]),
    ).resolves.toEqual({ state: setupState(), canManage: true })
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })

  it("hands opaque prefill to an href-backed package form without putting it in the URL", () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    }
    const stepId = "@acme/setup#business"
    const prefill = { name: "Acme Travel" }

    const href = createAdminSetupPrefillHref("/settings/operator?tab=profile", stepId)
    storeAdminSetupPrefill(stepId, prefill, storage)

    expect(href).toContain("tab=profile")
    expect(href).toContain("voyantSetupStep=")
    expect(href).not.toContain("Acme")
    expect(consumeAdminSetupPrefill(stepId, new URL(href, "https://test").search, storage)).toEqual(
      prefill,
    )
    expect(consumeAdminSetupPrefill(stepId, new URL(href, "https://test").search, storage)).toBe(
      undefined,
    )
  })
})

function response(shouldRedirect: boolean) {
  return {
    data: { ...setupState(), shouldRedirect },
  }
}

function setupState() {
  return {
    startedAt: "2026-07-15T08:00:00.000Z",
    firstRunOpenedAt: null,
    steps: [],
    prefill: {},
  }
}
