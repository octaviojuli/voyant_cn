import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"
import { describe, expect, it, vi } from "vitest"

const getPersonById = vi.fn()
const getOrganizationById = vi.fn()
const listAddresses = vi.fn()

vi.mock("@voyant-travel/relationships", () => ({
  relationshipsService: {
    getPersonById: (...args: unknown[]) => getPersonById(...args),
    getOrganizationById: (...args: unknown[]) => getOrganizationById(...args),
    listAddresses: (...args: unknown[]) => listAddresses(...args),
  },
}))

const { bookingPaymentSchedules } = await import("@voyant-travel/finance/schema")
const { bookingItems } = await import("@voyant-travel/bookings/schema")
const { buildContractVariableBindings } = await import("../../src/contracts/contract-variables.js")

import type { DefaultContractVariables } from "../../src/contracts/service-auto-generate-types.js"

/**
 * Minimal drizzle-query stub. `select(...)` returns a thenable chain that
 * remembers the table passed to `.from(table)` and resolves the matching
 * canned rows. Lets the variable builder run its schedule + rooms queries
 * without a real DB.
 */
function stubDb(rowsByTable: { schedule?: unknown[]; items?: unknown[] }): PostgresJsDatabase {
  function makeChain() {
    let rows: unknown[] = []
    const chain: Record<string, unknown> = {
      from(table: unknown) {
        rows =
          table === bookingPaymentSchedules
            ? (rowsByTable.schedule ?? [])
            : table === bookingItems
              ? (rowsByTable.items ?? [])
              : []
        return chain
      },
      where: () => chain,
      orderBy: () => chain,
      // biome-ignore lint/suspicious/noThenProperty: test stub mimics a thenable drizzle query builder -- owner: legal.
      then: (resolve: (rows: unknown[]) => unknown, reject?: (err: unknown) => unknown) =>
        Promise.resolve(rows).then(resolve, reject),
    }
    return chain
  }

  return {
    select: (..._args: unknown[]) => makeChain(),
  } as PostgresJsDatabase
}

function makeDefaults(): DefaultContractVariables {
  const emptyDoc = {
    type: "",
    number: "",
    country: "",
    issuingAuthority: "",
    issueDate: "",
    expiryDate: "",
  }
  return {
    today: "2026-06-16",
    currentDate: "2026-06-16",
    currentDateTime: "2026-06-16T00:00:00.000Z",
    currentTime: "00:00:00",
    contract: {
      contractNumber: "",
      number: "",
      contractDate: "2026-06-16",
      date: "2026-06-16",
      issuedAt: "2026-06-16T00:00:00.000Z",
      signedAt: "",
      isManual: false,
      series: "customer-contracts",
      channel: "",
      source: "",
      status: "draft",
      language: "en",
    },
    booking: {
      bookingId: "bkg_1",
      bookingNumber: "BKG-1",
      number: "BKG-1",
      id: "bkg_1",
      status: "confirmed",
      entityModule: "",
      entityId: "",
      vertical: "",
      productName: "",
      productSubtitle: "",
      destination: "",
      pax: 2,
      paxTotal: 2,
      paxAdult: 0,
      paxChild: 0,
      paxInfant: 0,
      paxBands: {},
      travelDates: { start: "", end: "", durationNights: 0 },
      startDate: null,
      endDate: null,
      sellCurrency: "EUR",
      sellAmountCents: 20000,
      sellSubtotalCents: 20000,
      sellTaxAmountCents: 0,
      sellDiscountAmountCents: 0,
      costCurrency: "",
      costAmountCents: 0,
      baseCurrency: "",
      baseSellAmountCents: 0,
      marginPercent: 0,
      currency: "EUR",
      totalAmountCents: 20000,
      subtotalAmountCents: 20000,
      taxAmountCents: 0,
      discountAmountCents: 0,
      paidAmountCents: 0,
      amountDueCents: 20000,
      balanceDueCents: 20000,
      isPaidInFull: false,
      depositAmountCents: 0,
      depositDueDate: "",
      balanceAmountCents: 0,
      balanceDueDate: "",
      paymentPolicy: { source: "operator_default" },
      roomsSummary: "",
      source: {
        kind: "",
        type: "",
        connectionId: "",
        ref: "",
        externalRef: "",
        supplier: { id: "", name: "" },
      },
      internalNotes: "",
      customerNotes: "",
    },
    customer: {
      type: "B2C",
      firstName: "",
      lastName: "",
      fullName: "",
      email: "",
      phone: "",
      dateOfBirth: "",
      companyName: "",
      vatId: "",
      registrationNumber: "",
      address: { line1: "", line2: "", city: "", region: "", postal: "", country: "" },
      document: { ...emptyDoc },
    },
    leadTraveler: null,
    travelers: [],
    passengers: [],
    items: [],
    addons: [],
    product: {
      title: "",
      subtitle: "",
      destination: "",
      module: "",
      id: "",
      vertical: "",
      heroImageUrl: "",
    },
    departureSlot: {
      slotId: "",
      startAt: "",
      endAt: "",
      durationDays: 0,
      departureCity: "",
    },
    sailing: {
      sailingId: "",
      ship: "",
      embarkationPort: "",
      disembarkationPort: "",
      airArrangement: "",
      startDate: "",
      endDate: "",
      cabinCategoryId: "",
      cabinNumberId: "",
    },
    stay: { checkIn: "", checkOut: "", nights: 0, rooms: [], destination: "" },
    payment: {
      intent: "",
      method: "",
      amountCents: 20000,
      currency: "EUR",
      schedule: [],
      capturedAt: "",
      createdAt: "",
    },
    operator: {
      name: "",
      legalName: "",
      vatId: "",
      registrationNumber: "",
      address: "",
      phone: "",
      email: "",
      website: "",
      iban: "",
      bank: "",
      license: "",
      licenseAuthority: "",
      signatoryName: "",
      signatoryRole: "",
    },
    acceptance: {
      ipAddress: "",
      userAgent: "",
      acceptedAt: "",
      marketingConsent: false,
      templateSlug: "customer-sales-agreement",
      templateId: "tpl_default",
    },
  }
}

