import { Card } from "@voyant-travel/ui/components"
import { ScrollArea, ScrollBar } from "@voyant-travel/ui/components/scroll-area"
import { TrendingUp } from "lucide-react"
import { useCrmUiI18nOrDefault } from "../i18n/index.js"
import type { QuoteRecord as QuoteData, StageRecord as StageData } from "../index.js"
import { formatCrmDate, formatCrmMoney } from "./crm-format.js"

export interface QuotesBoardProps {
  stages: StageData[]
  quotesByStage: Map<string, QuoteData[]>
  onQuoteOpen?: (quote: QuoteData) => void
  /**
   * Display fallback for quotes without a `valueCurrency` of their own —
   * typically the deployment default market's currency (see
   * `useDefaultCrmCurrency` in `admin/`).
   */
  defaultCurrency?: string | null
}

export function QuotesBoard({
  stages,
  quotesByStage,
  onQuoteOpen,
  defaultCurrency,
}: QuotesBoardProps) {
  const i18n = useCrmUiI18nOrDefault()
  const { messages } = i18n

  return (
    <ScrollArea className="flex-1">
      <div className="flex gap-3 pb-2">
        {stages.map((stage) => {
          const quotes = quotesByStage.get(stage.id) ?? []
          const total = quotes.reduce((sum, quote) => sum + (quote.valueAmountCents ?? 0), 0)
          const primaryCurrency = quotes.find((quote) => quote.valueCurrency)?.valueCurrency ?? null

          return (
            <div
              key={stage.id}
              className="flex w-[280px] min-w-[280px] flex-col gap-2 rounded-md border bg-muted/30 p-2"
            >
              <div className="flex items-center justify-between gap-2 px-2 py-1">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {stage.name || messages.quotesBoard.fallbackName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {i18n.formatNumber(quotes.length)} -{" "}
                    {formatCrmMoney(i18n, total, primaryCurrency, defaultCurrency)}
                  </p>
                </div>
                {stage.probability != null ? (
                  <span className="rounded border px-1.5 py-0.5 text-[10px]">
                    {i18n.formatNumber(stage.probability)}%
                  </span>
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                {quotes.map((quote) => (
                  <QuoteBoardCard
                    key={quote.id}
                    quote={quote}
                    onOpen={onQuoteOpen}
                    defaultCurrency={defaultCurrency}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}

function QuoteBoardCard({
  quote,
  onOpen,
  defaultCurrency,
}: {
  quote: QuoteData
  onOpen?: (quote: QuoteData) => void
  defaultCurrency?: string | null
}) {
  const i18n = useCrmUiI18nOrDefault()
  const content = (
    <>
      <p className="line-clamp-2 font-medium">{quote.title}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <TrendingUp className="size-3" aria-hidden="true" />
          {formatCrmMoney(i18n, quote.valueAmountCents, quote.valueCurrency, defaultCurrency)}
        </span>
        {quote.expectedCloseDate ? (
          <span className="text-xs text-muted-foreground">
            {formatCrmDate(i18n, quote.expectedCloseDate)}
          </span>
        ) : null}
      </div>
    </>
  )

  if (onOpen) {
    return (
      <Card className="p-3 text-sm">
        <button type="button" className="block w-full text-left" onClick={() => onOpen(quote)}>
          {content}
        </button>
      </Card>
    )
  }

  return <Card className="p-3 text-sm">{content}</Card>
}
