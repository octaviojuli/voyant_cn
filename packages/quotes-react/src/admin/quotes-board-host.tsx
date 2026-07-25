"use client"

import { useAdminNavigate } from "@voyant-travel/admin"
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@voyant-travel/ui/components"
import { Loader2, Plus, Settings2 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { QuotesBoard } from "../components/quotes-board.js"
import { useCrmUiMessagesOrDefault } from "../i18n/index.js"
import {
  CreateQuoteDialog,
  type QuoteRecord,
  usePipelines,
  useQuotes,
  useStages,
} from "../index.js"
import { CreatePipelineDialog, ManageStagesDialog } from "./pipeline-dialogs.js"
import { useDefaultCrmCurrency } from "./use-default-crm-currency.js"

/**
 * Packaged admin host for the Quotes board (packaged-admin RFC Phase 3). The
 * landing surface for the quotes domain: pick a pipeline, manage its stages,
 * create quotes, and open a quote's detail (where its versions live). All
 * data flows through the shared `@voyant-travel/react` provider context
 * mounted by the workspace shell; cross-route links resolve through the
 * `quote.detail` semantic destination.
 */
export function QuotesBoardHost() {
  const messages = useCrmUiMessagesOrDefault()
  const t = messages.quotesBoardPage
  const navigate = useAdminNavigate()
  const defaultCurrency = useDefaultCrmCurrency()

  const pipelinesQuery = usePipelines({ entityType: "quote", limit: 50 })
  const pipelines = pipelinesQuery.data?.data ?? []
  const defaultPipelineId =
    (pipelines.find((pipeline) => pipeline.isDefault) ?? pipelines[0])?.id ?? null

  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(defaultPipelineId)
  const [showCreatePipeline, setShowCreatePipeline] = useState(false)
  const [showManageStages, setShowManageStages] = useState(false)
  const [showCreateQuote, setShowCreateQuote] = useState(false)

  useEffect(() => {
    if (!selectedPipelineId && defaultPipelineId) {
      setSelectedPipelineId(defaultPipelineId)
      return
    }
    if (selectedPipelineId && !pipelines.some((pipeline) => pipeline.id === selectedPipelineId)) {
      setSelectedPipelineId(defaultPipelineId)
    }
  }, [defaultPipelineId, pipelines, selectedPipelineId])

  const stagesQuery = useStages({
    pipelineId: selectedPipelineId ?? undefined,
    limit: 100,
    enabled: Boolean(selectedPipelineId),
  })
  const quotesQuery = useQuotes({
    pipelineId: selectedPipelineId ?? undefined,
    status: "open",
    limit: 100,
    enabled: Boolean(selectedPipelineId),
  })

  const stages = useMemo(
    () =>
      [...(stagesQuery.data?.data ?? [])].sort((left, right) => left.sortOrder - right.sortOrder),
    [stagesQuery.data],
  )
  const quotes = quotesQuery.data?.data ?? []

  const quotesByStage = useMemo(() => {
    const map = new Map<string, QuoteRecord[]>()
    for (const stage of stages) map.set(stage.id, [])
    for (const quote of quotes) {
      map.get(quote.stageId)?.push(quote)
    }
    return map
  }, [stages, quotes])

  const openQuote = (quoteId: string) => navigate("quote.detail", { quoteId })

  return (
    <div className="flex h-full min-w-0 flex-col gap-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-bold text-2xl tracking-tight">{t.title}</h1>
          <p className="text-muted-foreground text-sm">{t.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={selectedPipelineId ?? undefined}
            onValueChange={(value) => setSelectedPipelineId(value)}
            disabled={pipelinesQuery.isPending || pipelines.length === 0}
          >
            <SelectTrigger className="w-[200px] text-sm">
              <SelectValue placeholder={t.selectPipelinePlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {pipelines.map((pipeline) => (
                <SelectItem key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                  {pipeline.isDefault ? t.defaultSuffix : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreatePipeline(true)}
            disabled={pipelinesQuery.isPending}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            {t.newPipeline}
          </Button>
          {selectedPipelineId ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowManageStages(true)}
                disabled={stagesQuery.isPending}
              >
                <Settings2 className="mr-1.5 h-4 w-4" />
                {t.manageStages}
              </Button>
              <Button
                size="sm"
                onClick={() => setShowCreateQuote(true)}
                disabled={stagesQuery.isPending || stages.length === 0}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                {t.newQuote}
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {pipelinesQuery.isPending ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : pipelines.length === 0 ? (
        <EmptyState title={t.emptyNoPipelines.title} description={t.emptyNoPipelines.description} />
      ) : !selectedPipelineId ? null : stagesQuery.isPending ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : stages.length === 0 ? (
        <EmptyState title={t.emptyNoStages.title} description={t.emptyNoStages.description} />
      ) : (
        <QuotesBoard
          stages={stages}
          quotesByStage={quotesByStage}
          onQuoteOpen={(quote) => openQuote(quote.id)}
          defaultCurrency={defaultCurrency}
        />
      )}

      <CreatePipelineDialog
        open={showCreatePipeline}
        onOpenChange={setShowCreatePipeline}
        existingCount={pipelines.length}
        onCreated={(pipelineId) => {
          setSelectedPipelineId(pipelineId)
          setShowCreatePipeline(false)
        }}
      />
      {selectedPipelineId ? (
        <>
          <ManageStagesDialog
            open={showManageStages}
            onOpenChange={setShowManageStages}
            pipelineId={selectedPipelineId}
            stages={stages}
          />
          <CreateQuoteDialog
            open={showCreateQuote}
            onOpenChange={setShowCreateQuote}
            pipelineId={selectedPipelineId}
            stages={stages}
            onCreated={(quoteId) => {
              setShowCreateQuote(false)
              openQuote(quoteId)
            }}
          />
        </>
      ) : null}
    </div>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-1 py-12 text-center">
      <p className="font-medium text-sm">{title}</p>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  )
}
