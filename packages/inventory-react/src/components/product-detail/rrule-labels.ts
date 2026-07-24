import { formatMessage } from "@voyant-travel/i18n"

const WEEKDAYS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] as const
type Weekday = (typeof WEEKDAYS)[number]

/**
 * Localized label bundle for RRULE descriptions. The host dictionary provides
 * this as `messages.products.core.rrule` (en/ro/zh stay in structural parity
 * via the typed zh dictionary in `@voyant-travel/i18n`).
 */
export interface RRuleLabels {
  everyDay: string
  everyNDays: string
  everyWeek: string
  everyNWeeks: string
  everyMonth: string
  everyNMonths: string
  everyWeekdayFull: string
  onWeekdays: string
  onMonthDay: string
  onMonthDays: string
  noWeekdays: string
  noMonthDays: string
  listSeparator: string
  weekdayShort: Record<Weekday, string>
  weekdayFull: Record<Weekday, string>
}

type Frequency = "DAILY" | "WEEKLY" | "MONTHLY"

interface ParsedRRule {
  frequency: Frequency
  interval: number
  byWeekdays: Weekday[]
  byMonthDays: number[]
}

function parseRRule(rrule: string): ParsedRRule {
  const parts = rrule
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
  const map = new Map<string, string>()
  for (const part of parts) {
    const [key, value] = part.split("=")
    if (key && value !== undefined) map.set(key.toUpperCase(), value)
  }

  const rawFrequency = (map.get("FREQ") ?? "DAILY").toUpperCase()
  const frequency: Frequency =
    rawFrequency === "WEEKLY" || rawFrequency === "MONTHLY" ? rawFrequency : "DAILY"
  const interval = Number.parseInt(map.get("INTERVAL") ?? "1", 10) || 1
  const byWeekdays = (map.get("BYDAY") ?? "")
    .split(",")
    .map((day) => day.trim().toUpperCase())
    .filter((day): day is Weekday => (WEEKDAYS as readonly string[]).includes(day))
  const byMonthDays = (map.get("BYMONTHDAY") ?? "")
    .split(",")
    .map((day) => Number.parseInt(day.trim(), 10))
    .filter((day) => Number.isFinite(day) && day >= 1 && day <= 31)

  return { frequency, interval, byWeekdays, byMonthDays }
}

export function describeRRule(rrule: string, labels: RRuleLabels): string {
  const { frequency, interval, byWeekdays, byMonthDays } = parseRRule(rrule)
  const cadence =
    frequency === "DAILY"
      ? interval > 1
        ? formatMessage(labels.everyNDays, { n: interval })
        : labels.everyDay
      : frequency === "WEEKLY"
        ? interval > 1
          ? formatMessage(labels.everyNWeeks, { n: interval })
          : labels.everyWeek
        : interval > 1
          ? formatMessage(labels.everyNMonths, { n: interval })
          : labels.everyMonth

  if (frequency === "WEEKLY") {
    if (byWeekdays.length === 0) return formatMessage(labels.noWeekdays, { cadence })
    const ordered = WEEKDAYS.filter((day) => byWeekdays.includes(day))
    const first = ordered[0]
    if (interval === 1 && ordered.length === 1 && first) {
      return formatMessage(labels.everyWeekdayFull, { weekday: labels.weekdayFull[first] })
    }
    return formatMessage(labels.onWeekdays, {
      cadence,
      days: ordered.map((day) => labels.weekdayShort[day]).join(labels.listSeparator),
    })
  }

  if (frequency === "MONTHLY") {
    if (byMonthDays.length === 0) return formatMessage(labels.noMonthDays, { cadence })
    const ordered = [...byMonthDays].sort((a, b) => a - b)
    return formatMessage(ordered.length === 1 ? labels.onMonthDay : labels.onMonthDays, {
      cadence,
      days: ordered.join(labels.listSeparator),
    })
  }

  return cadence
}
