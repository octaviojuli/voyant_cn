"use client"

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
import { useEffect, useMemo } from "react"
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
  instantToSlotLocal,
  localToInstant,
  NONE_VALUE,
  nullableNumber,
  nullableString,
  slotStatusOptions,
} from "../../index.js"
import {
  type AvailabilityDialogMessages,
  type AvailabilitySlotSubmitPayload,
  DialogActions,
  ProductSelect,
  type SubmitContext,
  SwitchField,
} from "./shared.js"

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

function getDefaultTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" // i18n-literal-ok IANA timezone fallback
  } catch {
    return "UTC" // i18n-literal-ok IANA timezone fallback
  }
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
  const slotMessages = props.messages.dialogs.slot
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
      timezone: getDefaultTimezone(),
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

  useEffect(() => {
    if (props.open && props.slot) {
      form.reset({
        productId: props.slot.productId,
        optionId: props.slot.optionId ?? NONE_VALUE,
        availabilityRuleId: props.slot.availabilityRuleId ?? NONE_VALUE,
        startTimeId: props.slot.startTimeId ?? NONE_VALUE,
        dateLocal: props.slot.dateLocal,
        startsAt: toLocalDateTimeInput(props.slot.startsAt, props.slot.timezone),
        endsAt: props.slot.endsAt
          ? toLocalDateTimeInput(props.slot.endsAt, props.slot.timezone)
          : "",
        timezone: props.slot.timezone,
        status: props.slot.status,
        unlimited: props.slot.unlimited,
        initialPax: props.slot.initialPax?.toString() ?? "",
        remainingPax: props.slot.remainingPax?.toString() ?? "",
        initialPickups: "",
        remainingPickups: "",
        remainingResources: "",
        pastCutoff: false,
        tooEarly: false,
        notes: props.slot.notes ?? "",
      })
    } else if (props.open) {
      form.reset()
    }
  }, [form, props.open, props.slot])

  const selectedProductId = form.watch("productId")
  const filteredRules = props.rules.filter((rule) => rule.productId === selectedProductId)
  const filteredStartTimes = props.startTimes.filter(
    (startTime) => startTime.productId === selectedProductId,
  )
  const isEditing = Boolean(props.slot)

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
                form.setValue("productId", value ?? "")
                // The previously selected option belongs to the old product.
                form.setValue("optionId", NONE_VALUE)
                form.clearErrors("optionId")
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
                />
              </div>
              <div className="grid gap-2">
                <Label>{slotMessages.timezoneLabel}</Label>
                <Input
                  {...form.register("timezone")}
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
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{slotMessages.statusLabel}</Label>
                <Select
                  items={slotStatusOptions}
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
                  items={booleanOptions}
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
            disabled={Boolean(selectedProductId) && optionsQuery.isLoading}
            onCancel={() => props.onOpenChange(false)}
          />
        </form>
      </DialogContent>
    </Dialog>
  )
}
