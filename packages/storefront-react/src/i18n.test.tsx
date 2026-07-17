import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import {
  resolveStorefrontSettingsUiMessages,
  StorefrontSettingsUiMessagesProvider,
  useStorefrontSettingsUiMessagesOrDefault,
} from "./i18n/index.js"
import {
  StorefrontMessagesProvider,
  useStorefrontMessagesOrDefault,
} from "./storefront/messages.js"

function StorefrontProbe(): React.ReactElement {
  const messages = useStorefrontMessagesOrDefault()
  return (
    <p>
      {messages.layout.signIn} | {messages.account.heading}
    </p>
  )
}

function SettingsProbe(): React.ReactElement {
  const messages = useStorefrontSettingsUiMessagesOrDefault()
  return <p>{messages.page.title}</p>
}

describe("storefront-react i18n", () => {
  it("resolves Chinese storefront messages for zh-CN via region fallback", () => {
    const html = renderToStaticMarkup(
      <StorefrontMessagesProvider locale="zh-CN">
        <StorefrontProbe />
      </StorefrontMessagesProvider>,
    )

    expect(html).toContain("登录")
    expect(html).toContain("您的账户")
  })

  it("falls back to English storefront messages without a provider", () => {
    const html = renderToStaticMarkup(<StorefrontProbe />)

    expect(html).toContain("Sign in")
    expect(html).toContain("Your account")
  })

  it("resolves Chinese settings messages for zh-CN", () => {
    const messages = resolveStorefrontSettingsUiMessages({ locale: "zh-CN" })

    expect(messages.page.title).toBe("在线商城设置")
    expect(messages.payment.methodLabels.bank_transfer).toBe("银行转账")
    expect(messages.validation.defaultMethodDisabled).toBe("默认支付方式必须处于启用状态。")
  })

  it("renders Chinese settings copy with the package provider", () => {
    const html = renderToStaticMarkup(
      <StorefrontSettingsUiMessagesProvider locale="zh-CN">
        <SettingsProbe />
      </StorefrontSettingsUiMessagesProvider>,
    )

    expect(html).toContain("在线商城设置")
  })

  it("falls back to English settings messages without a provider", () => {
    const html = renderToStaticMarkup(<SettingsProbe />)

    expect(html).toContain("Storefront settings")
  })
})
