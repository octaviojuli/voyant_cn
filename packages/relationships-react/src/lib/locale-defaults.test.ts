import { isFamilyNameFirstLocale } from "@voyant-travel/i18n"
import { describe, expect, it } from "vitest"

import { resolveDefaultPhoneCountry } from "./locale-defaults.js"

describe("resolveDefaultPhoneCountry (#R3)", () => {
  it("honours an explicit alpha-2 country over the locale", () => {
    expect(resolveDefaultPhoneCountry("zh-CN", "RO")).toBe("RO")
    expect(resolveDefaultPhoneCountry("zh-CN", " ro ")).toBe("RO")
  })

  it("ignores a malformed explicit country", () => {
    expect(resolveDefaultPhoneCountry("zh-CN", "CHN")).toBe("CN")
    expect(resolveDefaultPhoneCountry("zh-CN", "1")).toBe("CN")
  })

  it("derives the country from the locale's region subtag", () => {
    expect(resolveDefaultPhoneCountry("ro-RO")).toBe("RO")
    expect(resolveDefaultPhoneCountry("en_US")).toBe("US")
    expect(resolveDefaultPhoneCountry("zh-Hant-TW")).toBe("TW")
  })

  it("maps a bare language tag to its canonical region", () => {
    // The admin shell normalizes its persisted locale down to the bare
    // language tag, so this is the path a real zh-CN deployment takes — it
    // used to land on the hardcoded "RO".
    expect(resolveDefaultPhoneCountry("zh")).toBe("CN")
    expect(resolveDefaultPhoneCountry("ro")).toBe("RO")
    expect(resolveDefaultPhoneCountry("ja")).toBe("JP")
  })

  it("falls back to GB for an unmapped or missing locale", () => {
    expect(resolveDefaultPhoneCountry("en")).toBe("GB")
    expect(resolveDefaultPhoneCountry(null)).toBe("GB")
    expect(resolveDefaultPhoneCountry("")).toBe("GB")
  })
})

describe("name-order convention (#R2)", () => {
  it("puts the family name first only in CJK locales", () => {
    expect(isFamilyNameFirstLocale("zh")).toBe(true)
    expect(isFamilyNameFirstLocale("zh-CN")).toBe(true)
    expect(isFamilyNameFirstLocale("ja-JP")).toBe(true)
    expect(isFamilyNameFirstLocale("ko")).toBe(true)
    expect(isFamilyNameFirstLocale("en-GB")).toBe(false)
    expect(isFamilyNameFirstLocale("ro-RO")).toBe(false)
  })

  it("decides on the locale alone, so empty capture forms can use it", () => {
    // `formatPersonName` needs CJK characters before it reorders; field order
    // has to be decided before anything is typed, which is why the two
    // helpers are separate.
    expect(isFamilyNameFirstLocale(null)).toBe(false)
    expect(isFamilyNameFirstLocale(undefined)).toBe(false)
  })
})
