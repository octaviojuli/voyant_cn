export const WEEKDAYS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] as const
export type Weekday = (typeof WEEKDAYS)[number]

/**
 * English short weekday labels.
 *
 * These are the *developer-facing* defaults used by `describeRRule(...)` when
 * no label bundle is injected. They are NOT a localization surface: any
 * operator/customer-visible recurrence preview must pass its own localized
 * `RRuleDescriptionLabels` (see `describeRRule`), the same way
 * `packages/inventory-react/src/components/product-detail/rrule-labels.ts`
 * takes its labels from the host dictionary.
 */
export const WEEKDAY_LABELS: Record<Weekday, string> = {
  MO: "Mon",
  TU: "Tue",
  WE: "Wed",
  TH: "Thu",
  FR: "Fri",
  SA: "Sat",
  SU: "Sun",
}

/** English full weekday names — same developer-facing default caveat. */
export const WEEKDAY_FULL_LABELS: Record<Weekday, string> = {
  MO: "Monday",
  TU: "Tuesday",
  WE: "Wednesday",
  TH: "Thursday",
  FR: "Friday",
  SA: "Saturday",
  SU: "Sunday",
}

/**
 * Injectable label bundle for `describeRRule(...)`.
 *
 * Templates interpolate `{n}`, `{cadence}`, `{weekday}` and `{days}` with the
 * same `{key}` syntax `@voyant-travel/i18n`'s `formatMessage` uses, so a host
 * can hand its dictionary strings straight through without a translation step.
 * Mirrors `RRuleLabels` in
 * `packages/inventory-react/src/components/product-detail/rrule-labels.ts`.
 */
export type RRuleDescriptionLabels = {
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

/**
 * English fallback bundle. Kept so `describeRRule(rrule)` stays behaviourally
 * identical for existing (developer/log/debug) callers; user-facing callers
 * must pass their own bundle.
 */
export const DEFAULT_RRULE_DESCRIPTION_LABELS: RRuleDescriptionLabels = {
  everyDay: "Every day",
  everyNDays: "Every {n} days",
  everyWeek: "Every week",
  everyNWeeks: "Every {n} weeks",
  everyMonth: "Every month",
  everyNMonths: "Every {n} months",
  everyWeekdayFull: "Every {weekday}",
  onWeekdays: "{cadence} on {days}",
  onMonthDay: "{cadence} on day {days}",
  onMonthDays: "{cadence} on days {days}",
  noWeekdays: "{cadence} (no weekdays)",
  noMonthDays: "{cadence} (no days)",
  listSeparator: ", ",
  weekdayShort: WEEKDAY_LABELS,
  weekdayFull: WEEKDAY_FULL_LABELS,
}

/** `{key}` interpolation, matching `@voyant-travel/i18n`'s `formatMessage`. */
function formatRRuleTemplate(
  template: string,
  values: Record<string, string | number | null | undefined>,
): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = values[key]
    return value === null || value === undefined ? "" : String(value)
  })
}

export type Frequency = "DAILY" | "WEEKLY" | "MONTHLY"

export type ParsedRRule = {
  frequency: Frequency
  interval: number
  byWeekdays: Weekday[]
  byMonthDays: number[]
}

const SUPPORTED_FREQUENCIES: readonly Frequency[] = ["DAILY", "WEEKLY", "MONTHLY"]

export type RRuleValidationResult =
  | { ok: true; parsed: ParsedRRule }
  | { ok: false; message: string }

function parseRRuleParts(rrule: string): { map: Map<string, string> } | { error: string } {
  const parts = rrule
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean)
  const map = new Map<string, string>()
  for (const part of parts) {
    const separatorIndex = part.indexOf("=")
    if (separatorIndex < 1) {
      return { error: `Invalid RRULE part: ${part}` }
    }
    const key = part.slice(0, separatorIndex).trim().toUpperCase()
    const value = part.slice(separatorIndex + 1).trim()
    if (!value) {
      return { error: `Invalid RRULE part: ${part}` }
    }
    map.set(key, value)
  }
  return { map }
}

