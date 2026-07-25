import { describe, expect, it } from "vitest"
import { resolveDefaultCrmCurrency } from "../admin/use-default-crm-currency.js"
import { formatCrmMoney } from "./crm-format.js"

type CrmUiI18n = Parameters<typeof formatCrmMoney>[0]

const fakeI18n = {
  messages: { common: { none: "—" } },
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) =>
    new Intl.NumberFormat("en-US", options).format(value),
} as unknown as CrmUiI18n

describe("formatCrmMoney", () => {
  it("formats with the record's own currency when present", () => {
    expect(formatCrmMoney(fakeI18n, 917_600, "EUR", "CNY")).toContain("€")
  })

  it("falls back to the provided default-market currency when the record has none", () => {
    const formatted = formatCrmMoney(fakeI18n, 917_600, null, "CNY")
    expect(formatted).toContain("CN¥")
    expect(formatted).not.toContain("US$")
  })

  it("keeps the USD last resort only when no fallback currency is available", () => {
    expect(formatCrmMoney(fakeI18n, 917_600, null)).toContain("$")
  })

  it("renders the none placeholder for missing amounts", () => {
    expect(formatCrmMoney(fakeI18n, null, null, "CNY")).toBe("—")
  })
})

describe("resolveDefaultCrmCurrency", () => {
  it("uses the first market in admin list order (most recently updated first)", () => {
    expect(
      resolveDefaultCrmCurrency([
        { code: "CN", defaultCurrency: "CNY" },
        { code: "UK", defaultCurrency: "GBP" },
      ]),
    ).toBe("CNY")
  })

  it("prefers a synthetic `default` market when present", () => {
    expect(
      resolveDefaultCrmCurrency([
        { code: "CN", defaultCurrency: "CNY" },
        { code: "default", defaultCurrency: "EUR" },
      ]),
    ).toBe("EUR")
  })

  it("returns null when no market is available yet", () => {
    expect(resolveDefaultCrmCurrency([])).toBeNull()
  })
})
