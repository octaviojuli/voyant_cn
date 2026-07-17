import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { FacilityBadge } from "./components/facility-badge.js"
import {
  FacilitiesUiMessagesProvider,
  getFacilitiesUiI18n,
  resolveFacilitiesUiMessages,
  useFacilitiesUiMessagesOrDefault,
} from "./i18n/index.js"

describe("facilities-ui i18n", () => {
  it("resolves localized package messages with fallback and overrides", () => {
    const result = resolveFacilitiesUiMessages({
      locale: "ro-RO",
      overrides: {
        locales: {
          ro: {
            facilityCombobox: {
              placeholder: "Alege un port",
            },
          },
        },
      },
    })

    expect(result.facilityCombobox.placeholder).toBe("Alege un port")
    // Non-overridden keys fall back to ro defaults.
    expect(result.facilityBadge.missing).toBe("Facilitate necunoscută")
  })

  it("returns locale-aware formatters from the package helper", () => {
    const result = getFacilitiesUiI18n({ locale: "ro-RO" })

    expect(result.locale).toBe("ro-RO")
    expect(result.formatNumber(1200)).toBe(new Intl.NumberFormat("ro-RO").format(1200))
  })

  it("renders English copy without a provider when label is supplied", () => {
    const html = renderToStaticMarkup(
      <div>
        <FacilityBadge facilityId="fac_demo" label="JFK Terminal 4" />
        <FacilityBadge facilityId={null} />
        <MessagesProbe />
      </div>,
    )

    expect(html).toContain("JFK Terminal 4")
    expect(html).toContain("Select a facility")
    expect(html).toContain("No facilities found")
  })

  it("renders Romanian copy with the package provider", () => {
    const html = renderToStaticMarkup(
      <FacilitiesUiMessagesProvider locale="ro-RO">
        <div>
          <FacilityBadge facilityId="fac_demo" label="Aeroportul Henri Coandă" />
          <MessagesProbe />
        </div>
      </FacilitiesUiMessagesProvider>,
    )

    expect(html).toContain("Aeroportul Henri Coandă")
    expect(html).toContain("Selectează o facilitate")
    expect(html).toContain("Nicio facilitate găsită")
  })

  it("renders Chinese copy with the package provider via region fallback", () => {
    const html = renderToStaticMarkup(
      <FacilitiesUiMessagesProvider locale="zh-CN">
        <div>
          <FacilityBadge facilityId={null} />
          <MessagesProbe />
        </div>
      </FacilitiesUiMessagesProvider>,
    )

    expect(html).toContain("选择地点")
    expect(html).toContain("未找到地点")
  })
})

function MessagesProbe() {
  const messages = useFacilitiesUiMessagesOrDefault()

  return (
    <div>
      <span>{messages.facilityCombobox.placeholder}</span>
      <span>{messages.facilityCombobox.empty}</span>
    </div>
  )
}
