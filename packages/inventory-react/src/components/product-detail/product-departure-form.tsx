// agent-quality: file-size exception -- owner: inventory-react; existing UI surface stays co-located until a dedicated split preserves behavior and tests.

import { useQuery } from "@tanstack/react-query"
import { formatMessage } from "@voyant-travel/i18n"
import { instantToSlotLocal, localToInstant } from "@voyant-travel/operations/scheduling"
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
} from "@voyant-travel/ui/components"
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@voyant-travel/ui/components/combobox"
import { DatePicker } from "@voyant-travel/ui/components/date-picker"
import { Loader2 } from "lucide-react"
import { useEffect, useMemo, useRef } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod/v4"
import { useProduct, useProductItineraries, useProductOptions } from "../../index.js"
import { useProductResourceTemplates } from "./commerce-client.js"
import { useProductDetailApi, useProductDetailMessages } from "./host.js"
import {
  getProductDetailDaysQueryOptions,
  resolveProductTimezoneDefault,
} from "./product-detail-shared.js"
import { getTimezoneLabel, TIMEZONE_IDS, TIMEZONE_OPTIONS } from "./timezone-options.js"
import { zodResolver } from "./zod-resolver.js"

type DepartureMessages = ReturnType<
  typeof useProductDetailMessages
>["products"]["operations"]["departures"]

const buildDepartureFormSchema = (messages: DepartureMessages) =>
  z
    .object({
      startDate: z.string().min(1, messages.validationStartDateRequired),
      startTime: z.string().min(1, messages.validationStartTimeRequired),
      endDate: z.string().optional().nullable(),
      endTime: z.string().optional().nullable(),
      itineraryId: z.string().optional().nullable(),
      optionId: z.string().optional().nullable(),
      timezone: z.string().min(1, messages.validationTimezoneRequired),
      status: z.enum(["open", "closed", "sold_out", "cancelled"]),
      unlimited: z.boolean(),
      initialPax: z.coerce.number().int().min(0).optional().or(z.literal("")).nullable(),
      nights: z.coerce.number().int().min(0).optional().or(z.literal("")).nullable(),
      days: z.coerce.number().int().min(0).optional().or(z.literal("")).nullable(),
      notes: z.string().optional().nullable(),
    })
    .refine(
      (v) => {
        if (!v.endDate || typeof v.endDate !== "string" || v.endDate.length === 0) return true
        return v.endDate >= v.startDate
      },
      { message: messages.validationEndDateOrder, path: ["endDate"] },
    )
    .refine(
      (v) => {
        const endDate =
          v.endDate && typeof v.endDate === "string" && v.endDate.length > 0
            ? v.endDate
            : v.startDate
        const endTime =
          v.endTime && typeof v.endTime === "string" && v.endTime.length > 0 ? v.endTime : null
        if (!endTime) return true
        if (endDate > v.startDate) return true
        return endTime >= v.startTime
      },
      { message: messages.validationEndTimeOrder, path: ["endTime"] },
    )

type DepartureFormSchema = ReturnType<typeof buildDepartureFormSchema>
type DepartureFormValues = z.input<DepartureFormSchema>
type DepartureFormOutput = z.output<DepartureFormSchema>

export type DepartureSlot = {
  id: string
  productId: string
  optionId: string | null
  itineraryId: string | null
  dateLocal: string
  startsAt: string
  endsAt: string | null
  timezone: string
  status: "open" | "closed" | "sold_out" | "cancelled"
  unlimited: boolean
  initialPax: number | null
  remainingPax: number | null
  nights: number | null
  days: number | null
  notes: string | null
}

