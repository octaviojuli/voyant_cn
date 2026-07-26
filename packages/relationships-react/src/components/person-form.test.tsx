import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { CrmUiMessagesProvider } from "../i18n/index.js"
import { VoyantProvider } from "../provider.js"
import { PersonForm } from "./person-form.js"

function renderPersonForm(locale: string): string {
  return renderToStaticMarkup(
    <Harness locale={locale}>
      <PersonForm mode={{ kind: "create" }} />
    </Harness>,
  )
}

function Harness({ children, locale }: { children: ReactNode; locale: string }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return (
    <QueryClientProvider client={queryClient}>
      <VoyantProvider baseUrl="https://example.test">
        <CrmUiMessagesProvider locale={locale}>{children}</CrmUiMessagesProvider>
      </VoyantProvider>
    </QueryClientProvider>
  )
}

/** Index of the first occurrence of `needle`, or `Infinity` when absent. */
function positionOf(html: string, needle: string): number {
  const index = html.indexOf(needle)
  return index === -1 ? Number.POSITIVE_INFINITY : index
}

describe("PersonForm name-field order (#R2)", () => {
  it("renders given name before family name in western locales", () => {
    const html = renderPersonForm("en")

    expect(positionOf(html, 'id="person-first-name"')).toBeLessThan(
      positionOf(html, 'id="person-last-name"'),
    )
  })

  it("renders the family name field first in zh so 姓 is the left-hand box", () => {
    const html = renderPersonForm("zh-CN")

    // Labels stay correct in both orders; what this guards is the *layout*:
    // an operator reading left-to-right must meet 姓 before 名, or they type
    // the family name into `firstName` and corrupt the record at capture.
    expect(positionOf(html, 'id="person-last-name"')).toBeLessThan(
      positionOf(html, 'id="person-first-name"'),
    )
    expect(html).toContain("姓")
    expect(html).toContain("名")
  })

  it("keeps the stored field identity untouched when the order flips", () => {
    const html = renderPersonForm("zh-CN")

    // Only the visual order changes — the inputs keep their ids (and so their
    // `firstName` / `lastName` bindings and their labels).
    expect(html).toContain('id="person-first-name"')
    expect(html).toContain('id="person-last-name"')
  })
})
