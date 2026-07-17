import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import {
  CrmUiMessagesProvider,
  getCrmUiI18n,
  resolveCrmUiMessages,
  useCrmUiMessagesOrDefault,
} from "./i18n/index.js"

describe("crm-ui i18n", () => {
  it("resolves localized package messages with fallback and overrides", () => {
    const result = resolveCrmUiMessages({
      locale: "ro-RO",
      overrides: {
        locales: {
          ro: {
            activitiesPage: {
              title: "Activitati custom",
            },
          },
        },
      },
    })

    expect(result.activitiesPage.title).toBe("Activitati custom")
    expect(result.common.activityTypeLabels.follow_up).toBe("Urmarire")
  })

  it("returns locale-aware formatters from the package helper", () => {
    const result = getCrmUiI18n({ locale: "ro-RO" })

    expect(result.locale).toBe("ro-RO")
    expect(result.formatNumber(1200)).toBe(new Intl.NumberFormat("ro-RO").format(1200))
  })

  it("renders English copy without a provider", () => {
    const html = renderToStaticMarkup(<CrmMessageProbe />)

    expect(html).toContain("New organization")
    expect(html).toContain("People")
    expect(html).toContain("Contact methods")
    expect(html).toContain("Add activity")
    expect(html).toContain("Follow-up")
    expect(html).toContain("Client")
  })

  it("renders Romanian copy with the package provider", () => {
    const html = renderToStaticMarkup(
      <CrmUiMessagesProvider locale="ro-RO">
        <CrmMessageProbe />
      </CrmUiMessagesProvider>,
    )

    expect(html).toContain("Organizatie noua")
    expect(html).toContain("Persoane")
    expect(html).toContain("Metode de contact")
    expect(html).toContain("Adauga activitate")
    expect(html).toContain("Urmarire")
    expect(html).toContain("Client")
  })

  it("renders Chinese copy with the package provider via region fallback", () => {
    const html = renderToStaticMarkup(
      <CrmUiMessagesProvider locale="zh-CN">
        <CrmMessageProbe />
      </CrmUiMessagesProvider>,
    )

    expect(html).toContain("新建组织")
    expect(html).toContain("联系人")
    expect(html).toContain("联系方式")
    expect(html).toContain("添加跟进记录")
    expect(html).toContain("跟进")
    expect(html).toContain("客户")
  })
})

function CrmMessageProbe() {
  const messages = useCrmUiMessagesOrDefault()

  return (
    <div>
      <span>{messages.organizationDialog.titles.create}</span>
      <span>{messages.peoplePage.title}</span>
      <span>{messages.organizationDetail.tabs.contactMethods}</span>
      <span>{messages.organizationDetail.actions.addActivity}</span>
      <span>{messages.common.activityTypeLabels.follow_up}</span>
      <span>{messages.common.relationTypeLabels.client}</span>
    </div>
  )
}
