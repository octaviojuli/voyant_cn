// agent-quality: file-size exception -- owner: bookings-react; existing UI surface stays co-located until a dedicated split preserves behavior and tests.
"use client"

import {
  type CreatePersonDocumentFromPlaintextInput,
  usePersonDocumentMutation,
  usePersonDocuments,
  usePersonMutation,
  usePersonTravelSnapshot,
} from "@voyant-travel/relationships-react"
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
import { CountryCombobox } from "@voyant-travel/ui/components/country-combobox"
import { DatePicker } from "@voyant-travel/ui/components/date-picker"
import { PhoneInput } from "@voyant-travel/ui/components/phone-input"
import { zodResolver } from "@voyant-travel/ui/lib/zod-resolver"
import { Loader2, Sparkles, Upload } from "lucide-react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod/v4"
import { useBookingsUiMessagesOrDefault } from "../i18n/provider.js"
import {
  type BookingTravelerRecord,
  useRevealTraveler,
  useTravelerWithTravelDetailsMutation,
} from "../index.js"

const identityDocumentTypes = ["passport", "id_card", "driver_license", "visa", "other"] as const
const travelerCategories = ["adult", "child", "infant", "senior", "other"] as const

function createTravelerFormSchema(messages: ReturnType<typeof useBookingsUiMessagesOrDefault>) {
  return z.object({
    firstName: z.string().min(1, messages.travelerDialog.validation.firstNameRequired),
    lastName: z.string().min(1, messages.travelerDialog.validation.lastNameRequired),
    travelerCategory: z.enum(travelerCategories).default("adult"),
    email: z.string().email().optional().or(z.literal("")).nullable(),
    phone: z.string().optional().nullable(),
    specialRequests: z.string().optional().nullable(),
    documentType: z.enum(identityDocumentTypes).default("passport"),
    documentNumber: z.string().optional().nullable(),
    documentExpiry: z.string().optional().nullable(),
    documentIssuingCountry: z.string().optional().nullable(),
    documentIssuingAuthority: z.string().optional().nullable(),
    dateOfBirth: z.string().optional().nullable(),
    dietaryRequirements: z.string().optional().nullable(),
    accessibilityNeeds: z.string().optional().nullable(),
  })
}

type TravelerFormValues = z.input<ReturnType<typeof createTravelerFormSchema>>
type TravelerFormOutput = z.output<ReturnType<typeof createTravelerFormSchema>>

const EMPTY_PII_FORM = {
  documentType: "passport" as const,
  documentNumber: "",
  documentExpiry: "",
  documentIssuingCountry: "",
  documentIssuingAuthority: "",
  dateOfBirth: "",
  dietaryRequirements: "",
  accessibilityNeeds: "",
}

function normalizeTravelerCategory(value: string | null | undefined) {
  return travelerCategories.includes(value as (typeof travelerCategories)[number])
    ? (value as (typeof travelerCategories)[number])
    : "adult"
}

export interface TravelerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookingId: string
  traveler?: BookingTravelerRecord
  onSuccess?: () => void
}

