import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it } from "vitest"

import { CountryCombobox } from "../src/components/country-combobox.js"
import { SidebarProvider, SidebarRail, SidebarTrigger } from "../src/components/sidebar.js"

// `SidebarProvider` mounts `useIsMobile`, which jsdom doesn't implement.
beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  })
})

afterEach(() => {
  cleanup()
})

describe("CountryCombobox messages seam (#R5)", () => {
  it("ships an English default so unmigrated hosts keep working", () => {
    render(<CountryCombobox value={null} onChange={() => undefined} />)

    expect(screen.getByRole("combobox").getAttribute("placeholder")).toBe("Search countries…")
  })

  it("uses the host's localized copy when passed", () => {
    render(
      <CountryCombobox
        value={null}
        onChange={() => undefined}
        messages={{ placeholder: "搜索国家/地区…", empty: "未找到国家/地区。" }}
      />,
    )

    expect(screen.getByRole("combobox").getAttribute("placeholder")).toBe("搜索国家/地区…")
  })

  it("lets a per-instance placeholder still win over the messages bundle", () => {
    render(
      <CountryCombobox
        value={null}
        onChange={() => undefined}
        messages={{ placeholder: "搜索国家/地区…", empty: "未找到国家/地区。" }}
        placeholder="签发国"
      />,
    )

    expect(screen.getByRole("combobox").getAttribute("placeholder")).toBe("签发国")
  })
})

describe("Sidebar toggle messages seam (#R5)", () => {
  it("defaults the rail's accessible name to English", () => {
    render(
      <SidebarProvider>
        <SidebarRail />
      </SidebarProvider>,
    )

    expect(screen.getByLabelText("Toggle sidebar")).toBeDefined()
  })

  it("localizes the rail's aria-label and title from the host", () => {
    render(
      <SidebarProvider>
        <SidebarRail messages={{ toggleSidebar: "切换侧边栏" }} />
      </SidebarProvider>,
    )

    const rail = screen.getByLabelText("切换侧边栏")
    expect(rail.getAttribute("title")).toBe("切换侧边栏")
  })

  it("localizes the trigger's screen-reader-only label", () => {
    // The host already overrode aria-label/title via prop spread; the sr-only
    // span was the piece with no seam at all.
    render(
      <SidebarProvider>
        <SidebarTrigger messages={{ toggleSidebar: "切换侧边栏" }} />
      </SidebarProvider>,
    )

    expect(screen.getByRole("button").textContent).toContain("切换侧边栏")
  })
})
