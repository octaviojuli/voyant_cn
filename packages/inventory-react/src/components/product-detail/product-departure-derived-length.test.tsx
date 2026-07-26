// @vitest-environment jsdom

/**
 * A tour's length is fixed by its itinerary, so the operator should only have to
 * pick the START date: 12 itinerary day rows ⇒ 11 nights ⇒ the departure ends
 * 11 days later. These tests pin that derivation, the "never recompute what the
 * operator typed" guarantee, and the two edge cases that must *not* stamp a
 * value — a single-day product and an itinerary that has not loaded yet.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
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

const PRODUCT_TZ = "Asia/Shanghai"

vi.mock("../../index.js", () => ({
  useProduct: () => ({ data: { id: "prod_1", timezone: PRODUCT_TZ } }),
  useProductItineraries: () => ({ data: { data: [] } }),
  useProductOptions: () => ({ data: { data: [] } }),
}))

vi.mock("./commerce-client.js", () => ({
  useProductResourceTemplates: () => ({ data: { data: [] } }),
}))

vi.mock("@voyant-travel/ui/components/combobox", () => ({
  Combobox: ({ value }: { value?: string | null }) => (
    <input data-testid="timezone-value" readOnly value={value ?? ""} />
  ),
  ComboboxCollection: () => null,
  ComboboxContent: () => null,
  ComboboxEmpty: () => null,
  ComboboxInput: () => null,
  ComboboxItem: () => null,
  ComboboxList: () => null,
}))

// Stand in for the real date picker: a read-only mirror of the value plus a
// registry of the `onChange` handlers, indexed in render order (0 = start
// date, 1 = end date) so a test can drive either one.
const datePickerHandlers = new Map<number, (value: string | null) => void>()
let nextDatePickerId = 0

vi.mock("@voyant-travel/ui/components/date-picker", async () => {
  const { useRef } = await import("react")
  return {
    DatePicker: ({
      value,
      onChange,
    }: {
      value?: string | null
      onChange?: (value: string | null) => void
    }) => {
      const idRef = useRef<number | null>(null)
      if (idRef.current === null) {
        idRef.current = nextDatePickerId
        nextDatePickerId += 1
      }
      if (onChange) datePickerHandlers.set(idRef.current, onChange)
      return <input data-testid={`date-picker-${idRef.current}`} readOnly value={value ?? ""} />
    },
  }
})

import { type ProductDetailApi, ProductDetailHostProvider } from "./host.js"
import type { DepartureSlot } from "./product-departure-dialog.js"
import {
  addCalendarDays,
  DepartureForm,
  itineraryDayCount,
  itineraryNightCount,
} from "./product-departure-form.js"
import type { ProductDay } from "./product-detail-shared.js"

const messages = resolveLocaleMessages<OperatorAdminMessages>({
  locale: "en",
  fallbackLocale: "en",
  definitions: operatorAdminMessageDefinitions,
})

function itineraryDays(count: number): ProductDay[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `day_${index + 1}`,
    itineraryId: "itin_1",
    dayNumber: index + 1,
    title: null,
    description: null,
    location: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  }))
}

describe("itinerary length derivation", () => {
  it("reads the day count from dayNumber, not just the row count", () => {
    expect(itineraryDayCount(itineraryDays(12))).toBe(12)
    expect(itineraryDayCount([])).toBe(0)
    // Defensive: junk day numbers still cannot report fewer days than rows.
    expect(itineraryDayCount([{ dayNumber: 0 }, { dayNumber: 0 }])).toBe(2)
  })

  it("turns N itinerary days into N-1 nights, and single-day tours into none", () => {
    expect(itineraryNightCount(12)).toBe(11)
    expect(itineraryNightCount(2)).toBe(1)
    expect(itineraryNightCount(1)).toBe(0)
    expect(itineraryNightCount(0)).toBe(0)
  })

  it("shifts a local date by whole calendar days across a month boundary", () => {
    expect(addCalendarDays("2026-10-10", 11)).toBe("2026-10-21")
    expect(addCalendarDays("2026-10-25", 11)).toBe("2026-11-05")
    expect(addCalendarDays("2026-12-28", 11)).toBe("2027-01-08")
    expect(addCalendarDays("not-a-date", 11)).toBeNull()
  })
})

/** The departure verified live: a 12-day Asia/Shanghai tour leaving at 08:00. */
const storedSlot: DepartureSlot = {
  id: "avsl_1",
  productId: "prod_1",
  optionId: null,
  itineraryId: null,
  dateLocal: "2026-10-10",
  startsAt: "2026-10-10T00:00:00.000Z",
  endsAt: "2026-10-21T12:00:00.000Z",
  timezone: PRODUCT_TZ,
  status: "open",
  unlimited: false,
  initialPax: 20,
  remainingPax: 20,
  nights: 11,
  days: 12,
  notes: null,
}

