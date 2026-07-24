"use client"

import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Switch,
} from "@voyant-travel/ui/components"
import { Loader2, Plus, Trash2 } from "lucide-react"
import type { FormEvent } from "react"
import { useEffect, useMemo, useState } from "react"
import {
  type CreateCustomFieldDefinitionInput,
  type UpdateCustomFieldDefinitionInput,
  useCustomFieldDefinitionMutation,
} from "../hooks/use-custom-field-definition-mutation.js"
import { type CrmUiMessages, useCrmUiMessagesOrDefault } from "../i18n/index.js"
import type { CustomFieldDefinitionRecord } from "../schemas.js"

export const entityTypes = ["organization", "person", "quote", "activity"] as const
const fieldTypes = [
  "varchar",
  "text",
  "double",
  "monetary",
  "date",
  "boolean",
  "enum",
  "set",
  "json",
  "address",
  "phone",
] as const

export type EntityType = (typeof entityTypes)[number]
type FieldType = (typeof fieldTypes)[number]

type OptionRow = {
  rowKey: string
  label: string
  value: string
}

type FormValues = {
  entityType: EntityType
  fieldType: FieldType
  key: string
  label: string
  isSearchable: boolean
  options: OptionRow[]
}

type FormErrors = Partial<Record<"key" | "label" | "options", string>>

let optionSeq = 0
const nextOptionKey = () => `custom-field-option-${++optionSeq}`

const defaultFormValues: FormValues = {
  entityType: "person",
  fieldType: "text",
  key: "",
  label: "",
  isSearchable: false,
  options: [],
}

