"use client"

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
} from "@voyant-travel/ui/components"
import { zodResolver } from "@voyant-travel/ui/lib/zod-resolver"
import { Loader2 } from "lucide-react"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod/v4"
import { useNotificationsUiMessagesOrDefault } from "../i18n/index.js"
import {
  type NotificationReminderRuleRecord,
  useNotificationReminderRuleMutation,
  useNotificationTemplates,
} from "../index.js"

// Factory so validation messages resolve against the active locale
// (schema-at-module-scope cannot see the messages context).
function createReminderRuleFormSchema(
  messages: ReturnType<typeof useNotificationsUiMessagesOrDefault>,
) {
  return z.object({
    name: z.string().min(1, messages.admin.reminderRuleDialog.nameRequired),
    status: z.enum(["draft", "active", "archived"]).default("draft"),
    targetType: z.enum([
      "booking_confirmed",
      "booking_payment_schedule",
      "payment_complete",
      "booking_cancelled_non_payment",
    ]),
    channel: z.enum(["email", "sms"]),
    // Optional default template — stages own per-channel templates and
    // override this. Empty string is normalized to null in the payload.
    templateId: z.string().optional(),
  })
}

const reminderTargetValues = [
  "booking_confirmed",
  "payment_complete",
  "booking_cancelled_non_payment",
  "booking_payment_schedule",
] as const

type FormValues = z.input<ReturnType<typeof createReminderRuleFormSchema>>
type FormOutput = z.output<ReturnType<typeof createReminderRuleFormSchema>>

function slugifyReminderRule(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return slug || "notification-rule"
}

type NotificationReminderRuleDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  rule?: NotificationReminderRuleRecord
  onSuccess: () => void
}

export function NotificationReminderRuleDialog({
  open,
  onOpenChange,
  rule,
  onSuccess,
}: NotificationReminderRuleDialogProps) {
  const isEditing = Boolean(rule)
  const messages = useNotificationsUiMessagesOrDefault()
  const t = messages.admin.reminderRuleDialog
  const common = messages.admin.common
  const { create, update } = useNotificationReminderRuleMutation()
  const reminderRuleFormSchema = createReminderRuleFormSchema(messages)
  const form = useForm<FormValues, unknown, FormOutput>({
    resolver: zodResolver(reminderRuleFormSchema),
    defaultValues: {
      name: "",
      status: "draft",
      targetType: "booking_payment_schedule",
      channel: "email",
      templateId: "",
    },
  })
  const channel = form.watch("channel")
  const { data: templates } = useNotificationTemplates({
    channel,
    status: "active",
    limit: 100,
    offset: 0,
  })

  useEffect(() => {
    if (open && rule) {
      const resolvedTemplateId =
        rule.templateId ??
        (rule.templateSlug
          ? ((templates?.data ?? []).find((template) => template.slug === rule.templateSlug)?.id ??
            "")
          : "")

      form.reset({
        name: rule.name,
        status: rule.status,
        targetType: rule.targetType === "invoice" ? "booking_payment_schedule" : rule.targetType,
        channel: rule.channel,
        templateId: resolvedTemplateId,
      })
      return
    }

    if (open) {
      form.reset()
    }
  }, [open, rule, form, templates?.data])

  const onSubmit = async (values: FormOutput) => {
    const payload = {
      name: values.name,
      slug:
        rule?.slug ??
        `${slugifyReminderRule(values.targetType)}-${slugifyReminderRule(values.name)}`,
      status: values.status,
      targetType: values.targetType,
      channel: values.channel,
      provider: null,
      templateId: values.templateId ? values.templateId : null,
      templateSlug: null,
      isSystem: rule?.isSystem ?? false,
      metadata: rule?.metadata ?? null,
    }

    if (isEditing && rule) {
      await update.mutateAsync({ id: rule.id, input: payload })
    } else {
      await create.mutateAsync(payload)
    }

    onSuccess()
  }

  const isPending = create.isPending || update.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? t.editTitle : t.createTitle}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <DialogBody className="grid gap-4">
            <div className="flex flex-col gap-2">
              <Label>{t.nameLabel}</Label>
              <Input {...form.register("name")} placeholder={t.namePlaceholder} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>{t.targetLabel}</Label>
                <Select
                  value={form.watch("targetType")}
                  onValueChange={(value) => {
                    if (!value) return
                    form.setValue("targetType", value as FormValues["targetType"])
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {reminderTargetValues.map((value) => (
                      <SelectItem key={value} value={value}>
                        {messages.admin.reminderRulesPage.targets[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>{t.statusLabel}</Label>
                <Select
                  value={form.watch("status")}
                  onValueChange={(value) => {
                    if (!value) return
                    form.setValue("status", value as FormValues["status"])
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">{common.statusDraft}</SelectItem>
                    <SelectItem value="active">{common.statusActive}</SelectItem>
                    <SelectItem value="archived">{common.statusArchived}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="flex flex-col gap-2">
                <Label>{t.channelLabel}</Label>
                <Select
                  value={form.watch("channel")}
                  onValueChange={(value) => {
                    if (!value) return
                    form.setValue("channel", value as FormValues["channel"])
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">{common.channelEmail}</SelectItem>
                    <SelectItem value="sms">{common.channelSms}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>{t.defaultTemplateLabel}</Label>
              <Select
                value={form.watch("templateId")}
                onValueChange={(value) => {
                  if (!value) return
                  form.setValue("templateId", value)
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t.selectTemplatePlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {(templates?.data ?? []).map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} ({template.slug})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t.defaultTemplateHint}</p>
            </div>

            {!isEditing ? (
              <p className="rounded-md border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                {t.stagesHintBefore} <strong>{t.stagesHintAction}</strong> {t.stagesHintAfter}
              </p>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {messages.common.cancel}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isEditing ? common.saveChanges : t.createRule}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
