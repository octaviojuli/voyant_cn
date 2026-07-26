// @vitest-environment jsdom

import type * as ReactTypes from "react"
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

;(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

const testState = vi.hoisted(() => ({
  slotDetail: undefined as Record<string, unknown> | undefined,
}))

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>()
  return {
    ...actual,
    useQuery: () => ({
      data: testState.slotDetail ? { data: testState.slotDetail } : undefined,
      isLoading: !testState.slotDetail,
      isSuccess: Boolean(testState.slotDetail),
      isError: false,
    }),
  }
})

vi.mock("@voyant-travel/inventory-react", () => ({
  useProductOptions: () => ({ data: { data: [] }, isLoading: false, isSuccess: true }),
}))

vi.mock("@voyant-travel/ui/components", () => ({
  Button: ({ children, ...props }: ReactTypes.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
  Dialog: ({ children, open }: { children: ReactTypes.ReactNode; open?: boolean }) =>
    open ? <div>{children}</div> : null,
  DialogBody: ({ children }: { children: ReactTypes.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: ReactTypes.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: ReactTypes.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactTypes.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactTypes.ReactNode }) => <h2>{children}</h2>,
  Input: (props: ReactTypes.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  Label: ({ children }: ReactTypes.LabelHTMLAttributes<HTMLLabelElement>) => (
    <span>{children}</span>
  ),
  // `items` is recorded so a test can prove the callsite no longer feeds the
  // component a hardcoded English label map for the collapsed trigger.
  Select: ({
    children,
    items,
    onValueChange,
    value,
  }: {
    children: ReactTypes.ReactNode
    items?: unknown
    onValueChange?: (value: string) => void
    value?: string
  }) => (
    <select
      data-has-items={items === undefined ? "no" : "yes"}
      value={value}
      onChange={(event) => onValueChange?.(event.target.value)}
    >
      {children}
    </select>
  ),
  SelectContent: ({ children }: { children: ReactTypes.ReactNode }) => <>{children}</>,
  SelectItem: ({ children, value }: { children: ReactTypes.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
  SelectTrigger: ({ children }: { children?: ReactTypes.ReactNode }) => <>{children}</>,
  SelectValue: () => null,
  Switch: ({
    checked,
    onCheckedChange,
  }: {
    checked?: boolean
    onCheckedChange?: (checked: boolean) => void
  }) => (
    <input
      type="checkbox"
      checked={checked ?? false}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
  Textarea: (props: ReactTypes.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea {...props} />
  ),
}))

vi.mock("@voyant-travel/ui/components/date-picker", () => ({
  DatePicker: ({
    onChange,
    placeholder,
    value,
  }: {
    onChange?: (value: string | null) => void
    placeholder?: string
    value?: string | null
  }) => (
    <input
      data-testid="date-picker"
      data-placeholder={placeholder ?? ""}
      value={value ?? ""}
      onChange={(event) => onChange?.(event.target.value || null)}
    />
  ),
}))

vi.mock("@voyant-travel/ui/components/date-time-picker", () => ({
  DateTimePicker: ({
    onChange,
    placeholder,
    value,
  }: {
    onChange?: (value: string | null) => void
    placeholder?: string
    value?: string | null
  }) => (
    <input
      data-testid="date-time-picker"
      data-placeholder={placeholder ?? ""}
      value={value ?? ""}
      onChange={(event) => onChange?.(event.target.value || null)}
    />
  ),
}))

import { VoyantReactProvider } from "@voyant-travel/react"

import { availabilityUiZh } from "../../i18n/index.js"
import type { AvailabilityDialogMessages, AvailabilitySlotSubmitPayload } from "./shared.js"
import { AvailabilitySlotDialog, resolveSlotTimezone } from "./slot-dialog.js"

const messages = availabilityUiZh as unknown as AvailabilityDialogMessages

/** The list projection: no pickup/resource counts, no cutoff flags. */
const slotRow = {
  id: "slot_1",
  productId: "prod_1",
  productName: "桂林山水四日游",
  itineraryId: null,
  optionId: null,
  facilityId: null,
  availabilityRuleId: null,
  startTimeId: null,
  dateLocal: "2026-09-18",
  endDateLocal: null,
  startsAt: "2026-09-18T00:30:00.000Z",
  endsAt: "2026-09-21T09:00:00.000Z",
  timezone: "Asia/Shanghai",
  status: "open" as const,
  unlimited: false,
  initialPax: 24,
  remainingPax: 17,
  nights: 3,
  days: 4,
  notes: "含接送",
}

/** What `GET /slots/{id}` adds on top of the row. */
const slotDetail = {
  ...slotRow,
  initialPickups: 12,
  remainingPickups: 9,
  remainingResources: 4,
  pastCutoff: true,
  tooEarly: true,
  createdAt: "2026-01-02T00:00:00.000Z",
  updatedAt: "2026-01-03T00:00:00.000Z",
}

const products = [
  {
    id: "prod_1",
    name: "桂林山水四日游",
    timezone: "Asia/Shanghai",
    sellCurrency: null,
    productType: null,
  },
  { id: "prod_2", name: "无时区产品", timezone: null, sellCurrency: null, productType: null },
]

function renderDialog(
  root: Root,
  overrides: {
    slot?: typeof slotRow
    onSubmit?: (payload: AvailabilitySlotSubmitPayload) => Promise<void>
  } = {},
) {
  return act(async () => {
    root.render(
      <VoyantReactProvider baseUrl="/api">
        <AvailabilitySlotDialog
          messages={messages}
          open
          onOpenChange={() => {}}
          slot={overrides.slot}
          products={products}
          rules={[]}
          startTimes={[]}
          onSubmit={overrides.onSubmit ?? (async () => {})}
          onSuccess={() => {}}
        />
      </VoyantReactProvider>,
    )
  })
}

function saveButton(container: HTMLElement) {
  const buttons = [...container.querySelectorAll<HTMLButtonElement>("button")]
  const submit = buttons.find((button) => button.type === "submit")
  if (!submit) throw new Error("save button not rendered")
  return submit
}

function setNativeValue(element: HTMLInputElement | HTMLSelectElement, value: string) {
  const prototype =
    element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(element, value)
  element.dispatchEvent(new Event("input", { bubbles: true }))
  element.dispatchEvent(new Event("change", { bubbles: true }))
}

function timezoneInput(container: HTMLElement) {
  const input = [...container.querySelectorAll<HTMLInputElement>("input")].find(
    (candidate) => candidate.name === "timezone",
  )
  if (!input) throw new Error("timezone input not rendered")
  return input
}

describe("AvailabilitySlotDialog", () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    testState.slotDetail = undefined
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it("re-submits every stored field unchanged when an edit is saved untouched", async () => {
    testState.slotDetail = slotDetail
    const onSubmit = vi.fn(async (_payload: AvailabilitySlotSubmitPayload) => {})

    await renderDialog(root, { slot: slotRow, onSubmit })
    await act(async () => {
      saveButton(container).click()
    })

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const payload = onSubmit.mock.calls[0]?.[0]
    expect(payload).toEqual({
      productId: slotDetail.productId,
      optionId: null,
      availabilityRuleId: null,
      startTimeId: null,
      dateLocal: slotDetail.dateLocal,
      startsAt: slotDetail.startsAt,
      endsAt: slotDetail.endsAt,
      timezone: slotDetail.timezone,
      status: slotDetail.status,
      unlimited: slotDetail.unlimited,
      initialPax: slotDetail.initialPax,
      remainingPax: slotDetail.remainingPax,
      // Regression guard: the list row omits these five, and the dialog used
      // to hardcode them to null/false and wipe the stored values.
      initialPickups: 12,
      remainingPickups: 9,
      remainingResources: 4,
      pastCutoff: true,
      tooEarly: true,
      notes: slotDetail.notes,
    })
  })

  it("blocks saving an edit until the slot detail has loaded", async () => {
    testState.slotDetail = undefined
    const onSubmit = vi.fn(async (_payload: AvailabilitySlotSubmitPayload) => {})

    await renderDialog(root, { slot: slotRow, onSubmit })

    expect(saveButton(container).disabled).toBe(true)
    await act(async () => {
      saveButton(container).click()
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("re-seeds the detail-only fields when the detail arrives after the row", async () => {
    testState.slotDetail = undefined
    const onSubmit = vi.fn(async (_payload: AvailabilitySlotSubmitPayload) => {})

    await renderDialog(root, { slot: slotRow, onSubmit })
    expect(saveButton(container).disabled).toBe(true)

    // The detail lands a tick later, as it does when the dialog is opened from
    // a list row rather than the slot detail page.
    testState.slotDetail = slotDetail
    await renderDialog(root, { slot: slotRow, onSubmit })

    expect(saveButton(container).disabled).toBe(false)
    await act(async () => {
      saveButton(container).click()
    })

    const payload = onSubmit.mock.calls[0]?.[0]
    expect(payload).toMatchObject({
      initialPickups: 12,
      remainingPickups: 9,
      remainingResources: 4,
      pastCutoff: true,
      tooEarly: true,
    })
  })

  it("defaults the timezone from the picked product instead of the browser", async () => {
    await renderDialog(root)

    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    expect(timezoneInput(container).value).toBe(browserTimezone)

    const productSelect = container.querySelector<HTMLSelectElement>("select")
    if (!productSelect) throw new Error("product select not rendered")
    await act(async () => {
      setNativeValue(productSelect, "prod_1")
    })

    expect(timezoneInput(container).value).toBe("Asia/Shanghai")

    // A product with no timezone of its own falls back to the browser.
    await act(async () => {
      setNativeValue(productSelect, "prod_2")
    })
    expect(timezoneInput(container).value).toBe(browserTimezone)
  })

  it("keeps a hand-edited timezone when the product changes", async () => {
    await renderDialog(root)

    await act(async () => {
      setNativeValue(timezoneInput(container), "Asia/Urumqi")
    })

    const productSelect = container.querySelector<HTMLSelectElement>("select")
    if (!productSelect) throw new Error("product select not rendered")
    await act(async () => {
      setNativeValue(productSelect, "prod_1")
    })

    expect(timezoneInput(container).value).toBe("Asia/Urumqi")
  })

  it("resolves the timezone from product, then browser, then UTC", () => {
    expect(resolveSlotTimezone({ timezone: "Asia/Shanghai" })).toBe("Asia/Shanghai")
    expect(resolveSlotTimezone({ timezone: null })).toBe(
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    )
  })

  it("localizes the date and date-time picker placeholders", async () => {
    await renderDialog(root)

    const datePlaceholder = container
      .querySelector<HTMLInputElement>('[data-testid="date-picker"]')
      ?.getAttribute("data-placeholder")
    expect(datePlaceholder).toBe("选择日期")

    const dateTimePlaceholders = [
      ...container.querySelectorAll<HTMLInputElement>('[data-testid="date-time-picker"]'),
    ].map((input) => input.getAttribute("data-placeholder"))
    expect(dateTimePlaceholders).toEqual(["选择日期和时间", "选择日期和时间"])
  })

  it("lets the select harvest translated labels instead of English items", async () => {
    await renderDialog(root)

    const selects = [...container.querySelectorAll<HTMLSelectElement>("select")]
    // Product select still supplies real product names; the status and
    // unlimited selects must not supply an `items` label map at all.
    const statusSelect = selects.find((select) =>
      [...select.querySelectorAll("option")].some((option) => option.value === "sold_out"),
    )
    const unlimitedSelect = selects.find((select) => {
      const values = [...select.querySelectorAll("option")].map((option) => option.value)
      return values.includes("true") && values.includes("false")
    })

    expect(statusSelect?.dataset.hasItems).toBe("no")
    expect(unlimitedSelect?.dataset.hasItems).toBe("no")
    expect([...(statusSelect?.querySelectorAll("option") ?? [])].map((o) => o.textContent)).toEqual(
      ["开放", "已关闭", "已售罄", "已取消"],
    )
    expect(
      [...(unlimitedSelect?.querySelectorAll("option") ?? [])].map((o) => o.textContent),
    ).toEqual(["是", "否"])
  })
})
