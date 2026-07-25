import {
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@voyant-travel/ui/components"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@voyant-travel/ui/components/table"
import { cn } from "@voyant-travel/ui/lib/utils"
import { Loader2, Plus } from "lucide-react"
import { useState } from "react"
import { useCrmUiI18nOrDefault } from "../i18n/index.js"
import type { CrmQuoteVersionStatus } from "../i18n/messages.js"
import { type QuoteVersionRecord, useQuoteVersions } from "../index.js"
import { CreateQuoteVersionDialog } from "./create-quote-version-dialog.js"
import { formatCrmDate, formatCrmMoney, formatCrmRelative } from "./crm-format.js"

export interface QuoteVersionsPageProps {
  onQuoteVersionOpen?: (quoteVersion: QuoteVersionRecord) => void
  onQuoteVersionCreated?: (quoteVersion: QuoteVersionRecord) => void
  className?: string
  /**
   * Currency preselected in the create dialog when the chosen quote carries
   * none of its own — pass the deployment default market's currency.
   */
  defaultCurrency?: string
}

export function QuoteVersionsPage({
  onQuoteVersionOpen,
  onQuoteVersionCreated,
  className,
  defaultCurrency,
}: QuoteVersionsPageProps = {}) {
  const i18n = useCrmUiI18nOrDefault()
  const { messages } = i18n
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data, isPending, isError } = useQuoteVersions({
    status: statusFilter === "all" ? undefined : statusFilter,
    limit: 100,
  })

  const quoteVersions = data?.data ?? []
  const quoteVersionStatusOptions = Object.entries(messages.common.quoteVersionStatusLabels).map(
    ([value, label]) => ({ value, label }),
  )

  const handleCreated = (quoteVersion: QuoteVersionRecord) => {
    onQuoteVersionCreated?.(quoteVersion)
    onQuoteVersionOpen?.(quoteVersion)
  }

  return (
    <div data-slot="quote-versions-page" className={cn("flex flex-col gap-6 p-6", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{messages.quoteVersionsPage.title}</h1>
          <p className="text-sm text-muted-foreground">{messages.quoteVersionsPage.description}</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 size-4" aria-hidden="true" />
          {messages.quoteVersionsPage.create}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value ?? "all")}>
          <SelectTrigger className="w-[180px] text-sm">
            <SelectValue placeholder={messages.quoteVersionsPage.filters.status} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{messages.quoteVersionsPage.filters.allStatuses}</SelectItem>
            {quoteVersionStatusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{messages.quoteVersionsPage.columns.quoteVersion}</TableHead>
              <TableHead>{messages.quoteVersionsPage.columns.status}</TableHead>
              <TableHead>{messages.quoteVersionsPage.columns.total}</TableHead>
              <TableHead>{messages.quoteVersionsPage.columns.validUntil}</TableHead>
              <TableHead>{messages.quoteVersionsPage.columns.updated}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="mx-auto size-4 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-sm text-destructive">
                  {messages.quoteVersionsPage.loadFailed}
                </TableCell>
              </TableRow>
            ) : quoteVersions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground">
                  {messages.quoteVersionsPage.empty}
                </TableCell>
              </TableRow>
            ) : (
              quoteVersions.map((quoteVersion) => {
                const statusLabel =
                  messages.common.quoteVersionStatusLabels[
                    quoteVersion.status as CrmQuoteVersionStatus
                  ] ?? quoteVersion.status
                return (
                  <TableRow
                    key={quoteVersion.id}
                    onClick={() => onQuoteVersionOpen?.(quoteVersion)}
                    className={cn(onQuoteVersionOpen && "cursor-pointer")}
                  >
                    <TableCell className="font-mono text-xs">
                      {quoteVersion.label ?? quoteVersion.id.slice(-8)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{statusLabel}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCrmMoney(i18n, quoteVersion.totalAmountCents, quoteVersion.currency)}
                    </TableCell>
                    <TableCell>{formatCrmDate(i18n, quoteVersion.validUntil)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatCrmRelative(i18n, quoteVersion.updatedAt)}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <CreateQuoteVersionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={handleCreated}
        defaultCurrency={defaultCurrency}
      />
    </div>
  )
}
