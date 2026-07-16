import { describe, expect, it } from "vitest"
import { resolveCatalogUiMessages } from "./i18n/index.js"

describe("catalog-ui i18n", () => {
  it("resolves Simplified Chinese copy via zh-CN region fallback", () => {
    const result = resolveCatalogUiMessages({ locale: "zh-CN" })

    expect(result.catalogPage.title).toBe("目录")
    expect(result.catalogPage.detail.departuresTable.soldOut).toBe("售罄")
  })
})
