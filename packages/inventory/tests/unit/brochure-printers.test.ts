import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  brochureBodyToHtml,
  createBasicPdfProductBrochurePrinter,
  createCloudflareBrowserProductBrochurePrinter,
  createCloudflareBrowserProductBrochurePrinterFromEnv,
} from "../../src/tasks/brochure-printers.js"
import { renderProductBrochureTemplate } from "../../src/tasks/brochure-templates.js"
import {
  createThemedBrochurePrinter,
  renderThemedBrochureHtml,
} from "../../src/tasks/brochure-themed.js"

const templateContext = {
  product: {
    id: "prod_123",
    name: "Voyant City Break",
    description: "A designed city itinerary.",
    inclusionsHtml: "<ul><li>Breakfast</li></ul>",
    exclusionsHtml: null,
    termsHtml: "<p>Subject to availability.</p>",
    sellAmountCents: 49900,
    sellCurrency: "EUR",
    startDate: "2026-05-01",
    endDate: "2026-05-04",
    pax: 2,
  },
  days: [
    {
      id: "prod_days_1",
      productId: "prod_123",
      dayNumber: 1,
      title: "Arrival",
      description: "Airport transfer and hotel check-in",
      location: "Bucharest",
      createdAt: new Date("2026-04-01T10:00:00.000Z"),
      updatedAt: new Date("2026-04-01T10:00:00.000Z"),
      services: [],
    },
  ],
  media: [
    {
      id: "prod_media_1",
      productId: "prod_123",
      dayId: null,
      mediaType: "image",
      name: "Old town",
      url: "https://example.com/old-town.jpg",
      storageKey: null,
      mimeType: "image/jpeg",
      fileSize: null,
      altText: "Old town skyline",
      sortOrder: 0,
      isCover: true,
      isBrochure: false,
      isBrochureCurrent: false,
      brochureVersion: null,
      createdAt: new Date("2026-04-01T10:00:00.000Z"),
      updatedAt: new Date("2026-04-01T10:00:00.000Z"),
    },
  ],
  pricingTiers: [
    {
      id: "pax_tier_1",
      productId: "prod_123",
      optionUnitId: null,
      tierPax: 2,
      pricePerPaxCents: 24950,
      promoPricePerPaxCents: 19950,
      effectiveFrom: "2026-05-01",
      effectiveTo: "2026-05-31",
      createdAt: new Date("2026-04-01T10:00:00.000Z"),
      updatedAt: new Date("2026-04-01T10:00:00.000Z"),
    },
  ],
  generatedAt: new Date("2026-04-14T10:00:00.000Z"),
} as const

