import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { FlightsUiMessagesProvider, useFlightsUiMessages } from "./i18n/index.js"

function AvailableFlightsHeading() {
  const messages = useFlightsUiMessages()
  return <span>{messages.flightsPage.availableFlights}</span>
}

describe("flights-ui i18n", () => {
  it("renders Chinese copy with the package provider via region fallback", () => {
    const html = renderToStaticMarkup(
      <FlightsUiMessagesProvider locale="zh-CN">
        <AvailableFlightsHeading />
      </FlightsUiMessagesProvider>,
    )

    expect(html).toContain("可选航班")
  })
})
