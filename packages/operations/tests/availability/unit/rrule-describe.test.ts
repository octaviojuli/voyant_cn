import { describe, expect, it } from "vitest"

import {
  DEFAULT_RRULE_DESCRIPTION_LABELS,
  describeRRule,
  type RRuleDescriptionLabels,
  WEEKDAY_LABELS,
} from "../../../src/availability/rrule.js"

/**
 * `describeRRule` used to hardcode English (`WEEKDAY_LABELS` + inline
 * "Every N weeks on ..." strings), so every user-facing recurrence preview
 * leaked untranslated copy. The label bundle is now injectable, mirroring
 * `packages/inventory-react/src/components/product-detail/rrule-labels.ts`.
 */

const zhLabels: RRuleDescriptionLabels = {
  everyDay: "每天",
  everyNDays: "每 {n} 天",
  everyWeek: "每周",
  everyNWeeks: "每 {n} 周",
  everyMonth: "每月",
  everyNMonths: "每 {n} 个月",
  everyWeekdayFull: "每{weekday}",
  onWeekdays: "{cadence}的{days}",
  onMonthDay: "{cadence}的 {days} 日",
  onMonthDays: "{cadence}的 {days} 日",
  noWeekdays: "{cadence}（未选择星期）",
  noMonthDays: "{cadence}（未选择日期）",
  listSeparator: "、",
  weekdayShort: {
    MO: "周一",
    TU: "周二",
    WE: "周三",
    TH: "周四",
    FR: "周五",
    SA: "周六",
    SU: "周日",
  },
  weekdayFull: {
    MO: "周一",
    TU: "周二",
    WE: "周三",
    TH: "周四",
    FR: "周五",
    SA: "周六",
    SU: "周日",
  },
}

describe("describeRRule label injection", () => {
  it("renders every branch from the injected bundle without English leaking", () => {
    const cases = [
      "FREQ=DAILY",
      "FREQ=DAILY;INTERVAL=3",
      "FREQ=WEEKLY;BYDAY=WE",
      "FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE,FR",
      "FREQ=WEEKLY",
      "FREQ=MONTHLY;BYMONTHDAY=5",
      "FREQ=MONTHLY;INTERVAL=2;BYMONTHDAY=5,20",
      "FREQ=MONTHLY",
    ]

    for (const rrule of cases) {
      const described = describeRRule(rrule, zhLabels)
      expect(described).not.toMatch(/[A-Za-z]/)
    }
  })

  it("localizes the single-weekday shorthand", () => {
    expect(describeRRule("FREQ=WEEKLY;BYDAY=WE", zhLabels)).toBe("每周三")
  })

  it("localizes cadence, weekday list and separator together", () => {
    expect(describeRRule("FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE,FR", zhLabels)).toBe(
      "每 2 周的周一、周三、周五",
    )
  })

  it("localizes the monthly branches", () => {
    expect(describeRRule("FREQ=MONTHLY;BYMONTHDAY=5", zhLabels)).toBe("每月的 5 日")
    expect(describeRRule("FREQ=MONTHLY;INTERVAL=2;BYMONTHDAY=20,5", zhLabels)).toBe(
      "每 2 个月的 5、20 日",
    )
  })

  it("localizes the empty-selection branches", () => {
    expect(describeRRule("FREQ=WEEKLY", zhLabels)).toBe("每周（未选择星期）")
    expect(describeRRule("FREQ=MONTHLY", zhLabels)).toBe("每月（未选择日期）")
  })

  it("keeps the previous English wording as the developer-facing default", () => {
    expect(describeRRule("FREQ=DAILY")).toBe("Every day")
    expect(describeRRule("FREQ=DAILY;INTERVAL=3")).toBe("Every 3 days")
    expect(describeRRule("FREQ=WEEKLY;BYDAY=MO")).toBe("Every Monday")
    expect(describeRRule("FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE,FR")).toBe(
      "Every 2 weeks on Mon, Wed, Fri",
    )
    expect(describeRRule("FREQ=WEEKLY")).toBe("Every week (no weekdays)")
    expect(describeRRule("FREQ=MONTHLY;BYMONTHDAY=5")).toBe("Every month on day 5")
    expect(describeRRule("FREQ=MONTHLY;INTERVAL=2;BYMONTHDAY=20,5")).toBe(
      "Every 2 months on days 5, 20",
    )
    expect(describeRRule("FREQ=MONTHLY")).toBe("Every month (no days)")
  })

  it("keeps WEEKDAY_LABELS as the default bundle's short weekday set", () => {
    expect(DEFAULT_RRULE_DESCRIPTION_LABELS.weekdayShort).toBe(WEEKDAY_LABELS)
  })

  it("accepts a pre-parsed rrule with injected labels", () => {
    expect(
      describeRRule(
        { frequency: "WEEKLY", interval: 1, byWeekdays: ["SA", "SU"], byMonthDays: [] },
        zhLabels,
      ),
    ).toBe("每周的周六、周日")
  })
})
