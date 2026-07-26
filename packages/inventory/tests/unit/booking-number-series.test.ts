/**
 * The journey commit used to mint `BK-MS1XCLUS` (base36 timestamp)
 * while every other booking in the workspace used the issued series
 * (`VYT-CN-2026-00002`), because no deployment ever wired
 * `generateBookingNumber`. `allocateBookingNumber` continues whatever
 * series the workspace already issues.
 */
import { describe, expect, it, vi } from "vitest"

vi.mock("@voyant-travel/bookings/schema", () => ({
  bookingItems: {},
  bookings: { id: "id", bookingNumber: "booking_number", createdAt: "created_at" },
}))

vi.mock("@voyant-travel/finance", () => ({
  bookingItemTaxLines: {},
}))

// Partial mock: only the operators this module applies to the stubbed
// `bookings` columns. Everything else (notably `sql`) stays real so
// other schema modules still load.
vi.mock("drizzle-orm", async (importOriginal) => ({
  ...(await importOriginal<typeof import("drizzle-orm")>()),
  and: (...args: unknown[]) => args,
  asc: (value: unknown) => value,
  desc: (value: unknown) => value,
  eq: (...args: unknown[]) => args,
  like: (_column: unknown, pattern: string) => ({ pattern }),
}))

const { allocateBookingNumber } = await import(
  "../../src/booking-engine/product-runtime-support.js"
)

type QueryResult = Array<Record<string, unknown>>

/**
 * Minimal chainable stand-in for the drizzle query builder. Every
 * builder method returns the same object; `limit` closes each query
 * (it is always last here) and resolves the next queued result set.
 */
function makeDb(results: QueryResult[], patterns: string[] = []) {
  const queue = [...results]
  const builder: Record<string, unknown> = {}
  const chain = () => builder
  for (const method of ["select", "from", "orderBy"]) builder[method] = chain
  builder.where = (clause: unknown) => {
    const pattern = (clause as { pattern?: string })?.pattern
    if (typeof pattern === "string") patterns.push(pattern)
    return builder
  }
  builder.limit = async () => queue.shift() ?? []
  return builder as never
}

describe("allocateBookingNumber", () => {
  it("continues the workspace series and preserves its pad width", async () => {
    const patterns: string[] = []
    const db = makeDb(
      [
        [{ bookingNumber: "VYT-CN-2026-00002" }, { bookingNumber: "VYT-2026-00006" }],
        [{ bookingNumber: "VYT-CN-2026-00002" }],
        [],
      ],
      patterns,
    )

    await expect(allocateBookingNumber(db)).resolves.toBe(
      `VYT-CN-${new Date().getUTCFullYear()}-00003`,
    )
    expect(patterns[0]).toBe(`VYT-CN-${new Date().getUTCFullYear()}-%`)
  })

  it("starts the series at 1 when the current year has no bookings yet", async () => {
    const db = makeDb([[{ bookingNumber: "VYT-CN-2019-00042" }], [], []])
    await expect(allocateBookingNumber(db)).resolves.toBe(
      `VYT-CN-${new Date().getUTCFullYear()}-00001`,
    )
  })

  it("skips a number that is already taken", async () => {
    const db = makeDb([
      [{ bookingNumber: "VYT-2026-00001" }],
      [{ bookingNumber: `VYT-${new Date().getUTCFullYear()}-00001` }],
      [{ id: "bkg_existing" }],
      [],
    ])
    await expect(allocateBookingNumber(db)).resolves.toBe(
      `VYT-${new Date().getUTCFullYear()}-00003`,
    )
  })

  it("falls back to the timestamp number on a fresh workspace", async () => {
    const db = makeDb([[]])
    await expect(allocateBookingNumber(db)).resolves.toMatch(/^BK-[0-9A-Z]+$/)
  })

  it("falls back rather than failing the commit when the lookup throws", async () => {
    const db = {
      select: () => {
        throw new Error('relation "bookings" does not exist')
      },
    } as never
    await expect(allocateBookingNumber(db)).resolves.toMatch(/^BK-[0-9A-Z]+$/)
  })
})
