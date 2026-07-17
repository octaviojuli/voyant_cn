import { describe, expect, it } from "vitest"

import { resolveSetupMessages, setupZh } from "../src/i18n/index.js"

describe("setup i18n", () => {
  it("resolves chinese messages via region fallback", () => {
    const messages = resolveSetupMessages("zh-CN")

    expect(messages).toBe(setupZh)
    expect(messages.title).toBe("设置工作台")
  })
})
