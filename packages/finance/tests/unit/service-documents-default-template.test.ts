import { describe, expect, it } from "vitest"

import { pickDefaultInvoiceTemplate } from "../../src/service-documents.js"

/**
 * Unit tests for `pickDefaultInvoiceTemplate` — the language-aware default
 * invoice template selection used by `prepareInvoiceDocument`. Rows arrive
 * already filtered to active defaults and ordered by recency (updatedAt
 * desc), so the first row is the pre-language fallback.
 */

const templates = [
  { id: "tpl_en", language: "en" },
  { id: "tpl_zh", language: "zh-CN" },
  { id: "tpl_ro", language: "ro" },
]

describe("pickDefaultInvoiceTemplate", () => {
  it("returns the most recent default when no language is preferred", () => {
    expect(pickDefaultInvoiceTemplate(templates, null)?.id).toBe("tpl_en")
    expect(pickDefaultInvoiceTemplate(templates, undefined)?.id).toBe("tpl_en")
    expect(pickDefaultInvoiceTemplate(templates, "  ")?.id).toBe("tpl_en")
  })

  it("prefers an exact full-tag match, normalizing case", () => {
    expect(pickDefaultInvoiceTemplate(templates, "zh-CN")?.id).toBe("tpl_zh")
    expect(pickDefaultInvoiceTemplate(templates, "ZH-cn")?.id).toBe("tpl_zh")
    expect(pickDefaultInvoiceTemplate(templates, "ro")?.id).toBe("tpl_ro")
  })

  it("falls back to a primary-subtag match when the full tag has no default", () => {
    // Preferred region variant, template stored under the primary subtag.
    expect(
      pickDefaultInvoiceTemplate(
        [{ id: "tpl_zh", language: "zh" }, ...templates.slice(0, 1)],
        "zh-CN",
      )?.id,
    ).toBe("tpl_zh")
    // Preferred primary subtag, template stored under a region variant.
    expect(pickDefaultInvoiceTemplate(templates, "zh")?.id).toBe("tpl_zh")
    expect(pickDefaultInvoiceTemplate(templates, "zh-TW")?.id).toBe("tpl_zh")
  })

  it("keeps the pre-language behavior when no language-matched default exists", () => {
    expect(pickDefaultInvoiceTemplate(templates, "fr")?.id).toBe("tpl_en")
  })

  it("returns null for an empty candidate list", () => {
    expect(pickDefaultInvoiceTemplate([], "zh-CN")).toBeNull()
    expect(pickDefaultInvoiceTemplate([], null)).toBeNull()
  })
})
