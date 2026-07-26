"use client"

import { Separator } from "@voyant-travel/ui/components"
import { Button } from "@voyant-travel/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@voyant-travel/ui/components/card"
import { Label } from "@voyant-travel/ui/components/label"
import { Textarea } from "@voyant-travel/ui/components/textarea"
import { Loader2 } from "lucide-react"
import { useBookingsUiI18nOrDefault } from "../../../i18n/index.js"
import { personDisplayName } from "../../../lib/person-name.js"
import type { Draft } from "../../lib/draft-state.js"
import { bandLabel, JourneyWarnings } from "./shared.js"

// ─────────────────────────────────────────────────────────────────
// Review
// ─────────────────────────────────────────────────────────────────

export function ReviewStep({
  draft,
  setDraft,
  isCommitting,
  onConfirm,
  canConfirm,
  renderExtras,
  surface,
  warnings,
}: {
  draft: Draft
  setDraft: (next: Draft) => void
  isCommitting: boolean
  onConfirm: () => void
  warnings?: ReadonlyArray<string>
  /** Gate the confirm button — when `false`, it's disabled with a hint
   *  (stacked layout, where there are no per-step advance gates). The
   *  wizard reaches Review only after passing every gate, so it omits
   *  this (defaults to enabled). */
  canConfirm?: boolean
  renderExtras?: () => React.ReactNode
  /**
   * Drives the notes field. Public storefronts collect
   * customer-facing "anything we should know?" notes; operator
   * surfaces collect operator-only internal notes. Defaults to
   * `admin` so existing operator usage stays unchanged.
   */
  surface?: "admin" | "public"
  /** Live quote total + currency — drives the price-override default. */
  pricing?: { total: number; currency: string } | null
}): React.ReactElement {
  const { locale, messages } = useBookingsUiI18nOrDefault()
  const isPublic = surface === "public"
  const leadName =
    (draft.billing.buyerType === "B2B" ? draft.billing.company?.name : undefined) ||
    personDisplayName(draft.billing.contact, locale) ||
    messages.bookingJourney.values.noValue
  const leadEmail = draft.billing.contact.email || messages.bookingJourney.values.noValue
  return (
    <Card>
      <CardHeader>
        <CardTitle>{messages.bookingJourney.review.title}</CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className="space-y-4">
        <div>
          <div className="font-medium">{messages.bookingJourney.review.leadContact}</div>
          <div className="text-muted-foreground text-sm">
            {leadName} · {leadEmail}
          </div>
        </div>
        <div>
          <div className="font-medium">{messages.bookingJourney.review.travelers}</div>
          <ul className="text-muted-foreground text-sm">
            {draft.travelers.map((t, i) => (
              <li key={t.rowId ?? i}>
                {personDisplayName(t, locale) || messages.bookingJourney.values.noValue} (
                {bandLabel({ code: t.band }, messages.bookingJourney.travelers.bandLabels)})
              </li>
            ))}
          </ul>
        </div>
        {/* Public storefront collects a customer-facing note. Operator
            finalize controls (internal notes, price override, Travel Credit, document
            generation) live on the Payment block, not here. */}
        {isPublic ? (
          <div className="space-y-1">
            <Label htmlFor="bj-customer-notes">
              {messages.bookingJourney.review.customerNotes}
            </Label>
            <Textarea
              id="bj-customer-notes"
              placeholder={messages.bookingJourney.review.customerNotesPlaceholder}
              value={draft.customerNotes ?? ""}
              onChange={(e) => setDraft({ ...draft, customerNotes: e.target.value })}
            />
          </div>
        ) : null}
        {renderExtras ? <div>{renderExtras()}</div> : null}
        <JourneyWarnings warnings={warnings} />
        <div className="space-y-2">
          <Button onClick={onConfirm} disabled={isCommitting || canConfirm === false}>
            {isCommitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {messages.bookingJourney.review.confirming}
              </>
            ) : (
              messages.bookingJourney.review.confirmBooking
            )}
          </Button>
          {canConfirm === false ? (
            <p className="text-muted-foreground text-sm">
              {messages.bookingJourney.review.completeToConfirm}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
