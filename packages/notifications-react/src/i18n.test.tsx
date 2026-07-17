import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import {
  getNotificationsUiI18n,
  NotificationsUiMessagesProvider,
  resolveNotificationsUiMessages,
  useNotificationsUiMessagesOrDefault,
} from "./i18n/index.js"

describe("notifications-ui i18n", () => {
  it("resolves picker labels in Romanian", () => {
    const messages = getNotificationsUiI18n({ locale: "ro-RO" }).messages

    expect(messages.pickers.templates.placeholder).toBe("Caută șabloane…")
    expect(messages.pickers.timezones.empty).toBe("Nu s-a găsit niciun fus orar.")
  })

  it("applies picker overrides", () => {
    const messages = resolveNotificationsUiMessages({
      locale: "en",
      overrides: {
        locales: {
          en: {
            pickers: {
              templates: {
                empty: "No active templates.",
              },
            },
          },
        },
      },
    })

    expect(messages.pickers.templates.empty).toBe("No active templates.")
    expect(messages.pickers.templates.placeholder).toBe("Search templates…")
  })

  it("falls back to English outside a provider", () => {
    expect(renderToStaticMarkup(<PickerProbe />)).toContain("Search templates…")
  })

  it("provides picker messages through the provider", () => {
    const html = renderToStaticMarkup(
      <NotificationsUiMessagesProvider locale="ro-RO">
        <PickerProbe />
      </NotificationsUiMessagesProvider>,
    )

    expect(html).toContain("Caută șabloane…")
  })

  it("renders Chinese copy with the package provider via region fallback", () => {
    const html = renderToStaticMarkup(
      <NotificationsUiMessagesProvider locale="zh-CN">
        <PickerProbe />
      </NotificationsUiMessagesProvider>,
    )

    expect(html).toContain("搜索模板…")
  })
})

function PickerProbe() {
  const messages = useNotificationsUiMessagesOrDefault()
  return <span>{messages.pickers.templates.placeholder}</span>
}
