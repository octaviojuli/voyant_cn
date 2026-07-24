import { createContext, useContext } from "react"
import type { FinanceUiMessages } from "../../i18n/index.js"

export const TAX_CODE_OPTIONS = [
  "standard",
  "reduced",
  "exempt",
  "reverse_charge",
  "margin_scheme_art311",
  "zero_rated",
  "out_of_scope",
  "other",
] as const

export type TaxRegimeCode = (typeof TAX_CODE_OPTIONS)[number]
export type TaxClassAppliesTo = "base" | "addon" | "accommodation" | "all"
export type TaxPolicySide = "sell" | "buy"
export type TaxPolicyConditionMode = "always" | "all" | "any"
export type TaxPolicyConditionFact = "hasAccommodation" | "accommodationCountries"
export type TaxPolicyConditionOperator = "eq" | "contains"

export interface TaxesPageApi {
  get: <T = unknown>(path: string) => Promise<T>
  post: <T = unknown>(path: string, body?: unknown) => Promise<T>
  patch: <T = unknown>(path: string, body?: unknown) => Promise<T>
  delete: <T = unknown>(path: string) => Promise<T>
}

export interface TaxesPageProps {
  api?: TaxesPageApi
}

export const TaxesPageApiContext = createContext<TaxesPageApi | null>(null)

function joinUrl(baseUrl: string, path: string) {
  const trimmedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl
  const trimmedPath = path.startsWith("/") ? path : `/${path}`
  return `${trimmedBase}${trimmedPath}`
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let body: unknown
    try {
      body = await response.json()
    } catch {
      body = await response.text().catch(() => undefined)
    }
    const message =
      typeof body === "object" && body !== null && "error" in body
        ? String((body as { error: unknown }).error)
        : `API error: ${response.status} ${response.statusText}`
    throw new Error(message)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export function createTaxesPageApi(
  baseUrl: string,
  fetcher: (url: string, init?: RequestInit) => Promise<Response>,
) {
  const request = async <T,>(path: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers)
    if (init.body !== undefined && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json")
    }
    return readJson<T>(await fetcher(joinUrl(baseUrl, path), { ...init, headers }))
  }

  const api: TaxesPageApi = {
    get: <T = unknown>(path: string) => request<T>(path, { method: "GET" }),
    post: <T = unknown>(path: string, body?: unknown) =>
      request<T>(path, {
        method: "POST",
        body: body !== undefined ? JSON.stringify(body) : undefined,
      }),
    patch: <T = unknown>(path: string, body?: unknown) =>
      request<T>(path, {
        method: "PATCH", // i18n-literal-ok HTTP method
        body: body !== undefined ? JSON.stringify(body) : undefined,
      }),
    delete: <T = unknown>(path: string) => request<T>(path, { method: "DELETE" }), // i18n-literal-ok HTTP method
  }

  return api
}

export function useTaxesPageApi() {
  const api = useContext(TaxesPageApiContext)
  if (!api) throw new Error("TaxesPage requires a TaxesPageApiContext provider")
  return api
}

export const TAX_CLASS_APPLIES_TO_OPTIONS: TaxClassAppliesTo[] = [
  "base",
  "addon",
  "accommodation",
  "all",
]
export const TAX_POLICY_CONDITION_FACT_OPTIONS: TaxPolicyConditionFact[] = [
  "hasAccommodation",
  "accommodationCountries",
]

export type TaxRegimeRecord = {
  id: string
  code: TaxRegimeCode
  name: string
  jurisdiction: string | null
  ratePercent: number | null
  description: string | null
  legalReference: string | null
  active: boolean
}

export type TaxClassRecord = {
  id: string
  code: string
  label: string
  description: string | null
  defaultRegimeId: string | null
  lines: TaxClassLineRecord[] | null
  active: boolean
}

export type TaxClassLineRecord = {
  regime_id: string
  applies_to: TaxClassAppliesTo
}

export type TaxRow = {
  taxClass: TaxClassRecord
  regime: TaxRegimeRecord | null
}

export type TaxPolicyProfileRecord = {
  id: string
  code: string
  name: string
  jurisdiction: string | null
  description: string | null
  active: boolean
}

export type TaxPolicyRuleRecord = {
  id: string
  profileId: string
  side: TaxPolicySide
  priority: number
  name: string
  appliesTo: TaxClassAppliesTo
  condition: Record<string, unknown> | null
  taxRegimeId: string
  active: boolean
}

