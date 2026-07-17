"use client"

import { formatMessage } from "@voyant-travel/i18n"
import {
  Badge,
  Button,
  CurrencyCombobox,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@voyant-travel/ui/components"
import { Loader2, Plus, Settings2, Trophy } from "lucide-react"
import { useState } from "react"

import { useProgramRfps, useRfp } from "../hooks/use-mice-lists.js"
import { useRfpMutation } from "../hooks/use-rfp-mutation.js"
import {
  type MiceBidStatus,
  type MiceRfpStatus,
  useMiceUiMessagesOrDefault,
} from "../i18n/index.js"
import type { BidRecord } from "../schemas.js"

/** RFP + bid statuses operators can set directly (`validation-rfp`). The
 * award-controlled states (`awarded`, `accepted`, `rejected`) are reached only
 * through the award flow, so they are not offered as choices. */
const RFP_EDITABLE_STATUSES = ["draft", "issued", "closed", "cancelled"] as const
type RfpEditableStatus = (typeof RFP_EDITABLE_STATUSES)[number]

const RFP_STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline",
  issued: "secondary",
  closed: "secondary",
  awarded: "default",
  cancelled: "outline",
}
const BID_STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline",
  submitted: "secondary",
  under_review: "secondary",
  accepted: "default",
  rejected: "destructive",
}

// 200 is the backend's hard per-page max (`rfpListQuerySchema`). A program runs
// a handful of RFPs, so one page covers it; if it ever hits the cap the section
// says so rather than silently dropping the rest.
const RFPS_PAGE_LIMIT = 200

function statusLabel(value: string): string {
  return value.replace(/_/g, " ")
}

