import { cleanup, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  DefaultOperatorAdminBrand,
  OperatorAdminWorkspaceLayout,
  resolveAdminPageTitle,
} from "../../src/components/operator-admin-sidebar.js"
import { AdminProvider } from "../../src/providers/admin-provider.js"
import { OperatorAdminMessagesProvider } from "../../src/providers/operator-admin-messages.js"

function renderWithAdminProviders(children: ReactNode) {
  return render(
    <AdminProvider themeStorageKey={null}>
      <OperatorAdminMessagesProvider>{children}</OperatorAdminMessagesProvider>
    </AdminProvider>,
  )
}

beforeEach(() => {
  document.title = ""
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("OperatorAdminWorkspaceLayout", () => {
  it("wraps page content in SidebarInset and renders a sidebar trigger header", () => {
    const { container } = renderWithAdminProviders(
      <OperatorAdminWorkspaceLayout currentPath="/" navItems={[]}>
        <section>Dashboard content</section>
      </OperatorAdminWorkspaceLayout>,
    )

    expect(container.querySelector("main[data-slot='sidebar-inset']")).not.toBeNull()
    // Scoped to the trigger's slot — the rail shares its accessible name.
    expect(container.querySelectorAll("[data-slot='sidebar-trigger']")).toHaveLength(1)
    expect(screen.getByText("Dashboard content")).not.toBeNull()
  })

  it("passes inset variant, side, and default open state into the sidebar primitives", () => {
    const { container } = renderWithAdminProviders(
      <OperatorAdminWorkspaceLayout
        currentPath="/"
        defaultOpen={false}
        navItems={[]}
        side="right"
        variant="inset"
      >
        <section>Dashboard content</section>
      </OperatorAdminWorkspaceLayout>,
    )

    const sidebar = container.querySelector("[data-slot='sidebar']")

    expect(sidebar?.getAttribute("data-variant")).toBe("inset")
    expect(sidebar?.getAttribute("data-side")).toBe("right")
    expect(sidebar?.getAttribute("data-state")).toBe("collapsed")
  })

  it("renders right-sided sidebars after the inset so the reserved gap is on the right", () => {
    const { container } = renderWithAdminProviders(
      <OperatorAdminWorkspaceLayout currentPath="/" navItems={[]} side="right">
        <section>Dashboard content</section>
      </OperatorAdminWorkspaceLayout>,
    )

    const wrapper = container.querySelector("[data-slot='sidebar-wrapper']")
    const directSlots = Array.from(wrapper?.children ?? []).map((element) =>
      element.getAttribute("data-slot"),
    )

    expect(directSlots).toEqual(["sidebar-inset", "sidebar"])
  })

  it("derives document titles from the matching navigation item", async () => {
    renderWithAdminProviders(
      <OperatorAdminWorkspaceLayout
        currentPath="/finance/invoices/123"
        navItems={[
          {
            id: "finance",
            title: "Finance",
            url: "/finance/invoices",
            items: [
              { id: "invoices", title: "Invoices", url: "/finance/invoices" },
              { id: "payments", title: "Payments", url: "/finance/payments" },
            ],
          },
          { id: "settings", title: "Settings", url: "/settings" },
        ]}
      >
        <section>Invoice detail</section>
      </OperatorAdminWorkspaceLayout>,
    )

    await waitFor(() => expect(document.title).toBe("Invoices · Voyant"))
  })

  it("renders a hidden parent as a non-link container for an explicitly visible child", () => {
    renderWithAdminProviders(
      <OperatorAdminWorkspaceLayout
        currentPath="/elsewhere"
        navItems={[
          {
            id: "finance",
            title: "Finance",
            url: "/finance",
            items: [{ id: "invoices", title: "Invoices", url: "/finance/invoices" }],
          },
        ]}
        navigationPreferences={{ organization: { finance: false }, member: { invoices: true } }}
      >
        <section>Content</section>
      </OperatorAdminWorkspaceLayout>,
    )

    expect(screen.queryByRole("link", { name: "Finance" })).toBeNull()
    expect(screen.getByRole("link", { name: "Invoices" })).not.toBeNull()
  })

  it("allows workspace consumers to disable automatic page metadata", async () => {
    document.title = "Consumer owned"

    renderWithAdminProviders(
      <OperatorAdminWorkspaceLayout
        currentPath="/settings"
        navItems={[{ id: "settings", title: "Settings", url: "/settings" }]}
        pageHead={false}
      >
        <section>Settings</section>
      </OperatorAdminWorkspaceLayout>,
    )

    await waitFor(() => expect(document.title).toBe("Consumer owned"))
  })
})

describe("resolveAdminPageTitle", () => {
  it("uses the longest route-prefix match and keeps the root route exact", () => {
    expect(
      resolveAdminPageTitle("/finance/payments/pm_123", [
        { id: "dashboard", title: "Dashboard", url: "/" },
        {
          id: "finance",
          title: "Finance",
          url: "/finance/invoices",
          items: [
            { id: "invoices", title: "Invoices", url: "/finance/invoices" },
            { id: "payments", title: "Payments", url: "/finance/payments" },
          ],
        },
      ]),
    ).toBe("Payments")
  })
})

describe("DefaultOperatorAdminBrand", () => {
  it("uses the sidebar menu button pattern", () => {
    const { container } = renderWithAdminProviders(
      <OperatorAdminWorkspaceLayout
        currentPath="/"
        brand={<DefaultOperatorAdminBrand />}
        navItems={[]}
      >
        <section>Dashboard content</section>
      </OperatorAdminWorkspaceLayout>,
    )

    expect(container.querySelector("[data-slot='sidebar-menu']")).not.toBeNull()
    expect(container.querySelector("[data-slot='sidebar-menu-item']")).not.toBeNull()
    expect(container.querySelector("[data-slot='sidebar-menu-button']")).not.toBeNull()
    expect(screen.getByRole("link", { name: "Voyant" }).getAttribute("href")).toBe("/")
    expect(container.querySelector("[data-slot='voyant-mark']")).not.toBeNull()
    expect(container.querySelector("[data-slot='voyant-wordmark']")).not.toBeNull()
  })

  it("uses the workspace link component for the default brand link", () => {
    const AdminLink = ({
      "aria-label": ariaLabel,
      children,
      href,
      target,
      ...props
    }: {
      "aria-label"?: string
      children: ReactNode
      href: string
      target?: "_self" | "_blank"
    } & Omit<React.ComponentPropsWithoutRef<"a">, "href" | "target">) => (
      <a aria-label={ariaLabel} data-router-link="true" href={href} target={target} {...props}>
        {children}
      </a>
    )

    renderWithAdminProviders(
      <OperatorAdminWorkspaceLayout currentPath="/" linkComponent={AdminLink} navItems={[]}>
        <section>Dashboard content</section>
      </OperatorAdminWorkspaceLayout>,
    )

    expect(screen.getByRole("link", { name: "Voyant" }).getAttribute("data-router-link")).toBe(
      "true",
    )
  })
})