export function validateRRule(rrule: string): RRuleValidationResult {
  const parsedParts = parseRRuleParts(rrule)
  if ("error" in parsedParts) return { ok: false, message: parsedParts.error }

  const { map } = parsedParts
  const rawFreq = map.get("FREQ")?.toUpperCase()
  if (!rawFreq) return { ok: false, message: "RRULE must include FREQ" }
  if (!(SUPPORTED_FREQUENCIES as readonly string[]).includes(rawFreq)) {
    return { ok: false, message: `Unsupported RRULE frequency: ${rawFreq}` }
  }

  const rawInterval = map.get("INTERVAL")
  const interval = rawInterval === undefined ? 1 : Number.parseInt(rawInterval, 10)
  if (
    !Number.isFinite(interval) ||
    interval < 1 ||
    (rawInterval !== undefined && String(interval) !== rawInterval)
  ) {
    return { ok: false, message: "RRULE INTERVAL must be a positive integer" }
  }

  const byday = map.get("BYDAY") ?? ""
  const rawWeekdays = byday
    .split(",")
    .map((d) => d.trim().toUpperCase())
    .filter(Boolean)
  const byWeekdays = rawWeekdays.filter((d): d is Weekday =>
    (WEEKDAYS as readonly string[]).includes(d),
  )
  if (rawWeekdays.length !== byWeekdays.length) {
    return { ok: false, message: "RRULE BYDAY contains unsupported weekdays" }
  }

  const bymonthday = map.get("BYMONTHDAY") ?? ""
  const rawMonthDays = bymonthday
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean)
  const byMonthDays = rawMonthDays.map((d) => Number.parseInt(d, 10))
  if (
    byMonthDays.some(
      (n, index) => !Number.isFinite(n) || n < 1 || n > 31 || String(n) !== rawMonthDays[index],
    )
  ) {
    return { ok: false, message: "RRULE BYMONTHDAY must contain days 1 through 31" }
  }

  const frequency = rawFreq as Frequency
  if (frequency === "WEEKLY" && byWeekdays.length === 0) {
    return { ok: false, message: "Weekly RRULE must include BYDAY" }
  }
  if (frequency === "MONTHLY" && byMonthDays.length === 0) {
    return { ok: false, message: "Monthly RRULE must include BYMONTHDAY" }
  }

  return {
    ok: true,
    parsed: { frequency, interval, byWeekdays, byMonthDays },
  }
}

/**
 * Parse a minimal RRULE string (subset of RFC 5545).
 * Supports FREQ, INTERVAL, BYDAY, BYMONTHDAY.
 */
export function parseRRule(rrule: string): ParsedRRule {
  const parts = rrule
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean)
  const map = new Map<string, string>()
  for (const part of parts) {
    const [key, value] = part.split("=")
    if (key && value !== undefined) map.set(key.toUpperCase(), value)
  }

  const rawFreq = (map.get("FREQ") ?? "DAILY").toUpperCase()
  const frequency: Frequency =
    rawFreq === "WEEKLY" || rawFreq === "MONTHLY" ? (rawFreq as Frequency) : "DAILY"

  const interval = Number.parseInt(map.get("INTERVAL") ?? "1", 10) || 1

  const byday = map.get("BYDAY") ?? ""
  const byWeekdays = byday
    .split(",")
    .map((d) => d.trim().toUpperCase())
    .filter((d): d is Weekday => (WEEKDAYS as readonly string[]).includes(d))

  const bymonthday = map.get("BYMONTHDAY") ?? ""
  const byMonthDays = bymonthday
    .split(",")
    .map((d) => Number.parseInt(d.trim(), 10))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 31)

  return { frequency, interval, byWeekdays, byMonthDays }
}

/**
 * Build an RRULE string from structured values.
 */
export function buildRRule(values: ParsedRRule): string {
  const parts = [`FREQ=${values.frequency}`]
  if (values.interval > 1) parts.push(`INTERVAL=${values.interval}`)
  if (values.frequency === "WEEKLY" && values.byWeekdays.length > 0) {
    const ordered = WEEKDAYS.filter((d) => values.byWeekdays.includes(d))
    parts.push(`BYDAY=${ordered.join(",")}`)
  }
  if (values.frequency === "MONTHLY" && values.byMonthDays.length > 0) {
    const ordered = [...values.byMonthDays].sort((a, b) => a - b)
    parts.push(`BYMONTHDAY=${ordered.join(",")}`)
  }
  return parts.join(";")
}

/**
 * Human-readable preview: "Every Monday" / "Every 2 weeks on Mon, Wed, Fri".
 *
 * The wording comes entirely from `labels`, so a user-facing caller localizes
 * the preview by passing its own bundle:
 *
 *     describeRRule(rule.recurrenceRule, messages.availability.rrule)
 *
 * Omitting `labels` falls back to `DEFAULT_RRULE_DESCRIPTION_LABELS` (English)
 * and is only appropriate for developer-facing output — logs, debug tooling,
 * tests. Nothing rendered to an operator or a traveler should rely on it.
 */
