"use client"

import { useQuery } from "@tanstack/react-query"
import { useProductOptions } from "@voyant-travel/inventory-react"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@voyant-travel/ui/components"
import { DatePicker } from "@voyant-travel/ui/components/date-picker"
import { DateTimePicker } from "@voyant-travel/ui/components/date-time-picker"
import { useEffect, useMemo, useRef } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod/v4"
import { zodResolver } from "../../form-resolver.js"
import type {
  AvailabilityRuleRow,
  AvailabilitySlotRow,
  AvailabilityStartTimeRow,
  ProductOption,
} from "../../index.js"
import {
  booleanOptions,
  getSlotQueryOptions,
  instantToSlotLocal,
  localToInstant,
  NONE_VALUE,
  nullableNumber,
  nullableString,
  slotStatusOptions,
  useVoyantAvailabilityContext,
} from "../../index.js"
import {
  type AvailabilityDialogMessages,
  type AvailabilitySlotSubmitPayload,
  DialogActions,
  ProductSelect,
  type SubmitContext,
  SwitchField,
} from "./shared.js"

/**
 * Placeholder copy for the date / date-time pickers. The message bundles ship
 * these under `dialogs.slot`, but the shared `AvailabilityDialogMessages`
 * contract predates them, so they are read as optional and fall back to the
 * field label — never to the pickers' built-in English defaults
 * ("Pick a date" / "Pick date & time").
 */
type SlotPickerPlaceholders = {
  datePlaceholder?: string
  dateTimePlaceholder?: string
}

function getSlotFormSchema(messages: AvailabilityDialogMessages) {
  return z.object({
    productId: z.string().min(1, messages.dialogs.slot.validationProductRequired),
    optionId: z.string().optional(),
    availabilityRuleId: z.string().optional(),
    startTimeId: z.string().optional(),
    dateLocal: z.string().min(1, messages.dialogs.slot.validationDateRequired),
    startsAt: z.string().min(1, messages.dialogs.slot.validationStartsAtRequired),
    endsAt: z.string().optional(),
    timezone: z.string().min(1, messages.dialogs.slot.validationTimezoneRequired),
    status: z.enum(["open", "closed", "sold_out", "cancelled"]),
    unlimited: z.boolean(),
    initialPax: z.string().optional(),
    remainingPax: z.string().optional(),
    initialPickups: z.string().optional(),
    remainingPickups: z.string().optional(),
    remainingResources: z.string().optional(),
    pastCutoff: z.boolean(),
    tooEarly: z.boolean(),
    notes: z.string().optional(),
  })
}

type SlotFormSchema = ReturnType<typeof getSlotFormSchema>
type SlotFormValues = z.input<SlotFormSchema>
type SlotFormOutput = z.output<SlotFormSchema>

function toLocalDateTimeInput(instant: string, timezone: string) {
  const local = instantToSlotLocal(instant, timezone)
  return `${local.date}T${local.time}`
}

function getBrowserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" // i18n-literal-ok IANA timezone fallback
  } catch {
    return "UTC" // i18n-literal-ok IANA timezone fallback
  }
}

/**
 * A departure belongs to the product's calendar, not to the operator's laptop.
 * The server validates that `dateLocal` equals `startsAt` rendered in this
 * timezone, so defaulting to the browser (e.g. an America/Los_Angeles desk
 * scheduling an Asia/Shanghai departure) silently moves the departure to the
 * wrong day. Resolution order: the product's own timezone, then the browser's,
 * then UTC.
 */
export function resolveSlotTimezone(product?: Pick<ProductOption, "timezone"> | null) {
  return product?.timezone || getBrowserTimezone()
}

function localDateTimeInputToInstant(value: string, timezone: string) {
  const [date, time] = value.split("T")
  if (!date || !time) {
    throw new RangeError("Local date-time input must use YYYY-MM-DDTHH:mm")
  }
  return localToInstant({ date, time, timezone })
}