export type TaxFormState = {
  taxClassLabel: string
  taxClassCode: string
  taxClassDescription: string
  regimeName: string
  regimeCode: TaxRegimeCode
  jurisdiction: string
  ratePercent: string
  regimeDescription: string
  legalReference: string
  lines: Array<{
    key: string
    appliesTo: TaxClassAppliesTo
    regimeId: string
  }>
  active: boolean
}

export type PolicyProfileFormState = {
  name: string
  code: string
  jurisdiction: string
  description: string
  active: boolean
}

export type PolicyRuleFormState = {
  profileId: string
  side: TaxPolicySide
  priority: string
  name: string
  appliesTo: TaxClassAppliesTo
  conditionMode: TaxPolicyConditionMode
  conditions: Array<{
    key: string
    fact: TaxPolicyConditionFact
    operator: TaxPolicyConditionOperator
    value: string
  }>
  taxRegimeId: string
  active: boolean
}

const EMPTY_FORM: TaxFormState = {
  taxClassLabel: "",
  taxClassCode: "",
  taxClassDescription: "",
  regimeName: "",
  regimeCode: "standard",
  jurisdiction: "RO",
  ratePercent: "0",
  regimeDescription: "",
  legalReference: "",
  lines: [],
  active: true,
}

const EMPTY_POLICY_PROFILE_FORM: PolicyProfileFormState = {
  name: "",
  code: "",
  jurisdiction: "RO",
  description: "",
  active: true,
}

const EMPTY_POLICY_RULE_FORM: PolicyRuleFormState = {
  profileId: "",
  side: "sell",
  priority: "100",
  name: "",
  appliesTo: "all",
  conditionMode: "always",
  conditions: [],
  taxRegimeId: "",
  active: true,
}

let taxClassLineKey = 0
let taxPolicyConditionKey = 0

export function nextTaxClassLineKey(seed = "line") {
  taxClassLineKey += 1
  return `${seed}-${taxClassLineKey}`
}

export function nextTaxPolicyConditionKey(seed = "condition") {
  taxPolicyConditionKey += 1
  return `${seed}-${taxPolicyConditionKey}`
}

export function initialForm(row: TaxRow | undefined): TaxFormState {
  if (!row) return EMPTY_FORM
  return {
    taxClassLabel: row.taxClass.label,
    taxClassCode: row.taxClass.code,
    taxClassDescription: row.taxClass.description ?? "",
    regimeName: row.regime?.name ?? row.taxClass.label,
    regimeCode: row.regime?.code ?? "other",
    jurisdiction: row.regime?.jurisdiction ?? "RO",
    ratePercent: row.regime?.ratePercent != null ? String(row.regime.ratePercent) : "0",
    regimeDescription: row.regime?.description ?? "",
    legalReference: row.regime?.legalReference ?? "",
    lines: (row.taxClass.lines ?? []).map((line) => ({
      key: nextTaxClassLineKey(`${line.applies_to}-${line.regime_id}`),
      appliesTo: line.applies_to,
      regimeId: line.regime_id,
    })),
    active: row.taxClass.active,
  }
}

export function initialPolicyProfileForm(
  profile: TaxPolicyProfileRecord | undefined,
): PolicyProfileFormState {
  if (!profile) return EMPTY_POLICY_PROFILE_FORM
  return {
    name: profile.name,
    code: profile.code,
    jurisdiction: profile.jurisdiction ?? "",
    description: profile.description ?? "",
    active: profile.active,
  }
}

export function initialPolicyRuleForm(
  rule: TaxPolicyRuleRecord | undefined,
  profileId: string,
  taxRegimeId: string,
): PolicyRuleFormState {
  if (!rule) {
    return {
      ...EMPTY_POLICY_RULE_FORM,
      profileId,
      taxRegimeId,
    }
  }
  return {
    profileId: rule.profileId,
    side: rule.side,
    priority: String(rule.priority),
    name: rule.name,
    appliesTo: rule.appliesTo,
    ...parsePolicyCondition(rule.condition),
    taxRegimeId: rule.taxRegimeId,
    active: rule.active,
  }
}

function parsePolicyCondition(
  condition: Record<string, unknown> | null,
): Pick<PolicyRuleFormState, "conditionMode" | "conditions"> {
  if (!condition || condition.always === true) {
    return { conditionMode: "always", conditions: [] }
  }

  const group = Array.isArray(condition.all)
    ? { mode: "all" as const, expressions: condition.all }
    : Array.isArray(condition.any)
      ? { mode: "any" as const, expressions: condition.any }
      : { mode: "all" as const, expressions: [condition] }

  const conditions = group.expressions
    .map(parsePolicyConditionExpression)
    .filter((row): row is PolicyRuleFormState["conditions"][number] => Boolean(row))

  return {
    conditionMode: conditions.length ? group.mode : "always",
    conditions,
  }
}

