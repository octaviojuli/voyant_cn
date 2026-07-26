"use client"

import {
  type BookingGuaranteeRecord,
  useBookingGuaranteeMutation,
} from "@voyant-travel/finance-react"
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
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
import { CurrencyCombobox } from "@voyant-travel/ui/components/currency-combobox"
import { CurrencyInput } from "@voyant-travel/ui/components/currency-input"
import { DateTimePicker } from "@voyant-travel/ui/components/date-time-picker"
import { zodResolver } from "@voyant-travel/ui/lib/zod-resolver"
import { Loader2 } from "lucide-react"
import { useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod/v4"
import { useBookingsUiMessagesOrDefault } from "../i18n/provider.js"

const guaranteeTypes = [
  "deposit",
  "credit_card",
  "preauth",
  "card_on_file",
  "bank_transfer",
  "voucher",
  "agency_letter",
  "other",
] as const

const guaranteeStatuses = [
  "pending",
  "active",
  "released",
  "failed",
  "cancelled",
  "expired",
] as const
const DEFAULT_CURRENCY = "EUR" // i18n-literal-ok ISO default currency

function createGuaranteeFormSchema() {
  return z.object({
    guaranteeType: z.enum(guaranteeTypes),
    status: z.enum(guaranteeStatuses).default("pending"),
    currency: z.string().min(3).max(3).optional().nullable(),
    amountCents: z.coerce.number().int().min(0).optional().nullable(),
    provider: z.string().optional().nullable(),
    referenceNumber: z.string().optional().nullable(),
    expiresAt: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  })
}

type GuaranteeFormValues = z.input<ReturnType<typeof createGuaranteeFormSchema>>
type GuaranteeFormOutput = z.output<ReturnType<typeof createGuaranteeFormSchema>>

export interface BookingGuaranteeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookingId: string
  guarantee?: BookingGuaranteeRecord
  onSuccess?: () => void
}

export function BookingGuaranteeDialog({
  open,
  onOpenChange,
  bookingId,
  guarantee,
  onSuccess,
}: BookingGuaranteeDialogProps) {
  const isEditing = Boolean(guarantee)
  const { create, update } = useBookingGuaranteeMutation(bookingId)
  const messages = useBookingsUiMessagesOrDefault()
  const guaranteeFormSchema = createGuaranteeFormSchema()
  const typeItems = useMemo(
    () =>
      guaranteeTypes.map((t) => ({
        value: t,
        label: messages.bookingGuaranteeDialog.guaranteeTypeLabels[t],
      })),
    [messages.bookingGuaranteeDialog.guaranteeTypeLabels],
  )
  const statusItems = useMemo(
    () =>
      guaranteeStatuses.map((s) => ({
        value: s,
        label: messages.bookingGuaranteeDialog.guaranteeStatusLabels[s],
      })),
    [messages.bookingGuaranteeDialog.guaranteeStatusLabels],
  )

  const form = useForm<GuaranteeFormValues, unknown, GuaranteeFormOutput>({
    resolver: zodResolver(guaranteeFormSchema),
    defaultValues: {
      guaranteeType: "deposit",
      status: "pending",
      currency: DEFAULT_CURRENCY,
      amountCents: null,
      provider: "",
      referenceNumber: "",
      expiresAt: "",
      notes: "",
    },
  })

  useEffect(() => {
    if (open && guarantee) {
      form.reset({
        guaranteeType: guarantee.guaranteeType,
        status: guarantee.status,
        currency: guarantee.currency,
        amountCents: guarantee.amountCents,
        provider: guarantee.provider ?? "",
        referenceNumber: guarantee.referenceNumber ?? "",
        expiresAt: guarantee.expiresAt ? guarantee.expiresAt.slice(0, 16) : "",
        notes: guarantee.notes ?? "",
      })
    } else if (open) {
      form.reset()
    }
  }, [form, open, guarantee])

  const onSubmit = async (values: GuaranteeFormOutput) => {
    const payload = {
      guaranteeType: values.guaranteeType,
      status: values.status,
      currency: values.currency || null,
      amountCents: values.amountCents ?? null,
      provider: values.provider || null,
      referenceNumber: values.referenceNumber || null,
      expiresAt: values.expiresAt || null,
      notes: values.notes || null,
    }

    if (isEditing) {
      await update.mutateAsync({ id: guarantee!.id, input: payload })
    } else {
      await create.mutateAsync(payload)
    }

    onOpenChange(false)
    onSuccess?.()
  }

  const isSubmitting = create.isPending || update.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? messages.bookingGuaranteeDialog.titles.edit
              : messages.bookingGuaranteeDialog.titles.create}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <DialogBody className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>{messages.bookingGuaranteeDialog.fields.type}</Label>
                <Select
                  items={typeItems}
                  value={form.watch("guaranteeType")}
                  onValueChange={(v) =>
                    form.setValue(
                      "guaranteeType",
                      (v ?? "deposit") as (typeof guaranteeTypes)[number],
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {guaranteeTypes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {messages.bookingGuaranteeDialog.guaranteeTypeLabels[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>{messages.bookingGuaranteeDialog.fields.status}</Label>
                <Select
                  items={statusItems}
                  value={form.watch("status")}
                  onValueChange={(v) =>
                    form.setValue("status", (v ?? "pending") as (typeof guaranteeStatuses)[number])
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {guaranteeStatuses.map((s) => (
                      <SelectItem key={s} value={s}>
                        {messages.bookingGuaranteeDialog.guaranteeStatusLabels[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>{messages.bookingGuaranteeDialog.fields.currency}</Label>
                <CurrencyCombobox
                  value={form.watch("currency") || null}
                  onChange={(next) =>
                    form.setValue("currency", next ?? DEFAULT_CURRENCY, {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>{messages.bookingGuaranteeDialog.fields.amountCents}</Label>
                <CurrencyInput
                  value={form.watch("amountCents") as number | null}
                  onChange={(next) =>
                    form.setValue("amountCents", next, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                  currency={form.watch("currency")}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>{messages.bookingGuaranteeDialog.fields.provider}</Label>
                <Input
                  {...form.register("provider")}
                  placeholder={messages.bookingGuaranteeDialog.placeholders.provider}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>{messages.bookingGuaranteeDialog.fields.referenceNumber}</Label>
                <Input
                  {...form.register("referenceNumber")}
                  placeholder={messages.bookingGuaranteeDialog.placeholders.referenceNumber}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>{messages.bookingGuaranteeDialog.fields.expiresAt}</Label>
              <DateTimePicker
                displayFormat={messages.common.datePickerFormats.longWithTime}
                value={form.watch("expiresAt") || null}
                onChange={(next) =>
                  form.setValue("expiresAt", next ?? "", {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                placeholder={messages.bookingGuaranteeDialog.placeholders.expiresAt}
                className="w-full"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>{messages.bookingGuaranteeDialog.fields.notes}</Label>
              <Textarea
                {...form.register("notes")}
                placeholder={messages.bookingGuaranteeDialog.placeholders.notes}
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              {messages.common.cancel}
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing
                ? messages.common.saveChanges
                : messages.bookingGuaranteeDialog.actions.addGuarantee}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
