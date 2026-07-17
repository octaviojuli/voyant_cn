// agent-quality: file-size exception -- owner: legal; existing coverage file stays co-located until a dedicated split preserves behavior and tests.
import type { BookingPiiService } from "@voyant-travel/bookings"
import { bookingItems, bookings, bookingTravelers } from "@voyant-travel/bookings/schema"
import { createEventBus } from "@voyant-travel/core"
import { bookingPaymentSchedules, invoices, payments } from "@voyant-travel/finance/schema"
import { eq, sql } from "drizzle-orm"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import {
  contractAttachments,
  contracts,
  contractTemplates,
  contractTemplateVersions,
} from "../../src/contracts/schema.js"
import { autoGenerateContractForBooking } from "../../src/contracts/service-auto-generate.js"
import { contractRecordsService } from "../../src/contracts/service-contracts.js"
import type { ContractDocumentGenerator } from "../../src/contracts/service-documents.js"
import { contractSeriesService } from "../../src/contracts/service-series.js"

const DB_AVAILABLE = !!process.env.TEST_DATABASE_URL

let testSeq = 0
function nextBookingNumber() {
  testSeq += 1
  return `BK-CONTRACT-AUTO-${String(testSeq).padStart(5, "0")}`
}

describe.skipIf(!DB_AVAILABLE)("autoGenerateContractForBooking", () => {
  let db: PostgresJsDatabase

  beforeAll(async () => {
    const { createTestDb, cleanupTestDb } = await import("@voyant-travel/db/test-utils")
    db = createTestDb()
    await cleanupTestDb(db)
  })

  beforeEach(async () => {
    const { cleanupTestDb } = await import("@voyant-travel/db/test-utils")
    await cleanupTestDb(db)
  })

  afterAll(async () => {
    const { closeTestDb } = await import("@voyant-travel/db/test-utils")
    await closeTestDb()
  })

  async function seedTemplate(slug: string, options: { language?: string } = {}) {
    const [template] = await db
      .insert(contractTemplates)
      .values({
        slug,
        name: "Customer Services Contract",
        scope: "customer",
        language: options.language ?? "en",
        body: "",
        active: true,
      })
      .returning()
    const [version] = await db
      .insert(contractTemplateVersions)
      .values({
        templateId: template!.id,
        version: 1,
        body: 'Contract for {{ booking.number }}. Lead: {{ leadTraveler.firstName }} {{ leadTraveler.lastName }}. Travelers: {% for t in travelers %}{{ t.firstName }}{% unless forloop.last %}, {% endunless %}{% endfor %}. Total: {{ booking.totalAmountCents | cents: booking.currency }}. Issued: {{ contract.date | format_date: "short" }}.',
      })
      .returning()
    // Point template at the version we just made.
    await db
      .update(contractTemplates)
      .set({ currentVersionId: version!.id, updatedAt: new Date() })
      .where(eq(contractTemplates.id, template!.id))
    return { template: template!, version: version! }
  }

  async function seedBooking(overrides: Partial<typeof bookings.$inferInsert> = {}) {
    const [row] = await db
      .insert(bookings)
      .values({
        bookingNumber: nextBookingNumber(),
        status: "confirmed",
        sellCurrency: "EUR",
        sellAmountCents: 125000,
        costAmountCents: 80000,
        marginPercent: 36,
        startDate: "2026-07-01",
        pax: 2,
        ...overrides,
      })
      .returning()
    return row!
  }

  function makeGenerator(captureBody: string[] = []): ContractDocumentGenerator {
    return async (ctx) => {
      captureBody.push(ctx.renderedBody)
      return {
        kind: "document",
        name: `contract-${ctx.contract.id}.pdf`,
        mimeType: "application/pdf",
        fileSize: 4096,
        storageKey: `contracts/${ctx.contract.id}/document.pdf`,
        metadata: { source: "test" },
      }
    }
  }

  it("creates contract, renders liquid, and attaches generated document", async () => {
    const { template } = await seedTemplate("cust-services-1")
    const booking = await seedBooking()
    await db.insert(bookingTravelers).values([
      {
        bookingId: booking.id,
        participantType: "traveler",
        firstName: "Ana",
        lastName: "Primary",
        email: "ana@example.com",
        isPrimary: true,
      },
      {
        bookingId: booking.id,
        participantType: "traveler",
        firstName: "Bob",
        lastName: "Second",
        isPrimary: false,
      },
    ])

    const renderedBodies: string[] = []
    const outcome = await autoGenerateContractForBooking(
      db,
      { bookingId: booking.id, bookingNumber: booking.bookingNumber, actorId: "usrp_tester" },
      { enabled: true, templateSlug: template.slug },
      { generator: makeGenerator(renderedBodies) },
    )

    expect(outcome.status).toBe("ok")
    if (outcome.status !== "ok") return

    // Contract row persisted + linked to booking.
    const [contract] = await db.select().from(contracts).where(eq(contracts.id, outcome.contractId))
    expect(contract?.bookingId).toBe(booking.id)
    expect(contract?.status).toBe("issued")
    // Template's currentVersionId was set after seedTemplate returned — refetch.
    const [refreshedTemplate] = await db
      .select()
      .from(contractTemplates)
      .where(eq(contractTemplates.id, template.id))
    expect(contract?.templateVersionId).toBe(refreshedTemplate?.currentVersionId ?? null)
    expect(contract?.language).toBe("en")

    // Attachment created and linked to contract.
    const attachmentRows = await db
      .select()
      .from(contractAttachments)
      .where(eq(contractAttachments.contractId, outcome.contractId))
    expect(attachmentRows).toHaveLength(1)
    expect(attachmentRows[0]?.kind).toBe("document")

    // Liquid was actually executed — lead traveler + total should be interpolated.
    expect(renderedBodies).toHaveLength(1)
    const body = renderedBodies[0] ?? ""
    expect(body).toContain(booking.bookingNumber)
    expect(body).toContain("Ana Primary")
    expect(body).toContain("Ana, Bob")
    expect(body).toContain("1,250.00") // 125000 cents → 1,250.00 EUR
  })

  it("populates product, departure, and traveler identity variables from the booking", async () => {
    const { template, version } = await seedTemplate("cust-booking-bag-1")
    await db
      .update(contractTemplateVersions)
      .set({
        body: [
          "{{ product.title }}",
          "{{ booking.productName }}",
          "{{ product.destination }}",
          "{{ departureSlot.slotId }}",
          "{{ departureSlot.departureCity }}",
          "{{ customer.dateOfBirth }}",
          "{{ customer.document.number }}",
        ].join(" | "),
      })
      .where(eq(contractTemplateVersions.id, version.id))

    const booking = await seedBooking()
    await db.insert(bookingItems).values({
      bookingId: booking.id,
      title: "Fallback title",
      itemType: "unit",
      status: "confirmed",
      quantity: 2,
      sellCurrency: "EUR",
      unitSellAmountCents: 62500,
      totalSellAmountCents: 125000,
      productId: "prod_romania_loop",
      availabilitySlotId: "slot_bucharest_1",
      productNameSnapshot: "Romania Heritage Loop",
      optionNameSnapshot: "Standard cabin",
      departureLabelSnapshot: "Jul 1, 2026 09:00 — Bucharest",
      startsAt: new Date("2026-07-01T06:00:00.000Z"),
      endsAt: new Date("2026-07-08T06:00:00.000Z"),
      metadata: { destination: "Romania", vertical: "tour" },
    })
    const [lead] = await db
      .insert(bookingTravelers)
      .values({
        bookingId: booking.id,
        participantType: "traveler",
        firstName: "Ana",
        lastName: "Primary",
        isPrimary: true,
      })
      .returning()

    const pii: BookingPiiService = {
      async getTravelerTravelDetails(_db, travelerId) {
        if (travelerId !== lead!.id) return null
        return {
          travelerId,
          nationality: "RO",
          documentType: "passport",
          documentNumber: "P1234567",
          documentExpiry: "2031-01-02",
          documentIssuingCountry: "RO",
          documentIssuingAuthority: "DEPABD",
          documentPersonDocumentId: "pdoc_1",
          dateOfBirth: "1990-02-03",
          dietaryRequirements: null,
          accessibilityNeeds: null,
          isLeadTraveler: true,
          sharingGroupId: null,
          roomTypeId: null,
          bedPreference: null,
          allocations: {},
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        }
      },
      async upsertTravelerTravelDetails() {
        throw new Error("not used")
      },
      async deleteTravelerTravelDetails() {
        throw new Error("not used")
      },
    }

    const bodies: string[] = []
    const outcome = await autoGenerateContractForBooking(
      db,
      { bookingId: booking.id, bookingNumber: booking.bookingNumber, actorId: "usrp_tester" },
      { enabled: true, templateSlug: template.slug },
      { generator: makeGenerator(bodies), bookingPiiService: pii },
    )
    expect(outcome.status).toBe("ok")
    if (outcome.status !== "ok") return

    const contract = await contractRecordsService.getContractById(db, outcome.contractId)
    const variables = contract?.variables as Record<string, unknown>
    expect(variables.product).toMatchObject({
      title: "Romania Heritage Loop",
      subtitle: "Standard cabin",
      destination: "Romania",
      id: "prod_romania_loop",
      module: "products",
      vertical: "tour",
    })
    expect(variables.booking).toMatchObject({
      productName: "Romania Heritage Loop",
      productSubtitle: "Standard cabin",
      destination: "Romania",
      entityModule: "products",
      entityId: "prod_romania_loop",
      vertical: "tour",
    })
    expect(variables.departureSlot).toMatchObject({
      slotId: "slot_bucharest_1",
      departureCity: "Bucharest",
    })
    expect(variables.customer).toMatchObject({
      dateOfBirth: "1990-02-03",
      document: {
        type: "passport",
        number: "P1234567",
        country: "RO",
        issuingAuthority: "DEPABD",
        issueDate: "",
        expiryDate: "2031-01-02",
      },
    })
    expect(bodies[0]).toContain(
      "Romania Heritage Loop | Romania Heritage Loop | Romania | slot_bucharest_1 | Bucharest | 1990-02-03 | P1234567",
    )
  })

  it("emits contract.document.generated event on the runtime bus", async () => {
    const { template } = await seedTemplate("cust-evt-1")
    const booking = await seedBooking()

    const eventBus = createEventBus()
    const received: Array<{ name: string; data: { contractId: string } }> = []
    eventBus.subscribe("contract.document.generated", (envelope) => {
      received.push(envelope as { name: string; data: { contractId: string } })
    })

    const outcome = await autoGenerateContractForBooking(
      db,
      { bookingId: booking.id, bookingNumber: booking.bookingNumber, actorId: null },
      { enabled: true, templateSlug: template.slug },
      { generator: makeGenerator(), eventBus },
    )
    expect(outcome.status).toBe("ok")

    await new Promise((r) => setTimeout(r, 10))
    expect(received).toHaveLength(1)
    expect(received[0]?.name).toBe("contract.document.generated")
    if (outcome.status === "ok") {
      expect(received[0]?.data.contractId).toBe(outcome.contractId)
    }
  })

  it("returns template_not_found when slug doesn't resolve", async () => {
    const booking = await seedBooking()
    const outcome = await autoGenerateContractForBooking(
      db,
      { bookingId: booking.id, bookingNumber: booking.bookingNumber, actorId: null },
      { enabled: true, templateSlug: "does-not-exist" },
      { generator: makeGenerator() },
    )
    expect(outcome.status).toBe("template_not_found")
    expect(await db.select().from(contracts)).toHaveLength(0)
  })

  it("returns template_version_missing when template exists but has no current version", async () => {
    const [template] = await db
      .insert(contractTemplates)
      .values({
        slug: "no-versions",
        name: "Empty Template",
        scope: "customer",
        language: "en",
        body: "",
        active: true,
      })
      .returning()
    const booking = await seedBooking()

    const outcome = await autoGenerateContractForBooking(
      db,
      { bookingId: booking.id, bookingNumber: booking.bookingNumber, actorId: null },
      { enabled: true, templateSlug: template!.slug },
      { generator: makeGenerator() },
    )
    expect(outcome.status).toBe("template_version_missing")
  })

  it("returns booking_not_found when the booking was deleted between confirm and handler fire", async () => {
    const { template } = await seedTemplate("cust-ghost-1")

    const outcome = await autoGenerateContractForBooking(
      db,
      { bookingId: "book_does_not_exist", bookingNumber: "BK-GHOST", actorId: null },
      { enabled: true, templateSlug: template.slug },
      { generator: makeGenerator() },
    )
    expect(outcome.status).toBe("booking_not_found")
    expect(await db.select().from(contracts)).toHaveLength(0)
  })

  it("uses resolveVariables to override defaults when supplied", async () => {
    const { template } = await seedTemplate("cust-override-1")
    const booking = await seedBooking()

    const bodies: string[] = []
    const outcome = await autoGenerateContractForBooking(
      db,
      { bookingId: booking.id, bookingNumber: booking.bookingNumber, actorId: null },
      {
        enabled: true,
        templateSlug: template.slug,
        resolveVariables: ({ defaults }) => ({
          ...defaults,
          leadTraveler: {
            id: "ovr",
            firstName: "Overridden",
            lastName: "Lead",
            email: null,
            phone: null,
          },
        }),
      },
      { generator: makeGenerator(bodies) },
    )
    expect(outcome.status).toBe("ok")
    expect(bodies[0]).toContain("Overridden Lead")
  })

  it("exposes settlement variables from invoices and completed payments", async () => {
    const { template, version } = await seedTemplate("cust-settlement-1")
    await db
      .update(contractTemplateVersions)
      .set({
        body: [
          "Paid {{ booking.paidAmountCents }}",
          "Balance {{ booking.balanceDueCents }}",
          "Due {{ booking.amountDueCents }}",
          "Full {{ booking.isPaidInFull }}",
          "Latest {{ payment.latestCompleted.methodLabel }}",
          "Date {{ payment.latestCompleted.date }}",
        ].join(" | "),
      })
      .where(eq(contractTemplateVersions.id, version.id))

    const booking = await seedBooking({
      sellCurrency: "RON",
      sellAmountCents: 32000,
    })
    const [invoice] = await db
      .insert(invoices)
      .values({
        invoiceNumber: `INV-${booking.bookingNumber}`,
        bookingId: booking.id,
        status: "paid",
        currency: "RON",
        subtotalCents: 32000,
        taxCents: 0,
        totalCents: 32000,
        paidCents: 32000,
        balanceDueCents: 0,
        issueDate: "2026-05-01",
        dueDate: "2026-05-10",
      })
      .returning()
    await db.insert(payments).values({
      invoiceId: invoice!.id,
      amountCents: 32000,
      currency: "RON",
      paymentMethod: "bank_transfer",
      status: "completed",
      paymentDate: "2026-05-04",
    })

    const bodies: string[] = []
    const outcome = await autoGenerateContractForBooking(
      db,
      { bookingId: booking.id, bookingNumber: booking.bookingNumber, actorId: null },
      { enabled: true, templateSlug: template.slug },
      { generator: makeGenerator(bodies) },
    )
    expect(outcome.status).toBe("ok")
    if (outcome.status !== "ok") return

    const contract = await contractRecordsService.getContractById(db, outcome.contractId)
    const variables = contract?.variables as Record<string, unknown>
    const bookingVariables = variables.booking as Record<string, unknown>
    const paymentVariables = variables.payment as Record<string, unknown>
    const latestCompleted = paymentVariables.latestCompleted as Record<string, unknown>

    expect(bookingVariables.paidAmountCents).toBe(32000)
    expect(bookingVariables.balanceDueCents).toBe(0)
    expect(bookingVariables.amountDueCents).toBe(0)
    expect(bookingVariables.isPaidInFull).toBe(true)
    expect(latestCompleted).toMatchObject({
      method: "bank_transfer",
      methodLabel: "Bank Transfer",
      date: "2026-05-04",
    })
    expect(paymentVariables.method).toBe("Bank Transfer")
    expect(paymentVariables.capturedAt).toBe("2026-05-04")
    expect(bodies[0]).toContain("Paid 32000 | Balance 0 | Due 0 | Full true")
  })

  it("localizes latest payment method labels to the contract language", async () => {
    const { template, version } = await seedTemplate("cust-settlement-ro-1", { language: "ro" })
    await db
      .update(contractTemplateVersions)
      .set({
        body: [
          "Metoda {{ payment.method }}",
          "Ultima {{ payment.latestCompleted.methodLabel }}",
        ].join(" | "),
      })
      .where(eq(contractTemplateVersions.id, version.id))

    const booking = await seedBooking({
      sellCurrency: "RON",
      sellAmountCents: 32000,
    })
    const [invoice] = await db
      .insert(invoices)
      .values({
        invoiceNumber: `INV-${booking.bookingNumber}`,
        bookingId: booking.id,
        status: "paid",
        currency: "RON",
        subtotalCents: 32000,
        taxCents: 0,
        totalCents: 32000,
        paidCents: 32000,
        balanceDueCents: 0,
        issueDate: "2026-05-01",
        dueDate: "2026-05-10",
      })
      .returning()
    await db.insert(payments).values({
      invoiceId: invoice!.id,
      amountCents: 32000,
      currency: "RON",
      paymentMethod: "other",
      status: "completed",
      paymentDate: "2026-05-04",
    })

    const bodies: string[] = []
    const outcome = await autoGenerateContractForBooking(
      db,
      { bookingId: booking.id, bookingNumber: booking.bookingNumber, actorId: null },
      { enabled: true, templateSlug: template.slug },
      { generator: makeGenerator(bodies) },
    )
    expect(outcome.status).toBe("ok")
    if (outcome.status !== "ok") return

    const contract = await contractRecordsService.getContractById(db, outcome.contractId)
    const variables = contract?.variables as Record<string, unknown>
    const paymentVariables = variables.payment as Record<string, unknown>
    const latestCompleted = paymentVariables.latestCompleted as Record<string, unknown>

    expect(contract?.language).toBe("ro")
    expect(latestCompleted).toMatchObject({
      method: "other",
      methodLabel: "Alta",
      date: "2026-05-04",
    })
    expect(paymentVariables.method).toBe("Alta")
    expect(bodies[0]).toContain("Metoda Alta | Ultima Alta")
  })

  it("localizes latest payment method labels for zh-CN contracts", async () => {
    const { template, version } = await seedTemplate("cust-settlement-zh-1", { language: "zh-CN" })
    await db
      .update(contractTemplateVersions)
      .set({
        body: [
          "收款方式 {{ payment.method }}",
          "最近收款 {{ payment.latestCompleted.methodLabel }}",
        ].join(" | "),
      })
      .where(eq(contractTemplateVersions.id, version.id))

    const booking = await seedBooking({
      sellCurrency: "CNY",
      sellAmountCents: 32000,
    })
    const [invoice] = await db
      .insert(invoices)
      .values({
        invoiceNumber: `INV-${booking.bookingNumber}`,
        bookingId: booking.id,
        status: "paid",
        currency: "CNY",
        subtotalCents: 32000,
        taxCents: 0,
        totalCents: 32000,
        paidCents: 32000,
        balanceDueCents: 0,
        issueDate: "2026-05-01",
        dueDate: "2026-05-10",
      })
      .returning()
    await db.insert(payments).values({
      invoiceId: invoice!.id,
      amountCents: 32000,
      currency: "CNY",
      paymentMethod: "bank_transfer",
      status: "completed",
      paymentDate: "2026-05-04",
    })

    const bodies: string[] = []
    const outcome = await autoGenerateContractForBooking(
      db,
      { bookingId: booking.id, bookingNumber: booking.bookingNumber, actorId: null },
      { enabled: true, templateSlug: template.slug },
      { generator: makeGenerator(bodies) },
    )
    expect(outcome.status).toBe("ok")
    if (outcome.status !== "ok") return

    const contract = await contractRecordsService.getContractById(db, outcome.contractId)
    const variables = contract?.variables as Record<string, unknown>
    const paymentVariables = variables.payment as Record<string, unknown>
    const latestCompleted = paymentVariables.latestCompleted as Record<string, unknown>

    expect(contract?.language).toBe("zh-CN")
    expect(latestCompleted).toMatchObject({
      method: "bank_transfer",
      methodLabel: "银行转账",
      date: "2026-05-04",
    })
    expect(paymentVariables.method).toBe("银行转账")
    expect(bodies[0]).toContain("收款方式 银行转账 | 最近收款 银行转账")
  })

  it("separates scheduled balance from current amount due for paid-in-full bookings", async () => {
    const { template, version } = await seedTemplate("cust-paid-full-balance-1")
    await db
      .update(contractTemplateVersions)
      .set({
        body: [
          "PaidFull {{ booking.isPaidInFull }}",
          "Due {{ booking.amountDueCents }}",
          "BalanceDue {{ booking.balanceDueCents }}",
          "ScheduledBalance {{ booking.balanceAmountCents }}",
        ].join(" | "),
      })
      .where(eq(contractTemplateVersions.id, version.id))

    const booking = await seedBooking({
      sellCurrency: "RON",
      sellAmountCents: 32000,
    })
    await db.insert(bookingPaymentSchedules).values({
      bookingId: booking.id,
      scheduleType: "balance",
      status: "paid",
      dueDate: "2026-05-10",
      currency: "RON",
      amountCents: 32000,
    })
    const [invoice] = await db
      .insert(invoices)
      .values({
        invoiceNumber: `INV-${booking.bookingNumber}`,
        bookingId: booking.id,
        status: "paid",
        currency: "RON",
        subtotalCents: 32000,
        taxCents: 0,
        totalCents: 32000,
        paidCents: 32000,
        balanceDueCents: 0,
        issueDate: "2026-05-01",
        dueDate: "2026-05-10",
      })
      .returning()
    await db.insert(payments).values({
      invoiceId: invoice!.id,
      amountCents: 32000,
      currency: "RON",
      paymentMethod: "bank_transfer",
      status: "completed",
      paymentDate: "2026-05-04",
    })

    const bodies: string[] = []
    const outcome = await autoGenerateContractForBooking(
      db,
      { bookingId: booking.id, bookingNumber: booking.bookingNumber, actorId: null },
      { enabled: true, templateSlug: template.slug },
      { generator: makeGenerator(bodies) },
    )
    expect(outcome.status).toBe("ok")
    if (outcome.status !== "ok") return

    const contract = await contractRecordsService.getContractById(db, outcome.contractId)
    const variables = contract?.variables as Record<string, unknown>
    const bookingVariables = variables.booking as Record<string, unknown>

    expect(bookingVariables).toMatchObject({
      paidAmountCents: 32000,
      amountDueCents: 0,
      balanceDueCents: 0,
      isPaidInFull: true,
      depositAmountCents: 0,
      balanceAmountCents: 32000,
      balanceDueDate: "2026-05-10",
    })
    expect(bodies[0]).toContain("PaidFull true | Due 0 | BalanceDue 0 | ScheduledBalance 32000")
  })

  it("does not mark paid in full when invoices still have a positive balance", async () => {
    const { template, version } = await seedTemplate("cust-adjusted-invoice-balance-1")
    await db
      .update(contractTemplateVersions)
      .set({
        body: [
          "PaidFull {{ booking.isPaidInFull }}",
          "Due {{ booking.amountDueCents }}",
          "BalanceDue {{ booking.balanceDueCents }}",
          "Paid {{ booking.paidAmountCents }}",
        ].join(" | "),
      })
      .where(eq(contractTemplateVersions.id, version.id))

    const booking = await seedBooking({
      sellCurrency: "RON",
      sellAmountCents: 32000,
    })
    const [invoice] = await db
      .insert(invoices)
      .values({
        invoiceNumber: `INV-${booking.bookingNumber}`,
        bookingId: booking.id,
        status: "issued",
        currency: "RON",
        subtotalCents: 37000,
        taxCents: 0,
        totalCents: 37000,
        paidCents: 32000,
        balanceDueCents: 5000,
        issueDate: "2026-05-01",
        dueDate: "2026-05-10",
      })
      .returning()
    await db.insert(payments).values({
      invoiceId: invoice!.id,
      amountCents: 32000,
      currency: "RON",
      paymentMethod: "bank_transfer",
      status: "completed",
      paymentDate: "2026-05-04",
    })

    const bodies: string[] = []
    const outcome = await autoGenerateContractForBooking(
      db,
      { bookingId: booking.id, bookingNumber: booking.bookingNumber, actorId: null },
      { enabled: true, templateSlug: template.slug },
      { generator: makeGenerator(bodies) },
    )
    expect(outcome.status).toBe("ok")
    if (outcome.status !== "ok") return

    const contract = await contractRecordsService.getContractById(db, outcome.contractId)
    const variables = contract?.variables as Record<string, unknown>
    const bookingVariables = variables.booking as Record<string, unknown>

    expect(bookingVariables).toMatchObject({
      paidAmountCents: 32000,
      amountDueCents: 5000,
      balanceDueCents: 5000,
      isPaidInFull: false,
    })
    expect(bodies[0]).toContain("PaidFull false | Due 5000 | BalanceDue 5000 | Paid 32000")
  })

  it("recomputes variables and replaces the document when forceRecompute is set", async () => {
    const { template, version } = await seedTemplate("cust-force-recompute-2291")
    await db
      .update(contractTemplateVersions)
      .set({
        body: [
          "PaidFull {{ booking.isPaidInFull }}",
          "Due {{ booking.amountDueCents }}",
          "BalanceDue {{ booking.balanceDueCents }}",
          "Paid {{ booking.paidAmountCents }}",
        ].join(" | "),
      })
      .where(eq(contractTemplateVersions.id, version.id))

    const booking = await seedBooking({
      sellCurrency: "RON",
      sellAmountCents: 32000,
    })
    const [invoice] = await db
      .insert(invoices)
      .values({
        invoiceNumber: `INV-${booking.bookingNumber}`,
        bookingId: booking.id,
        status: "issued",
        currency: "RON",
        subtotalCents: 32000,
        taxCents: 0,
        totalCents: 32000,
        paidCents: 0,
        balanceDueCents: 32000,
        issueDate: "2026-05-01",
        dueDate: "2026-05-10",
      })
      .returning()

    const bodies: string[] = []
    const initial = await autoGenerateContractForBooking(
      db,
      { bookingId: booking.id, bookingNumber: booking.bookingNumber, actorId: null },
      { enabled: true, templateSlug: template.slug },
      { generator: makeGenerator(bodies) },
    )
    expect(initial.status).toBe("ok")
    if (initial.status !== "ok") return

    const initialContract = await contractRecordsService.getContractById(db, initial.contractId)
    const initialVariables = initialContract?.variables as Record<string, unknown>
    expect(initialVariables.booking).toMatchObject({
      paidAmountCents: 0,
      amountDueCents: 32000,
      balanceDueCents: 32000,
      isPaidInFull: false,
    })
    expect(bodies[0]).toContain("PaidFull false | Due 32000 | BalanceDue 32000 | Paid 0")

    await db
      .update(invoices)
      .set({ status: "paid", paidCents: 32000, balanceDueCents: 0 })
      .where(eq(invoices.id, invoice!.id))
    await db.insert(payments).values({
      invoiceId: invoice!.id,
      amountCents: 32000,
      currency: "RON",
      paymentMethod: "bank_transfer",
      status: "completed",
      paymentDate: "2026-05-04",
    })

    const idempotent = await autoGenerateContractForBooking(
      db,
      { bookingId: booking.id, bookingNumber: booking.bookingNumber, actorId: null },
      { enabled: true, templateSlug: template.slug },
      { generator: makeGenerator(bodies) },
    )
    expect(idempotent).toEqual(initial)
    expect(bodies).toHaveLength(1)

    const recomputed = await autoGenerateContractForBooking(
      db,
      { bookingId: booking.id, bookingNumber: booking.bookingNumber, actorId: null },
      { enabled: true, templateSlug: template.slug, forceRecompute: true },
      { generator: makeGenerator(bodies) },
    )
    expect(recomputed.status).toBe("ok")
    if (recomputed.status !== "ok") return
    expect(recomputed.contractId).toBe(initial.contractId)
    expect(recomputed.attachmentId).not.toBe(initial.attachmentId)

    const contract = await contractRecordsService.getContractById(db, recomputed.contractId)
    const variables = contract?.variables as Record<string, unknown>
    expect(variables.booking).toMatchObject({
      paidAmountCents: 32000,
      amountDueCents: 0,
      balanceDueCents: 0,
      isPaidInFull: true,
    })
    expect(bodies[1]).toContain("PaidFull true | Due 0 | BalanceDue 0 | Paid 32000")

    const attachmentRows = await db
      .select()
      .from(contractAttachments)
      .where(eq(contractAttachments.contractId, recomputed.contractId))
    expect(attachmentRows).toHaveLength(1)
    expect(attachmentRows[0]?.id).toBe(recomputed.attachmentId)
  })

  it("derives payment schedule aliases and rooms summary from the booking", async () => {
    const { template, version } = await seedTemplate("cust-schedule-rooms-1")
    await db
      .update(contractTemplateVersions)
      .set({
        body: [
          "Deposit {{ booking.depositAmountCents }} due {{ booking.depositDueDate }}",
          "Balance {{ booking.balanceAmountCents }} due {{ booking.balanceDueDate }}",
          "Rooms {{ booking.roomsSummary }}",
          "Schedule {% for line in payment.schedule %}{{ line.type }}:{{ line.amountCents }}{% unless forloop.last %}, {% endunless %}{% endfor %}",
        ].join(" | "),
      })
      .where(eq(contractTemplateVersions.id, version.id))

    const booking = await seedBooking({
      sellCurrency: "RON",
      sellAmountCents: 120000,
    })
    await db.execute(sql`
      INSERT INTO products (id, name, sell_currency)
      VALUES ('prod_contract_room_units', 'Moldova Circuit', 'RON')
    `)
    await db.execute(sql`
      INSERT INTO product_options (id, product_id, name)
      VALUES ('opto_contract_room_units', 'prod_contract_room_units', 'Standard package')
    `)
    await db.execute(sql`
      INSERT INTO option_units (id, option_id, name, unit_type)
      VALUES
        ('unit_contract_adult', 'opto_contract_room_units', 'Adult', 'person'),
        ('unit_contract_dbl_room', 'opto_contract_room_units', 'DBL room', 'room')
    `)
    await db.insert(bookingItems).values([
      {
        bookingId: booking.id,
        title: "Tour package",
        itemType: "unit",
        status: "confirmed",
        quantity: 2,
        sellCurrency: "RON",
        unitSellAmountCents: 30000,
        totalSellAmountCents: 60000,
        productNameSnapshot: "Moldova Circuit",
        optionNameSnapshot: "Standard package",
        optionUnitId: "unit_contract_adult",
        unitNameSnapshot: "Adult",
      },
      {
        bookingId: booking.id,
        title: "DBL room",
        itemType: "unit",
        status: "confirmed",
        quantity: 1,
        sellCurrency: "RON",
        unitSellAmountCents: 60000,
        totalSellAmountCents: 60000,
        productNameSnapshot: "Moldova Circuit",
        optionNameSnapshot: "DBL",
        optionUnitId: "unit_contract_dbl_room",
        unitNameSnapshot: "DBL room",
      },
    ])
    await db.insert(bookingPaymentSchedules).values([
      {
        bookingId: booking.id,
        scheduleType: "deposit",
        status: "expired",
        dueDate: "2026-04-15",
        currency: "RON",
        amountCents: 25000,
      },
      {
        bookingId: booking.id,
        scheduleType: "deposit",
        status: "paid",
        dueDate: "2026-05-01",
        currency: "RON",
        amountCents: 30000,
      },
      {
        bookingId: booking.id,
        scheduleType: "balance",
        status: "cancelled",
        dueDate: "2026-05-15",
        currency: "RON",
        amountCents: 95000,
      },
      {
        bookingId: booking.id,
        scheduleType: "balance",
        status: "pending",
        dueDate: "2026-06-01",
        currency: "RON",
        amountCents: 90000,
      },
    ])

    const bodies: string[] = []
    const outcome = await autoGenerateContractForBooking(
      db,
      { bookingId: booking.id, bookingNumber: booking.bookingNumber, actorId: null },
      { enabled: true, templateSlug: template.slug },
      { generator: makeGenerator(bodies) },
    )
    expect(outcome.status).toBe("ok")
    if (outcome.status !== "ok") return

    const contract = await contractRecordsService.getContractById(db, outcome.contractId)
    const variables = contract?.variables as Record<string, unknown>
    const bookingVariables = variables.booking as Record<string, unknown>
    const paymentVariables = variables.payment as Record<string, unknown>

    expect(bookingVariables).toMatchObject({
      depositAmountCents: 30000,
      depositDueDate: "2026-05-01",
      balanceAmountCents: 90000,
      balanceDueDate: "2026-06-01",
      roomsSummary: "1× DBL room",
    })
    expect(paymentVariables.schedule).toHaveLength(2)
    expect(paymentVariables.schedule).toMatchObject([
      {
        index: 1,
        type: "deposit",
        amountCents: 30000,
        currency: "RON",
        dueDate: "2026-05-01",
        status: "paid",
      },
      {
        index: 2,
        type: "balance",
        amountCents: 90000,
        currency: "RON",
        dueDate: "2026-06-01",
        status: "pending",
      },
    ])
    expect(bodies[0]).toContain(
      "Deposit 30000 due 2026-05-01 | Balance 90000 due 2026-06-01 | Rooms 1× DBL room | Schedule deposit:30000, balance:90000",
    )
  })

  it("generates the rooms summary without depending on the 'accommodation' enum value (#1603)", async () => {
    // Regression for #1603: contract generation filtered option_units by
    // `unit_type IN ('room', 'accommodation')`, but 'accommodation' is not a
    // member of the option_unit_type enum on every deployment. Postgres rejects
    // an unknown enum literal before the query runs, which used to 500 ALL
    // contract generation on deployments whose enum lacks the value. This test
    // seeds only enum values that always exist ('person', 'room', 'service')
    // and asserts the summary still resolves the room unit.
    const { template, version } = await seedTemplate("cust-rooms-1603")
    await db
      .update(contractTemplateVersions)
      .set({ body: "Rooms {{ booking.roomsSummary }}" })
      .where(eq(contractTemplateVersions.id, version.id))

    const booking = await seedBooking({ sellCurrency: "RON", sellAmountCents: 90000 })
    await db.execute(sql`
      INSERT INTO products (id, name, sell_currency)
      VALUES ('prod_1603', 'Bucovina Tour', 'RON')
    `)
    await db.execute(sql`
      INSERT INTO product_options (id, product_id, name)
      VALUES ('opto_1603', 'prod_1603', 'Standard package')
    `)
    await db.execute(sql`
      INSERT INTO option_units (id, option_id, name, unit_type)
      VALUES
        ('unit_1603_adult', 'opto_1603', 'Adult', 'person'),
        ('unit_1603_room', 'opto_1603', 'Twin room', 'room'),
        ('unit_1603_guide', 'opto_1603', 'Private guide', 'service')
    `)
    await db.insert(bookingItems).values([
      {
        bookingId: booking.id,
        title: "Adult",
        itemType: "unit",
        status: "confirmed",
        quantity: 2,
        sellCurrency: "RON",
        unitSellAmountCents: 30000,
        totalSellAmountCents: 60000,
        optionUnitId: "unit_1603_adult",
        unitNameSnapshot: "Adult",
      },
      {
        bookingId: booking.id,
        title: "Twin room",
        itemType: "unit",
        status: "confirmed",
        quantity: 1,
        sellCurrency: "RON",
        unitSellAmountCents: 30000,
        totalSellAmountCents: 30000,
        optionUnitId: "unit_1603_room",
        unitNameSnapshot: "Twin room",
      },
      {
        bookingId: booking.id,
        title: "Private guide",
        itemType: "unit",
        status: "confirmed",
        quantity: 1,
        sellCurrency: "RON",
        unitSellAmountCents: 0,
        totalSellAmountCents: 0,
        optionUnitId: "unit_1603_guide",
        unitNameSnapshot: "Private guide",
      },
    ])

    const bodies: string[] = []
    const outcome = await autoGenerateContractForBooking(
      db,
      { bookingId: booking.id, bookingNumber: booking.bookingNumber, actorId: null },
      { enabled: true, templateSlug: template.slug },
      { generator: makeGenerator(bodies) },
    )
    expect(outcome.status).toBe("ok")
    if (outcome.status !== "ok") return

    const contract = await contractRecordsService.getContractById(db, outcome.contractId)
    const variables = contract?.variables as Record<string, unknown>
    const bookingVariables = variables.booking as Record<string, unknown>

    // Only the 'room' unit is summarised; the service unit is excluded.
    expect(bookingVariables.roomsSummary).toBe("1× Twin room")
    expect(bodies[0]).toBe("Rooms 1× Twin room")
  })

  it("resolves a series by prefix and scope and writes seriesId onto the contract", async () => {
    const { template } = await seedTemplate("cust-series-1")
    const booking = await seedBooking()
    const series = await contractSeriesService.createSeries(db, {
      name: "2026 Customer",
      prefix: "CS",
      separator: "-",
      padLength: 5,
      resetStrategy: "never",
      scope: "customer",
      active: true,
    })

    const outcome = await autoGenerateContractForBooking(
      db,
      { bookingId: booking.id, bookingNumber: booking.bookingNumber, actorId: null },
      {
        enabled: true,
        templateSlug: template.slug,
        seriesPrefixScope: { prefix: "CS", scope: "customer" },
      },
      { generator: makeGenerator() },
    )
    expect(outcome.status).toBe("ok")
    if (outcome.status !== "ok") return

    const contract = await contractRecordsService.getContractById(db, outcome.contractId)
    expect(contract?.seriesId).toBe(series!.id)
    expect(contract?.contractNumber).toBeTruthy() // allocated from series
    expect((contract?.variables as { contract?: { series?: string } }).contract?.series).toBe(
      "2026 Customer",
    )
  })

  it("records trigger metadata on the created contract", async () => {
    const { template } = await seedTemplate("cust-meta-1")
    const booking = await seedBooking()

    const outcome = await autoGenerateContractForBooking(
      db,
      { bookingId: booking.id, bookingNumber: booking.bookingNumber, actorId: "usrp_meta" },
      { enabled: true, templateSlug: template.slug },
      { generator: makeGenerator() },
    )
    expect(outcome.status).toBe("ok")
    if (outcome.status !== "ok") return

    const contract = await contractRecordsService.getContractById(db, outcome.contractId)
    const metadata = contract?.metadata as Record<string, unknown> | null
    expect(metadata?.autoGenerated).toBe(true)
    expect(metadata?.trigger).toBe("booking.confirmed")
    expect(metadata?.triggerActorId).toBe("usrp_meta")
  })
})
