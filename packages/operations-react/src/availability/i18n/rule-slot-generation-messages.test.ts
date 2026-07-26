import { describe, expect, it } from "vitest"

import {
  formatRuleSlotGenerationResult,
  resolveRuleSlotGenerationMessages,
  ruleSlotGenerationMessageDefinitions,
} from "./rule-slot-generation-messages.js"

describe("rule slot generation messages", () => {
  it("keeps en/ro/zh in structural parity", () => {
    const en = Object.keys(ruleSlotGenerationMessageDefinitions.en).sort()
    expect(Object.keys(ruleSlotGenerationMessageDefinitions.ro).sort()).toEqual(en)
    expect(Object.keys(ruleSlotGenerationMessageDefinitions.zh).sort()).toEqual(en)
  })

  it("resolves regional locales and falls back to English", () => {
    expect(resolveRuleSlotGenerationMessages("zh-CN").action).toBe("按规则生成班期")
    expect(resolveRuleSlotGenerationMessages("ro-RO").action).toBe("Genereaza plecari")
    expect(resolveRuleSlotGenerationMessages("de-DE").action).toBe("Generate departures")
    expect(resolveRuleSlotGenerationMessages(null).action).toBe("Generate departures")
  })

  it("summarizes a fresh generation", () => {
    const messages = resolveRuleSlotGenerationMessages("zh")
    expect(
      formatRuleSlotGenerationResult(messages, { created: 13, skipped: 0 }, { active: true }),
    ).toBe("已生成 13 个班期。")
  })

  it("summarizes an idempotent re-run", () => {
    const messages = resolveRuleSlotGenerationMessages("zh")
    expect(
      formatRuleSlotGenerationResult(messages, { created: 0, skipped: 13 }, { active: true }),
    ).toBe("已是最新：13 个日期已存在班期。")
  })

  it("summarizes a partial generation", () => {
    const messages = resolveRuleSlotGenerationMessages("en")
    expect(
      formatRuleSlotGenerationResult(messages, { created: 4, skipped: 9 }, { active: true }),
    ).toBe("4 departures generated, 9 already existed.")
  })

  it("explains the inactive-rule no-op instead of reporting a bare zero", () => {
    const messages = resolveRuleSlotGenerationMessages("zh")
    expect(
      formatRuleSlotGenerationResult(messages, { created: 0, skipped: 0 }, { active: false }),
    ).toBe("该规则已停用，未生成任何班期。")
  })
})
