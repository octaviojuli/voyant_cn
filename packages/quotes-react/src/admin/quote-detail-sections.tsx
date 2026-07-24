"use client"

import type { ActivityRecord } from "@voyant-travel/relationships-react"
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from "@voyant-travel/ui/components"
import { Calendar, CircleDot, DollarSign, Tag, Target, X } from "lucide-react"
import { type KeyboardEvent, useState } from "react"
import { formatCrmMoney, formatCrmRelative } from "../components/crm-format.js"
import { InlineCurrencyField } from "../components/inline-currency-field.js"
import { InlineField } from "../components/inline-field.js"
import { InlineSelectField } from "../components/inline-select-field.js"
import { useCrmUiI18nOrDefault, useCrmUiMessagesOrDefault } from "../i18n/index.js"
import { type CrmQuoteStatus, crmQuoteStatuses } from "../i18n/messages.js"

interface QuoteDetailsFields {
  title: string
  stageId: string
  status: string
  valueAmountCents: number | null
  valueCurrency: string | null
  expectedCloseDate: string | null
  source: string | null
  sourceRef: string | null
  lostReason: string | null
}

export interface QuoteDetailsCardProps {
  quote: QuoteDetailsFields
  stages: ReadonlyArray<{ id: string; name: string }>
  onUpdateField: (patch: Record<string, unknown>) => Promise<void>
}

/** Editable deal fields — every value flows back through the quote update mutation. */
export function QuoteDetailsCard({ quote, stages, onUpdateField }: QuoteDetailsCardProps) {
  const i18n = useCrmUiI18nOrDefault()
  const { messages } = i18n
  const t = messages.quoteDetailPage
  const statusOptions = crmQuoteStatuses.map((status) => ({
    value: status,
    label: messages.common.quoteStatusLabels[status as CrmQuoteStatus] ?? status,
  }))

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-semibold text-sm">{t.detailsTitle}</CardTitle>
      </CardHeader>
      <CardContent className="divide-y text-sm">
        <InlineField
          icon={Target}
          label={t.fields.title}
          value={quote.title}
          onSave={(next) => onUpdateField({ title: next ?? "" })}
        />
        <InlineSelectField
          icon={CircleDot}
          label={t.fields.stage}
          value={quote.stageId}
          options={stages.map((stage) => ({ value: stage.id, label: stage.name }))}
          allowClear={false}
          onSave={(next) => onUpdateField({ stageId: next ?? quote.stageId })}
        />
        <InlineSelectField
          icon={CircleDot}
          label={t.fields.status}
          value={quote.status}
          options={statusOptions}
          allowClear={false}
          onSave={(next) => onUpdateField({ status: next ?? quote.status })}
        />
        <div className="flex items-start gap-3 py-1.5">
          <DollarSign className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <div className="font-medium text-muted-foreground text-xs">{t.fields.value}</div>
            <div className="text-sm">
              {formatCrmMoney(i18n, quote.valueAmountCents, quote.valueCurrency)}
            </div>
            <div className="text-[10px] text-muted-foreground">{t.fields.valueHint}</div>
          </div>
        </div>
        <InlineCurrencyField
          label={t.fields.currency}
          value={quote.valueCurrency}
          onSave={(next) => onUpdateField({ valueCurrency: next })}
        />
        <InlineField
          icon={Calendar}
          label={t.fields.expectedClose}
          // i18n-literal-ok: ISO-8601 date format hint for a machine-format input, not prose copy
          placeholder="YYYY-MM-DD"
          value={quote.expectedCloseDate}
          onSave={(next) => onUpdateField({ expectedCloseDate: next })}
        />
        <InlineField
          icon={Tag}
          label={t.fields.source}
          value={quote.source}
          onSave={(next) => onUpdateField({ source: next })}
        />
        {quote.status === "lost" ? (
          <InlineField
            label={t.fields.lostReason}
            kind="textarea"
            value={quote.lostReason}
            onSave={(next) => onUpdateField({ lostReason: next })}
          />
        ) : null}
      </CardContent>
    </Card>
  )
}

export interface QuoteTagsCardProps {
  tags: string[] | null | undefined
  onChange: (tags: string[]) => Promise<void>
}

export function QuoteTagsCard({ tags, onChange }: QuoteTagsCardProps) {
  const messages = useCrmUiMessagesOrDefault()
  const t = messages.quoteDetailPage
  const current = tags ?? []
  const [draft, setDraft] = useState("")

  const addTag = async () => {
    const value = draft.trim()
    if (!value || current.includes(value)) {
      setDraft("")
      return
    }
    setDraft("")
    await onChange([...current, value])
  }

  const removeTag = async (tag: string) => {
    await onChange(current.filter((entry) => entry !== tag))
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault()
      void addTag()
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-semibold text-sm">{t.tagsTitle}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {current.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {current.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <button
                  type="button"
                  onClick={() => void removeTag(tag)}
                  className="rounded-sm hover:text-destructive"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        ) : null}
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => void addTag()}
          placeholder={t.addTagPlaceholder}
          className="h-8 text-sm"
        />
      </CardContent>
    </Card>
  )
}

export interface QuoteActivitiesCardProps {
  isPending: boolean
  activities: ActivityRecord[]
}

export function QuoteActivitiesCard({ isPending, activities }: QuoteActivitiesCardProps) {
  const i18n = useCrmUiI18nOrDefault()
  const t = i18n.messages.quoteDetailPage

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-semibold text-sm">{t.activitiesTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        {isPending ? null : activities.length === 0 ? (
          <p className="py-4 text-center text-muted-foreground text-sm">{t.activitiesEmpty}</p>
        ) : (
          <ul className="divide-y">
            {activities.map((activity) => (
              <li key={activity.id} className="py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-sm">{activity.subject}</p>
                    {activity.description ? (
                      <p className="mt-1 whitespace-pre-wrap text-muted-foreground text-sm">
                        {activity.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right text-muted-foreground text-xs">
                    <p>
                      {i18n.messages.common.activityTypeLabels[
                        activity.type as keyof typeof i18n.messages.common.activityTypeLabels
                      ] ?? activity.type}
                    </p>
                    <p>{formatCrmRelative(i18n, activity.createdAt)}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