// The real callback receives the full bookings row; the builder only reads a
// handful of fields, so a structural partial cast keeps the test focused.
type ResolveContext = Parameters<ReturnType<typeof buildContractVariableBindings>>[0]
type TestBooking = ResolveContext["booking"]

const bookingBase = {
  id: "bkg_1",
  internalNotes: "",
  personId: null as string | null,
  organizationId: null as string | null,
  sourceType: "direct" as string | null,
} as TestBooking

// biome-ignore lint/suspicious/noExplicitAny: because the test reads a dynamic variable bag
type AnyRecord = Record<string, any>

describe("buildContractVariableBindings", () => {
  it("folds payment schedule, rooms, operator profile and documents url onto defaults", async () => {
    const resolve = buildContractVariableBindings({
      resolveOperatorProfile: () => ({ name: "Acme Travel", vatId: "RO123", iban: null }),
      resolveOperatorPaymentInstructions: () => ({ iban: "RO99BANK", bank: "Acme Bank" }),
    })

    const db = stubDb({
      schedule: [
        {
          scheduleType: "deposit",
          amountCents: 5000,
          currency: "EUR",
          dueDate: "2026-01-01",
          status: "pending",
        },
        {
          scheduleType: "balance",
          amountCents: 15000,
          currency: "EUR",
          dueDate: "2026-02-01",
          status: "pending",
        },
      ],
      items: [
        { title: "Double room", quantity: 2, itemType: "accommodation" },
        { title: "Airport transfer", quantity: 1, itemType: "transfer" },
      ],
    })

    const result = (await resolve({
      db,
      booking: { ...bookingBase },
      travelers: [],
      defaults: makeDefaults(),
      bindings: { DOCUMENTS_BASE_URL: "https://docs.example.com", APP_URL: "http://localhost" },
    })) as AnyRecord

    expect(result.booking.depositAmountCents).toBe(5000)
    expect(result.booking.balanceAmountCents).toBe(15000)
    expect(result.booking.roomsSummary).toBe("2× Double room")
    expect(result.payment.schedule).toHaveLength(2)
    expect(result.payment.schedule[0]).toMatchObject({ index: 1, type: "deposit" })
    expect(result.operator.name).toBe("Acme Travel")
    expect(result.operator.legalName).toBe("Acme Travel")
    expect(result.operator.iban).toBe("RO99BANK")
    expect(result.operator.bank).toBe("Acme Bank")
    expect(result.documents).toEqual({
      baseUrl: "https://docs.example.com",
      base_url: "https://docs.example.com",
    })
    expect(result.booking.paymentPolicy.source).toBe("operator_default")
    expect(result.contract.source).toBe("self_service")
  })

  it("ignores inactive payment schedule rows when folding contract variables", async () => {
    const resolve = buildContractVariableBindings({
      resolveOperatorProfile: () => null,
      resolveOperatorPaymentInstructions: () => null,
    })

    const db = stubDb({
      schedule: [
        {
          scheduleType: "deposit",
          amountCents: 3000,
          currency: "EUR",
          dueDate: "2026-01-01",
          status: "expired",
        },
        {
          scheduleType: "balance",
          amountCents: 17000,
          currency: "EUR",
          dueDate: "2026-01-15",
          status: "cancelled",
        },
        {
          scheduleType: "deposit",
          amountCents: 5000,
          currency: "EUR",
          dueDate: "2026-02-01",
          status: "paid",
        },
        {
          scheduleType: "balance",
          amountCents: 15000,
          currency: "EUR",
          dueDate: "2026-03-01",
          status: "pending",
        },
      ],
    })

    const result = (await resolve({
      db,
      booking: { ...bookingBase },
      travelers: [],
      defaults: makeDefaults(),
      bindings: null,
    })) as AnyRecord

    expect(result.booking.depositAmountCents).toBe(5000)
    expect(result.booking.depositDueDate).toBe("2026-02-01")
    expect(result.booking.balanceAmountCents).toBe(15000)
    expect(result.booking.balanceDueDate).toBe("2026-03-01")
    expect(result.payment.schedule).toEqual([
      {
        index: 1,
        type: "deposit",
        amountCents: 5000,
        currency: "EUR",
        dueDate: "2026-02-01",
        status: "paid",
      },
      {
        index: 2,
        type: "balance",
        amountCents: 15000,
        currency: "EUR",
        dueDate: "2026-03-01",
        status: "pending",
      },
    ])
  })

  it("promotes the acceptance marker and maps manual bookings to staff_issued", async () => {
    const acceptance = {
      templateId: "tpl_9",
      templateSlug: "customer-sales-agreement",
      acceptedAt: "2026-03-01T10:00:00.000Z",
      acceptedMarketing: true,
      clientIp: "203.0.113.7",
      userAgent: "Mozilla/5.0",
    }
    const internalNotes = `some note\n__contract_acceptance__:${JSON.stringify(acceptance)}`

    const resolve = buildContractVariableBindings({
      resolveOperatorProfile: () => null,
      resolveOperatorPaymentInstructions: () => null,
      resolvePaymentPolicySource: () => "supplier",
    })

    const result = (await resolve({
      db: stubDb({}),
      booking: { ...bookingBase, internalNotes, sourceType: "manual" },
      travelers: [],
      defaults: makeDefaults(),
      bindings: null,
    })) as AnyRecord

    expect(result.acceptance.ipAddress).toBe("203.0.113.7")
    expect(result.acceptance.userAgent).toBe("Mozilla/5.0")
    expect(result.acceptance.acceptedAt).toBe(acceptance.acceptedAt)
    expect(result.acceptance.marketingConsent).toBe(true)
    expect(result.contract.signedAt).toBe(acceptance.acceptedAt)
    expect(result.contract.source).toBe("staff_issued")
    expect(result.booking.paymentPolicy.source).toBe("supplier")
    expect(result.operator.name).toBe("")
  })

  it("hydrates the customer block from a linked relationships person", async () => {
    getPersonById.mockResolvedValueOnce({
      id: "per_1",
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      phone: "+40 700 000 000",
      dateOfBirth: "1990-12-10",
    })
    listAddresses.mockResolvedValueOnce([
      {
        isPrimary: true,
        line1: "1 King St",
        city: "Bucharest",
        region: "B",
        postalCode: "010101",
        country: "RO",
      },
    ])

    const resolve = buildContractVariableBindings({
      resolveOperatorProfile: () => null,
      resolveOperatorPaymentInstructions: () => null,
    })

    const result = (await resolve({
      db: stubDb({}),
      booking: { ...bookingBase, personId: "per_1" },
      travelers: [],
      defaults: makeDefaults(),
      bindings: null,
    })) as AnyRecord

    expect(getPersonById).toHaveBeenCalledWith(expect.anything(), "per_1")
    expect(result.customer.firstName).toBe("Ada")
    expect(result.customer.lastName).toBe("Lovelace")
    expect(result.customer.fullName).toBe("Ada Lovelace")
    expect(result.customer.email).toBe("ada@example.com")
    expect(result.customer.address.city).toBe("Bucharest")
    expect(result.customer.address.country).toBe("RO")
  })

  it("renders the hydrated customer name in the contract's own language (#R4a)", async () => {
    getPersonById.mockResolvedValueOnce({
      id: "per_zh",
      firstName: "伟",
      lastName: "张",
      email: "zhangwei@example.cn",
      phone: "+86 138 0000 0000",
      dateOfBirth: "1988-04-02",
    })
    listAddresses.mockResolvedValueOnce([])

    const resolve = buildContractVariableBindings({
      resolveOperatorProfile: () => null,
      resolveOperatorPaymentInstructions: () => null,
    })

    const defaults = makeDefaults()
    defaults.contract.language = "zh-CN"

    const result = (await resolve({
      db: stubDb({}),
      booking: { ...bookingBase, personId: "per_zh" },
      travelers: [],
      defaults,
      bindings: null,
    })) as AnyRecord

    // Family name leads and there is no separator - the western join
    // produced "伟 张" on a customer-facing artifact.
    expect(result.customer.fullName).toBe("张伟")
    // Stored fields are never reordered, only the rendered display name.
    expect(result.customer.firstName).toBe("伟")
    expect(result.customer.lastName).toBe("张")
  })

  it("keeps western order when the contract language is not CJK (#R4a)", async () => {
    getPersonById.mockResolvedValueOnce({
      id: "per_zh_en",
      firstName: "伟",
      lastName: "张",
    })
    listAddresses.mockResolvedValueOnce([])

    const resolve = buildContractVariableBindings({
      resolveOperatorProfile: () => null,
      resolveOperatorPaymentInstructions: () => null,
    })

    const result = (await resolve({
      db: stubDb({}),
      booking: { ...bookingBase, personId: "per_zh_en" },
      travelers: [],
      defaults: makeDefaults(),
      bindings: null,
    })) as AnyRecord

    expect(result.customer.fullName).toBe("伟 张")
  })
})
