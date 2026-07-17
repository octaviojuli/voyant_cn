import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { ProgramCostSheetPanel } from "./components/program-cost-sheet-panel.js"
import { getMiceUiI18n, MiceUiMessagesProvider, resolveMiceUiMessages } from "./i18n/index.js"
import type { ProgramCostSheet } from "./schemas.js"

const costSheet: ProgramCostSheet = {
  programId: "prog_1",
  mixedCurrency: false,
  byCurrency: [],
}

describe("mice-ui i18n", () => {
  it("resolves localized package messages with fallback and overrides", () => {
    const result = resolveMiceUiMessages({
      locale: "ro-RO",
      overrides: {
        locales: {
          ro: {
            programsPage: {
              title: "Programe de grup",
            },
          },
        },
      },
    })

    expect(result.programsPage.title).toBe("Programe de grup")
    expect(result.costSheetPanel.empty).toBe("Niciun inventar angajat inca.")
  })

  it("returns locale-aware formatters from the package helper", () => {
    const result = getMiceUiI18n({ locale: "ro-RO" })

    expect(result.locale).toBe("ro-RO")
    expect(result.formatCurrency(1200, "USD")).toBe(
      new Intl.NumberFormat("ro-RO", { currency: "USD", style: "currency" }).format(1200),
    )
  })

  it("renders English copy without a provider", () => {
    const html = renderToStaticMarkup(<ProgramCostSheetPanel costSheet={costSheet} />)

    expect(html).toContain("Cost sheet")
    expect(html).toContain("No committed inventory yet.")
  })

  it("renders Romanian copy with the package provider", () => {
    const html = renderToStaticMarkup(
      <MiceUiMessagesProvider locale="ro-RO">
        <ProgramCostSheetPanel costSheet={costSheet} />
      </MiceUiMessagesProvider>,
    )

    expect(html).toContain("Fisa de costuri")
    expect(html).toContain("Niciun inventar angajat inca.")
  })

  it("renders Chinese copy with the package provider via region fallback", () => {
    const html = renderToStaticMarkup(
      <MiceUiMessagesProvider locale="zh-CN">
        <ProgramCostSheetPanel costSheet={costSheet} />
      </MiceUiMessagesProvider>,
    )

    expect(html).toContain("成本表")
    expect(html).toContain("暂无已承诺库存。")
  })
})