export interface DepartureFormProps {
  productId: string
  slot?: DepartureSlot
  onSuccess: () => void
  onCancel?: () => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Wall clock ⇄ instant
//
// The operator types a wall-clock time on the *departure's* calendar, and the
// service validates `dateLocal` against `startsAt` rendered in that same
// timezone. Reading and writing these fields as UTC made a 09:00 Shanghai
// departure store 09:00Z (17:00 local) and made every stored departure read
// back at its UTC hour. Both directions now go through the same helper the
// availability pages use.
// ─────────────────────────────────────────────────────────────────────────────

function combineLocalToIso(date: string, time: string, timezone: string): string {
  try {
    return localToInstant({ date, time, timezone })
  } catch {
    // The only realistic failure is a wall-clock time that does not exist in
    // this zone (a DST spring-forward gap). Fall back to reading the input as
    // UTC rather than blocking the save.
    return new Date(`${date}T${time}:00Z`).toISOString()
  }
}

function isoToLocalDate(iso: string, timezone: string): string {
  try {
    return instantToSlotLocal(iso, timezone).date
  } catch {
    return ""
  }
}

function isoToLocalTime(iso: string, timezone: string): string {
  try {
    return instantToSlotLocal(iso, timezone).time
  } catch {
    return ""
  }
}

const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

/** `date` shifted by whole calendar days, or `null` when `date` is unusable. */
export function addCalendarDays(date: string, days: number): string | null {
  const match = LOCAL_DATE_PATTERN.exec(date)
  if (!match) return null
  const shifted = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) + days * 86_400_000,
  )
  if (Number.isNaN(shifted.getTime())) return null
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0")
  const day = String(shifted.getUTCDate()).padStart(2, "0")
  return `${shifted.getUTCFullYear()}-${month}-${day}`
}

/**
 * Length of the product's itinerary in day rows. `dayNumber` is the authority
 * (1..N); the row count is only a floor for defensive cases where the numbers
 * are missing or duplicated.
 */
export function itineraryDayCount(days: ReadonlyArray<{ dayNumber: number }>): number {
  return days.reduce((max, day) => Math.max(max, day.dayNumber), days.length)
}

/**
 * Nights implied by an itinerary of `dayCount` days: 12 days ⇒ 11 nights.
 * A 0- or 1-day itinerary implies no overnight, so nothing is derived and the
 * end date stays optional exactly as it is today for single-day products.
 */
export function itineraryNightCount(dayCount: number): number {
  return dayCount > 1 ? dayCount - 1 : 0
}

function initialValues(slot: DepartureSlot | undefined, defaultTz: string): DepartureFormValues {
  if (slot) {
    return {
      startDate: slot.dateLocal,
      startTime: isoToLocalTime(slot.startsAt, slot.timezone),
      endDate: slot.endsAt ? isoToLocalDate(slot.endsAt, slot.timezone) : "",
      endTime: slot.endsAt ? isoToLocalTime(slot.endsAt, slot.timezone) : "",
      itineraryId: slot.itineraryId ?? "",
      optionId: slot.optionId ?? "",
      timezone: slot.timezone,
      status: slot.status,
      unlimited: slot.unlimited,
      initialPax: slot.initialPax != null ? slot.initialPax : "",
      nights: slot.nights != null ? slot.nights : "",
      days: slot.days != null ? slot.days : "",
      notes: slot.notes ?? "",
    }
  }
  return {
    startDate: "",
    startTime: "09:00",
    endDate: "",
    endTime: "",
    itineraryId: "",
    optionId: "",
    timezone: defaultTz,
    status: "open",
    unlimited: false,
    initialPax: "",
    nights: "",
    days: "",
    notes: "",
  }
}

