import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import {
  getLegalUiI18n,
  LegalUiMessagesProvider,
  resolveLegalUiMessages,
  useLegalUiMessagesOrDefault,
} from "./i18n/index.js"

describe("legal-ui i18n", () => {
  it("resolves localized package messages with fallback and overrides", () => {
    const result = resolveLegalUiMessages({
      locale: "ro-RO",
      overrides: {
        locales: {
          ro: {
            signatureDialog: {
              title: "Semnatura custom",
            },
          },
        },
      },
    })

    expect(result.signatureDialog.title).toBe("Semnatura custom")
    expect(result.bookingContractCard.contractStatusLabels.executed).toBe("Executat")
  })

  it("returns locale-aware formatters from the package helper", () => {
    const result = getLegalUiI18n({ locale: "ro-RO" })

    expect(result.locale).toBe("ro-RO")
    expect(result.formatNumber(1200)).toBe(new Intl.NumberFormat("ro-RO").format(1200))
  })

  it("renders English message defaults without a provider", () => {
    const html = renderToStaticMarkup(<LegalMessagesProbe />)

    expect(html).toContain("Contract")
    expect(html).toContain("Download")
    expect(html).toContain("Edit Document")
    expect(html).toContain("Manual")
  })

  it("renders Romanian package messages with the provider", () => {
    const html = renderToStaticMarkup(
      <LegalUiMessagesProvider locale="ro-RO">
        <LegalMessagesProbe />
      </LegalUiMessagesProvider>,
    )

    expect(html).toContain("Contract")
    expect(html).toContain("Descarca")
    expect(html).toContain("Editeaza documentul")
    expect(html).toContain("Manual")
  })

  it("renders Chinese package messages with the provider via region fallback", () => {
    const html = renderToStaticMarkup(
      <LegalUiMessagesProvider locale="zh-CN">
        <LegalMessagesProbe />
      </LegalUiMessagesProvider>,
    )

    expect(html).toContain("合同")
    expect(html).toContain("下载")
    expect(html).toContain("编辑文档")
    expect(html).toContain("手工")
  })
})

function LegalMessagesProbe() {
  const messages = useLegalUiMessagesOrDefault()

  return (
    <div>
      <span>{messages.bookingContractCard.heading}</span>
      <span>{messages.bookingContractCard.download}</span>
      <span>{messages.attachmentDialog.titles.edit}</span>
      <span>{messages.signatureDialog.methodLabels.manual}</span>
    </div>
  )
}
