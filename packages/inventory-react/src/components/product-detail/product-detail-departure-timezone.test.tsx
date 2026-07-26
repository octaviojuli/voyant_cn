// @vitest-environment jsdom

/**
 * A departure's `startsAt` / `endsAt` are instants. The 班期 table used to print
 * their raw UTC fields, so an Asia/Shanghai departure stored as
 * 2026-10-10T00:00Z read back as "00:00" — every Chinese departure looked like
 * it left at midnight, and the same slot showed different times on the
 * availability page, which renders through the slot's own timezone. These tests
 * pin the table to the slot's calendar.
 */

import {
  type OperatorAdminMessages,
  operatorAdminMessageDefinitions,
  resolveLocaleMessages,
} from "@voyant-travel/i18n"
import { act, type ReactNode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

;(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

import { type ProductDetailApi, ProductDetailHostProvider } from "./host.js"
import { ProductDeparturesSection } from "./product-detail-availability-sections.js"
import type { DepartureSlot } from "./product-detail-shared.js"
import {
  formatDuration,
  formatSlotDate,
  formatSlotTime,
  formatSlotTimezoneOffset,
  isForeignSlotTimezone,
} from "./product-detail-shared.js"

const SHANGHAI = "Asia/Shanghai"

const messages = resolveLocaleMessages<OperatorAdminMessages>({
  locale: "en",
  fallbackLocale: "en",
  definitions: operatorAdminMessageDefinitions,
})

const api: ProductDetailApi = {
  get: async <T,>() => ({ data: [] }) as T,
  post: async <T,>() => ({ data: {} }) as T,
  patch: async <T,>() => ({ data: {} }) as T,
  delete: async <T,>() => ({}) as T,
}

// The departure verified live on product `prod_01kyczgz7jezfbvk64kc121qvn`:
// a 12-day Asia/Shanghai tour leaving 2026-10-10 08:00 local.
const liveSlot: DepartureSlot = {
  id: "avsl_1",
  productId: "prod_1",
  optionId: null,
  itineraryId: null,
  dateLocal: "2026-10-10",
  startsAt: "2026-10-10T00:00:00.000Z",
  endsAt: "2026-10-21T12:00:00.000Z",
  timezone: SHANGHAI,
  status: "open",
  unlimited: false,
  initialPax: 20,
  remainingPax: 20,
  nights: null,
  days: null,
  notes: null,
}

describe("slot instant formatting", () => {
  it("renders the instants on the slot's own calendar, not in UTC", () => {
    expect(formatSlotTime(liveSlot.startsAt, liveSlot.timezone)).toBe("08:00")
    expect(formatSlotDate(liveSlot.endsAt as string, liveSlot.timezone)).toBe("2026-10-21")
    expect(formatSlotTime(liveSlot.endsAt as string, liveSlot.timezone)).toBe("20:00")
  })

  it("matches how the availability pages format the same slot", async () => {
    const { slotLocalEnd, slotLocalStart } = await import("@voyant-travel/operations/scheduling")
    const start = slotLocalStart(liveSlot)
    const end = slotLocalEnd(liveSlot)
    expect(formatSlotDate(liveSlot.startsAt, liveSlot.timezone)).toBe(start.date)
    expect(formatSlotTime(liveSlot.startsAt, liveSlot.timezone)).toBe(start.time)
    expect(formatSlotDate(liveSlot.endsAt as string, liveSlot.timezone)).toBe(end?.date)
    expect(formatSlotTime(liveSlot.endsAt as string, liveSlot.timezone)).toBe(end?.time)
  })

  it("degrades to the no-value dash instead of throwing on an unusable timezone", () => {
    expect(formatSlotTime(liveSlot.startsAt, "Not/AZone")).toBe("-")
    expect(formatSlotDate(liveSlot.startsAt, "Not/AZone")).toBe("-")
  })

  it("counts calendar nights on the slot's calendar", () => {
    expect(formatDuration(liveSlot, messages)).toBe("11 nights")
  })

  it("does not count an extra night for an evening arrival that is still UTC-yesterday", () => {
    // 2026-10-11T22:00Z is 2026-10-12 06:00 in Shanghai: one night, not zero.
    const overnight: DepartureSlot = {
      ...liveSlot,
      startsAt: "2026-10-10T14:00:00.000Z", // 2026-10-10 22:00 local
      endsAt: "2026-10-11T22:00:00.000Z", // 2026-10-12 06:00 local
    }
    expect(formatDuration(overnight, messages)).toBe("2 nights")
  })

  it("only marks the offset when the slot runs on another clock than the operator", () => {
    expect(isForeignSlotTimezone(SHANGHAI, SHANGHAI)).toBe(false)
    expect(isForeignSlotTimezone(SHANGHAI, "America/Los_Angeles")).toBe(true)
    expect(isForeignSlotTimezone(SHANGHAI, null)).toBe(false)
    expect(formatSlotTimezoneOffset(liveSlot.startsAt, SHANGHAI)).toBe("GMT+8")
    expect(formatSlotTimezoneOffset(liveSlot.startsAt, "Not/AZone")).toBeNull()
  })
})

function withHost(children: ReactNode) {
  return (
    <ProductDetailHostProvider
      value={{
        messages,
        api,
        locale: "en",
        navigate: {
          toProducts: () => undefined,
          toProduct: () => undefined,
          toNewBooking: () => undefined,
          toAvailability: () => undefined,
        },
      }}
    >
      {children}
    </ProductDetailHostProvider>
  )
}

describe("ProductDeparturesSection", () => {
  let container: HTMLDivElement
  let root: Root
  let intlSpy: ReturnType<typeof vi.spyOn>

  function pinBrowserTimezone(timeZone: string) {
    const original = Intl.DateTimeFormat().resolvedOptions()
    intlSpy = vi
      .spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions")
      .mockReturnValue({ ...original, timeZone })
  }

  beforeEach(() => {
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    intlSpy?.mockRestore()
    vi.clearAllMocks()
  })

  function render() {
    act(() => {
      root.render(
        withHost(
          <ProductDeparturesSection
            slots={[liveSlot]}
            itineraryNameById={new Map()}
            onCreate={() => undefined}
            onEdit={() => undefined}
            onDelete={() => undefined}
          />,
        ),
      )
    })
  }

  it("shows the departure at its local start and end, not at its UTC hour", () => {
    pinBrowserTimezone(SHANGHAI)
    render()
    const text = container.textContent ?? ""
    expect(text).toContain("2026-10-10")
    expect(text).toContain("08:00")
    expect(text).toContain("2026-10-21")
    expect(text).toContain("20:00")
    expect(text).not.toContain("00:00")
    expect(text).not.toContain("12:00")
  })

  it("stays quiet about the timezone for an operator on the same clock", () => {
    pinBrowserTimezone(SHANGHAI)
    render()
    expect(container.textContent ?? "").not.toContain("GMT")
  })

  it("marks the offset for an operator sitting on a different clock", () => {
    pinBrowserTimezone("America/Los_Angeles")
    render()
    expect(container.textContent ?? "").toContain("GMT+8")
    expect(container.querySelector('[title="Asia/Shanghai"]')).not.toBeNull()
  })
})
