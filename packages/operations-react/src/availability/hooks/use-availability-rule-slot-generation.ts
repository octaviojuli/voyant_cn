"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { z } from "zod"

import { fetchWithValidation } from "../client.js"
import { useVoyantAvailabilityContext } from "../provider.js"
import { availabilityQueryKeys } from "../query-keys.js"
import { singleEnvelope } from "../schemas.js"

/**
 * `POST /v1/admin/operations/availability/rules/{id}/generate-slots`.
 *
 * Availability rules describe a recurrence; until this endpoint existed nothing
 * ever expanded them, so a rule could sit "active" forever without producing a
 * single departure. `created` counts newly materialized departures, `skipped`
 * counts dates that already had one (the endpoint is idempotent), and
 * `horizonDays` echoes the horizon that was applied.
 */
export const generateRuleSlotsResponse = singleEnvelope(
  z.object({
    created: z.number().int(),
    skipped: z.number().int(),
    horizonDays: z.number().int(),
  }),
)

export type GenerateRuleSlotsResult = z.infer<typeof generateRuleSlotsResponse>["data"]

export interface GenerateRuleSlotsVariables {
  id: string
  /** 1..365. Omit to let the server apply its 90-day default. */
  horizonDays?: number
}

export function useAvailabilityRuleSlotGeneration() {
  const { baseUrl, fetcher } = useVoyantAvailabilityContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, horizonDays }: GenerateRuleSlotsVariables) => {
      const { data } = await fetchWithValidation(
        `/v1/admin/operations/availability/rules/${id}/generate-slots`,
        generateRuleSlotsResponse,
        { baseUrl, fetcher },
        {
          method: "POST",
          body: JSON.stringify(horizonDays === undefined ? {} : { horizonDays }),
        },
      )
      return data
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: availabilityQueryKeys.slots() })
      await queryClient.invalidateQueries({
        queryKey: availabilityQueryKeys.ruleDetail(variables.id),
      })
    },
  })
}
