import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"
import { beforeEach, describe, expect, it, vi } from "vitest"

const getBookingById = vi.fn()
const findTemplateBySlug = vi.fn()
const findDefaultTemplateByLanguage = vi.fn()
const getTemplateVersionById = vi.fn()
const resolveContractGenerationVariables = vi.fn()

vi.mock("@voyant-travel/bookings", () => ({
  bookingsService: {
    getBookingById: (...args: unknown[]) => getBookingById(...args),
  },
}))

vi.mock("../../src/contracts/service-templates.js", () => ({
  contractTemplatesService: {
    findTemplateBySlug: (...args: unknown[]) => findTemplateBySlug(...args),
    findDefaultTemplateByLanguage: (...args: unknown[]) => findDefaultTemplateByLanguage(...args),
    getTemplateVersionById: (...args: unknown[]) => getTemplateVersionById(...args),
  },
}))

vi.mock("../../src/contracts/service-auto-generate-variables.js", () => ({
  resolveContractGenerationVariables: (...args: unknown[]) =>
    resolveContractGenerationVariables(...args),
}))

const { autoGenerateContractForBooking } = await import(
  "../../src/contracts/service-auto-generate.js"
)

const englishTemplate = {
  id: "tpl_en",
  slug: "customer-sales-agreement",
  name: "Customer Sales Agreement",
  language: "en",
  currentVersionId: "ver_en",
}
const chineseTemplate = {
  id: "tpl_zh",
  slug: "travel-services-contract-zh",
  name: "旅游服务合同(zh-CN)",
  language: "zh-CN",
  currentVersionId: "ver_zh",
}

const db = {} as PostgresJsDatabase

/**
 * The deployment default from `DEFAULT_AUTO_GENERATE_CONTRACT_OPTIONS`: the
 * English slug, pinned to `en`. Both are what the audit found the zh-CN
 * booking journey previewing.
 */
const deploymentDefaults = {
  enabled: true,
  templateSlug: "customer-sales-agreement",
  scope: "customer" as const,
  language: "en",
  previewMode: true,
}

async function previewFor(booking: Record<string, unknown>, options = deploymentDefaults) {
  getBookingById.mockResolvedValue(booking)
  return autoGenerateContractForBooking(
    db,
    { bookingId: "book_1", bookingNumber: "BK-1", actorId: null },
    options,
    // biome-ignore lint/suspicious/noExplicitAny: preview never touches the generator -- owner: legal.
    { generator: (() => undefined) as any },
  )
}

describe("contract template selection follows the booking's language (#R4b)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    findTemplateBySlug.mockResolvedValue(englishTemplate)
    getTemplateVersionById.mockResolvedValue({ id: "ver", body: "<p>body</p>" })
    resolveContractGenerationVariables.mockResolvedValue({})
    findDefaultTemplateByLanguage.mockResolvedValue(null)
  })

  it("previews the Chinese template for a zh-CN booking", async () => {
    findDefaultTemplateByLanguage.mockResolvedValue(chineseTemplate)

    const result = await previewFor({
      id: "book_1",
      contactPreferredLanguage: "zh-CN",
      communicationLanguage: null,
      personId: null,
      organizationId: null,
    })

    expect(findDefaultTemplateByLanguage).toHaveBeenCalledWith(db, {
      scope: "customer",
      language: "zh-CN",
    })
    expect(result).toMatchObject({
      status: "preview",
      templateName: "旅游服务合同(zh-CN)",
      // The deployment's `language: "en"` pin must yield, or the Chinese body
      // renders with English dates and currency.
      templateLanguage: "zh-CN",
    })
    expect(findTemplateBySlug).not.toHaveBeenCalled()
  })

  it("falls back to the configured slug when no template ships for the language", async () => {
    const result = await previewFor({
      id: "book_1",
      contactPreferredLanguage: "zh-CN",
      communicationLanguage: null,
      personId: null,
      organizationId: null,
    })

    expect(findTemplateBySlug).toHaveBeenCalledWith(db, "customer-sales-agreement")
    expect(result).toMatchObject({ status: "preview", templateName: "Customer Sales Agreement" })
  })

  it("leaves language-less bookings on the deployment default", async () => {
    const result = await previewFor({
      id: "book_1",
      contactPreferredLanguage: null,
      communicationLanguage: null,
      personId: null,
      organizationId: null,
    })

    expect(findDefaultTemplateByLanguage).not.toHaveBeenCalled()
    expect(result).toMatchObject({ status: "preview", templateLanguage: "en" })
  })

  it("respects preferBookingLanguage: false so an explicit pick is never overridden", async () => {
    findDefaultTemplateByLanguage.mockResolvedValue(chineseTemplate)

    const result = await previewFor(
      {
        id: "book_1",
        contactPreferredLanguage: "zh-CN",
        communicationLanguage: null,
        personId: null,
        organizationId: null,
      },
      { ...deploymentDefaults, preferBookingLanguage: false },
    )

    expect(findDefaultTemplateByLanguage).not.toHaveBeenCalled()
    expect(result).toMatchObject({ status: "preview", templateName: "Customer Sales Agreement" })
  })
})
