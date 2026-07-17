import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import {
  NavigationPreferencesMessagesProvider,
  useNavigationPreferencesMessages,
} from "./i18n/index.js"

describe("navigation-preferences i18n", () => {
  it("provides chinese messages through the provider via region fallback", () => {
    const html = renderToStaticMarkup(
      <NavigationPreferencesMessagesProvider locale="zh-CN">
        <MessageProbe />
      </NavigationPreferencesMessagesProvider>,
    )

    expect(html).toContain("导航偏好已保存")
  })
})

function MessageProbe() {
  const messages = useNavigationPreferencesMessages()
  return <span>{messages.saved}</span>
}
