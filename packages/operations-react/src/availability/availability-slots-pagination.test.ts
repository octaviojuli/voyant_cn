import { describe, expect, it, vi } from "vitest"

import type { FetchWithValidationOptions } from "./client.js"
import { resolveAvailabilityPageSummary } from "./components/availability-tabs/shared.js"
import { getSlotsQueryOptions } from "./query-options.js"

/**
 * These cover the availability index page's slots list, which used to fetch a
 * single 25-row page and then paginate/filter/sort it in the browser: the
 * footer counted rows in memory (25) instead of the API's `total` (449 in the
 * reported case), so departures outside that first response were unreachable.
 */

function stubClient(body: unknown): {
  client: FetchWithValidationOptions
  requestedUrls: string[]
} {
  const requestedUrls: string[] = []
  const fetcher = vi.fn(async (url: string) => {
    requestedUrls.push(url)
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  })

  return { client: { baseUrl: "https://api.test", fetcher }, requestedUrls }
}

const emptyPage = { data: [], total: 449, limit: 25, offset: 0 }

async function runSlotsQuery(
  options: Parameters<typeof getSlotsQueryOptions>[1],
): Promise<{ url: string; total: number }> {
  const { client, requestedUrls } = stubClient(emptyPage)
  const queryOptions = getSlotsQueryOptions(client, options)
  const result = (await queryOptions.queryFn?.({} as never)) as { total: number }
  return { url: requestedUrls[0] ?? "", total: result.total }
}

describe("slots list query", () => {
  it("asks the server for the requested page, not always the first one", async () => {
    const { url } = await runSlotsQuery({ limit: 25, offset: 75 })

    expect(url).toContain("/v1/admin/operations/availability/slots?")
    expect(url).toContain("limit=25")
    expect(url).toContain("offset=75")
  })

  it("pushes every page filter to the server so the whole result set is searchable", async () => {
    const { url } = await runSlotsQuery({
      limit: 25,
      offset: 0,
      productId: "prod_new",
      status: "open",
      startsAtFrom: "2026-08-01T00:00:00.000Z",
      startsAtUntil: "2026-08-08T00:00:00.000Z",
    })

    expect(url).toContain("productId=prod_new")
    expect(url).toContain("status=open")
    expect(url).toContain("startsAtFrom=2026-08-01T00%3A00%3A00.000Z")
    expect(url).toContain("startsAtUntil=2026-08-08T00%3A00%3A00.000Z")
  })

  it("keeps react-query behaviour flags out of the request and the cache key", async () => {
    const { client, requestedUrls } = stubClient(emptyPage)
    const queryOptions = getSlotsQueryOptions(client, {
      limit: 25,
      offset: 0,
      keepPreviousData: true,
    })

    await queryOptions.queryFn?.({} as never)

    expect(requestedUrls[0]).not.toContain("keepPreviousData")
    expect(JSON.stringify(queryOptions.queryKey)).not.toContain("keepPreviousData")
  })

  it("surfaces the API total rather than the number of rows returned", async () => {
    const { total } = await runSlotsQuery({ limit: 25, offset: 0 })

    expect(total).toBe(449)
  })
})

describe("resolveAvailabilityPageSummary", () => {
  it("reports the server total, not the loaded page size", () => {
    const summary = resolveAvailabilityPageSummary({ pageIndex: 0, pageSize: 25, total: 449 })

    expect(summary).toMatchObject({
      start: 1,
      end: 25,
      page: 1,
      pageCount: 18,
      canPreviousPage: false,
      canNextPage: true,
    })
  })

  it("walks to pages the first response never contained", () => {
    const summary = resolveAvailabilityPageSummary({ pageIndex: 17, pageSize: 25, total: 449 })

    expect(summary).toMatchObject({
      start: 426,
      end: 449,
      page: 18,
      pageCount: 18,
      canPreviousPage: true,
      canNextPage: false,
    })
  })

  it("clamps a stale page index left over from a wider filter", () => {
    const summary = resolveAvailabilityPageSummary({ pageIndex: 12, pageSize: 25, total: 29 })

    expect(summary).toMatchObject({ start: 26, end: 29, page: 2, pageCount: 2, canNextPage: false })
  })

  it("degrades to an empty summary when nothing matches", () => {
    const summary = resolveAvailabilityPageSummary({ pageIndex: 0, pageSize: 25, total: 0 })

    expect(summary).toMatchObject({
      start: 0,
      end: 0,
      page: 0,
      pageCount: 1,
      canPreviousPage: false,
      canNextPage: false,
    })
  })
})
