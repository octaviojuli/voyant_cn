import { createEventBus, type EventEnvelope } from "@voyant-travel/core"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { financeService } from "../../src/service.js"
import { type InvoiceIssuedEvent, issueInvoiceFromBooking } from "../../src/service-issue.js"

vi.mock("../../src/booking-tax.js", () => ({
  resolveBookingSellTaxRate: vi.fn(),
}))

vi.mock("../../src/service.js", () => ({
  financeService: {
    createInvoiceFromBooking: vi.fn(),
  },
  touchLinkedBookingUpdatedAt: vi.fn(),
}))

const draftInvoice = {
  id: "inv_zh",
  invoiceNumber: "INV-ZH-1",
  invoiceType: "invoice",
  bookingId: "book_zh",
  totalCents: 500000,
  currency: "CNY",
  convertedFromInvoiceId: null,
  issueDate: "2026-07-26",
  dueDate: "2026-08-02",
}

/**
 * Issues an invoice against a booking whose contact is 张伟 and returns the
 * `clientName` that lands on the emitted event (and from there on every
 * customer-facing artifact rendered from it).
 */
async function issuedClientName(
  booking: Record<string, unknown>,
): Promise<string | null | undefined> {
  vi.mocked(financeService.createInvoiceFromBooking).mockResolvedValue(
    draftInvoice as Awaited<ReturnType<typeof financeService.createInvoiceFromBooking>>,
  )

  const db = Object.assign({} as PostgresJsDatabase, {
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(async () => [{ ...draftInvoice, status: "issued" }]),
        })),
      })),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => [booking]),
          orderBy: vi.fn(async () => []),
        })),
      })),
    })),
  })

  const eventBus = createEventBus()
  const emitted: Array<EventEnvelope<InvoiceIssuedEvent>> = []
  eventBus.subscribe<InvoiceIssuedEvent>("invoice.issued", (event) => {
    emitted.push(event)
  })

  await issueInvoiceFromBooking(
    db,
    {
      invoiceNumber: draftInvoice.invoiceNumber,
      bookingId: draftInvoice.bookingId,
      issueDate: draftInvoice.issueDate,
      dueDate: draftInvoice.dueDate,
    },
    {
      booking: {
        id: "book_zh",
        bookingNumber: "BK-ZH-1",
        personId: null,
        organizationId: null,
        sellCurrency: "CNY",
        baseCurrency: null,
        fxRateSetId: null,
        sellAmountCents: 500000,
        baseSellAmountCents: null,
      },
      items: [],
    },
    { eventBus },
  )

  return emitted[0]?.data.clientName
}

describe("invoice clientName is rendered in the booking's language (#R4a)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("uses family-name-first order for a zh-CN contact", async () => {
    expect(
      await issuedClientName({
        bookingNumber: "BK-ZH-1",
        contactFirstName: "伟",
        contactLastName: "张",
        contactPreferredLanguage: "zh-CN",
        communicationLanguage: null,
      }),
    ).toBe("张伟")
  })

  it("falls back to the booking's communication language", async () => {
    expect(
      await issuedClientName({
        bookingNumber: "BK-ZH-1",
        contactFirstName: "伟",
        contactLastName: "张",
        contactPreferredLanguage: null,
        communicationLanguage: "zh",
      }),
    ).toBe("张伟")
  })

  it("keeps western order when the booking states no language", async () => {
    // Unchanged behaviour for every existing non-CJK deployment.
    expect(
      await issuedClientName({
        bookingNumber: "BK-1",
        contactFirstName: "Ana",
        contactLastName: "Popescu",
        contactPreferredLanguage: null,
        communicationLanguage: null,
      }),
    ).toBe("Ana Popescu")
  })

  it("still falls back to Client when the booking carries no contact name", async () => {
    expect(
      await issuedClientName({
        bookingNumber: "BK-1",
        contactFirstName: null,
        contactLastName: null,
        contactPreferredLanguage: "zh-CN",
        communicationLanguage: null,
      }),
    ).toBe("Client")
  })
})
