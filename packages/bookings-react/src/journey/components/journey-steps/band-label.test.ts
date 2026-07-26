import { describe, expect, it } from "vitest"

import { getBookingsUiI18n } from "../../../i18n/provider.js"
import { bandLabel } from "./shared.js"

function labelsFor(locale: string) {
  return getBookingsUiI18n({ locale }).messages.bookingJourney.travelers.bandLabels
}

// The server ships English pax-band `label`s, so the traveler-type selector read
// "Adult / Child / Infant" in the Chinese admin. The band contract also carries a
// stable `code`, which is what the UI renders by.
describe("bandLabel", () => {
  it("renders the localized label for a known code, ignoring the server's English label", () => {
    const zh = labelsFor("zh-CN")
    expect(bandLabel({ code: "adult", label: "Adult" }, zh)).toBe("成人")
    expect(bandLabel({ code: "child", label: "Child" }, zh)).toBe("儿童")
    expect(bandLabel({ code: "infant", label: "Infant" }, zh)).toBe("婴儿")
  })

  it("still renders English under en", () => {
    expect(bandLabel({ code: "adult", label: "Adult" }, labelsFor("en"))).toBe("Adult")
  })

  it("falls back to the server label for a vertical-specific code", () => {
    expect(bandLabel({ code: "pilgrim", label: "Pilgrim" }, labelsFor("zh-CN"))).toBe("Pilgrim")
  })

  it("falls back to the code when the server sent no label at all", () => {
    expect(bandLabel({ code: "pilgrim" }, labelsFor("zh-CN"))).toBe("pilgrim")
  })
})