describe("product brochure template and printers", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("renders Liquid brochure templates with product/day variables", async () => {
    const rendered = await renderProductBrochureTemplate(
      {
        bodyFormat: "markdown",
        title: ({ product }) => `${product.name} brochure`,
        filename: ({ product }) => `${product.name}.pdf`,
        body: [
          "# {{ product.name }}",
          "{% for day in days %}",
          "Day {{ day.dayNumber }}: {{ day.title }}",
          "{% endfor %}",
        ].join("\n"),
      },
      templateContext,
    )

    expect(rendered.title).toBe("Voyant City Break brochure")
    expect(rendered.filename).toBe("Voyant City Break.pdf")
    expect(rendered.body).toContain("# Voyant City Break")
    expect(rendered.body).toContain("Day 1: Arrival")
  })

  it("creates PDF artifacts with the built-in printer", async () => {
    const printer = createBasicPdfProductBrochurePrinter()
    const artifact = await printer({
      template: {
        title: "Voyant City Break brochure",
        filename: "voyant-city-break.pdf",
        body: "# Voyant City Break\nA compact brochure body",
        bodyFormat: "markdown",
        variables: {},
        metadataLines: ["Generated in unit test"],
      },
      context: templateContext,
    })

    expect(artifact.mimeType).toBe("application/pdf")
    expect(artifact.fileSize).toBeGreaterThan(0)
    expect(artifact.metadata).toMatchObject({
      renderer: "voyant-basic-pdf",
      bodyFormat: "markdown",
    })
    expect(artifact.body.byteLength).toBeGreaterThan(0)
  })

  it("prints brochures through the Cloudflare Browser adapter", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(new Uint8Array([1, 2, 3, 4]), {
          status: 200,
          headers: {
            "X-Browser-Ms-Used": "91",
          },
        }),
    )
    vi.stubGlobal("fetch", fetchMock)

    const printer = createCloudflareBrowserProductBrochurePrinter({
      accountId: "cf-account",
      apiToken: "cf-token",
      addStyleTag: [{ content: "body { font-family: sans-serif; }" }],
      pdfOptions: { format: "A4" },
    })

    const artifact = await printer({
      template: {
        title: "Voyant City Break brochure",
        filename: "voyant-city-break.pdf",
        body: "<h1>Voyant City Break</h1>",
        bodyFormat: "html",
        variables: {},
        metadataLines: [],
      },
      context: templateContext,
    })

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, request] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe(
      "https://api.cloudflare.com/client/v4/accounts/cf-account/browser-rendering/pdf",
    )
    expect(request?.method).toBe("POST")
    expect(request?.headers).toMatchObject({
      Authorization: "Bearer cf-token",
      "Content-Type": "application/json",
    })
    expect(JSON.parse(String(request?.body))).toMatchObject({
      html: expect.stringContaining("<h1>Voyant City Break</h1>"),
      pdfOptions: { format: "A4" },
    })
    expect(artifact.mimeType).toBe("application/pdf")
    expect(artifact.fileSize).toBe(4)
    expect(artifact.metadata).toMatchObject({
      renderer: "cloudflare-browser",
      bodyFormat: "html",
      browserMsUsed: "91",
      productId: "prod_123",
    })
  })

  it("converts markdown brochure bodies to HTML for browser printers", () => {
    const html = brochureBodyToHtml(
      [
        "# Voyant City Break",
        "",
        "## Day 1: Arrival",
        "",
        '<div class="payload-richtext"><p><strong>Airport transfer</strong></p></div>',
      ].join("\n"),
      "markdown",
      "Voyant City Break brochure",
    )

    expect(html).toContain("<h1>Voyant City Break</h1>")
    expect(html).toContain("<h2>Day 1: Arrival</h2>")
    expect(html).toContain(
      '<div class="payload-richtext"><p><strong>Airport transfer</strong></p></div>',
    )
    expect(html).not.toContain("<pre")
    expect(html).not.toContain("&lt;div")
  })

  it("renders a themed brochure layout from media and pricing context", () => {
    const html = renderThemedBrochureHtml(
      {
        title: "Voyant City Break brochure",
        filename: "voyant-city-break.pdf",
        body: "A compact brochure body",
        bodyFormat: "markdown",
        variables: {},
        metadataLines: [],
      },
      templateContext,
      {
        theme: {
          brandName: "Example Travel",
          primaryColor: "#123456",
          accentColor: "#0f766e",
          footerText: "Example Travel footer",
        },
      },
    )

    expect(html).toContain("Example Travel")
    expect(html).toContain("Old town skyline")
    expect(html).toContain("https://example.com/old-town.jpg")
    expect(html).toContain("Pricing")
    expect(html).toContain("€249.50")
    expect(html).toContain("€199.50")
    expect(html).toContain("Breakfast")
    expect(html).toContain("Subject to availability.")
  })

  it("wraps an existing printer with a replaceable themed section set", async () => {
    const delegate = vi.fn(async () => ({
      body: new Uint8Array([1, 2, 3]),
      mimeType: "application/pdf",
      fileSize: 3,
      metadata: { renderer: "browser" },
    }))
    const printer = createThemedBrochurePrinter({
      printer: delegate,
      sections: [
        {
          id: "custom-cover",
          render: ({ context }) => `<main><h1>${context.product.name}</h1></main>`,
        },
      ],
    })

    const artifact = await printer({
      template: {
        title: "Voyant City Break brochure",
        filename: "voyant-city-break.pdf",
        body: "# Ignored by custom sections",
        bodyFormat: "markdown",
        variables: {},
        metadataLines: [],
      },
      context: templateContext,
    })

    expect(delegate).toHaveBeenCalledOnce()
    const input = delegate.mock.calls[0]?.[0]
    expect(input?.template.bodyFormat).toBe("html")
    expect(input?.template.body).toContain("<main><h1>Voyant City Break</h1></main>")
    expect(input?.template.body).not.toContain("Ignored by custom sections")
    expect(artifact.metadata).toEqual({
      renderer: "browser",
      layout: "themed-brochure",
      inlinedImages: 0,
    })
  })

  it("rejects the basic PDF printer for themed brochures", () => {
    expect(() =>
      createThemedBrochurePrinter({
        printer: createBasicPdfProductBrochurePrinter(),
      }),
    ).toThrow(/HTML-capable browser printer/)
  })

  it("sanitizes unsafe markdown HTML before browser rendering", () => {
    const html = brochureBodyToHtml(
      [
        "# Safe brochure",
        "",
        '<p onclick="alert(1)">Rich <strong>text</strong></p>',
        '<script>alert("xss")</script>',
        '<img src="https://example.com/tracker.png" onerror="alert(1)" />',
        '<a href="javascript:alert(1)">Unsafe link</a>',
        '<a href="https://example.com/details" target="_blank">Safe link</a>',
      ].join("\n"),
      "markdown",
      "Safe brochure",
    )

    expect(html).toContain("<h1>Safe brochure</h1>")
    expect(html).toContain("<p>Rich <strong>text</strong></p>")
    expect(html).toContain('<a href="https://example.com/details" target="_blank">Safe link</a>')
    expect(html).not.toContain("<script")
    expect(html).not.toContain("<img")
    expect(html).not.toContain("onclick")
    expect(html).not.toContain("onerror")
    expect(html).not.toContain("javascript:")
    expect(html).not.toContain("alert(")
  })

  it("keeps unknown brochure body formats in escaped preformatted text", () => {
    const html = brochureBodyToHtml(
      '{"root":{"type":"root","children":[]}}',
      "lexical_json",
      "Lexical brochure",
    )

    expect(html).toContain("<pre")
    expect(html).toContain("&quot;root&quot;")
  })

  it("requires Cloudflare credentials when building a printer from env", () => {
    expect(() =>
      createCloudflareBrowserProductBrochurePrinterFromEnv({
        CLOUDFLARE_ACCOUNT_ID: "cf-account",
      }),
    ).toThrow(/CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN/)
  })
})
