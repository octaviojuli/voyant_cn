import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  CrmUiMessagesProvider,
  detectCrmUiFallbackLocale,
  getCrmUiI18n,
  resolveCrmUiMessages,
  useCrmUiMessagesOrDefault,
} from "./i18n/index.js"

/**
 * Fake the browser globals the fallback detector reads. Node's test
 * environment has no `window`, which is exactly the "server" branch — so the
 * only way to exercise the client branch is to stub it.
 */
function stubBrowser({
  storedLocale,
  browserLocale,
}: {
  storedLocale?: string | null
  browserLocale?: string | null
}) {
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => (key === "admin-locale" ? (storedLocale ?? null) : null),
    },
  })
  vi.stubGlobal("navigator", { language: browserLocale ?? null })
}

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

describe("crm-ui fallback locale (#R1)", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("falls back to en when there is no window (server render)", () => {
    expect(detectCrmUiFallbackLocale()).toBe("en")
  })

  it("prefers the persisted admin locale over the browser language", () => {
    stubBrowser({ storedLocale: "zh-CN", browserLocale: "en-GB" })

    expect(detectCrmUiFallbackLocale()).toBe("zh-CN")
  })

  it("falls back to the browser language when nothing is persisted", () => {
    stubBrowser({ storedLocale: null, browserLocale: "zh-Hans-CN" })

    expect(detectCrmUiFallbackLocale()).toBe("zh-Hans-CN")
  })

  it("ignores locales this package ships no dictionary for", () => {
    stubBrowser({ storedLocale: null, browserLocale: "fr-FR" })

    // Otherwise the copy would be English while `Intl` formatted in French.
    expect(detectCrmUiFallbackLocale()).toBe("en")
  })

  it("renders Chinese copy without a provider on a zh-CN deployment", () => {
    stubBrowser({ storedLocale: "zh-CN" })

    // The regression: the booking journey's person picker mounts CRM
    // components bare, and a hardcoded `en` fallback made the whole sheet
    // English even though the zh dictionary was right there.
    const html = renderToStaticMarkup(<CrmMessageProbe />)

    expect(html).toContain("新建组织")
    expect(html).toContain("联系人")
    expect(html).toContain("跟进")
  })

  it("still lets an explicit provider win over the detected locale", () => {
    stubBrowser({ storedLocale: "zh-CN" })

    const html = renderToStaticMarkup(
      <CrmUiMessagesProvider locale="ro-RO">
        <CrmMessageProbe />
      </CrmUiMessagesProvider>,
    )

    expect(html).toContain("Organizatie noua")
    expect(html).not.toContain("新建组织")
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
