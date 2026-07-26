// @vitest-environment jsdom

import type { BookingDraftShape } from "@voyant-travel/catalog-contracts/booking-engine/draft-shape"
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { LeadContactPickerProps, UnitsPickerProps } from "../types.js"
import { defaultMinimalShape } from "./booking-journey-rules.js"

vi.mock("@voyant-travel/catalog-react/booking-engine", () => ({
  useBookingQuote: () => ({
    data: { available: true, pricing: null, quoteId: "quote-1" },
    isQuoting: false,
    error: null,
    requote: async () => ({}) as never,
    refetch: async () => ({}) as never,
  }),
  useBookingDraftShape: (options: { fallback: unknown }) => options.fallback,
  useBookingDraft: () => ({ save: { mutate: () => {} } }),
  useBookingCommit: () => ({ mutateAsync: async () => {}, isPending: false, error: null }),
  useBookingHold: () => ({ place: async () => ({}), release: async () => ({}) }),
}))

const { BookingJourney } = await import("./booking-journey.js")
;(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

/** Shape with a single product option the server has marked as the default. */
function shapeWithDefaultOption(): BookingDraftShape {
  const base = defaultMinimalShape()
  return {
    ...base,
    showsConfigure: true,
    // Narrow the journey to Departure + Options so the stacked layout's
    // sequential gates don't keep the Options section locked.
    showsBilling: false,
    showsTravelers: false,
    showsAccommodation: false,
    showsAddons: false,
    showsPayment: false,
    // The contract types this `true`: the review step is never optional.
    showsReview: true,
    configureSubSteps: [
      {
        kind: "product-option" as const,
        options: [
          { id: "opt-standard", name: "Standard", isDefault: true },
          { id: "opt-premium", name: "Premium" },
        ],
      },
      { kind: "option-units" as const },
    ],
  }
}

describe("BookingJourney derivation defaults", () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  // Defaulting the admin surface to B2B demanded an 组织 on every booking, which
  // is the wrong shape for a B2C leisure operator.
  it("starts the billing step on 个人 (B2C) rather than 企业 (B2B)", async () => {
    let seen: LeadContactPickerProps["buyerType"] | undefined

    await act(async () => {
      root.render(
        <BookingJourney
          entityModule="products"
          entityId="product-1"
          draftId="draft-1"
          surface="admin"
          renderLeadContactPicker={(picker) => {
            seen = picker.buyerType
            return null
          }}
          renderDeparturePicker={() => null}
          renderTravelCreditPicker={() => null}
        />,
      )
    })

    expect(seen).toBe("B2C")
  })

  it("honours an explicit defaultBuyerType so B2B deployments still work", async () => {
    let seen: LeadContactPickerProps["buyerType"] | undefined

    await act(async () => {
      root.render(
        <BookingJourney
          entityModule="products"
          entityId="product-1"
          draftId="draft-1"
          surface="admin"
          defaultBuyerType="B2B"
          renderLeadContactPicker={(picker) => {
            seen = picker.buyerType
            return null
          }}
          renderDeparturePicker={() => null}
          renderTravelCreditPicker={() => null}
        />,
      )
    })

    expect(seen).toBe("B2B")
  })

  // `isDefault` was declared on the option contract and never read, so the
  // operator had to click the only sensible choice by hand.
  it("preselects the option the descriptor marks isDefault", async () => {
    let optionId: UnitsPickerProps["optionId"] | undefined

    await act(async () => {
      root.render(
        <BookingJourney
          entityModule="products"
          entityId="product-1"
          draftId="draft-1"
          surface="admin"
          fallbackShape={shapeWithDefaultOption()}
          renderLeadContactPicker={() => null}
          renderDeparturePicker={() => null}
          renderTravelCreditPicker={() => null}
          renderUnitsPicker={(picker) => {
            optionId = picker.optionId
            return null
          }}
        />,
      )
    })

    expect(optionId).toBe("opt-standard")
  })
})
