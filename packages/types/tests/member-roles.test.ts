import { describe, expect, it } from "vitest"

import { hasApiKeyPermission, permissionStringsToPermissions } from "../src/api-keys.js"
import {
  isFullAccessRole,
  MEMBER_ROLE_PRESETS,
  permissionsForRole,
  scopesForRole,
  scopesForRoleWithPresets,
} from "../src/member-roles.js"

describe("permissionsForRole", () => {
  it("maps owner/admin/super-admin to full access", () => {
    for (const role of ["owner", "admin", "super-admin", "ADMIN", " Admin "]) {
      expect(permissionsForRole(role)).toEqual({ "*": ["*"] })
    }
  })

  it("maps viewer/guest to read-only", () => {
    expect(permissionsForRole("viewer")).toEqual(MEMBER_ROLE_PRESETS.viewer.permissions)
    expect(permissionsForRole("guest")).toEqual(MEMBER_ROLE_PRESETS.viewer.permissions)
  })

  it("maps editor/member to the editor bundle", () => {
    expect(permissionsForRole("editor")).toEqual(MEMBER_ROLE_PRESETS.editor.permissions)
    expect(permissionsForRole("member")).toEqual(MEMBER_ROLE_PRESETS.editor.permissions)
  })

  it("returns null for custom/unknown/empty slugs", () => {
    expect(permissionsForRole("custom")).toBeNull()
    expect(permissionsForRole("totally-unknown")).toBeNull()
    expect(permissionsForRole(null)).toBeNull()
    expect(permissionsForRole(undefined)).toBeNull()
  })
})

describe("scopesForRole", () => {
  it("resolves admin to the wildcard", () => {
    expect(scopesForRole("admin")).toEqual(["*"])
  })

  it("resolves viewer to read/search wildcards", () => {
    expect(scopesForRole("viewer")).toEqual(["*:read", "*:search"])
  })

  it("leaves Bookings grants to project-owned presets and keeps finance read-only", () => {
    const scopes = scopesForRole("editor") ?? []
    expect(scopes).not.toContain("bookings:read")
    expect(scopes).not.toContain("bookings:write")
    expect(scopes).toContain("finance:read")
    expect(scopes).not.toContain("finance:write")
    // No deletes, no team/settings in the default editor bundle.
    expect(scopes.some((s) => s.endsWith(":delete"))).toBe(false)
    expect(scopes.some((s) => s.startsWith("team:") || s.startsWith("settings:"))).toBe(false)
  })

  it("returns null for slugs without a preset", () => {
    expect(scopesForRole("custom")).toBeNull()
  })
})

describe("role bundles enforce as expected via hasApiKeyPermission", () => {
  it("admin passes every gate", () => {
    const p = permissionsForRole("admin")
    expect(hasApiKeyPermission(p, "finance", "write")).toBe(true)
    expect(hasApiKeyPermission(p, "team", "manage")).toBe(true)
  })

  it("editor leaves Bookings to project policy and cannot write finance", () => {
    const p = permissionsForRole("editor")
    expect(hasApiKeyPermission(p, "bookings", "write")).toBe(false)
    expect(hasApiKeyPermission(p, "bookings", "delete")).toBe(false)
    expect(hasApiKeyPermission(p, "finance", "read")).toBe(true)
    expect(hasApiKeyPermission(p, "finance", "write")).toBe(false)
    expect(hasApiKeyPermission(p, "team", "manage")).toBe(false)
  })

  it("viewer can read anything but write nothing", () => {
    const p = permissionsForRole("viewer")
    expect(hasApiKeyPermission(p, "bookings", "read")).toBe(true)
    expect(hasApiKeyPermission(p, "products", "read")).toBe(true)
    expect(hasApiKeyPermission(p, "bookings", "write")).toBe(false)
  })
})

describe("scopesForRoleWithPresets", () => {
  const presets = [
    {
      id: "owner",
      kind: "staff",
      label: "Owner",
      description: "Owner staff preset.",
      grants: ["action-ledger:approve", "action-ledger:read", "action-ledger:write"],
    },
    {
      id: "admin",
      kind: "staff",
      label: "Admin",
      description: "Admin staff preset.",
      grants: ["action-ledger:read"],
    },
    {
      id: "editor",
      kind: "staff",
      label: "Editor",
      description: "Editor staff preset.",
      grants: ["bookings:read", "bookings:write"],
    },
    {
      id: "owner",
      kind: "api-token",
      label: "Owner token",
      description: "Same id, non-staff kind — must be ignored.",
      grants: ["catalog:read"],
    },
  ] as const

  it("unions the matching staff preset's explicit grants onto the role bundle", () => {
    expect(scopesForRoleWithPresets("owner", presets)).toEqual([
      "*",
      "action-ledger:approve",
      "action-ledger:read",
      "action-ledger:write",
    ])
    expect(scopesForRoleWithPresets("admin", presets)).toEqual(["*", "action-ledger:read"])
  })

  it("keeps explicit-wildcard scopes reachable via hasApiKeyPermission", () => {
    const catalog = {
      presets: [],
      resources: [
        {
          id: "@voyant-travel/action-ledger#access.action-ledger",
          unitId: "@voyant-travel/action-ledger",
          resource: "action-ledger",
          label: "Action ledger",
          description: "Read action audit records.",
          wildcard: "explicit-resource" as const,
          actions: [
            {
              action: "read",
              label: "Read action ledger",
              description: "Read action records.",
              sensitive: true,
              wildcard: "explicit" as const,
            },
          ],
        },
      ],
    }
    const bare = scopesForRole("owner") ?? []
    const withPresets = scopesForRoleWithPresets("owner", presets) ?? []
    // The `*` bundle alone is denied on the explicit-wildcard resource…
    expect(hasApiKeyPermission({ "*": ["*"] }, "action-ledger", "read", catalog)).toBe(false)
    expect(bare).toEqual(["*"])
    // …and the preset union is what makes the grant effective.
    expect(withPresets).toContain("action-ledger:read")
    expect(
      hasApiKeyPermission(
        permissionStringsToPermissions(withPresets),
        "action-ledger",
        "read",
        catalog,
      ),
    ).toBe(true)
  })

  it("resolves member/guest against the editor/viewer staff presets", () => {
    expect(scopesForRoleWithPresets("member", presets)).toContain("bookings:write")
    expect(scopesForRoleWithPresets("guest", presets)).toEqual(["*:read", "*:search"])
  })

  it("returns the plain role bundle when no staff preset matches", () => {
    expect(scopesForRoleWithPresets("viewer", presets)).toEqual(["*:read", "*:search"])
    expect(scopesForRoleWithPresets("owner", [])).toEqual(["*"])
  })

  it("returns null for slugs without a preset bundle", () => {
    expect(scopesForRoleWithPresets("custom", presets)).toBeNull()
    expect(scopesForRoleWithPresets(null, presets)).toBeNull()
  })
})

describe("isFullAccessRole", () => {
  it("is true only for admin-equivalent roles", () => {
    expect(isFullAccessRole("owner")).toBe(true)
    expect(isFullAccessRole("admin")).toBe(true)
    expect(isFullAccessRole("editor")).toBe(false)
    expect(isFullAccessRole("viewer")).toBe(false)
    expect(isFullAccessRole("custom")).toBe(false)
    expect(isFullAccessRole(null)).toBe(false)
  })
})
