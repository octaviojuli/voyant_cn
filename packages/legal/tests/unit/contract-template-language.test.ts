import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"
import { describe, expect, it } from "vitest"

import { resolveBookingDocumentLanguage } from "../../src/contracts/service-auto-generate.js"
import { contractTemplatesService } from "../../src/contracts/service-templates.js"

type TemplateRow = {
  id: string
  slug: string
  name: string
  scope: string
  language: string
  channelId: string | null
  isDefault: boolean
  active: boolean
  currentVersionId: string | null
}

function template(overrides: Partial<TemplateRow> & Pick<TemplateRow, "id" | "language">) {
  return {
    slug: overrides.id,
    name: overrides.id,
    scope: "customer",
    channelId: null,
    isDefault: false,
    active: true,
    currentVersionId: `ver_${overrides.id}`,
    ...overrides,
  } as TemplateRow
}

/**
 * Minimal thenable drizzle stub — `findDefaultTemplateByLanguage` filters in
 * memory, so the query chain only has to hand back the canned rows.
 */
function stubDb(rows: TemplateRow[]): PostgresJsDatabase {
  const chain: Record<string, unknown> = {
    from: () => chain,
    where: () => chain,
    orderBy: () => chain,
    // biome-ignore lint/suspicious/noThenProperty: test stub mimics a thenable drizzle query builder -- owner: legal.
    then: (resolve: (value: TemplateRow[]) => unknown, reject?: (err: unknown) => unknown) =>
      Promise.resolve(rows).then(resolve, reject),
  }
  const db: Partial<PostgresJsDatabase> = { select: (() => chain) as never }
  return db as PostgresJsDatabase
}

const englishDefault = template({
  id: "customer-sales-agreement",
  language: "en",
  isDefault: true,
})
const chineseDefault = template({
  id: "travel-services-contract-zh",
  language: "zh-CN",
  isDefault: true,
})

describe("contractTemplatesService.findDefaultTemplateByLanguage (#R4b)", () => {
  it("matches on the primary language subtag, not the exact tag", async () => {
    // The seeded template is `zh-CN`; a booking usually only says `zh`.
    // Exact-tag matching (what `getDefaultTemplate` does) never pairs those.
    const match = await contractTemplatesService.findDefaultTemplateByLanguage(
      stubDb([englishDefault, chineseDefault]),
      { scope: "customer", language: "zh" },
    )

    expect(match?.slug).toBe("travel-services-contract-zh")
  })

  it("matches a bare template language from a regioned booking language", async () => {
    const match = await contractTemplatesService.findDefaultTemplateByLanguage(
      stubDb([englishDefault, template({ id: "zh-bare", language: "zh" })]),
      { scope: "customer", language: "zh-Hans-CN" },
    )

    expect(match?.slug).toBe("zh-bare")
  })

  it("returns null rather than an any-language default when nothing matches", async () => {
    // Falling back to "whatever default exists" is how the customer ended up
    // with the English agreement; the caller must get null so it can use its
    // explicitly configured slug instead.
    const match = await contractTemplatesService.findDefaultTemplateByLanguage(
      stubDb([englishDefault]),
      { scope: "customer", language: "zh-CN" },
    )

    expect(match).toBeNull()
  })

  it("prefers the flagged default over a merely-present template of that language", async () => {
    const match = await contractTemplatesService.findDefaultTemplateByLanguage(
      stubDb([template({ id: "zh-alt", language: "zh-CN" }), chineseDefault]),
      { scope: "customer", language: "zh-CN" },
    )

    expect(match?.slug).toBe("travel-services-contract-zh")
  })

  it("returns null for an empty or unusable language", async () => {
    const db = stubDb([chineseDefault])

    expect(
      await contractTemplatesService.findDefaultTemplateByLanguage(db, {
        scope: "customer",
        language: "  ",
      }),
    ).toBeNull()
  })
})

describe("resolveBookingDocumentLanguage (#R4b)", () => {
  it("prefers the contact's stated preference", () => {
    expect(
      resolveBookingDocumentLanguage({
        contactPreferredLanguage: "zh-CN",
        communicationLanguage: "en",
      }),
    ).toBe("zh-CN")
  })

  it("falls back to the booking's communication language", () => {
    expect(
      resolveBookingDocumentLanguage({
        contactPreferredLanguage: null,
        communicationLanguage: "zh",
      }),
    ).toBe("zh")
  })

  it("returns null when the booking states nothing", () => {
    // The deployment's configured template/language then stays in charge.
    expect(
      resolveBookingDocumentLanguage({
        contactPreferredLanguage: null,
        communicationLanguage: "   ",
      }),
    ).toBeNull()
  })
})