export function TravelerDialog({
  open,
  onOpenChange,
  bookingId,
  traveler,
  onSuccess,
}: TravelerDialogProps) {
  const isEditing = Boolean(traveler)
  const personId = traveler?.personId ?? null
  const messages = useBookingsUiMessagesOrDefault()
  const travelerFormSchema = createTravelerFormSchema(messages)

  const travelerMutation = useTravelerWithTravelDetailsMutation(bookingId)
  const personMutation = usePersonMutation()
  const documentMutation = usePersonDocumentMutation(personId ?? undefined)

  const reveal = useRevealTraveler(bookingId, traveler?.id ?? null, {
    enabled: Boolean(open && isEditing && traveler?.id),
  })
  const snapshotQuery = usePersonTravelSnapshot(personId ?? undefined, {
    enabled: open && Boolean(personId),
  })
  const documentsQuery = usePersonDocuments(personId ?? undefined, {
    enabled: open && Boolean(personId),
  })

  const snapshot = snapshotQuery.data?.data ?? null
  const revealedTravelDetails = reveal.data?.data.travelDetails ?? null

  const form = useForm<TravelerFormValues, unknown, TravelerFormOutput>({
    resolver: zodResolver(travelerFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      travelerCategory: "adult",
      email: "",
      phone: "",
      specialRequests: "",
      ...EMPTY_PII_FORM,
    },
  })

  const [savedToProfileMessage, setSavedToProfileMessage] = useState(false)
  const [prefilledNotice, setPrefilledNotice] = useState(false)

  useEffect(() => {
    setSavedToProfileMessage(false)
    setPrefilledNotice(false)
    if (!open) return
    if (traveler) {
      form.reset({
        firstName: traveler.firstName,
        lastName: traveler.lastName,
        travelerCategory: normalizeTravelerCategory(traveler.travelerCategory),
        email: traveler.email ?? "",
        phone: traveler.phone ?? "",
        specialRequests: traveler.specialRequests ?? "",
        documentType: revealedTravelDetails?.documentType ?? "passport",
        documentNumber: revealedTravelDetails?.documentNumber ?? "",
        documentExpiry: revealedTravelDetails?.documentExpiry ?? "",
        documentIssuingCountry: revealedTravelDetails?.documentIssuingCountry ?? "",
        documentIssuingAuthority: revealedTravelDetails?.documentIssuingAuthority ?? "",
        dateOfBirth: revealedTravelDetails?.dateOfBirth ?? "",
        dietaryRequirements: revealedTravelDetails?.dietaryRequirements ?? "",
        accessibilityNeeds: revealedTravelDetails?.accessibilityNeeds ?? "",
      })
    } else {
      form.reset({
        firstName: "",
        lastName: "",
        travelerCategory: "adult",
        email: "",
        phone: "",
        specialRequests: "",
        ...EMPTY_PII_FORM,
      })
    }
  }, [form, open, traveler, revealedTravelDetails])

  const prefillFromProfile = () => {
    if (!snapshot) return
    form.setValue("documentType", snapshot.documentType ?? "passport")
    form.setValue("documentNumber", snapshot.documentNumber ?? "")
    form.setValue("documentExpiry", snapshot.documentExpiry ?? "")
    form.setValue("documentIssuingCountry", snapshot.documentIssuingCountry ?? "")
    form.setValue("documentIssuingAuthority", snapshot.documentIssuingAuthority ?? "")
    form.setValue("dateOfBirth", snapshot.dateOfBirth ?? "")
    form.setValue("dietaryRequirements", snapshot.dietaryRequirements ?? "")
    form.setValue("accessibilityNeeds", snapshot.accessibilityNeeds ?? "")
    setPrefilledNotice(true)
    setSavedToProfileMessage(false)
  }

  const onSubmit = async (values: TravelerFormOutput) => {
    const trimOrNull = (value: string | null | undefined) => {
      if (value === null || value === undefined) return null
      const trimmed = value.trim()
      return trimmed === "" ? null : trimmed
    }

    const payload = {
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email || null,
      phone: values.phone || null,
      specialRequests: values.specialRequests || null,
      isPrimary: traveler?.isPrimary ?? false,
      participantType: "traveler",
      travelerCategory: values.travelerCategory,
      documentType: values.documentType,
      documentNumber: trimOrNull(values.documentNumber),
      documentExpiry: trimOrNull(values.documentExpiry),
      documentIssuingCountry: trimOrNull(values.documentIssuingCountry),
      documentIssuingAuthority: trimOrNull(values.documentIssuingAuthority),
      dateOfBirth: trimOrNull(values.dateOfBirth),
      dietaryRequirements: trimOrNull(values.dietaryRequirements),
      accessibilityNeeds: trimOrNull(values.accessibilityNeeds),
    }

    if (isEditing) {
      await travelerMutation.update.mutateAsync({ travelerId: traveler!.id, input: payload })
    } else {
      await travelerMutation.create.mutateAsync(payload)
    }

    onOpenChange(false)
    onSuccess?.()
  }

  /**
   * Pushes diverging dietary / accessibility / document values from
   * the form back to the linked person record. Dietary + accessibility
   * land on `crm.people` via the profile-pii endpoint. Document
   * diffs update the existing primary document of the selected type if
   * there is one, otherwise create a new primary document.
   */
  const saveBackToProfile = async () => {
    if (!personId) return
    const values = form.getValues()
    const trim = (value: string | null | undefined) => {
      if (value === null || value === undefined) return null
      const trimmed = value.trim()
      return trimmed === "" ? null : trimmed
    }
    const formDietary = trim(values.dietaryRequirements)
    const formAccessibility = trim(values.accessibilityNeeds)
    const formDocumentType = values.documentType ?? "passport"
    const formDocumentNumber = trim(values.documentNumber)
    const formDocumentExpiry = trim(values.documentExpiry)
    const formDocumentCountry = trim(values.documentIssuingCountry)
    const formDocumentAuthority = trim(values.documentIssuingAuthority)

    const piiUpdate: Record<string, string | null> = {}
    if (formDietary !== (snapshot?.dietaryRequirements ?? null)) {
      piiUpdate.dietary = formDietary
    }
    if (formAccessibility !== (snapshot?.accessibilityNeeds ?? null)) {
      piiUpdate.accessibility = formAccessibility
    }
    if (Object.keys(piiUpdate).length > 0) {
      await personMutation.updateProfilePii.mutateAsync({ personId, input: piiUpdate })
    }

    const documentDiverged =
      formDocumentType !== (snapshot?.documentType ?? "passport") ||
      formDocumentNumber !== (snapshot?.documentNumber ?? null) ||
      formDocumentExpiry !== (snapshot?.documentExpiry ?? null) ||
      formDocumentCountry !== (snapshot?.documentIssuingCountry ?? null) ||
      formDocumentAuthority !== (snapshot?.documentIssuingAuthority ?? null)
    if (documentDiverged) {
      const documentPayload: CreatePersonDocumentFromPlaintextInput = {
        type: formDocumentType,
        number: formDocumentNumber,
        issuingCountry: formDocumentCountry,
        issuingAuthority: formDocumentAuthority,
        expiryDate: formDocumentExpiry,
        isPrimary: true,
      }
      const primaryDocument =
        documentsQuery.data?.data.find((row) => row.type === formDocumentType && row.isPrimary) ??
        null
      if (primaryDocument) {
        await documentMutation.updateFromPlaintext.mutateAsync({
          id: primaryDocument.id,
          input: documentPayload,
        })
      } else {
        await documentMutation.createFromPlaintext.mutateAsync(documentPayload)
      }
    }

    setSavedToProfileMessage(true)
    setPrefilledNotice(false)
  }

  const isSubmitting = travelerMutation.create.isPending || travelerMutation.update.isPending
  const isSavingProfile =
    personMutation.updateProfilePii.isPending ||
    documentMutation.updateFromPlaintext.isPending ||
    documentMutation.createFromPlaintext.isPending

  const watched = form.watch()
  const hasDivergence =
    Boolean(personId) &&
    snapshot &&
    [
      ["dietaryRequirements", "dietaryRequirements"],
      ["accessibilityNeeds", "accessibilityNeeds"],
      ["documentType", "documentType"],
      ["documentNumber", "documentNumber"],
      ["documentExpiry", "documentExpiry"],
      ["documentIssuingCountry", "documentIssuingCountry"],
      ["documentIssuingAuthority", "documentIssuingAuthority"],
    ].some(([formKey, snapKey]) => {
      const formValue = (watched as Record<string, unknown>)[formKey as string] ?? ""
      const snapValue = (snapshot as Record<string, unknown>)[snapKey as string] ?? ""
      return String(formValue ?? "").trim() !== String(snapValue ?? "").trim()
    })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? messages.travelerDialog.titles.edit
              : messages.travelerDialog.titles.create}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <DialogBody className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>{messages.travelerDialog.fields.firstName}</Label>
                <Input
                  {...form.register("firstName")}
                  placeholder={messages.travelerDialog.placeholders.firstName}
                />
                {form.formState.errors.firstName && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.firstName.message}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label>{messages.travelerDialog.fields.lastName}</Label>
                <Input
                  {...form.register("lastName")}
                  placeholder={messages.travelerDialog.placeholders.lastName}
                />
                {form.formState.errors.lastName && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>{messages.travelerDialog.fields.email}</Label>
                <Input
                  {...form.register("email")}
                  type="email"
                  placeholder={messages.travelerDialog.placeholders.email}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>{messages.travelerDialog.fields.phone}</Label>
                <PhoneInput
                  value={form.watch("phone") ?? ""}
                  onChange={(next) => form.setValue("phone", next, { shouldDirty: true })}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>{messages.travelerDialog.fields.travelerCategory}</Label>
              <Select
                value={form.watch("travelerCategory") ?? "adult"}
                onValueChange={(nextValue) =>
                  form.setValue(
                    "travelerCategory",
                    nextValue as (typeof travelerCategories)[number],
                    {
                      shouldDirty: true,
                      shouldValidate: true,
                    },
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {travelerCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {messages.travelerDialog.travelerCategoryLabels[category]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>{messages.travelerDialog.fields.specialRequests}</Label>
              <Textarea
                {...form.register("specialRequests")}
                placeholder={messages.travelerDialog.placeholders.specialRequests}
              />
            </div>

            <div className="flex flex-col gap-3 border-t pt-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">
                  {messages.travelerDialog.fields.travelDetailsHeading}
                </h3>
                {personId ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={!snapshot || snapshotQuery.isLoading}
                    onClick={prefillFromProfile}
                  >
                    <Sparkles className="mr-2 h-3.5 w-3.5" />
                    {messages.travelerDialog.actions.prefillFromProfile}
                  </Button>
                ) : null}
              </div>
              {prefilledNotice ? (
                <p className="text-xs text-muted-foreground">
                  {messages.travelerDialog.hints.prefilledFromProfile}
                </p>
              ) : null}

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>{messages.travelerDialog.fields.documentType}</Label>
                  <Select
                    value={form.watch("documentType") ?? "passport"}
                    onValueChange={(nextValue) =>
                      form.setValue(
                        "documentType",
                        nextValue as (typeof identityDocumentTypes)[number],
                        {
                          shouldDirty: true,
                          shouldValidate: true,
                        },
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {identityDocumentTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {messages.travelerDialog.documentTypeLabels[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>{messages.travelerDialog.fields.documentNumber}</Label>
                  <Input
                    {...form.register("documentNumber")}
                    placeholder={messages.travelerDialog.placeholders.documentNumber}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label>{messages.travelerDialog.fields.documentExpiry}</Label>
                <DatePicker
                  displayFormat={messages.common.datePickerFormats.long}
                  value={form.watch("documentExpiry") || null}
                  onChange={(nextValue) =>
                    form.setValue("documentExpiry", nextValue ?? "", {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                  placeholder={messages.travelerDialog.placeholders.documentExpiry}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label>{messages.travelerDialog.fields.documentIssuingCountry}</Label>
                <CountryCombobox
                  value={form.watch("documentIssuingCountry") || null}
                  onChange={(next) =>
                    form.setValue("documentIssuingCountry", next ?? "", {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label>{messages.travelerDialog.fields.documentIssuingAuthority}</Label>
                <Input
                  {...form.register("documentIssuingAuthority")}
                  placeholder={messages.travelerDialog.placeholders.documentIssuingAuthority}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label>{messages.travelerDialog.fields.dateOfBirth}</Label>
                <DatePicker
                  displayFormat={messages.common.datePickerFormats.long}
                  value={form.watch("dateOfBirth") || null}
                  onChange={(nextValue) =>
                    form.setValue("dateOfBirth", nextValue ?? "", {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                  placeholder={messages.travelerDialog.placeholders.dateOfBirth}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>{messages.travelerDialog.fields.dietaryRequirements}</Label>
                  <Textarea
                    {...form.register("dietaryRequirements")}
                    placeholder={messages.travelerDialog.placeholders.dietaryRequirements}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>{messages.travelerDialog.fields.accessibilityNeeds}</Label>
                  <Textarea
                    {...form.register("accessibilityNeeds")}
                    placeholder={messages.travelerDialog.placeholders.accessibilityNeeds}
                  />
                </div>
              </div>

              {personId && hasDivergence ? (
                <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2">
                  <p className="text-xs text-muted-foreground">
                    {savedToProfileMessage ? messages.travelerDialog.hints.savedToProfile : null}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isSavingProfile}
                    onClick={saveBackToProfile}
                  >
                    {isSavingProfile ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-3.5 w-3.5" />
                    )}
                    {messages.travelerDialog.actions.saveToProfile}
                  </Button>
                </div>
              ) : null}
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
                : messages.travelerDialog.actions.addTraveler}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
