// @vitest-environment jsdom

import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { BookingsUiMessagesProvider } from "../i18n/index.js"
import type { BookingRecord } from "../index.js"
import { bookingRecordSchema } from "../schemas.js"

const mutation = vi.hoisted(() => ({ mutateAsync: vi.fn() }))

vi.mock("../index.js", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useBookingMutation: () => ({ update: { ...mutation, isPending: false } }),
}))

const { BookingDialog } = await import("./booking-dialog.js")
;(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

function bookingWith(status: BookingRecord["status"]): BookingRecord {
  // Parse rather than cast, so a schema change breaks this fixture loudly
  // instead of letting the test run against a shape the app never sees.
  return bookingRecordSchema.parse({
    id: "bk_1",
    bookingNumber: "VOY-1",
    status,
    personId: null,
    organizationId: null,
    sellCurrency: "CNY",
    sellAmountCents: 1196000,
    costAmountCents: null,
    marginPercent: null,
    startDate: "2026-08-12",
    endDate: "2026-08-19",
    pax: 2,
    internalNotes: null,
    createdAt: "2026-07-26T00:00:00.000Z",
    updatedAt: "2026-07-26T00:00:00.000Z",
  })
}

describe("BookingDialog — edit mode status handling", () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    mutation.mutateAsync.mockReset().mockResolvedValue(bookingWith("on_hold"))
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  async function render(booking: BookingRecord) {
    await act(async () => {
      root.render(
        <BookingsUiMessagesProvider locale="zh-CN">
          <BookingDialog open onOpenChange={() => {}} booking={booking} />
        </BookingsUiMessagesProvider>,
      )
    })
  }

  // Opening the dialog on a held booking used to seed the form with "draft",
  // so merely pressing Save silently demoted the booking.
  it.each([
    "on_hold",
    "expired",
    "awaiting_payment",
  ] as const)("preserves %s instead of demoting it to draft on save", async (status) => {
    await render(bookingWith(status))

    const form = document.querySelector("form")
    expect(form).not.toBeNull()
    await act(async () => {
      form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))
    })

    expect(mutation.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "bk_1",
        input: expect.objectContaining({ status }),
      }),
    )
  })

  // `<SelectValue />` resolves its label from the rendered `<SelectItem>`s, so a
  // status missing from the list rendered as the raw enum ("awaiting_payment").
  it("renders the localized status label rather than the raw enum", async () => {
    await render(bookingWith("awaiting_payment"))

    const text = document.body.textContent ?? ""
    expect(text).toContain("待付款")
    expect(text).not.toContain("awaiting_payment")
  })
})
