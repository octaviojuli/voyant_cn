// @vitest-environment jsdom

/**
 * The availability service validates that a slot's `dateLocal` matches its
 * `startsAt` rendered in the slot timezone. Defaulting the timezone field to
 * the *browser* timezone therefore shifts a departure by a day whenever the
 * operator is not sitting in the product's timezone — these tests pin the
 * product-first defaulting and the "never clobber an edit" guarantee.
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

const BROWSER_TZ = "America/Los_Angeles"
const PRODUCT_TZ = "Asia/Shanghai"
const PICKED_TZ = "Europe/Bucharest"

let loadedProductTimezone: string | null | undefined

vi.mock("../../index.js", () => ({
  useProduct: () => ({
    data:
      loadedProductTimezone === undefined
        ? undefined
        : { id: "prod_1", timezone: loadedProductTimezone },
  }),
}))

// Stand in for the real combobox: a read-only mirror of the current value plus
// a button that fires the same `onValueChange` the real one does.
vi.mock("@voyant-travel/ui/components/combobox", () => ({
  Combobox: ({
    value,
    onValueChange,
  }: {
    value?: string | null
    onValueChange?: (value: string) => void
  }) => (
    <div>
      <input data-testid="timezone-value" readOnly value={value ?? ""} />
      <button type="button" data-testid="pick-timezone" onClick={() => onValueChange?.(PICKED_TZ)}>
        pick
      </button>
    </div>
  ),
  ComboboxCollection: () => null,
  ComboboxContent: () => null,
  ComboboxEmpty: () => null,
  ComboboxInput: () => null,
  ComboboxItem: () => null,
  ComboboxList: () => null,
}))

import { type ProductDetailApi, ProductDetailHostProvider } from "./host.js"
import { resolveProductTimezoneDefault } from "./product-detail-shared.js"
import { ScheduleForm } from "./product-schedule-form.js"

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

function withHost(children: ReactNode) {
  return (
    <QueryClientProvider client={new QueryClient()}>
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

describe("resolveProductTimezoneDefault", () => {
  it("prefers the product timezone over the browser timezone", () => {
    expect(resolveProductTimezoneDefault(PRODUCT_TZ, BROWSER_TZ)).toBe(PRODUCT_TZ)
  })

  it("falls back to the browser timezone when the product has none", () => {
    expect(resolveProductTimezoneDefault(null, BROWSER_TZ)).toBe(BROWSER_TZ)
    expect(resolveProductTimezoneDefault("   ", BROWSER_TZ)).toBe(BROWSER_TZ)
  })

  it("falls back to UTC when neither is known", () => {
    expect(resolveProductTimezoneDefault(null, null)).toBe("UTC")
    expect(resolveProductTimezoneDefault(undefined, "")).toBe("UTC")
  })
})

describe("ScheduleForm timezone default", () => {
  let container: HTMLDivElement
  let root: Root
  let intlSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // Pin the "browser" timezone so the assertions describe a real mismatch.
    const original = Intl.DateTimeFormat().resolvedOptions()
    intlSpy = vi
      .spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions")
      .mockReturnValue({ ...original, timeZone: BROWSER_TZ })
    loadedProductTimezone = undefined
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    intlSpy.mockRestore()
    vi.clearAllMocks()
  })

  function timezoneValue(): string {
    const input = container.querySelector<HTMLInputElement>('[data-testid="timezone-value"]')
    if (!input) throw new Error("timezone field not rendered")
    return input.value
  }

  function render() {
    act(() => {
      root.render(withHost(<ScheduleForm productId="prod_1" onSuccess={() => undefined} />))
    })
  }

  it("defaults a new rule to the product's timezone, not the browser's", () => {
    loadedProductTimezone = PRODUCT_TZ
    render()
    expect(timezoneValue()).toBe(PRODUCT_TZ)
  })

  it("adopts the product timezone when the product query resolves late", () => {
    loadedProductTimezone = undefined
    render()
    expect(timezoneValue()).toBe(BROWSER_TZ)

    loadedProductTimezone = PRODUCT_TZ
    render()
    expect(timezoneValue()).toBe(PRODUCT_TZ)
  })

  it("never overwrites a timezone the operator already picked", () => {
    loadedProductTimezone = undefined
    render()

    act(() => {
      container.querySelector<HTMLButtonElement>('[data-testid="pick-timezone"]')?.click()
    })
    expect(timezoneValue()).toBe(PICKED_TZ)

    loadedProductTimezone = PRODUCT_TZ
    render()
    expect(timezoneValue()).toBe(PICKED_TZ)
  })

  it("keeps an existing rule's own timezone when editing", () => {
    loadedProductTimezone = PRODUCT_TZ
    act(() => {
      root.render(
        withHost(
          <ScheduleForm
            productId="prod_1"
            rule={{
              id: "avrule_1",
              productId: "prod_1",
              timezone: "Europe/Lisbon",
              recurrenceRule: "FREQ=WEEKLY;BYDAY=MO",
              maxCapacity: 10,
              cutoffMinutes: null,
              active: true,
            }}
            onSuccess={() => undefined}
          />,
        ),
      )
    })
    expect(timezoneValue()).toBe("Europe/Lisbon")
  })
})
