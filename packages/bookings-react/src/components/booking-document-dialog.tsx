"use client"

import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@voyant-travel/ui/components"
import { DatePicker } from "@voyant-travel/ui/components/date-picker"
import { zodResolver } from "@voyant-travel/ui/lib/zod-resolver"
import { Loader2 } from "lucide-react"
import { useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod/v4"
import { useBookingsUiI18nOrDefault } from "../i18n/provider.js"
import { useBookingTravelerDocumentMutation, useTravelers } from "../index.js"
import { personDisplayName } from "../lib/person-name.js"

import { FileDropzone } from "./file-dropzone.js"

const documentTypes = ["visa", "insurance", "health", "passport_copy", "other"] as const

const UNASSIGNED = "__unassigned__"

function createDocumentFormSchema(
  messages: ReturnType<typeof useBookingsUiI18nOrDefault>["messages"],
) {
  return z.object({
    type: z.enum(documentTypes).default("other"),
    fileName: z
      .string()
      .min(1, messages.bookingDocumentDialog.validation.fileNameRequired)
      .max(500),
    fileUrl: z
      .string()
      .min(1, messages.bookingDocumentDialog.validation.fileRequired)
      .url(messages.bookingDocumentDialog.validation.fileUrlInvalid),
    travelerId: z.string().optional().nullable(),
    expiresAt: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  })
}

type DocumentFormValues = z.input<ReturnType<typeof createDocumentFormSchema>>
type DocumentFormOutput = z.output<ReturnType<typeof createDocumentFormSchema>>

export interface BookingDocumentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookingId: string
  onSuccess?: () => void
}

export function BookingDocumentDialog({
  open,
  onOpenChange,
  bookingId,
  onSuccess,
}: BookingDocumentDialogProps) {
  const { create } = useBookingTravelerDocumentMutation(bookingId)
  const { data: travelersData } = useTravelers(bookingId)
  const travelers = travelersData?.data ?? []
  const { locale, messages } = useBookingsUiI18nOrDefault()
  const documentFormSchema = createDocumentFormSchema(messages)
  const typeItems = useMemo(
    () =>
      documentTypes.map((t) => ({
        value: t,
        label: messages.bookingDocumentDialog.documentTypeLabels[t],
      })),
    [messages.bookingDocumentDialog.documentTypeLabels],
  )
  const travelerItems = useMemo(
    () => [
      {
        value: UNASSIGNED,
        label: messages.bookingDocumentDialog.placeholders.travelerUnassigned,
      },
      ...travelers.map((t) => ({
        value: t.id,
        label: personDisplayName(t, locale),
      })),
    ],
    [travelers, locale, messages.bookingDocumentDialog.placeholders.travelerUnassigned],
  )

  const form = useForm<DocumentFormValues, unknown, DocumentFormOutput>({
    resolver: zodResolver(documentFormSchema),
    defaultValues: {
      type: "other",
      fileName: "",
      fileUrl: "",
      travelerId: UNASSIGNED,
      expiresAt: "",
      notes: "",
    },
  })

  useEffect(() => {
    if (open) {
      form.reset()
    }
  }, [form, open])

  const onSubmit = async (values: DocumentFormOutput) => {
    await create.mutateAsync({
      type: values.type,
      fileName: values.fileName,
      fileUrl: values.fileUrl,
      travelerId: values.travelerId && values.travelerId !== UNASSIGNED ? values.travelerId : null,
      expiresAt: values.expiresAt || null,
      notes: values.notes || null,
    })

    onOpenChange(false)
    onSuccess?.()
  }
  const uploadedFileUrl = form.watch("fileUrl")
  const canSubmit = Boolean(uploadedFileUrl) && !create.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{messages.bookingDocumentDialog.title}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <DialogBody className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>{messages.bookingDocumentDialog.fields.type}</Label>
                <Select
                  items={typeItems}
                  value={form.watch("type")}
                  onValueChange={(v) =>
                    form.setValue("type", (v ?? "other") as (typeof documentTypes)[number])
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {documentTypes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {messages.bookingDocumentDialog.documentTypeLabels[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>{messages.bookingDocumentDialog.fields.traveler}</Label>
                <Select
                  items={travelerItems}
                  value={form.watch("travelerId") ?? UNASSIGNED}
                  onValueChange={(v) => form.setValue("travelerId", v ?? UNASSIGNED)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED}>
                      {messages.bookingDocumentDialog.placeholders.travelerUnassigned}
                    </SelectItem>
                    {travelers.map((traveler) => (
                      <SelectItem key={traveler.id} value={traveler.id}>
                        {personDisplayName(traveler, locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>{messages.bookingDocumentDialog.fields.file}</Label>
              <FileDropzone
                accept="application/pdf,image/*"
                maxSize={10 * 1024 * 1024}
                onUploaded={(upload) => {
                  form.setValue("fileUrl", upload.url, { shouldValidate: true })
                  form.setValue("fileName", upload.name, { shouldValidate: true })
                }}
                onCleared={() => {
                  form.setValue("fileUrl", "", { shouldDirty: true, shouldValidate: true })
                  form.setValue("fileName", "", { shouldDirty: true, shouldValidate: true })
                }}
                helperText={messages.bookingDocumentDialog.placeholders.helperText}
              />
              {form.formState.errors.fileUrl && (
                <p className="text-xs text-destructive">{form.formState.errors.fileUrl.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label>{messages.bookingDocumentDialog.fields.expiresAt}</Label>
              <DatePicker
                displayFormat={messages.common.datePickerFormats.long}
                value={form.watch("expiresAt") || null}
                onChange={(next) =>
                  form.setValue("expiresAt", next ?? "", {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                placeholder={messages.bookingDocumentDialog.placeholders.expiresAt}
                className="w-full"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>{messages.bookingDocumentDialog.fields.notes}</Label>
              <Textarea
                {...form.register("notes")}
                placeholder={messages.bookingDocumentDialog.placeholders.notes}
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              {messages.common.cancel}
            </Button>
            <Button type="submit" size="sm" disabled={!canSubmit}>
              {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {messages.bookingDocumentDialog.actions.addDocument}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