describe("DepartureForm derived end date", () => {
  let container: HTMLDivElement
  let root: Root
  let daysResponse: { data: ProductDay[] } | null
  let pendingDays: { resolve: (value: { data: ProductDay[] }) => void } | null
  let posted: Array<{ path: string; body: unknown }>

  const api: ProductDetailApi = {
    get: (async (path: string) => {
      if (path.includes("/days")) {
        if (daysResponse) return daysResponse
        return new Promise<{ data: ProductDay[] }>((resolve) => {
          pendingDays = { resolve }
        })
      }
      return { data: [] }
    }) as ProductDetailApi["get"],
    post: (async (path: string, body?: unknown) => {
      posted.push({ path, body })
      return { data: {} }
    }) as ProductDetailApi["post"],
    patch: async <T,>() => ({ data: {} }) as T,
    delete: async <T,>() => ({}) as T,
  }

  beforeEach(() => {
    daysResponse = { data: itineraryDays(12) }
    pendingDays = null
    posted = []
    datePickerHandlers.clear()
    nextDatePickerId = 0
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.clearAllMocks()
  })

  function withHost(children: ReactNode) {
    return (
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
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
      </QueryClientProvider>
    )
  }

  async function flush() {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  async function render(slot?: DepartureSlot) {
    await act(async () => {
      root.render(
        withHost(<DepartureForm productId="prod_1" slot={slot} onSuccess={() => undefined} />),
      )
    })
    await flush()
  }

  async function pickDate(index: number, value: string | null) {
    await act(async () => {
      datePickerHandlers.get(index)?.(value)
    })
    await flush()
  }

  function fieldValue(testId: string): string {
    const input = container.querySelector<HTMLInputElement>(`[data-testid="${testId}"]`)
    if (!input) throw new Error(`field ${testId} not rendered`)
    return input.value
  }

  function timeInputs(): HTMLInputElement[] {
    return Array.from(container.querySelectorAll<HTMLInputElement>('input[type="time"]'))
  }

  // The shared `Input` renders an unbounded `type="number"` field as a decimal
  // text input, so select on the input mode rather than the type.
  function numberInputs(): HTMLInputElement[] {
    return Array.from(container.querySelectorAll<HTMLInputElement>('input[inputmode="decimal"]'))
  }

  async function typeInto(input: HTMLInputElement, value: string) {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set
    await act(async () => {
      setter?.call(input, value)
      input.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await flush()
  }

  it("fills the end date from the itinerary when the operator picks a start date", async () => {
    await render()
    expect(fieldValue("date-picker-1")).toBe("")

    await pickDate(0, "2026-10-10")

    // 12 itinerary days ⇒ 11 nights ⇒ start + 11 days.
    expect(fieldValue("date-picker-1")).toBe("2026-10-21")
    // End time mirrors the start time rather than leaving a blank field.
    expect(timeInputs()[1]?.value).toBe("09:00")
    expect(numberInputs()[0]?.value).toBe("11")
    expect(numberInputs()[1]?.value).toBe("12")
  })

  it("explains where the length came from", async () => {
    await render()
    await pickDate(0, "2026-10-10")
    const hint = container.querySelector('[data-testid="itinerary-length-hint"]')
    expect(hint?.textContent).toContain("12")
    expect(hint?.textContent).toContain("11")
  })

  it("follows the operator when they move the start date", async () => {
    await render()
    await pickDate(0, "2026-10-10")
    await pickDate(0, "2026-10-17")
    expect(fieldValue("date-picker-1")).toBe("2026-10-28")
  })

  it("never recomputes an end date the operator set by hand", async () => {
    await render()
    await pickDate(0, "2026-10-10")
    expect(fieldValue("date-picker-1")).toBe("2026-10-21")

    await pickDate(1, "2026-10-25")
    expect(fieldValue("date-picker-1")).toBe("2026-10-25")

    await pickDate(0, "2026-10-17")
    expect(fieldValue("date-picker-1")).toBe("2026-10-25")
  })

  it("never recomputes an end time the operator set by hand", async () => {
    await render()
    await pickDate(0, "2026-10-10")

    const endTime = timeInputs()[1]
    if (!endTime) throw new Error("end time field not rendered")
    await typeInto(endTime, "18:30")
    expect(endTime.value).toBe("18:30")

    await pickDate(0, "2026-10-17")
    expect(timeInputs()[1]?.value).toBe("18:30")
  })

  it("never recomputes nights/days the operator overrode", async () => {
    await render()
    await pickDate(0, "2026-10-10")

    const nightsInput = numberInputs()[0]
    if (!nightsInput) throw new Error("nights field not rendered")
    await typeInto(nightsInput, "9")

    await pickDate(0, "2026-10-17")
    expect(numberInputs()[0]?.value).toBe("9")
  })

  it("saves the typed wall clock as an instant on the departure's own calendar", async () => {
    await render()
    await pickDate(0, "2026-10-10")

    const submit = container.querySelector<HTMLButtonElement>('button[type="submit"]')
    if (!submit) throw new Error("submit button not rendered")
    await act(async () => {
      submit.click()
    })
    await flush()

    expect(posted).toHaveLength(1)
    const body = posted[0]?.body as Record<string, unknown>
    expect(body.timezone).toBe(PRODUCT_TZ)
    expect(body.dateLocal).toBe("2026-10-10")
    // 09:00 in Asia/Shanghai is 01:00Z — not 09:00Z, which is what reading the
    // operator's input as UTC used to store.
    expect(body.startsAt).toBe("2026-10-10T01:00:00.000Z")
    expect(body.endsAt).toBe("2026-10-21T01:00:00.000Z")
    expect(body.nights).toBe(11)
    expect(body.days).toBe(12)
  })

  it("leaves the end date empty for a single-day product", async () => {
    daysResponse = { data: itineraryDays(1) }
    await render()
    await pickDate(0, "2026-10-10")

    expect(fieldValue("date-picker-1")).toBe("")
    expect(timeInputs()[1]?.value).toBe("")
    expect(container.querySelector('[data-testid="itinerary-length-hint"]')).toBeNull()
    // The end date stays labelled optional, not auto-filled.
    expect(container.textContent ?? "").toContain(
      messages.products.operations.departures.endDateOptional,
    )
  })

  it("leaves the end date empty for a product with no itinerary days", async () => {
    daysResponse = { data: [] }
    await render()
    await pickDate(0, "2026-10-10")
    expect(fieldValue("date-picker-1")).toBe("")
  })

  it("reads an existing departure back at its local wall clock, not its UTC hour", async () => {
    await render(storedSlot)
    expect(timeInputs()[0]?.value).toBe("08:00")
    expect(fieldValue("date-picker-1")).toBe("2026-10-21")
    expect(timeInputs()[1]?.value).toBe("20:00")
  })

  it("re-derives the end date when an existing departure is moved, keeping its end time", async () => {
    await render(storedSlot)
    await pickDate(0, "2026-10-17")
    expect(fieldValue("date-picker-1")).toBe("2026-10-28")
    expect(timeInputs()[1]?.value).toBe("20:00")
  })

  it("stamps nothing while the itinerary is still loading, then fills in once it lands", async () => {
    daysResponse = null
    await render()
    await pickDate(0, "2026-10-10")

    // Nothing derived yet — and, crucially, no wrong value stamped.
    expect(fieldValue("date-picker-1")).toBe("")
    expect(container.querySelector('[data-testid="itinerary-length-hint"]')).toBeNull()

    await act(async () => {
      pendingDays?.resolve({ data: itineraryDays(12) })
    })
    await flush()

    expect(fieldValue("date-picker-1")).toBe("2026-10-21")
  })
})
