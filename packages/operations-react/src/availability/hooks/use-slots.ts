"use client"

import { keepPreviousData as keepPreviousDataPlaceholder, useQuery } from "@tanstack/react-query"

import { useVoyantAvailabilityContext } from "../provider.js"
import type { AvailabilitySlotsListFilters } from "../query-keys.js"
import { getSlotsQueryOptions } from "../query-options.js"

export interface UseSlotsOptions extends AvailabilitySlotsListFilters {
  enabled?: boolean
  /**
   * Keep the previously fetched page on screen while the next one loads.
   * Server-paginated callers set this so paging (or changing a filter) swaps
   * rows in place instead of collapsing the table back to a skeleton.
   */
  keepPreviousData?: boolean
}

export function useSlots(options: UseSlotsOptions = {}) {
  const client = useVoyantAvailabilityContext()
  const { enabled = true, keepPreviousData = false, ...filters } = options
  return useQuery({
    ...getSlotsQueryOptions(client, filters),
    enabled,
    ...(keepPreviousData ? { placeholderData: keepPreviousDataPlaceholder } : {}),
  })
}