export function DepartureForm({ productId, slot, onSuccess, onCancel }: DepartureFormProps) {
  const messages = useProductDetailMessages()
  const api = useProductDetailApi()
  const productMessages = messages.products.core
  const departureMessages = messages.products.operations.departures
  const itineraryMessages = messages.products.operations.itineraries
  const isEditing = !!slot
  const departureFormSchema = buildDepartureFormSchema(departureMessages)
  const slotStatuses = [
    { value: "open", label: productMessages.departureStatusOpen },
    { value: "closed", label: productMessages.departureStatusClosed },
    { value: "sold_out", label: productMessages.departureStatusSoldOut },
    { value: "cancelled", label: productMessages.departureStatusCancelled },
  ] as const

  // The slot service validates that `dateLocal` matches `startsAt` rendered in
  // the slot's timezone, so defaulting this field to the *browser* timezone
  // silently shifts a departure by a day whenever the operator is not in the
  // product's timezone. Prefer the product's own timezone; the product query is
  // already cached by the detail page, so this costs no extra request.
  const { data: product } = useProduct(productId)
  const productTimezone = product?.timezone ?? null
  const defaultTz = resolveProductTimezoneDefault(productTimezone)

  const form = useForm<DepartureFormValues, unknown, DepartureFormOutput>({
    resolver: zodResolver(departureFormSchema),
    defaultValues: initialValues(slot, defaultTz),
  })

  const unlimited = form.watch("unlimited")
  const startDate = form.watch("startDate")
  const endDate = form.watch("endDate")
  const timezone = form.watch("timezone")
  const { data: itineraryData } = useProductItineraries(productId)
  const itineraries = itineraryData?.data ?? []
  const defaultItinerary = itineraries.find((itinerary) => itinerary.isDefault) ?? itineraries[0]
  const { data: optionData } = useProductOptions({ productId, status: "active", limit: 100 })
  const productOptions = optionData?.data ?? []
  const defaultOption = productOptions.find((option) => option.isDefault) ?? productOptions[0]
  const selectedOptionId = form.watch("optionId")
  const shouldShowOptionSelect =
    productOptions.length > 1 || (isEditing && !selectedOptionId && Boolean(defaultOption))

  // Suggested pax = total physical capacity of the configured departure
  // inventory (each room/seat type's count × its capacity, e.g. 20 doubles
  // sleeping 2 = 40). Lets a new departure inherit capacity from the rooms the
  // operator already set up, while staying editable for an override.
  const { data: resourceTemplateData } = useProductResourceTemplates(productId)
  const suggestedPax = useMemo(
    () =>
      (resourceTemplateData?.data ?? []).reduce(
        (optionTotal, option) =>
          optionTotal +
          option.templates.reduce(
            (sum, template) => sum + (template.defaultCount ?? 0) * template.capacity,
            0,
          ),
        0,
      ),
    [resourceTemplateData?.data],
  )

  // Pre-fill capacity once for a brand-new departure, only while the field is
  // still untouched — never clobber an edit or an existing slot's value.
  const prefilledPaxRef = useRef(false)
  useEffect(() => {
    if (isEditing || prefilledPaxRef.current || suggestedPax <= 0) return
    const current = form.getValues("initialPax")
    if (current === "" || current == null) {
      form.setValue("initialPax", suggestedPax)
      prefilledPaxRef.current = true
    }
  }, [isEditing, suggestedPax, form])

  // ───────────────────────────────────────────────────────────────────────────
  // Derived departure length
  //
  // A tour's length is fixed by its itinerary, so the operator should only pick
  // the START date. `GET /v1/admin/products/{id}/days` returns the day rows of
  // the product's default itinerary (dayNumber 1..N), so N days ⇒ N-1 nights ⇒
  // the departure ends N-1 days after it starts. `undefined` data means the
  // query has not resolved yet: never stamp a value we would have to correct.
  // ───────────────────────────────────────────────────────────────────────────
  const { data: dayData } = useQuery(getProductDetailDaysQueryOptions(api, productId))
  const itineraryDays = dayData ? itineraryDayCount(dayData.data) : null
  const itineraryNights = itineraryDays == null ? null : itineraryNightCount(itineraryDays)
  /** `true` once we know the itinerary spans at least one overnight. */
  const hasDerivedLength = itineraryDays != null && itineraryNights != null && itineraryNights > 0

  const nights = (() => {
    if (!startDate || !endDate || typeof endDate !== "string" || endDate.length === 0) return 0
    const start = new Date(`${startDate}T00:00:00Z`).getTime()
    const end = new Date(`${endDate}T00:00:00Z`).getTime()
    const diffDays = Math.round((end - start) / 86_400_000)
    return diffDays > 0 ? diffDays : 0
  })()

  // Keep the freshest default out of the reset effect's dependency list: the
  // product query resolves *after* first render, and re-running `form.reset`
  // then would wipe whatever the operator has already typed.
  const defaultTzRef = useRef(defaultTz)
  defaultTzRef.current = defaultTz

  // Same dirty-guard discipline as the timezone default: anything the operator
  // typed by hand is never recomputed underneath them. `endDateEditedRef` stays
  // `false` when editing an existing slot so that moving the start date still
  // drags the itinerary-derived end along; the stored end *time* is treated as
  // operator-authored, because there is no other place it could have come from.
  const endDateEditedRef = useRef(false)
  const endTimeEditedRef = useRef(Boolean(slot?.endsAt))
  const durationEditedRef = useRef(false)
  const prefilledDurationRef = useRef(false)
  /** Last start date the end date was derived from — `null` means "not yet". */
  const derivedFromStartRef = useRef<string | null>(slot ? slot.dateLocal : null)

  useEffect(() => {
    form.reset(initialValues(slot, defaultTzRef.current))
    endDateEditedRef.current = false
    endTimeEditedRef.current = Boolean(slot?.endsAt)
    durationEditedRef.current = false
    prefilledDurationRef.current = false
    derivedFromStartRef.current = slot ? slot.dateLocal : null
  }, [slot, form])

  // Auto-fill the end date (and a sensible end time) whenever the operator
  // picks or changes the start date. Deliberately ordered so that a start date
  // chosen *before* the itinerary loads is still filled in once it arrives.
  useEffect(() => {
    if (!startDate) {
      // Nothing to derive from — and re-picking the same date later should
      // still fill the end date in, so forget what we last derived from.
      derivedFromStartRef.current = null
      return
    }
    if (derivedFromStartRef.current === startDate) return
    if (itineraryNights == null) return
    derivedFromStartRef.current = startDate
    if (itineraryNights <= 0) return

    if (!endDateEditedRef.current) {
      const derivedEndDate = addCalendarDays(startDate, itineraryNights)
      if (derivedEndDate) {
        form.setValue("endDate", derivedEndDate, { shouldDirty: false, shouldValidate: true })
      }
    }
    if (!endTimeEditedRef.current) {
      // Mirror the start time: a 12-day tour that leaves at 09:00 comes back at
      // 09:00 on day 12 unless the operator says otherwise.
      const startTime = form.getValues("startTime")
      if (startTime) {
        form.setValue("endTime", startTime, { shouldDirty: false, shouldValidate: true })
      }
    }
  }, [startDate, itineraryNights, form])

  // Nights / days follow only the itinerary, so they are stamped once, and only
  // while both fields are still empty (a stored override survives an edit).
  useEffect(() => {
    if (prefilledDurationRef.current || durationEditedRef.current) return
    if (itineraryDays == null || itineraryNights == null || itineraryNights <= 0) return
    const currentNights = form.getValues("nights")
    const currentDays = form.getValues("days")
    const isBlank = (value: unknown) => value === "" || value == null
    if (!isBlank(currentNights) || !isBlank(currentDays)) {
      prefilledDurationRef.current = true
      return
    }
    prefilledDurationRef.current = true
    form.setValue("nights", itineraryNights, { shouldDirty: false })
    form.setValue("days", itineraryDays, { shouldDirty: false })
  }, [itineraryDays, itineraryNights, form])

  // Adopt the product's timezone once it loads, but only for a new departure
  // whose timezone field the operator has not touched yet.
  const adoptedProductTzRef = useRef(false)
  useEffect(() => {
    if (isEditing || adoptedProductTzRef.current || !productTimezone) return
    if (form.getFieldState("timezone").isDirty) return
    adoptedProductTzRef.current = true
    if (form.getValues("timezone") === productTimezone) return
    form.setValue("timezone", productTimezone, {
      shouldDirty: false,
      shouldValidate: true,
    })
  }, [isEditing, productTimezone, form])

  useEffect(() => {
    if (!defaultOption) return
    const current = form.getValues("optionId")
    if (current) return

    form.setValue("optionId", defaultOption.id, {
      shouldDirty: false,
      shouldValidate: true,
    })
  }, [defaultOption, form])

  const onSubmit = async (values: DepartureFormOutput) => {
    const startsAt = combineLocalToIso(values.startDate, values.startTime, values.timezone)

    const effectiveEndDate =
      values.endDate && typeof values.endDate === "string" && values.endDate.length > 0
        ? values.endDate
        : values.startDate
    const hasEndTime =
      values.endTime && typeof values.endTime === "string" && values.endTime.length > 0
    const hasExplicitEndDate =
      values.endDate && typeof values.endDate === "string" && values.endDate.length > 0

    const endsAt =
      hasEndTime || hasExplicitEndDate
        ? combineLocalToIso(
            effectiveEndDate,
            hasEndTime ? (values.endTime as string) : "18:00",
            values.timezone,
          )
        : null

    const initialPax =
      !values.unlimited && typeof values.initialPax === "number" ? values.initialPax : null

    // Treat blank / zero overrides as `null` so the slot card doesn't show
    // "0 nights / 0 days" after the operator clears the override (#1087 side
    // bug). The schema accepts `null` for both; sending `0` was the bug.
    const nightsOverride =
      typeof values.nights === "number" && values.nights > 0 ? values.nights : null
    const daysOverride = typeof values.days === "number" && values.days > 0 ? values.days : null
    const optionId = values.optionId || defaultOption?.id || null

    // `remainingPax` is intentionally omitted on edit — the slot service is
    // the source of truth for that field. Concurrent flows (holds, bookings,
    // refunds) mutate it atomically while a form is open, so any snapshot
    // we computed in JS would be stale by save time (#1087, Codex review on
    // #1088). The backend's `updateSlot` recomputes remaining_pax in the
    // same UPDATE statement when initialPax / unlimited change.
    const baseFields = {
      productId,
      itineraryId: values.itineraryId ? values.itineraryId : null,
      optionId,
      dateLocal: values.startDate,
      startsAt,
      endsAt,
      timezone: values.timezone,
      status: values.status,
      unlimited: values.unlimited,
      initialPax,
      nights: nightsOverride,
      days: daysOverride,
      notes: values.notes || null,
    }

    if (isEditing) {
      await api.patch(`/v1/admin/operations/availability/slots/${slot.id}`, baseFields)
    } else {
      // New slots haven't been booked against yet, so seeding remainingPax
      // from initialPax is correct on create.
      await api.post("/v1/admin/operations/availability/slots", {
        ...baseFields,
        remainingPax: initialPax,
      })
    }
    onSuccess()
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-1 flex-col gap-6 overflow-hidden"
    >
      <fieldset className="grid gap-3">
        <legend className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {departureMessages.scheduleLegend}
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>{departureMessages.startDateLabel}</Label>
            <DatePicker
              value={startDate || null}
              onChange={(v) =>
                form.setValue("startDate", v ?? "", {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
              placeholder={departureMessages.datePlaceholder}
            />
            {form.formState.errors.startDate && (
              <p className="text-xs text-destructive">{form.formState.errors.startDate.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{departureMessages.startTimeLabel}</Label>
            <Input {...form.register("startTime")} type="time" />
            {form.formState.errors.startTime && (
              <p className="text-xs text-destructive">{form.formState.errors.startTime.message}</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>
              {departureMessages.endDateLabel}{" "}
              <span className="text-muted-foreground font-normal">
                {hasDerivedLength
                  ? departureMessages.endDateAuto
                  : departureMessages.endDateOptional}
              </span>
            </Label>
            <DatePicker
              value={typeof endDate === "string" && endDate.length > 0 ? endDate : null}
              onChange={(v) => {
                endDateEditedRef.current = true
                form.setValue("endDate", v ?? "", {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }}
              placeholder={departureMessages.datePlaceholder}
              clearable
              dateDisabled={startDate ? { before: new Date(`${startDate}T00:00:00`) } : undefined}
            />
            {form.formState.errors.endDate && (
              <p className="text-xs text-destructive">{form.formState.errors.endDate.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>
              {departureMessages.endTimeLabel}{" "}
              <span className="text-muted-foreground font-normal">
                {hasDerivedLength
                  ? departureMessages.endTimeAuto
                  : departureMessages.endTimeOptional}
              </span>
            </Label>
            <Input
              {...form.register("endTime", {
                onChange: () => {
                  endTimeEditedRef.current = true
                },
              })}
              type="time"
            />
            {form.formState.errors.endTime && (
              <p className="text-xs text-destructive">{form.formState.errors.endTime.message}</p>
            )}
          </div>
        </div>
        {hasDerivedLength ? (
          <p className="text-xs text-muted-foreground" data-testid="itinerary-length-hint">
            {formatMessage(departureMessages.itineraryLengthHint, {
              days: itineraryDays,
              nights: itineraryNights,
            })}
          </p>
        ) : null}
        {nights > 0 && (
          <>
            {hasDerivedLength ? null : (
              <p className="text-xs text-muted-foreground">
                {formatMessage(departureMessages.multiDayHint, {
                  nights,
                  nightSuffix: nights === 1 ? "" : "s",
                  days: nights + 1,
                })}
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>{departureMessages.nightsOverrideLabel}</Label>
                <Input
                  {...form.register("nights", {
                    onChange: () => {
                      durationEditedRef.current = true
                    },
                  })}
                  type="number"
                  min="0"
                  step="1"
                  placeholder={String(nights)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{departureMessages.daysOverrideLabel}</Label>
                <Input
                  {...form.register("days", {
                    onChange: () => {
                      durationEditedRef.current = true
                    },
                  })}
                  type="number"
                  min="0"
                  step="1"
                  placeholder={String(nights + 1)}
                />
              </div>
            </div>
          </>
        )}
        {itineraries.length > 1 ? (
          <div className="flex flex-col gap-1.5">
            <Label>{itineraryMessages.formLabel}</Label>
            <Select
              items={[
                {
                  label: defaultItinerary
                    ? formatMessage(itineraryMessages.defaultWithName, {
                        name: defaultItinerary.name,
                      })
                    : itineraryMessages.defaultBadge,
                  value: "",
                },
                ...itineraries.map((itinerary) => ({
                  label: itinerary.name,
                  value: itinerary.id,
                })),
              ]}
              value={form.watch("itineraryId") ?? ""}
              onValueChange={(value) => form.setValue("itineraryId", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">
                  {defaultItinerary
                    ? formatMessage(itineraryMessages.defaultWithName, {
                        name: defaultItinerary.name,
                      })
                    : itineraryMessages.defaultBadge}
                </SelectItem>
                {itineraries.map((itinerary) => (
                  <SelectItem key={itinerary.id} value={itinerary.id}>
                    {itinerary.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{itineraryMessages.overrideHint}</p>
          </div>
        ) : null}
        {shouldShowOptionSelect ? (
          <div className="flex flex-col gap-1.5">
            <Label>{departureMessages.optionLabel}</Label>
            <Select
              value={selectedOptionId || defaultOption?.id || ""}
              onValueChange={(value) =>
                form.setValue("optionId", value, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              items={productOptions.map((option) => ({
                label: option.isDefault
                  ? formatMessage(departureMessages.defaultOptionLabel, { name: option.name })
                  : option.name,
                value: option.id,
              }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {productOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.isDefault
                      ? formatMessage(departureMessages.defaultOptionLabel, { name: option.name })
                      : option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{departureMessages.optionRepairHint}</p>
          </div>
        ) : null}
        <div className="flex flex-col gap-1.5">
          <Label>{departureMessages.timezoneLabel}</Label>
          <Combobox
            items={TIMEZONE_IDS}
            value={timezone || null}
            autoHighlight
            itemToStringValue={(id) => getTimezoneLabel(id as string)}
            onValueChange={(next) => {
              if (typeof next === "string") {
                form.setValue("timezone", next, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
            }}
          >
            <ComboboxInput
              placeholder={departureMessages.timezoneSearchPlaceholder}
              className="w-full"
            />
            <ComboboxContent>
              <ComboboxEmpty>{departureMessages.timezoneEmpty}</ComboboxEmpty>
              <ComboboxList>
                <ComboboxCollection>
                  {(id) => {
                    const tz = TIMEZONE_OPTIONS.find((t) => t.id === (id as string))
                    return (
                      <ComboboxItem key={id as string} value={id as string}>
                        <span className="font-mono text-xs">{id as string}</span>
                        {tz ? (
                          <span className="ml-2 text-xs text-muted-foreground">{tz.label}</span>
                        ) : null}
                      </ComboboxItem>
                    )
                  }}
                </ComboboxCollection>
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
          {form.formState.errors.timezone && (
            <p className="text-xs text-destructive">{form.formState.errors.timezone.message}</p>
          )}
        </div>
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {departureMessages.availabilityLegend}
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>{departureMessages.statusLabel}</Label>
            <Select
              value={form.watch("status")}
              onValueChange={(v) => form.setValue("status", v as DepartureFormValues["status"])}
              items={slotStatuses}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {slotStatuses.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{departureMessages.capacityLabel}</Label>
            <Input
              {...form.register("initialPax")}
              type="number"
              min="0"
              step="1"
              placeholder="0"
              disabled={unlimited}
            />
            {!unlimited && suggestedPax > 0 ? (
              <button
                type="button"
                onClick={() => form.setValue("initialPax", suggestedPax)}
                className="text-left text-xs text-muted-foreground hover:text-foreground"
              >
                {formatMessage(departureMessages.capacityAutoHint, { count: suggestedPax })}
              </button>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="unlimited"
            checked={unlimited}
            onCheckedChange={(c) => form.setValue("unlimited", c)}
          />
          <Label htmlFor="unlimited" className="font-normal cursor-pointer">
            {departureMessages.unlimitedLabel}
          </Label>
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <Label>{departureMessages.notesLabel}</Label>
        <Textarea {...form.register("notes")} placeholder={departureMessages.notesPlaceholder} />
      </div>

      <div className="flex items-center justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            {productMessages.cancel}
          </Button>
        ) : null}
        <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? productMessages.saveChanges : departureMessages.create}
        </Button>
      </div>
    </form>
  )
}
