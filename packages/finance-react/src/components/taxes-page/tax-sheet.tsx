"use client"

import { useMutation } from "@tanstack/react-query"
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
  Textarea,
} from "@voyant-travel/ui/components"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { useFinanceUiMessagesOrDefault } from "../../i18n/index.js"
import type {
  TaxClassAppliesTo,
  TaxFormState,
  TaxRegimeCode,
  TaxRegimeRecord,
  TaxRow,
} from "./shared.js"
import {
  appliesToLabel,
  formatRate,
  initialForm,
  nextTaxClassLineKey,
  TAX_CLASS_APPLIES_TO_OPTIONS,
  TAX_CODE_OPTIONS,
  taxCodeLabel,
  toSlug,
  useTaxesPageApi,
} from "./shared.js"

export function TaxSheet({
  open,
  onOpenChange,
  row,
  onSuccess,
  taxRegimes,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  row?: TaxRow
  onSuccess: () => void
  taxRegimes: TaxRegimeRecord[]
}) {
  const messages = useFinanceUiMessagesOrDefault()
  const taxMessages = messages.taxesPage
  const api = useTaxesPageApi()
  const [form, setForm] = useState<TaxFormState>(() => initialForm(row))
  const [error, setError] = useState<string | null>(null)
  const isEditing = !!row

  useEffect(() => {
    setForm(initialForm(row))
    setError(null)
  }, [row])

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.taxClassLabel.trim()) throw new Error(taxMessages.validationNameRequired)
      const ratePercent = Number(form.ratePercent)
      if (!Number.isFinite(ratePercent) || ratePercent < 0) {
        throw new Error(taxMessages.validationRateInvalid)
      }
      const regimeInput = {
        code: form.regimeCode,
        name: form.regimeName.trim() || form.taxClassLabel.trim(),
        jurisdiction: form.jurisdiction.trim() || null,
        ratePercent: Math.round(ratePercent),
        description: form.regimeDescription.trim() || null,
        legalReference: form.legalReference.trim() || null,
        active: form.active,
      }
      const taxClassInput = {
        code: form.taxClassCode.trim() || toSlug(form.taxClassLabel),
        label: form.taxClassLabel.trim(),
        description: form.taxClassDescription.trim() || null,
        lines: form.lines.length
          ? form.lines
              .filter((line) => line.regimeId.trim())
              .map((line) => ({
                regime_id: line.regimeId,
                applies_to: line.appliesTo,
              }))
          : null,
        active: form.active,
      }

      const regimeEnvelope = row?.regime
        ? await api.patch<{ data: TaxRegimeRecord }>(
            `/v1/admin/finance/tax-regimes/${row.regime.id}`,
            regimeInput,
          )
        : await api.post<{ data: TaxRegimeRecord }>("/v1/admin/finance/tax-regimes", regimeInput)
      const regime = regimeEnvelope.data

      if (row) {
        await api.patch(`/v1/admin/finance/tax-classes/${row.taxClass.id}`, {
          ...taxClassInput,
          defaultRegimeId: regime.id,
        })
      } else {
        await api.post("/v1/admin/finance/tax-classes", {
          ...taxClassInput,
          defaultRegimeId: regime.id,
        })
      }
    },
    onSuccess,
    onError: (err) => setError(err instanceof Error ? err.message : taxMessages.saveFailed),
  })

  const setField =
    <K extends keyof TaxFormState>(key: K) =>
    (value: TaxFormState[K]) =>
      setForm((current) => ({ ...current, [key]: value }))

  const updateLine = (
    index: number,
    patch: Partial<{ appliesTo: TaxClassAppliesTo; regimeId: string }>,
  ) => {
    setForm((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...patch } : line,
      ),
    }))
  }

  const addLine = () => {
    const regimeId = taxRegimes[0]?.id
    if (!regimeId) return
    setForm((current) => ({
      ...current,
      lines: [...current.lines, { key: nextTaxClassLineKey(), appliesTo: "all", regimeId }],
    }))
  }

  const removeLine = (index: number) => {
    setForm((current) => ({
      ...current,
      lines: current.lines.filter((_, lineIndex) => lineIndex !== index),
    }))
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" size="lg">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? taxMessages.editSheetTitle : taxMessages.newSheetTitle}
          </SheetTitle>
        </SheetHeader>
        <SheetBody>
          <form className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 rounded-lg border p-4">
              <div>
                <h3 className="text-sm font-medium">{taxMessages.taxClassSectionTitle}</h3>
                <p className="text-xs text-muted-foreground">
                  {taxMessages.taxClassSectionDescription}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>{taxMessages.taxClassLabelLabel}</Label>
                  <Input
                    value={form.taxClassLabel}
                    onChange={(event) => {
                      const next = event.target.value
                      setForm((current) => ({
                        ...current,
                        taxClassLabel: next,
                        taxClassCode: current.taxClassCode || toSlug(next),
                        regimeName: current.regimeName || next,
                      }))
                    }}
                    placeholder={taxMessages.taxClassLabelPlaceholder}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>{taxMessages.taxClassCodeLabel}</Label>
                  <Input
                    value={form.taxClassCode}
                    onChange={(event) => setField("taxClassCode")(event.target.value)}
                    placeholder={taxMessages.taxClassCodePlaceholder}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label>{taxMessages.taxClassDescriptionLabel}</Label>
                <Textarea
                  value={form.taxClassDescription}
                  onChange={(event) => setField("taxClassDescription")(event.target.value)}
                  placeholder={taxMessages.taxClassDescriptionPlaceholder}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-lg border p-4">
              <div>
                <h3 className="text-sm font-medium">{taxMessages.defaultRegimeSectionTitle}</h3>
                <p className="text-xs text-muted-foreground">
                  {taxMessages.defaultRegimeSectionDescription}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>{taxMessages.regimeNameLabel}</Label>
                  <Input
                    value={form.regimeName}
                    onChange={(event) => setField("regimeName")(event.target.value)}
                    placeholder={taxMessages.regimeNamePlaceholder}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>{taxMessages.regimeCodeLabel}</Label>
                  <Select
                    value={form.regimeCode}
                    onValueChange={(value) => setField("regimeCode")(value as TaxRegimeCode)}
                    items={TAX_CODE_OPTIONS.map((code) => ({
                      value: code,
                      label: taxCodeLabel(messages, code),
                    }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TAX_CODE_OPTIONS.map((code) => (
                        <SelectItem key={code} value={code}>
                          {taxCodeLabel(messages, code)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>{taxMessages.rateLabel}</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={form.ratePercent}
                    onChange={(event) => setField("ratePercent")(event.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>{taxMessages.jurisdictionLabel}</Label>
                  <Input
                    value={form.jurisdiction}
                    onChange={(event) => setField("jurisdiction")(event.target.value)}
                    placeholder="RO"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label>{taxMessages.legalReferenceLabel}</Label>
                <Input
                  value={form.legalReference}
                  onChange={(event) => setField("legalReference")(event.target.value)}
                  placeholder={taxMessages.legalReferencePlaceholder}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label>{taxMessages.regimeDescriptionLabel}</Label>
                <Textarea
                  value={form.regimeDescription}
                  onChange={(event) => setField("regimeDescription")(event.target.value)}
                  placeholder={taxMessages.regimeDescriptionPlaceholder}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-lg border p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-medium">{taxMessages.regimeOverridesSectionTitle}</h3>
                  <p className="text-xs text-muted-foreground">
                    {taxMessages.regimeOverridesSectionDescription}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addLine}
                  disabled={!taxRegimes.length}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  {taxMessages.addRegimeOverride}
                </Button>
              </div>

              {form.lines.length ? (
                <div className="flex flex-col gap-2">
                  {form.lines.map((line, index) => (
                    <div
                      key={line.key}
                      className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] items-end gap-2"
                    >
                      <div className="flex flex-col gap-2">
                        <Label>{taxMessages.appliesToLabel}</Label>
                        <Select
                          value={line.appliesTo}
                          onValueChange={(value) =>
                            updateLine(index, { appliesTo: value as TaxClassAppliesTo })
                          }
                          items={TAX_CLASS_APPLIES_TO_OPTIONS.map((appliesTo) => ({
                            value: appliesTo,
                            label: appliesToLabel(messages, appliesTo),
                          }))}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TAX_CLASS_APPLIES_TO_OPTIONS.map((appliesTo) => (
                              <SelectItem key={appliesTo} value={appliesTo}>
                                {appliesToLabel(messages, appliesTo)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label>{taxMessages.taxRegimeLabel}</Label>
                        <Select
                          value={line.regimeId}
                          onValueChange={(value) => updateLine(index, { regimeId: value ?? "" })}
                          items={taxRegimes.map((regime) => ({
                            value: regime.id,
                            label: `${regime.name} (${formatRate(regime.ratePercent)})`,
                          }))}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {taxRegimes.map((regime) => (
                              <SelectItem key={regime.id} value={regime.id}>
                                {regime.name} ({formatRate(regime.ratePercent)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLine(index)}
                        aria-label={taxMessages.removeRegimeOverride}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">{taxMessages.noRegimeOverrides}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={setField("active")} />
              <Label>{taxMessages.activeLabel}</Label>
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </form>
        </SheetBody>
        <SheetFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {taxMessages.cancel}
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isEditing ? taxMessages.saveChanges : taxMessages.createTax}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