export function CustomFieldDefinitionSheet({
  open,
  onOpenChange,
  definition,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  definition?: CustomFieldDefinitionRecord
  onSuccess: () => void
}) {
  const messages = useCrmUiMessagesOrDefault()
  const sheetMessages = messages.customFields.sheet
  const fieldTypeLabels = messages.customFields.fieldTypeLabels
  const isEditing = Boolean(definition)
  const { create, update } = useCustomFieldDefinitionMutation()
  const [values, setValues] = useState<FormValues>(defaultFormValues)
  const [errors, setErrors] = useState<FormErrors>({})
  const entityLabels = messages.common.entityTypeLabels

  useEffect(() => {
    if (!open) return
    setErrors({})

    if (!definition) {
      setValues(defaultFormValues)
      return
    }

    setValues({
      entityType: definition.entityType,
      fieldType: definition.fieldType,
      key: definition.key,
      label: definition.label,
      isSearchable: definition.isSearchable,
      options: definition.options?.map((option) => ({ ...option, rowKey: nextOptionKey() })) ?? [],
    })
  }, [definition, open])

  const supportsOptions = values.fieldType === "enum" || values.fieldType === "set"
  const isSubmitting = create.isPending || update.isPending
  const entityItems = useMemo(
    () => entityTypes.map((value) => ({ value, label: entityLabels[value] })),
    [entityLabels],
  )
  const fieldTypeItems = useMemo(
    () => fieldTypes.map((value) => ({ value, label: fieldTypeLabels[value] })),
    [fieldTypeLabels],
  )

  const setValue = <TKey extends keyof FormValues>(key: TKey, value: FormValues[TKey]) =>
    setValues((current) => ({ ...current, [key]: value }))

  const updateOption = (rowKey: string, patch: Partial<OptionRow>) =>
    setValue(
      "options",
      values.options.map((option) => (option.rowKey === rowKey ? { ...option, ...patch } : option)),
    )

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = validateForm(values, supportsOptions, sheetMessages.validation)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const options = supportsOptions
      ? values.options.map((option) => ({
          label: option.label.trim(),
          value: option.value.trim(),
        }))
      : null

    if (isEditing && definition) {
      const payload: UpdateCustomFieldDefinitionInput = {
        key: values.key.trim(),
        label: values.label.trim(),
        isSearchable: values.isSearchable,
        options,
      }
      await update.mutateAsync({ id: definition.id, input: payload })
    } else {
      const payload: CreateCustomFieldDefinitionInput = {
        entityType: values.entityType,
        fieldType: values.fieldType,
        key: values.key.trim(),
        label: values.label.trim(),
        isRequired: false,
        isSearchable: values.isSearchable,
        options,
      }
      await create.mutateAsync(payload)
    }

    onSuccess()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" size="lg">
        <SheetHeader>
          <SheetTitle>{isEditing ? sheetMessages.editTitle : sheetMessages.createTitle}</SheetTitle>
        </SheetHeader>
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <SheetBody className="grid gap-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>{sheetMessages.fields.entity}</Label>
                {isEditing ? (
                  <ReadOnlyPill>{entityLabels[values.entityType]}</ReadOnlyPill>
                ) : (
                  <Select
                    items={entityItems}
                    value={values.entityType}
                    onValueChange={(value) => setValue("entityType", value as EntityType)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {entityItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label>{sheetMessages.fields.fieldType}</Label>
                {isEditing ? (
                  <ReadOnlyPill>{fieldTypeLabels[values.fieldType]}</ReadOnlyPill>
                ) : (
                  <Select
                    items={fieldTypeItems}
                    value={values.fieldType}
                    onValueChange={(value) => setValue("fieldType", value as FieldType)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fieldTypeItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="custom-field-label">{sheetMessages.fields.label}</Label>
                <Input
                  id="custom-field-label"
                  value={values.label}
                  onChange={(event) => setValue("label", event.target.value)}
                  placeholder={sheetMessages.placeholders.label}
                  autoFocus
                />
                {errors.label ? <p className="text-xs text-destructive">{errors.label}</p> : null}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="custom-field-key">{sheetMessages.fields.key}</Label>
                <Input
                  id="custom-field-key"
                  value={values.key}
                  onChange={(event) => setValue("key", event.target.value)}
                  // i18n-literal-ok: snake_case machine-key example rendered in a font-mono input, not copy
                  placeholder="lead_source"
                  className="font-mono"
                />
                {errors.key ? <p className="text-xs text-destructive">{errors.key}</p> : null}
              </div>
            </div>

            <div className="grid gap-3 rounded-md border p-4">
              <ToggleRow
                label={sheetMessages.fields.searchable}
                description={sheetMessages.fields.searchableDescription}
                checked={values.isSearchable}
                onCheckedChange={(checked) => setValue("isSearchable", checked)}
              />
            </div>

            {supportsOptions ? (
              <div className="grid gap-3">
                <div>
                  <Label>{sheetMessages.fields.options}</Label>
                  <p className="text-xs text-muted-foreground">
                    {sheetMessages.fields.optionsDescription}
                  </p>
                </div>
                <div className="grid gap-2">
                  {values.options.map((option) => (
                    <div key={option.rowKey} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                      <Input
                        value={option.label}
                        onChange={(event) =>
                          updateOption(option.rowKey, { label: event.target.value })
                        }
                        placeholder={sheetMessages.placeholders.optionLabel}
                      />
                      <Input
                        value={option.value}
                        onChange={(event) =>
                          updateOption(option.rowKey, { value: event.target.value })
                        }
                        // i18n-literal-ok: machine option-value example rendered in a font-mono input, not copy
                        placeholder="value"
                        className="font-mono"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-9 text-muted-foreground"
                        onClick={() =>
                          setValue(
                            "options",
                            values.options.filter((row) => row.rowKey !== option.rowKey),
                          )
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                {errors.options ? (
                  <p className="text-xs text-destructive">{errors.options}</p>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  onClick={() =>
                    setValue("options", [
                      ...values.options,
                      { rowKey: nextOptionKey(), label: "", value: "" },
                    ])
                  }
                >
                  <Plus className="mr-1.5 size-3.5" />
                  {sheetMessages.actions.addOption}
                </Button>
              </div>
            ) : null}
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              {messages.common.cancel}
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {isEditing ? messages.common.saveChanges : sheetMessages.actions.create}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <Label>{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

function ReadOnlyPill({ children }: { children: string }) {
  return (
    <div className="flex h-9 items-center rounded-sm border bg-muted/40 px-3 text-sm text-muted-foreground">
      {children}
    </div>
  )
}

function validateForm(
  values: FormValues,
  supportsOptions: boolean,
  validationMessages: CrmUiMessages["customFields"]["sheet"]["validation"],
): FormErrors {
  const errors: FormErrors = {}
  if (!values.label.trim()) errors.label = validationMessages.labelRequired
  if (!values.key.trim()) errors.key = validationMessages.keyRequired

  if (supportsOptions) {
    const validOptions = values.options.filter(
      (option) => option.label.trim() && option.value.trim(),
    )
    if (validOptions.length !== values.options.length || validOptions.length === 0) {
      errors.options = validationMessages.optionsRequired
    }
  }

  return errors
}
