import { describe, expect, it } from "vitest"
import { z } from "zod"

import { fetchWithValidation } from "./client.js"

const okResponse = () =>
  new Response(JSON.stringify({ data: { id: "x" } }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })

const schema = z.object({ data: z.object({ id: z.string() }) })

/** 记下 fetcher 实际收到的请求头。 */
function capturingFetcher() {
  const seen: { contentType: string | null }[] = []
  const fetcher = async (_url: string, init?: RequestInit) => {
    const headers = new Headers(init?.headers)
    seen.push({ contentType: headers.get("Content-Type") })
    return okResponse()
  }
  return { seen, fetcher }
}

describe("fetchWithValidation 的 Content-Type", () => {
  it("JSON 请求体自动带上 application/json", async () => {
    const { seen, fetcher } = capturingFetcher()

    await fetchWithValidation(
      "/x",
      schema,
      { baseUrl: "http://t", fetcher },
      {
        method: "POST",
        body: JSON.stringify({ a: 1 }),
      },
    )

    expect(seen[0]?.contentType).toBe("application/json")
  })

  it("FormData 请求体不设 Content-Type,留给平台补 boundary", async () => {
    // 显式设了 Content-Type,fetch 就不会生成 multipart 的 boundary,
    // 服务端会收到一个声称是 JSON 的 multipart body,parseBody 解析不了。
    // 上传线路资料、合同附件、报价配图都走这条路。
    const { seen, fetcher } = capturingFetcher()
    const body = new FormData()
    body.set("file", new File([new Uint8Array([1, 2, 3])], "线路.docx"))

    await fetchWithValidation(
      "/x",
      schema,
      { baseUrl: "http://t", fetcher },
      {
        method: "POST",
        body,
      },
    )

    expect(seen[0]?.contentType).toBeNull()
  })

  it("调用方显式指定的 Content-Type 不被覆盖", async () => {
    const { seen, fetcher } = capturingFetcher()

    await fetchWithValidation(
      "/x",
      schema,
      { baseUrl: "http://t", fetcher },
      {
        method: "POST",
        body: "raw",
        headers: { "Content-Type": "text/plain" },
      },
    )

    expect(seen[0]?.contentType).toBe("text/plain")
  })
})
