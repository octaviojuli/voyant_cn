"use client"

import { Button } from "@voyant-travel/ui/components/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@voyant-travel/ui/components/tooltip"
import { Loader2, Lock } from "lucide-react"
import type * as React from "react"
import { useBookingsUiMessagesOrDefault } from "../../i18n/index.js"
import type { JourneyStep } from "../types.js"

const sectionId = (step: JourneyStep): string => `bj-section-${step}`

/**
 * The sequential gates in the stacked layout: each must be filled before the
 * next sections unlock. Once all three are done, the remaining sections
 * (options, extras, payment) all open together.
 */
const GATE_STEPS = new Set<JourneyStep>(["departure", "billing", "travelers"])

/**
 * The admin's guided single-page layout — every section is a block on one
 * page, but content stays collapsed until the previous section is complete,
 * so the operator fills them in sequence and focuses on one at a time.
 *
 *  - LOCKED (a prior section isn't done): a muted, disabled summary row.
 *  - ACTIVE (the first not-yet-done section): expanded with its full
 *    content + a "Continue" button (enabled once the section is valid).
 *  - DONE (passed via Continue): collapses to a one-line summary row with a
 *    check — click to re-open and edit, so nothing entered is ever lost.
 *
 * Completeness derives from the same per-step gate the wizard uses; the
 * final Review section's Confirm is gated on the whole booking.
 */
export function StackedJourney({
  className,
  steps,
  renderStep,
  isStepComplete,
  commitError,
  onCancel,
  onConfirm,
  isCommitting,
  canConfirm,
  sidePanel,
  contractDialog,
  banner,
}: {
  className?: string
  steps: ReadonlyArray<JourneyStep>
  renderStep: (step: JourneyStep) => React.ReactNode
  isStepComplete: (step: JourneyStep) => boolean
  /** Already-localized failure copy. Never a raw `Error` — the shell
   *  classifies the commit failure before handing it down. */
  commitError: string | null
  onCancel?: () => void
  onConfirm?: () => void
  isCommitting?: boolean
  canConfirm?: boolean
  sidePanel: React.ReactNode
  contractDialog: React.ReactNode
  /** Recoverable, always-visible banner (e.g. quote-refresh failure). */
  banner?: React.ReactNode
}): React.ReactElement {
  const messages = useBookingsUiMessagesOrDefault()
  const nav = messages.bookingJourney.navigation
  // Progressive unlock gated only on the SEQUENTIAL gates (departure →
  // billing → travelers). Once those are filled, the remaining sections
  // (options, extras, payment) all unlock together — they're independent
  // refinements, not a strict sequence. Unlocked sections stay open so the
  // operator keeps full context of everything they've filled.
  const firstIncompleteGate = steps.find((s) => GATE_STEPS.has(s) && !isStepComplete(s))
  const unlockThroughIndex = firstIncompleteGate
    ? steps.indexOf(firstIncompleteGate)
    : steps.length - 1

  return (
    <div className={className}>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-8 md:items-start">
        <div className="space-y-3 md:col-span-5">
          {banner}
          {steps.map((step, i) => {
            // Locked: a section beyond the active gate — a muted, disabled row
            // until the operator clears the gates above it.
            if (i > unlockThroughIndex) {
              return (
                <div
                  key={step}
                  id={sectionId(step)}
                  className="flex w-full scroll-mt-4 items-center gap-3 rounded-md border p-4 opacity-60"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1 font-medium text-sm">
                    {messages.bookingJourney.steps[step]}
                  </div>
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
              )
            }

            // Unlocked: full section content, stays open once reached. Its
            // warnings render inside the step's own card (scoped to the block).
            return (
              <section key={step} id={sectionId(step)} className="scroll-mt-4">
                {renderStep(step)}
              </section>
            )
          })}

          {commitError ? (
            <p className="text-destructive text-sm" role="alert" aria-live="polite">
              {commitError}
            </p>
          ) : null}

          <div className="flex items-center gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => onCancel?.()}>
              {nav.cancel}
            </Button>
            {onConfirm ? (
              canConfirm === false ? (
                // Disabled — explain why via a tooltip (the button can't be
                // clicked, so the span wrapper captures hover).
                <Tooltip>
                  <TooltipTrigger render={<span className="ml-auto inline-flex" />}>
                    <Button type="button" disabled>
                      {messages.bookingJourney.review.confirmBooking}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {messages.bookingJourney.review.completeToConfirm}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Button
                  type="button"
                  className="ml-auto"
                  onClick={onConfirm}
                  disabled={isCommitting === true}
                >
                  {isCommitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {messages.bookingJourney.review.confirming}
                    </>
                  ) : (
                    messages.bookingJourney.review.confirmBooking
                  )}
                </Button>
              )
            ) : null}
          </div>
        </div>

        <aside className="md:sticky md:top-4 md:col-span-3">{sidePanel}</aside>
      </div>
      {contractDialog}
    </div>
  )
}