function formatMoney(
  cents: number | null | undefined,
  currency: string | null | undefined,
): string {
  if (cents == null) return "—"
  const amount = cents / 100
  // Never fabricate a currency: a priced bid with no currency shows the bare
  // amount, not a defaulted code that could be compared/awarded as the wrong one.
  if (!currency) return amount.toFixed(2)
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

export interface ProgramRfpsSectionProps {
  programId: string
}

/**
 * Sourcing RFPs for a program (RFC voyant#1489 Phase 4). Lists the program's
 * RFPs and creates new ones in place; "Manage" opens the funnel for one RFP —
 * invite suppliers, record bids, and award to a winner. Lives inside the
 * program detail page; an RFP is a program's sourcing artifact, not a top-level
 * surface.
 */
export function ProgramRfpsSection({ programId }: ProgramRfpsSectionProps) {
  const m = useMiceUiMessagesOrDefault()
  const { data, isLoading } = useProgramRfps({ programId, limit: RFPS_PAGE_LIMIT })
  const rfps = data?.data ?? []
  const capped = rfps.length === RFPS_PAGE_LIMIT
  const [showCreate, setShowCreate] = useState(false)
  const [manageRfpId, setManageRfpId] = useState<string | null>(null)

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-lg tracking-tight">{m.rfpsSection.heading}</h2>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="size-4" aria-hidden="true" />
          {m.rfpsSection.create}
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{m.rfpsSection.titleColumn}</TableHead>
              <TableHead>{m.rfpsSection.statusColumn}</TableHead>
              <TableHead>{m.rfpsSection.dueColumn}</TableHead>
              <TableHead> </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!isLoading && rfps.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  {m.rfpsSection.empty}
                </TableCell>
              </TableRow>
            ) : (
              rfps.map((rfp) => (
                <TableRow key={rfp.id}>
                  <TableCell className="font-medium">{rfp.title}</TableCell>
                  <TableCell>
                    <Badge
                      variant={RFP_STATUS_VARIANT[rfp.status] ?? "outline"}
                      className="capitalize"
                    >
                      {m.rfpsSection.rfpStatusLabels[rfp.status as MiceRfpStatus] ??
                        statusLabel(rfp.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {rfp.dueAt ? rfp.dueAt.slice(0, 10) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setManageRfpId(rfp.id)}>
                      <Settings2 className="size-4" aria-hidden="true" />
                      {m.rfpsSection.manageAction}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {capped ? (
        <p className="text-muted-foreground text-xs">
          {formatMessage(m.rfpsSection.capped, { count: RFPS_PAGE_LIMIT })}
        </p>
      ) : null}

      <CreateRfpDialog programId={programId} open={showCreate} onOpenChange={setShowCreate} />
      <ManageRfpDialog
        rfpId={manageRfpId}
        onOpenChange={(open) => {
          if (!open) setManageRfpId(null)
        }}
      />
    </section>
  )
}

interface CreateRfpDialogProps {
  programId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

function CreateRfpDialog({ programId, open, onOpenChange }: CreateRfpDialogProps) {
  const m = useMiceUiMessagesOrDefault()
  const { create } = useRfpMutation()
  const [title, setTitle] = useState("")
  const [status, setStatus] = useState<RfpEditableStatus>("draft")

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setTitle("")
      setStatus("draft")
    }
    onOpenChange(next)
  }

  const submit = async () => {
    if (!title.trim()) return
    await create.mutateAsync({ programId, title: title.trim(), status })
    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.rfpsSection.createDialog.title}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rfp-title">{m.rfpsSection.createDialog.titleLabel}</Label>
            <Input
              id="rfp-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={m.rfpsSection.createDialog.titlePlaceholder}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rfp-status">{m.rfpsSection.createDialog.statusLabel}</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as RfpEditableStatus)}>
              <SelectTrigger id="rfp-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RFP_EDITABLE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {m.rfpsSection.rfpStatusLabels[s] ?? s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={create.isPending}
          >
            {m.common.cancel}
          </Button>
          <Button onClick={() => void submit()} disabled={!title.trim() || create.isPending}>
            {create.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : null}
            {m.rfpsSection.createDialog.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface ManageRfpDialogProps {
  rfpId: string | null
  onOpenChange: (open: boolean) => void
}

function ManageRfpDialog({ rfpId, onOpenChange }: ManageRfpDialogProps) {
  const m = useMiceUiMessagesOrDefault()
  const open = rfpId !== null
  const { invite, createBid, award } = useRfpMutation()
  const { data, isLoading } = useRfp(rfpId ?? undefined, { enabled: open })
  const rfp = data?.data
  const bids = rfp?.bids ?? []
  const awarded = rfp?.status === "awarded"

  const [supplierId, setSupplierId] = useState("")
  const [bidSupplierId, setBidSupplierId] = useState("")
  const [bidTotal, setBidTotal] = useState("")
  const [bidCurrency, setBidCurrency] = useState("")

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSupplierId("")
      setBidSupplierId("")
      setBidTotal("")
      setBidCurrency("")
    }
    onOpenChange(next)
  }

  const submitInvite = async () => {
    if (!rfpId || !supplierId.trim()) return
    await invite.mutateAsync({ rfpId, supplierId: supplierId.trim() })
    setSupplierId("")
  }

  const totalCents = bidTotal.trim() === "" ? undefined : Number(bidTotal) * 100
  const bidTotalInvalid =
    totalCents !== undefined && (!Number.isFinite(totalCents) || totalCents < 0)
  // A priced bid must carry a currency — otherwise it can't be compared or
  // awarded safely in a multi-currency RFP (per-currency, no FX).
  const bidCurrencyMissing = totalCents !== undefined && bidCurrency.trim() === ""
  const canSubmitBid =
    bidSupplierId.trim().length > 0 &&
    !bidTotalInvalid &&
    !bidCurrencyMissing &&
    !createBid.isPending

  const submitBid = async () => {
    if (!rfpId || !canSubmitBid) return
    await createBid.mutateAsync({
      rfpId,
      supplierId: bidSupplierId.trim(),
      status: "submitted",
      totalCents: totalCents !== undefined ? Math.round(totalCents) : undefined,
      currency: bidCurrency.trim() || undefined,
    })
    setBidSupplierId("")
    setBidTotal("")
    setBidCurrency("")
  }

  const submitAward = async (bid: BidRecord) => {
    if (!rfpId) return
    await award.mutateAsync({ rfpId, bidId: bid.id })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {rfp?.title ?? m.rfpsSection.manageDialog.fallbackTitle}
            {rfp ? (
              <Badge variant={RFP_STATUS_VARIANT[rfp.status] ?? "outline"} className="capitalize">
                {m.rfpsSection.rfpStatusLabels[rfp.status as MiceRfpStatus] ??
                  statusLabel(rfp.status)}
              </Badge>
            ) : null}
          </DialogTitle>
        </DialogHeader>

        <DialogBody>
          {isLoading && !rfp ? (
            <div className="py-6 text-center text-muted-foreground text-sm">{m.common.loading}</div>
          ) : (
            <div className="space-y-6">
              <Bids
                bids={bids}
                awarded={awarded}
                awardPending={award.isPending}
                onAward={submitAward}
              />

              {awarded ? null : (
                <div className="space-y-4 border-t pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="rfp-bid-supplier">
                      {m.rfpsSection.manageDialog.recordBidLabel}
                    </Label>
                    <div className="flex flex-wrap items-end gap-2">
                      <Input
                        id="rfp-bid-supplier"
                        className="min-w-40 flex-1"
                        value={bidSupplierId}
                        onChange={(e) => setBidSupplierId(e.target.value)}
                        placeholder={m.rfpsSection.manageDialog.bidSupplierPlaceholder}
                      />
                      <Input
                        className="w-28"
                        type="number"
                        min={0}
                        step="0.01"
                        value={bidTotal}
                        onChange={(e) => setBidTotal(e.target.value)}
                        placeholder={m.rfpsSection.manageDialog.bidTotalPlaceholder}
                        aria-invalid={bidTotalInvalid || undefined}
                      />
                      <CurrencyCombobox
                        className="w-32"
                        value={bidCurrency || null}
                        onChange={(value) => setBidCurrency(value ?? "")}
                      />
                      <Button onClick={() => void submitBid()} disabled={!canSubmitBid}>
                        {createBid.isPending ? (
                          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        ) : null}
                        {m.rfpsSection.manageDialog.addBid}
                      </Button>
                    </div>
                    {bidTotalInvalid ? (
                      <p className="text-destructive text-xs">
                        {m.rfpsSection.manageDialog.totalInvalid}
                      </p>
                    ) : bidCurrencyMissing ? (
                      <p className="text-destructive text-xs">
                        {m.rfpsSection.manageDialog.currencyMissing}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rfp-invite-supplier">
                      {m.rfpsSection.manageDialog.inviteLabel}
                    </Label>
                    <div className="flex flex-wrap items-end gap-2">
                      <Input
                        id="rfp-invite-supplier"
                        className="min-w-40 flex-1"
                        value={supplierId}
                        onChange={(e) => setSupplierId(e.target.value)}
                        placeholder={m.rfpsSection.manageDialog.invitePlaceholder}
                      />
                      <Button
                        variant="outline"
                        onClick={() => void submitInvite()}
                        disabled={!supplierId.trim() || invite.isPending}
                      >
                        {invite.isPending ? (
                          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        ) : null}
                        {m.rfpsSection.manageDialog.invite}
                      </Button>
                    </div>
                    {rfp && rfp.invitations.length > 0 ? (
                      <p className="text-muted-foreground text-xs">
                        {formatMessage(m.rfpsSection.manageDialog.invitedCount, {
                          count: rfp.invitations.length,
                        })}
                      </p>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {m.rfpsSection.manageDialog.close}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface BidsProps {
  bids: BidRecord[]
  awarded: boolean
  awardPending: boolean
  onAward: (bid: BidRecord) => void
}

function Bids({ bids, awarded, awardPending, onAward }: BidsProps) {
  const m = useMiceUiMessagesOrDefault()
  return (
    <div className="space-y-2">
      <h3 className="font-medium text-sm">{m.rfpsSection.bids.heading}</h3>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{m.rfpsSection.bids.supplierColumn}</TableHead>
              <TableHead className="text-right">{m.rfpsSection.bids.totalColumn}</TableHead>
              <TableHead>{m.rfpsSection.bids.statusColumn}</TableHead>
              <TableHead> </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bids.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  {m.rfpsSection.bids.empty}
                </TableCell>
              </TableRow>
            ) : (
              bids.map((bid) => (
                <TableRow key={bid.id}>
                  <TableCell className="font-medium">{bid.supplierId}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(bid.totalCents, bid.currency)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={BID_STATUS_VARIANT[bid.status] ?? "outline"}
                      className="capitalize"
                    >
                      {m.rfpsSection.bidStatusLabels[bid.status as MiceBidStatus] ??
                        statusLabel(bid.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {awarded ? (
                      bid.status === "accepted" ? (
                        <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
                          <Trophy className="size-4" aria-hidden="true" />
                          {m.rfpsSection.bids.awardedBadge}
                        </span>
                      ) : null
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onAward(bid)}
                        disabled={awardPending}
                      >
                        <Trophy className="size-4" aria-hidden="true" />
                        {m.rfpsSection.bids.award}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