function parsePolicyConditionExpression(
  expression: unknown,
): PolicyRuleFormState["conditions"][number] | null {
  if (typeof expression !== "object" || expression === null || Array.isArray(expression)) {
    return null
  }
  const record = expression as Record<string, unknown>
  if (record.fact === "hasAccommodation") {
    return {
      key: nextTaxPolicyConditionKey("has-accommodation"),
      fact: "hasAccommodation",
      operator: "eq",
      value: record.eq === false ? "false" : "true",
    }
  }
  if (record.fact === "accommodationCountries") {
    return {
      key: nextTaxPolicyConditionKey("accommodation-countries"),
      fact: "accommodationCountries",
      operator: "contains",
      value: typeof record.contains === "string" ? record.contains : "RO", // i18n-literal-ok ISO country default
    }
  }
  return null
}

export function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function formatRate(value: number | null) {
  return value == null ? "-" : `${value}%`
}

export function taxCodeLabel(messages: FinanceUiMessages, code: TaxRegimeCode | string) {
  const labels: Partial<Record<string, string>> = messages.taxesPage.taxCodeLabels
  return labels[code] ?? code
}

export function appliesToLabel(messages: FinanceUiMessages, appliesTo: TaxClassAppliesTo) {
  const taxMessages = messages.taxesPage
  switch (appliesTo) {
    case "base":
      return taxMessages.appliesToBase
    case "addon":
      return taxMessages.appliesToAddon
    case "accommodation":
      return taxMessages.appliesToAccommodation
    case "all":
      return taxMessages.appliesToAll
  }
}

export function summarizeCondition(
  messages: FinanceUiMessages,
  condition: Record<string, unknown> | null,
) {
  const taxMessages = messages.taxesPage
  if (!condition) return "-"
  if (condition.always === true) return taxMessages.policyConditionAlways
  const parsed = parsePolicyCondition(condition)
  if (parsed.conditionMode === "always") return taxMessages.policyConditionAlways
  const prefix =
    parsed.conditionMode === "all"
      ? taxMessages.policyConditionModeAll
      : taxMessages.policyConditionModeAny
  const labels = parsed.conditions.map((row) => summarizeConditionRow(messages, row))
  return `${prefix}: ${labels.join("; ")}`
}

function summarizeConditionRow(
  messages: FinanceUiMessages,
  condition: PolicyRuleFormState["conditions"][number],
) {
  const taxMessages = messages.taxesPage
  if (condition.fact === "hasAccommodation") {
    return `${taxMessages.policyFactHasAccommodation} ${
      condition.value === "false" ? taxMessages.policyValueNo : taxMessages.policyValueYes
    }`
  }
  if (condition.fact === "accommodationCountries") {
    return `${taxMessages.policyFactAccommodationCountries} ${taxMessages.policyOperatorContains} ${condition.value}`
  }
  return taxMessages.customCondition
}

export function normalizeCondition(
  condition: PolicyRuleFormState["conditions"][number],
): PolicyRuleFormState["conditions"][number] {
  if (condition.fact === "hasAccommodation") {
    return {
      ...condition,
      operator: "eq",
      value: condition.value === "false" ? "false" : "true",
    }
  }
  return {
    ...condition,
    operator: "contains",
    value: condition.value.trim().toUpperCase() || "RO",
  }
}

export function buildPolicyCondition(
  form: PolicyRuleFormState,
  taxMessages: FinanceUiMessages["taxesPage"],
): Record<string, unknown> {
  if (form.conditionMode === "always") {
    return { always: true }
  }

  const expressions = form.conditions.map((row) => {
    const condition = normalizeCondition(row)
    if (condition.fact === "hasAccommodation") {
      return { fact: "hasAccommodation", eq: condition.value === "true" }
    }

    if (!/^[A-Z]{2}$/.test(condition.value)) {
      throw new Error(taxMessages.validationPolicyRuleConditionInvalid)
    }
    return { fact: "accommodationCountries", contains: condition.value }
  })

  if (!expressions.length) {
    throw new Error(taxMessages.validationPolicyRuleConditionInvalid)
  }

  return form.conditionMode === "all" ? { all: expressions } : { any: expressions }
}
