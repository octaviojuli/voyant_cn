import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import {
  CrmUiMessagesProvider,
  getCrmUiI18n,
  resolveCrmUiMessages,
  useCrmUiMessagesOrDefault,
} from "./i18n/index.js"

describe("quotes i18n", () => {
  it("resolves localized package messages with fallback and overrides", () => {
    const result = resolveCrmUiMessages({
      locale: "ro-RO",
      overrides: {
        locales: {
          ro: {
            quoteVersionsPage: {
              title: "Versiuni custom",
            },
          },
        },
      },
    })

    expect(result.quoteVersionsPage.title).toBe("Versiuni custom")
    expect(result.common.quoteVersionStatusLabels.accepted).toBe("Acceptata")
  })

  it("returns locale-aware formatters from the package helper", () => {
    const result = getCrmUiI18n({ locale: "ro-RO" })

    expect(result.locale).toBe("ro-RO")
    expect(result.formatNumber(1200)).toBe(new Intl.NumberFormat("ro-RO").format(1200))
  })

  it("renders English copy without a provider", () => {
    const html = renderToStaticMarkup(<CrmMessageProbe />)

    expect(html).toContain("New quote version")
    expect(html).toContain("Quote versions")
    expect(html).toContain("Accepted")
    expect(html).toContain("Open")
  })

  it("renders Romanian copy with the package provider", () => {
    const html = renderToStaticMarkup(
      <CrmUiMessagesProvider locale="ro-RO">
        <CrmMessageProbe />
      </CrmUiMessagesProvider>,
    )

    expect(html).toContain("Versiune de oferta noua")
    expect(html).toContain("Versiuni oferta")
    expect(html).toContain("Acceptata")
    expect(html).toContain("Deschisa")
  })

  it("renders Chinese copy with the package provider via region fallback", () => {
    const html = renderToStaticMarkup(
      <CrmUiMessagesProvider locale="zh-CN">
        <CrmMessageProbe />
      </CrmUiMessagesProvider>,
    )

    expect(html).toContain("新建报价版本")
    expect(html).toContain("报价版本")
    expect(html).toContain("已接受")
    expect(html).toContain("进行中")
  })
})

function CrmMessageProbe() {
  const messages = useCrmUiMessagesOrDefault()

  return (
    <div>
      <span>{messages.createQuoteVersionDialog.title}</span>
      <span>{messages.quoteVersionsPage.title}</span>
      <span>{messages.common.quoteVersionStatusLabels.accepted}</span>
      <span>{messages.common.quoteStatusLabels.open}</span>
    </div>
  )
}