export function AvailabilitySlotDialog(props: {
  messages: AvailabilityDialogMessages
  open: boolean
  onOpenChange: (open: boolean) => void
  slot?: AvailabilitySlotRow
  products: ProductOption[]
  rules: AvailabilityRuleRow[]
  startTimes: AvailabilityStartTimeRow[]
  onSubmit: (payload: AvailabilitySlotSubmitPayload, context: SubmitContext) => Promise<void> // i18n-literal-ok type annotation
  onSuccess: () => void
}) {
  const slotMessages: AvailabilityDialogMessages["dialogs"]["slot"] & SlotPickerPlaceholders =
    props.messages.dialogs.slot
  const datePlaceholder = slotMessages.datePlaceholder ?? slotMessages.dateLabel
  const startsAtPlaceholder = slotMessages.dateTimePlaceholder ?? slotMessages.startsAtLabel
  const endsAtPlaceholder = slotMessages.dateTimePlaceholder ?? slotMessages.endsAtLabel
  const slotFormSchema = getSlotFormSchema(props.messages)
  const form = useForm<SlotFormValues, unknown, SlotFormOutput>({
    resolver: zodResolver(slotFormSchema),
    defaultValues: {
      productId: "",
      optionId: NONE_VALUE,
      availabilityRuleId: NONE_VALUE,
      startTimeId: NONE_VALUE,
      dateLocal: "",
      startsAt: "",
      endsAt: "",
      timezone: getBrowserTimezone(),
      status: "open",
      unlimited: false,
      initialPax: "",
      remainingPax: "",
      initialPickups: "",
      remainingPickups: "",
      remainingResources: "",
      pastCutoff: false,
      tooEarly: false,
      notes: "",
    },
  })

  const isEditing = Boolean(props.slot)
  const slotId = props.slot?.id
  const availabilityClient = useVoyantAvailabilityContext()

  // `AvailabilitySlotRow` (the list projection) omits initialPickups,
  // remainingPickups, remainingResources, pastCutoff and tooEarly — they live
  // only on the slot *detail*. Editing from a list row used to seed those five
  // fields with ""/false and PATCH them back as null/false, destroying stored
  // values the operator never saw. Load the detail and seed from it instead.
  const slotDetailQuery = useQuery({
    ...getSlotQueryOptions(availabilityClient, slotId),
    enabled: props.open && Boolean(slotId),
  })
  const slotDetail = slotDetailQuery.data?.data
  const slotDetailLoaded = Boolean(slotDetail) && slotDetail?.id === slotId

  // Re-arm on every fresh open, and whenever the dialog is retargeted at a
  // different slot: the timezone field starts out untouched again.
  const timezoneEditedRef = useRef(false)
  const openKey = props.open ? `open:${slotId ?? ""}` : null
  useEffect(() => {
    if (openKey) {
      timezoneEditedRef.current = false
    }
  }, [openKey])

  useEffect(() => {
    if (!props.open) return
    if (!props.slot) {
      form.reset()
      return
    }
    // Seed from the row straight away so the dialog is never blank, then re-seed
    // once the detail lands. `keepDirtyValues` protects anything the operator
    // typed in the meantime.
    const source = slotDetail ?? props.slot
    form.reset(
      {
        productId: source.productId,
        optionId: source.optionId ?? NONE_VALUE,
        availabilityRuleId: source.availabilityRuleId ?? NONE_VALUE,
        startTimeId: source.startTimeId ?? NONE_VALUE,
        dateLocal: source.dateLocal,
        startsAt: toLocalDateTimeInput(source.startsAt, source.timezone),
        endsAt: source.endsAt ? toLocalDateTimeInput(source.endsAt, source.timezone) : "",
        timezone: source.timezone,
        status: source.status,
        unlimited: source.unlimited,
        initialPax: source.initialPax?.toString() ?? "",
        remainingPax: source.remainingPax?.toString() ?? "",
        initialPickups: slotDetail?.initialPickups?.toString() ?? "",
        remainingPickups: slotDetail?.remainingPickups?.toString() ?? "",
        remainingResources: slotDetail?.remainingResources?.toString() ?? "",
        pastCutoff: slotDetail?.pastCutoff ?? false,
        tooEarly: slotDetail?.tooEarly ?? false,
        notes: source.notes ?? "",
      },
      { keepDirtyValues: true },
    )
  }, [form, props.open, props.slot, slotDetail])

  const timezoneField = form.register("timezone")
  const selectedProductId = form.watch("productId")
  const filteredRules = props.rules.filter((rule) => rule.productId === selectedProductId)
  const filteredStartTimes = props.startTimes.filter(
    (startTime) => startTime.productId === selectedProductId,
  )

  // A departure's price is derived from its option's rate plans, so the slot
  // needs to point at one of the product's options. Load the selected product's
  // active options so the operator can pick (and repair) the linkage (#2059).
  const optionsQuery = useProductOptions({
    productId: selectedProductId || undefined,
    status: "active",
    limit: 100,
    enabled: Boolean(selectedProductId),
  })
  const productOptions = useMemo(() => {
    const rows = optionsQuery.data?.data ?? []
    return [...rows].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
  }, [optionsQuery.data])
  const productHasOptions = productOptions.length > 0

  // Options are only *known* once the query for the selected product succeeds.
  // Until then `productOptions` is empty for an unrelated reason (loading/error),
  // so we must not treat the product as option-less.
  const optionsResolved = !selectedProductId || optionsQuery.isSuccess

  const onSubmit = async (values: SlotFormOutput) => {
    // Never PATCH an edit from a form that was only seeded with the list row:
    // the detail-only fields would go out as null/false. The save button is
    // already disabled in this state; this is the belt to that pair of braces.
    if (isEditing && !slotDetailLoaded) return
    const resolvedOptionId = values.optionId === NONE_VALUE ? null : (values.optionId ?? null)
    // Guard against an unpriceable slot. When no explicit option is chosen we
    // must be sure the product genuinely has none — block while the options
    // query is still loading/errored so the race can't slip a null option past
    // the required-option check (#2059).
    if (!resolvedOptionId) {
      if (!optionsResolved) {
        form.setError("optionId", {
          type: "manual",
          message: slotMessages.validationOptionsUnavailable,
        })
        return
      }
      if (productHasOptions) {
        form.setError("optionId", {
          type: "manual",
          message: slotMessages.validationOptionRequired,
        })
        return
      }
    }
    await props.onSubmit(
      {
        productId: values.productId,
        optionId: resolvedOptionId,
        availabilityRuleId:
          values.availabilityRuleId === NONE_VALUE ? null : (values.availabilityRuleId ?? null),
        startTimeId: values.startTimeId === NONE_VALUE ? null : (values.startTimeId ?? null),
        dateLocal: values.dateLocal,
        startsAt: localDateTimeInputToInstant(values.startsAt, values.timezone),
        endsAt: values.endsAt ? localDateTimeInputToInstant(values.endsAt, values.timezone) : null,
        timezone: values.timezone,
        status: values.status,
        unlimited: values.unlimited,
        initialPax: nullableNumber(values.initialPax),
        remainingPax: nullableNumber(values.remainingPax),
        initialPickups: nullableNumber(values.initialPickups),
        remainingPickups: nullableNumber(values.remainingPickups),
        remainingResources: nullableNumber(values.remainingResources),
        pastCutoff: values.pastCutoff,
        tooEarly: values.tooEarly,
        notes: nullableString(values.notes),
      },
      { isEditing, id: props.slot?.id },
    )
    props.onSuccess()
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? slotMessages.editTitle : slotMessages.newTitle}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <DialogBody className="grid gap-4">
            <ProductSelect
              label={slotMessages.productLabel}
              placeholder={slotMessages.selectProductPlaceholder}
              products={props.products}
              value={form.watch("productId")}
              onValueChange={(value) => {
                const nextProductId = value ?? ""
                form.setValue("productId", nextProductId)
                // The previously selected option belongs to the old product.
                form.setValue("optionId", NONE_VALUE)
                form.clearErrors("optionId")
                // The departure follows the new product's calendar — unless the
                // operator already typed a timezone by hand.
                if (!timezoneEditedRef.current) {
                  const nextProduct = props.products.find((product) => product.id === nextProductId)
                  form.setValue("timezone", resolveSlotTimezone(nextProduct))
                }
              }}
            />

            <div className="grid gap-2">
              <Label>{slotMessages.optionLabel}</Label>
              <Select
                value={form.watch("optionId") ?? NONE_VALUE}
                onValueChange={(value) => {
                  form.setValue("optionId", value ?? NONE_VALUE)
                  form.clearErrors("optionId")
                }}
              >
                <SelectTrigger className="w-full" disabled={!selectedProductId}>
                  <SelectValue placeholder={slotMessages.selectOptionPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>{slotMessages.noOption}</SelectItem>
                  {productOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.isDefault
                        ? `${option.name} (${slotMessages.defaultOptionSuffix})`
                        : option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.optionId ? (
                <p className="text-destructive text-sm">{form.formState.errors.optionId.message}</p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{slotMessages.ruleLabel}</Label>
                <Select
                  value={form.watch("availabilityRuleId") ?? NONE_VALUE}
                  onValueChange={(value) =>
                    form.setValue("availabilityRuleId", value ?? NONE_VALUE)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={slotMessages.optionalRulePlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>{slotMessages.noRule}</SelectItem>
                    {filteredRules.map((rule) => (
                      <SelectItem key={rule.id} value={rule.id}>
                        {rule.timezone} · {rule.recurrenceRule}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{slotMessages.startTimeLabel}</Label>
                <Select
                  value={form.watch("startTimeId") ?? NONE_VALUE}
                  onValueChange={(value) => form.setValue("startTimeId", value ?? NONE_VALUE)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={slotMessages.optionalStartTimePlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>{slotMessages.noStartTime}</SelectItem>
                    {filteredStartTimes.map((startTime) => (
                      <SelectItem key={startTime.id} value={startTime.id}>
                        {startTime.label ?? startTime.startTimeLocal}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{slotMessages.dateLabel}</Label>
                <DatePicker
                  value={form.watch("dateLocal") || null}
                  onChange={(nextValue) =>
                    form.setValue("dateLocal", nextValue ?? "", {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                  placeholder={datePlaceholder}
                />
              </div>
              <div className="grid gap-2">
                <Label>{slotMessages.timezoneLabel}</Label>
                <Input
                  {...timezoneField}
                  onChange={(event) => {
                    // Remember the hand-edit so switching product can't stomp it.
                    timezoneEditedRef.current = true
                    return timezoneField.onChange(event)
                  }}
                  placeholder={slotMessages.timezonePlaceholder}
                />
              </div>
              <div className="grid gap-2">
                <Label>{slotMessages.startsAtLabel}</Label>
                <DateTimePicker
                  value={form.watch("startsAt") || null}
                  onChange={(nextValue) =>
                    form.setValue("startsAt", nextValue ?? "", {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                  placeholder={startsAtPlaceholder}
                />
              </div>
              <div className="grid gap-2">
                <Label>{slotMessages.endsAtLabel}</Label>
                <DateTimePicker
                  value={form.watch("endsAt") || null}
                  onChange={(nextValue) =>
                    form.setValue("endsAt", nextValue ?? "", {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                  placeholder={endsAtPlaceholder}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{slotMessages.statusLabel}</Label>
                {/* No `items` prop: the component harvests the localized
                    `SelectItem` children so the collapsed trigger shows the
                    translated status instead of an English fallback. */}
                <Select
                  value={form.watch("status")}
                  onValueChange={(value) =>
                    form.setValue("status", value as SlotFormOutput["status"])
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {slotStatusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {
                          {
                            open: props.messages.statusOpen,
                            closed: props.messages.statusClosed,
                            sold_out: props.messages.statusSoldOut,
                            cancelled: props.messages.statusCancelled,
                          }[option.value]
                        }
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{slotMessages.unlimitedLabel}</Label>
                <Select
                  value={String(form.watch("unlimited"))}
                  onValueChange={(value) => form.setValue("unlimited", value === "true")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {booleanOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.value === "true" ? slotMessages.yes : slotMessages.no}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>{slotMessages.initialPaxLabel}</Label>
                <Input {...form.register("initialPax")} type="number" min={0} />
              </div>
              <div className="grid gap-2">
                <Label>{slotMessages.remainingPaxLabel}</Label>
                <Input {...form.register("remainingPax")} type="number" min={0} />
              </div>
              <div className="grid gap-2">
                <Label>{slotMessages.remainingResourcesLabel}</Label>
                <Input {...form.register("remainingResources")} type="number" min={0} />
              </div>
              <div className="grid gap-2">
                <Label>{slotMessages.initialPickupsLabel}</Label>
                <Input {...form.register("initialPickups")} type="number" min={0} />
              </div>
              <div className="grid gap-2">
                <Label>{slotMessages.remainingPickupsLabel}</Label>
                <Input {...form.register("remainingPickups")} type="number" min={0} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <SwitchField
                title={slotMessages.pastCutoffTitle}
                description={slotMessages.pastCutoffDescription}
                checked={form.watch("pastCutoff")}
                onCheckedChange={(checked) => form.setValue("pastCutoff", checked)}
              />
              <SwitchField
                title={slotMessages.tooEarlyTitle}
                description={slotMessages.tooEarlyDescription}
                checked={form.watch("tooEarly")}
                onCheckedChange={(checked) => form.setValue("tooEarly", checked)}
              />
            </div>

            <div className="grid gap-2">
              <Label>{slotMessages.notesLabel}</Label>
              <Textarea {...form.register("notes")} placeholder={slotMessages.notesPlaceholder} />
            </div>
          </DialogBody>
          <DialogActions
            cancel={slotMessages.cancel}
            save={slotMessages.save}
            create={slotMessages.create}
            isEditing={isEditing}
            isSubmitting={form.formState.isSubmitting}
            disabled={
              (Boolean(selectedProductId) && optionsQuery.isLoading) ||
              // Block save until the detail (and its capacity/gating fields)
              // is in hand, so an edit can never blank what it never loaded.
              (isEditing && !slotDetailLoaded)
            }
            onCancel={() => props.onOpenChange(false)}
          />
        </form>
      </DialogContent>
    </Dialog>
  )
}
