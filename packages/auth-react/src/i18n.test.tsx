import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import {
  AuthUiMessagesProvider,
  getAuthUiI18n,
  resolveAuthUiMessages,
  useAuthUiI18nOrDefault,
  useAuthUiMessagesOrDefault,
} from "./i18n/index.js"

describe("auth-ui i18n", () => {
  it("resolves romanian messages with fallback", () => {
    const messages = getAuthUiI18n({ locale: "ro-RO" }).messages

    expect(messages.serviceApiKeysPage.title).toBe("Tokenuri API")
    expect(messages.serviceApiKeysPage.create.submit).toBe("Creeaza token")
    expect(messages.organizationMembersPage.title).toBe("Membrii organizatiei")
  })

  it("applies overrides", () => {
    const messages = resolveAuthUiMessages({
      locale: "ro",
      overrides: {
        locales: {
          ro: {
            serviceApiKeysPage: {
              list: {
                refresh: "Actualizeaza",
              },
            },
            organizationMembersPage: {
              invitations: {
                empty: "Nicio invitatie",
              },
            },
          },
        },
      },
    })

    expect(messages.serviceApiKeysPage.list.refresh).toBe("Actualizeaza")
    expect(messages.organizationMembersPage.invitations.empty).toBe("Nicio invitatie")
  })

  it("falls back to english outside a provider", () => {
    expect(renderToStaticMarkup(<MessageProbe />)).toContain("API tokens")
  })

  it("provides romanian messages through the provider", () => {
    const html = renderToStaticMarkup(
      <AuthUiMessagesProvider locale="ro-RO">
        <MessageProbe />
      </AuthUiMessagesProvider>,
    )

    expect(html).toContain("Tokenuri API")
  })

  it("provides chinese messages through the provider via region fallback", () => {
    const html = renderToStaticMarkup(
      <AuthUiMessagesProvider locale="zh-CN">
        <MessageProbe />
      </AuthUiMessagesProvider>,
    )

    expect(html).toContain("API 令牌")
  })

  it("provides locale-aware date formatters through the provider", () => {
    const value = "2026-05-12T13:45:00.000Z"
    const expected = new Intl.DateTimeFormat("ro-RO", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value))

    const html = renderToStaticMarkup(
      <AuthUiMessagesProvider locale="ro-RO">
        <FormatterProbe value={value} />
      </AuthUiMessagesProvider>,
    )

    expect(html).toContain(expected)
  })
})

function MessageProbe() {
  const messages = useAuthUiMessagesOrDefault()
  return <span>{messages.serviceApiKeysPage.title}</span>
}

function FormatterProbe({ value }: { value: string }) {
  const i18n = useAuthUiI18nOrDefault()
  return <span>{i18n.formatDateTime(value)}</span>
}
