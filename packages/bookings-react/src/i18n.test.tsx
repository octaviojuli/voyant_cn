import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { BookingsUiMessagesProvider, useBookingsUiMessagesOrDefault } from "./i18n/index.js"

describe("bookings-ui i18n", () => {
  it("renders Chinese copy with the package provider via region fallback", () => {
    const html = renderToStaticMarkup(
      <BookingsUiMessagesProvider locale="zh-CN">
        <BookingsMessageProbe />
      </BookingsUiMessagesProvider>,
    )

    expect(html).toContain("订单")
    expect(html).toContain("已确认")
  })
})

function BookingsMessageProbe() {
  const messages = useBookingsUiMessagesOrDefault()

  return (
    <div>
      <span>{messages.bookingsPage.title}</span>
      <span>{messages.common.bookingStatusLabels.confirmed}</span>
    </div>
  )
}