export function describeRRule(
  rrule: string | ParsedRRule,
  labels: RRuleDescriptionLabels = DEFAULT_RRULE_DESCRIPTION_LABELS,
): string {
  const parsed = typeof rrule === "string" ? parseRRule(rrule) : rrule
  const { frequency, interval, byWeekdays, byMonthDays } = parsed
  const cadence =
    frequency === "DAILY"
      ? interval > 1
        ? formatRRuleTemplate(labels.everyNDays, { n: interval })
        : labels.everyDay
      : frequency === "WEEKLY"
        ? interval > 1
          ? formatRRuleTemplate(labels.everyNWeeks, { n: interval })
          : labels.everyWeek
        : interval > 1
          ? formatRRuleTemplate(labels.everyNMonths, { n: interval })
          : labels.everyMonth

  if (frequency === "WEEKLY") {
    if (byWeekdays.length === 0) return formatRRuleTemplate(labels.noWeekdays, { cadence })
    const ordered = WEEKDAYS.filter((d) => byWeekdays.includes(d))
    const first = ordered[0]
    if (interval === 1 && ordered.length === 1 && first) {
      return formatRRuleTemplate(labels.everyWeekdayFull, { weekday: labels.weekdayFull[first] })
    }
    return formatRRuleTemplate(labels.onWeekdays, {
      cadence,
      days: ordered.map((d) => labels.weekdayShort[d]).join(labels.listSeparator),
    })
  }
  if (frequency === "MONTHLY") {
    if (byMonthDays.length === 0) return formatRRuleTemplate(labels.noMonthDays, { cadence })
    const ordered = [...byMonthDays].sort((a, b) => a - b)
    return formatRRuleTemplate(ordered.length === 1 ? labels.onMonthDay : labels.onMonthDays, {
      cadence,
      days: ordered.join(labels.listSeparator),
    })
  }
  return cadence
}

function addDaysUtc(date: Date, days: number): Date {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

function startOfDayUtc(date: Date): Date {
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

function weekdayFromJsDay(jsDay: number): Weekday {
  // JS getUTCDay: 0=Sun, 1=Mon, ... 6=Sat
  const map: Record<number, Weekday> = {
    0: "SU",
    1: "MO",
    2: "TU",
    3: "WE",
    4: "TH",
    5: "FR",
    6: "SA",
  }
  return map[jsDay] ?? "MO"
}

function mondayOfWeekUtc(date: Date): Date {
  // JS Monday = 1, Sunday = 0. Convert Sunday → 7 for ISO week alignment.
  const d = startOfDayUtc(date)
  const jsDay = d.getUTCDay()
  const iso = jsDay === 0 ? 7 : jsDay
  return addDaysUtc(d, -(iso - 1))
}

function formatDateLocal(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, "0")
  const d = String(date.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/**
 * Expand an RRULE into a sorted list of local date strings (YYYY-MM-DD).
 * Operates on UTC-anchored wall-clock dates — timezone conversion is
 * the caller's responsibility.
 */
export function expandRRule(
  rrule: string | ParsedRRule,
  fromDate: Date,
  toDate: Date,
  limit = 1000,
): string[] {
  const parsed = typeof rrule === "string" ? parseRRule(rrule) : rrule
  const start = startOfDayUtc(fromDate)
  const end = startOfDayUtc(toDate)
  if (end < start) return []
  const interval = Math.max(1, parsed.interval)
  const out: string[] = []

  if (parsed.frequency === "DAILY") {
    let cursor = start
    while (cursor <= end && out.length < limit) {
      out.push(formatDateLocal(cursor))
      cursor = addDaysUtc(cursor, interval)
    }
    return out
  }

  if (parsed.frequency === "WEEKLY") {
    if (parsed.byWeekdays.length === 0) return []
    const target = new Set(parsed.byWeekdays)
    let weekStart = mondayOfWeekUtc(start)
    while (weekStart <= end && out.length < limit) {
      for (let i = 0; i < 7; i++) {
        const day = addDaysUtc(weekStart, i)
        if (day < start || day > end) continue
        const wd = weekdayFromJsDay(day.getUTCDay())
        if (target.has(wd)) out.push(formatDateLocal(day))
        if (out.length >= limit) break
      }
      weekStart = addDaysUtc(weekStart, 7 * interval)
    }
    return out
  }

  // MONTHLY
  if (parsed.byMonthDays.length === 0) return []
  const monthDays = [...parsed.byMonthDays].sort((a, b) => a - b)
  let year = start.getUTCFullYear()
  let month = start.getUTCMonth()
  while (out.length < limit) {
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
    for (const dom of monthDays) {
      if (dom > daysInMonth) continue
      const d = new Date(Date.UTC(year, month, dom))
      if (d < start) continue
      if (d > end) return out
      out.push(formatDateLocal(d))
      if (out.length >= limit) return out
    }
    month += interval
    while (month > 11) {
      month -= 12
      year += 1
    }
    const firstOfNextIterMonth = new Date(Date.UTC(year, month, 1))
    if (firstOfNextIterMonth > end) break
  }
  return out
}
