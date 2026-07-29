// agent-quality: file-size exception -- booking-engine pricing, commit, and draft helpers stay together until the owned products handler support layer is split.
import {
  type AddonOffer,
  type CommitOwnedRequest,
  type OwnedHandlerContext,
  type PaxBandSpec,
  type ProductVariantOption,
  paxCountsFromTravelers,
} from "@voyant-travel/catalog/booking-engine"
import type { AnyDrizzleDb } from "@voyant-travel/db"
import { and, eq, gte, isNull, lte, or } from "drizzle-orm"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"

import { productPaxPricingTiers, products } from "../schema-core.js"
import type {
  BookingCreateBridgeInput,
  CreateProductsBookingHandlerOptions,
  DraftLike,
  ResolvedOptionPrice,
  ResolvedPaxPricingTier,
} from "./handler.js"

export async function loadProduct(
  db: AnyDrizzleDb,
  productId: string,
): Promise<typeof products.$inferSelect | undefined> {
  const drizzle = db as PostgresJsDatabase
  const rows = (await drizzle
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1)) as Array<typeof products.$inferSelect>
  return rows[0]
}

export function sumPax(pax: Partial<Record<string, number>> | undefined): number {
  if (!pax) return 0
  let total = 0
  for (const v of Object.values(pax)) {
    if (typeof v === "number" && Number.isFinite(v) && v > 0) total += v
  }
  return total
}

/**
 * Pick the product option a draft's bands + pricing resolve against.
 * The draft's `variantId` wins; otherwise the option flagged default,
 * otherwise the only option. Returns undefined when the choice is
 * ambiguous so callers fall back to generic bands instead of guessing.
 */
export function selectShapeOption(
  productOptions: ReadonlyArray<ProductVariantOption>,
  selectedOptionId: string | null | undefined,
): ProductVariantOption | undefined {
  if (productOptions.length === 0) return undefined
  if (selectedOptionId) {
    const picked = productOptions.find((option) => option.id === selectedOptionId)
    if (picked) return picked
  }
  const fallback =
    productOptions.find((option) => option.isDefault) ??
    (productOptions.length === 1 ? productOptions[0] : undefined)
  return fallback
}

/**
 * The option to price when the draft names none.
 *
 * `configure.variantId` is only written once the shopper actively picks an
 * option, and a product with a single default option gives them nothing to
 * pick — so the id stays empty and pricing has no option to resolve rules
 * against. That is not "no price configured", it is "nobody said which"; the
 * catalog already answers it.
 *
 * Deliberately the same rule `selectShapeOption` uses to decide which option
 * the wizard renders as selected. If these two ever disagreed, the wizard
 * would show one option's units while pricing another's.
 */
export function defaultProductOptionId(
  productOptions: ReadonlyArray<ProductVariantOption> | null | undefined,
): string | null {
  return selectShapeOption(productOptions ?? [], null)?.id ?? null
}

export interface EffectivePaxCounts {
  counts: Record<string, number>
  /** Which input decided the counts — useful in tests + logs. */
  source: "configure" | "travelers"
}

/**
 * Decide the per-band counts that drive pricing and the committed item
 * lines.
 *
 * The Configure step collects counts per band; the Travelers step then
 * names the people and can move a row to another band (or supply a date
 * of birth that implies one). Those two must not disagree — the audit
 * found a traveler switched to Child still quoting and billing at the
 * adult price because only `configure.pax` was ever read.
 *
 * Rule: the traveler roster wins **only when it is complete** — i.e. it
 * has as many rows as the Configure step asked for (or Configure hasn't
 * been filled in yet). A half-entered roster leaves the Configure counts
 * alone, so the total never silently shrinks mid-wizard.
 */
export function resolveEffectivePaxCounts(input: {
  pax: Partial<Record<string, number>> | undefined
  travelers: DraftLike["travelers"]
  bands: ReadonlyArray<PaxBandSpec>
  now?: Date
}): EffectivePaxCounts {
  const configured: Record<string, number> = {}
  for (const [code, count] of Object.entries(input.pax ?? {})) {
    if (typeof count === "number" && Number.isFinite(count) && count > 0) {
      configured[code] = Math.floor(count)
    }
  }
  const configuredTotal = sumPax(configured)
  const travelers = input.travelers ?? []
  if (travelers.length === 0) return { counts: configured, source: "configure" }
  if (configuredTotal > 0 && travelers.length !== configuredTotal) {
    return { counts: configured, source: "configure" }
  }
  return {
    counts: paxCountsFromTravelers(travelers, input.bands, input.now),
    source: "travelers",
  }
}

export interface PricedLine {
  kind: "base" | "addon"
  label: string
  quantity: number
  unitAmount: number
  totalAmount: number
}

export interface PricedQuote {
  totalCents: number
  lines: PricedLine[]
}

export interface NormalizedOptionSelection {
  optionId: string
  optionUnitId?: string
  optionName?: string
  optionUnitName?: string
  quantity: number
}

type DraftOptionSelection = NonNullable<
  NonNullable<DraftLike["configure"]>["optionSelections"]
>[number]

export function normalizeOptionSelections(
  selections: ReadonlyArray<DraftOptionSelection> | undefined,
): NormalizedOptionSelection[] {
  if (!Array.isArray(selections)) return []
  return selections.flatMap((selection) => {
    if (
      !selection ||
      typeof selection !== "object" ||
      typeof selection.optionId !== "string" ||
      selection.optionId.length === 0
    ) {
      return []
    }
    const quantity =
      typeof selection.quantity === "number" && Number.isFinite(selection.quantity)
        ? Math.floor(selection.quantity)
        : 0
    if (quantity <= 0) return []
    return [
      {
        optionId: selection.optionId,
        ...(typeof selection.optionUnitId === "string" && selection.optionUnitId.length > 0
          ? { optionUnitId: selection.optionUnitId }
          : {}),
        ...(typeof selection.optionName === "string" ? { optionName: selection.optionName } : {}),
        ...(typeof selection.optionUnitName === "string"
          ? { optionUnitName: selection.optionUnitName }
          : {}),
        quantity,
      },
    ]
  })
}

export async function priceOptionSelections(input: {
  ctx: OwnedHandlerContext
  options: CreateProductsBookingHandlerOptions
  product: typeof products.$inferSelect
  productOptions: ReadonlyArray<ProductVariantOption>
  selections: ReadonlyArray<NormalizedOptionSelection>
  slotDate: string | null
  effectivePax: number
}): Promise<PricedQuote> {
  const lines: PricedLine[] = []
  let totalCents = 0
  const optionsById = new Map(input.productOptions.map((option) => [option.id, option]))
  const totalInventoryUnits = input.selections.reduce((sum, selection) => {
    const unit = findProductOptionUnit(
      input.productOptions,
      selection.optionId,
      selection.optionUnitId,
    )
    return unit && unit.unitType !== "person" ? sum + selection.quantity : sum
  }, 0)
  const totalPersonUnits = input.selections.reduce((sum, selection) => {
    const unit = findProductOptionUnit(
      input.productOptions,
      selection.optionId,
      selection.optionUnitId,
    )
    return unit?.unitType === "person" ? sum + selection.quantity : sum
  }, 0)

  for (const selection of input.selections) {
    const resolvedPrice =
      input.slotDate && input.options.loadResolvedOptionPrice
        ? await input.options.loadResolvedOptionPrice(input.ctx, {
            productId: input.product.id,
            optionId: selection.optionId,
            date: input.slotDate,
          })
        : null
    const unitPrice =
      selection.optionUnitId && resolvedPrice?.unitPrices
        ? resolvedPrice.unitPrices.find((unit) => unit.unitId === selection.optionUnitId)
            ?.sellAmountCents
        : null
    const paxTier =
      unitPrice == null && selection.optionUnitId
        ? await resolveSelectionPaxTier({
            ctx: input.ctx,
            options: input.options,
            productId: input.product.id,
            optionUnitId: selection.optionUnitId,
            tierPax: tierPaxForSelection({
              productOptions: input.productOptions,
              selection,
              effectivePax: input.effectivePax,
              totalInventoryUnits,
              totalPersonUnits,
            }),
            date: input.slotDate,
          })
        : null
    const paxTierUnitAmount = paxTier
      ? unitAmountForPaxTier({
          productOptions: input.productOptions,
          selection,
          tierPax: paxTier.tierPax,
          pricePerPaxCents: paxTier.price.pricePerPaxCents,
        })
      : null
    const unitAmount =
      unitPrice ??
      paxTierUnitAmount ??
      resolvedPrice?.baseSellAmountCents ??
      input.product.sellAmountCents ??
      0
    if (unitAmount <= 0) continue
    const totalAmount = unitAmount * selection.quantity
    totalCents += totalAmount
    lines.push({
      kind: "base",
      // Prefer the specific room/unit name ("Standard - Single"); fall back to
      // the option name, then the product name.
      label:
        selection.optionUnitName ?? optionsById.get(selection.optionId)?.name ?? input.product.name,
      quantity: selection.quantity,
      unitAmount,
      totalAmount,
    })
  }

  return { totalCents, lines }
}

interface SelectionPaxTier {
  tierPax: number
  price: ResolvedPaxPricingTier
}

async function resolveSelectionPaxTier(input: {
  ctx: OwnedHandlerContext
  options: CreateProductsBookingHandlerOptions
  productId: string
  optionUnitId: string
  tierPax: number
  date: string | null
}): Promise<SelectionPaxTier | null> {
  if (input.tierPax <= 0) return null
  const loader = input.options.loadPaxPricingTier ?? loadProductPaxPricingTier
  const price = await loader(input.ctx, {
    productId: input.productId,
    optionUnitId: input.optionUnitId,
    tierPax: input.tierPax,
    date: input.date,
  })
  return price ? { tierPax: input.tierPax, price } : null
}

export async function loadProductPaxPricingTier(
  ctx: OwnedHandlerContext,
  args: {
    productId: string
    optionUnitId: string
    tierPax: number
    date?: string | null
  },
): Promise<ResolvedPaxPricingTier | null> {
  const drizzle = ctx.db as PostgresJsDatabase
  const predicates = [
    eq(productPaxPricingTiers.productId, args.productId),
    eq(productPaxPricingTiers.tierPax, args.tierPax),
    ...paxTierDatePredicates(args.date),
  ]

  const [unitTier] = await drizzle
    .select({
      pricePerPaxCents: productPaxPricingTiers.pricePerPaxCents,
    })
    .from(productPaxPricingTiers)
    .where(and(...predicates, eq(productPaxPricingTiers.optionUnitId, args.optionUnitId)))
    .limit(1)
  if (unitTier) return unitTier

  const [productTier] = await drizzle
    .select({
      pricePerPaxCents: productPaxPricingTiers.pricePerPaxCents,
    })
    .from(productPaxPricingTiers)
    .where(and(...predicates, isNull(productPaxPricingTiers.optionUnitId)))
    .limit(1)
  return productTier ?? null
}

function paxTierDatePredicates(date: string | null | undefined) {
  if (!date) {
    return [
      isNull(productPaxPricingTiers.effectiveFrom),
      isNull(productPaxPricingTiers.effectiveTo),
    ]
  }
  return [
    or(
      isNull(productPaxPricingTiers.effectiveFrom),
      lte(productPaxPricingTiers.effectiveFrom, date),
    ),
    or(isNull(productPaxPricingTiers.effectiveTo), gte(productPaxPricingTiers.effectiveTo, date)),
  ]
}

function findProductOptionUnit(
  productOptions: ReadonlyArray<ProductVariantOption>,
  optionId: string,
  optionUnitId: string | undefined,
) {
  if (!optionUnitId) return undefined
  return productOptions
    .find((option) => option.id === optionId)
    ?.units?.find((unit) => unit.id === optionUnitId)
}

function tierPaxForSelection(input: {
  productOptions: ReadonlyArray<ProductVariantOption>
  selection: NormalizedOptionSelection
  effectivePax: number
  totalInventoryUnits: number
  totalPersonUnits: number
}): number {
  const unit = findProductOptionUnit(
    input.productOptions,
    input.selection.optionId,
    input.selection.optionUnitId,
  )
  if (!unit) return input.effectivePax > 0 ? input.effectivePax : input.selection.quantity
  if (unit.unitType === "person") {
    return Math.max(1, input.effectivePax, input.totalPersonUnits)
  }
  if (input.effectivePax <= 0) return input.selection.quantity
  return Math.max(1, Math.ceil(input.effectivePax / Math.max(1, input.totalInventoryUnits)))
}

function unitAmountForPaxTier(input: {
  productOptions: ReadonlyArray<ProductVariantOption>
  selection: NormalizedOptionSelection
  tierPax: number
  pricePerPaxCents: number
}): number {
  const unit = findProductOptionUnit(
    input.productOptions,
    input.selection.optionId,
    input.selection.optionUnitId,
  )
  return unit && unit.unitType !== "person"
    ? input.pricePerPaxCents * input.tierPax
    : input.pricePerPaxCents
}

export function bookingItemLinesFromOptionSelections(
  selections: ReadonlyArray<NormalizedOptionSelection>,
): BookingCreateBridgeInput["itemLines"] | undefined {
  const lines = selections.flatMap((selection) =>
    selection.optionUnitId
      ? [
          {
            optionId: selection.optionId,
            optionUnitId: selection.optionUnitId,
            quantity: selection.quantity,
          },
        ]
      : [],
  )
  return lines.length > 0 ? lines : undefined
}

/**
 * Resolve the per-`option_unit` sell amounts for the committing draft,
 * reusing the exact loader the quote used so the committed line prices
 * match the quoted ones. Returns null when the deployment wires no
 * price resolver, the draft has no departure, or the rule carries no
 * per-unit prices.
 */
export async function resolveBandUnitPrices(input: {
  ctx: OwnedHandlerContext
  options: CreateProductsBookingHandlerOptions
  productId: string
  optionId: string
  draft: DraftLike
}): Promise<Map<string, number> | null> {
  if (!input.options.loadResolvedOptionPrice) return null
  try {
    const slotId = input.draft.configure?.departureSlotId
    const slotDate =
      (slotId && input.options.loadSlotDate
        ? await input.options.loadSlotDate(input.ctx, slotId)
        : null) ??
      input.draft.configure?.departureDate ??
      null
    if (!slotDate) return null
    const resolved = await input.options.loadResolvedOptionPrice(input.ctx, {
      productId: input.productId,
      optionId: input.optionId,
      date: slotDate,
    })
    if (!resolved || resolved.unitPrices.length === 0) return null
    const byUnitId = new Map<string, number>()
    for (const unit of resolved.unitPrices) {
      if (unit.sellAmountCents == null || unit.sellAmountCents <= 0) continue
      byUnitId.set(unit.unitId, unit.sellAmountCents)
    }
    return byUnitId.size > 0 ? byUnitId : null
  } catch (error) {
    console.warn(
      "[products/booking-engine] resolveBandUnitPrices failed; committing without per-band lines",
      error,
    )
    return null
  }
}

/**
 * Build one `booking_items` line per occupancy band with a positive
 * count, so the committed booking records the real unit (成人 / 儿童)
 * and quantity instead of collapsing onto the option's required unit.
 *
 * Returns undefined — leaving the finance converter's default seeding
 * in place — unless **every** counted band resolves to both a unit and
 * a per-unit price. A partial mapping would stamp the wrong money on a
 * line, which is worse than the (single-line) status quo.
 */
export function bookingItemLinesFromPaxBands(input: {
  optionId: string | null | undefined
  bands: ReadonlyArray<PaxBandSpec>
  counts: Record<string, number>
  unitPriceCentsByUnitId: Map<string, number> | null
}): BookingCreateBridgeInput["itemLines"] | undefined {
  const prices = input.unitPriceCentsByUnitId
  if (!prices || prices.size === 0) return undefined
  const counted = input.bands.filter((band) => (input.counts[band.code] ?? 0) > 0)
  if (counted.length === 0) return undefined
  const lines: NonNullable<BookingCreateBridgeInput["itemLines"]> = []
  for (const band of counted) {
    const unitSellAmountCents = band.unitId ? prices.get(band.unitId) : undefined
    if (!band.unitId || unitSellAmountCents == null) return undefined
    const quantity = input.counts[band.code] ?? 0
    lines.push({
      ...(input.optionId ? { optionId: input.optionId } : {}),
      optionUnitId: band.unitId,
      quantity,
      title: band.label,
      unitSellAmountCents,
      totalSellAmountCents: unitSellAmountCents * quantity,
    })
  }
  return lines.length > 0 ? lines : undefined
}

export function applyAddonSelections(input: {
  priced: PricedQuote
  addons: DraftLike["addons"] | undefined
  addonCatalog: ReadonlyArray<AddonOffer>
  effectivePax: number
}): PricedQuote {
  const extraLines = bookingExtraLinesFromAddonSelections({
    addons: input.addons,
    addonCatalog: input.addonCatalog,
    currency: "EUR",
  })
  if (!extraLines?.length) return input.priced

  const lines: PricedLine[] = [...input.priced.lines]
  let totalCents = input.priced.totalCents
  for (const extra of extraLines) {
    const unitAmount = extra.unitSellAmountCents ?? 0
    const quantity =
      extra.pricingMode === "per_person" || extra.pricedPerPerson
        ? Math.max(1, input.effectivePax) * extra.quantity
        : extra.quantity
    const totalAmount = unitAmount * quantity
    if (totalAmount <= 0) continue
    totalCents += totalAmount
    lines.push({
      kind: "addon",
      label: extra.name,
      quantity,
      unitAmount,
      totalAmount,
    })
  }
  return { totalCents, lines }
}

export function bookingExtraLinesFromAddonSelections(input: {
  addons: DraftLike["addons"] | undefined
  addonCatalog: ReadonlyArray<AddonOffer> | undefined
  currency: string
  quantityMultiplier?: number
}): BookingCreateBridgeInput["extraLines"] | undefined {
  if (!Array.isArray(input.addons) || input.addons.length === 0) return undefined
  const catalogById = new Map((input.addonCatalog ?? []).map((offer) => [offer.id, offer]))
  const lines = input.addons.flatMap((selection) => {
    const offer = catalogById.get(selection.extraId)
    const quantity =
      typeof selection.quantity === "number" && Number.isFinite(selection.quantity)
        ? Math.floor(selection.quantity)
        : 0
    if (!offer || quantity <= 0) return []
    const unitSellAmountCents = offer.unitAmountCents ?? null
    const chargedQuantity =
      offer.pricingMode === "per_person" || offer.pricedPerPerson
        ? quantity * Math.max(1, input.quantityMultiplier ?? 1)
        : quantity
    return [
      {
        productExtraId: offer.id,
        name: offer.name,
        description: offer.description ?? null,
        pricingMode: offer.pricingMode ?? null,
        pricedPerPerson: offer.pricedPerPerson ?? null,
        quantity,
        sellCurrency: offer.currency ?? input.currency,
        unitSellAmountCents,
        totalSellAmountCents:
          unitSellAmountCents == null ? null : unitSellAmountCents * chargedQuantity,
      },
    ]
  })
  return lines.length > 0 ? lines : undefined
}

/**
 * Three-way price computation:
 *
 * 1. **Per-band** (preferred): when `resolvedPrice.unitPrices` matches
 *    at least one band with positive count, sum `pax[band] ×
 *    unit.sellAmountCents` for each matching band. One breakdown line
 *    per band.
 *
 *    Bands are matched to units by `PaxBandSpec.unitId` when the shape
 *    resolved one (the authoritative link), falling back to the unit's
 *    derived `travelerCategory` for generic default bands. Matching on
 *    the unit — not on a display label — is what keeps a 儿童 count
 *    priced at the child rate.
 *
 * 2. **Per-booking**: when no per-band match but `baseSellAmountCents`
 *    is set, charge a single `base × paxCount` line.
 *
 * 3. **Fallback**: `product.sellAmountCents × paxCount`. Same shape as
 *    Phase A behavior, kept for bookings without an option/slot
 *    configured yet.
 */
export function priceQuote(input: {
  product: typeof products.$inferSelect
  resolvedPrice: ResolvedOptionPrice | null
  pax: Partial<Record<string, number>> | undefined
  effectivePax: number
  /** Occupancy bands from the draft shape, when resolved. */
  bands?: ReadonlyArray<PaxBandSpec>
}): PricedQuote {
  const { product, resolvedPrice, pax, effectivePax, bands } = input

  if (resolvedPrice && resolvedPrice.unitPrices.length > 0) {
    const priceByUnitId = new Map<string, number>()
    const priceByCategory = new Map<string, number>()
    for (const unit of resolvedPrice.unitPrices) {
      const sell = unit.sellAmountCents ?? 0
      if (sell <= 0) continue
      priceByUnitId.set(unit.unitId, sell)
      if (unit.travelerCategory && !priceByCategory.has(unit.travelerCategory)) {
        priceByCategory.set(unit.travelerCategory, sell)
      }
    }

    // Prefer the shape's own bands so the breakdown line carries the
    // operator's unit name (成人 / 儿童) rather than an English code.
    const bandRows: Array<{ code: string; label: string; sell: number | undefined }> =
      bands && bands.length > 0
        ? bands.map((band) => ({
            code: band.code,
            label: band.label,
            sell:
              (band.unitId ? priceByUnitId.get(band.unitId) : undefined) ??
              priceByCategory.get(band.code),
          }))
        : resolvedPrice.unitPrices.flatMap((unit) =>
            unit.travelerCategory
              ? [
                  {
                    code: unit.travelerCategory,
                    label: `${product.name} — ${unit.travelerCategory}`,
                    sell: unit.sellAmountCents ?? undefined,
                  },
                ]
              : [],
          )

    const bandLines: PricedLine[] = []
    let total = 0
    for (const row of bandRows) {
      const count = pax?.[row.code] ?? 0
      if (count <= 0) continue
      const sell = row.sell ?? 0
      if (sell <= 0) continue
      const lineTotal = sell * count
      total += lineTotal
      bandLines.push({
        kind: "base",
        label: row.label,
        quantity: count,
        unitAmount: sell,
        totalAmount: lineTotal,
      })
    }
    if (bandLines.length > 0) {
      return { totalCents: total, lines: bandLines }
    }
  }

  if (resolvedPrice && resolvedPrice.baseSellAmountCents !== null) {
    const unitCents = resolvedPrice.baseSellAmountCents
    const totalCents = unitCents * effectivePax
    return {
      totalCents,
      lines: [
        {
          kind: "base",
          label: product.name,
          quantity: effectivePax,
          unitAmount: unitCents,
          totalAmount: totalCents,
        },
      ],
    }
  }

  const unitCents = product.sellAmountCents ?? 0
  const totalCents = unitCents * effectivePax
  return {
    totalCents,
    lines: [
      {
        kind: "base",
        label: product.name,
        quantity: effectivePax,
        unitAmount: unitCents,
        totalAmount: totalCents,
      },
    ],
  }
}

export function readInitialStatus(
  parameters: Record<string, unknown> | undefined,
): BookingCreateBridgeInput["initialStatus"] {
  const allowed: ReadonlyArray<NonNullable<BookingCreateBridgeInput["initialStatus"]>> = [
    "draft",
    "on_hold",
    "awaiting_payment",
    "confirmed",
    "in_progress",
    "completed",
    "cancelled",
    "expired",
  ]
  const raw = parameters?.initialStatus
  return typeof raw === "string" && (allowed as ReadonlyArray<string>).includes(raw)
    ? (raw as BookingCreateBridgeInput["initialStatus"])
    : undefined
}

export function extractInternalNotes(
  party: Record<string, unknown> | undefined,
): string | undefined {
  if (!party) return undefined
  const v = party.internalNotes
  return typeof v === "string" && v.length > 0 ? v : undefined
}

export function extractBillingParty(party: Record<string, unknown> | undefined): {
  personId?: string | null
  organizationId?: string | null
  contactFirstName?: string | null
  contactLastName?: string | null
  contactEmail?: string | null
  contactPhone?: string | null
} {
  const directBilling = asRecord(party?.billing)
  const travelerParty = asRecord(party?.travelerParty)
  const envelopeBilling = asRecord(travelerParty?.billing)
  const billing = envelopeBilling ?? directBilling
  const contact = asRecord(billing?.contact)

  return {
    personId: stringValue(party?.personId) ?? stringValue(billing?.personId),
    organizationId: stringValue(party?.organizationId) ?? stringValue(billing?.organizationId),
    contactFirstName: stringValue(contact?.firstName),
    contactLastName: stringValue(contact?.lastName),
    contactEmail: stringValue(contact?.email),
    contactPhone: stringValue(contact?.phone),
  }
}

// Mirrors `isRealEmail` in @voyant-travel/finance's `requireCompleteBookingParty`
// (and the trips copy). The owned booking handler resolves a CRM person from the
// billing contact before calling `createBooking`, which rejects a blank or
// placeholder email — so the resolver must apply the same rule up front, or it
// orphans a CRM person on every failed checkout. Keep this set in sync with
// finance's `placeholderEmails`.
const placeholderBillingEmails = new Set([
  "noreply@example.com",
  "tbd@example.com",
  "traveler@example.com",
])

export function isRealBillingEmail(value: string | null | undefined): value is string {
  const normalized = value?.trim().toLowerCase() ?? ""
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) && !placeholderBillingEmails.has(normalized)
}

export function extractPartyTravelers(
  party: Record<string, unknown> | undefined,
): Array<{ personId?: string | null }> {
  const travelerParty = asRecord(party?.travelerParty)
  const travelers = Array.isArray(travelerParty?.travelers) ? travelerParty.travelers : []
  return travelers.map((traveler) => ({
    personId: stringValue(asRecord(traveler)?.personId),
  }))
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

export function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

export function extractTaxLines(
  pricing: CommitOwnedRequest["pricing"],
): BookingCreateBridgeInput["taxLines"] {
  const breakdown = pricing?.breakdown
  if (!breakdown || typeof breakdown !== "object" || Array.isArray(breakdown)) return undefined
  const taxes = (breakdown as { taxes?: unknown }).taxes
  if (!Array.isArray(taxes)) return undefined

  const lines: NonNullable<BookingCreateBridgeInput["taxLines"]> = []
  for (const [index, tax] of taxes.entries()) {
    if (!tax || typeof tax !== "object" || Array.isArray(tax)) continue
    const row = tax as Record<string, unknown>
    const amountCents = asFiniteInteger(row.amount)
    const rate = typeof row.rate === "number" && Number.isFinite(row.rate) ? row.rate : null
    const currency =
      typeof pricing?.currency === "string" && pricing.currency.length === 3
        ? pricing.currency
        : "EUR"
    const name = typeof row.label === "string" && row.label.length > 0 ? row.label : "Tax"
    if (!amountCents || amountCents <= 0) continue
    const includedInPrice = row.includedInPrice === true || row.scope === "included"
    lines.push({
      code: typeof row.code === "string" ? row.code : null,
      name,
      scope: includedInPrice ? "included" : "excluded",
      currency,
      amountCents,
      rateBasisPoints: rate == null ? null : Math.round(rate * 10_000),
      includedInPrice,
      sortOrder: index,
    })
  }

  return lines.length ? lines : undefined
}

export function resolveSellAmountCentsOverride(
  pricing: CommitOwnedRequest["pricing"],
): number | null {
  if (!pricing) return null
  const breakdown = pricing.breakdown
  if (hasInclusiveTaxLine(breakdown)) {
    const total = readBreakdownTotal(breakdown)
    if (total != null) return total
  }
  return pricing.base_amount != null ? Math.round(pricing.base_amount) : null
}

export function hasInclusiveTaxLine(breakdown: unknown): boolean {
  if (!breakdown || typeof breakdown !== "object" || Array.isArray(breakdown)) return false
  const taxes = (breakdown as { taxes?: unknown }).taxes
  if (!Array.isArray(taxes)) return false
  return taxes.some((tax) => {
    if (!tax || typeof tax !== "object" || Array.isArray(tax)) return false
    const row = tax as Record<string, unknown>
    return row.includedInPrice === true || row.scope === "included"
  })
}

export function readBreakdownTotal(breakdown: unknown): number | null {
  if (!breakdown || typeof breakdown !== "object" || Array.isArray(breakdown)) return null
  const total = (breakdown as { total?: unknown }).total
  return typeof total === "number" && Number.isFinite(total) ? Math.round(total) : null
}

export function asFiniteInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null
  return Math.round(value)
}

export function defaultBookingNumber(): string {
  const ts = Date.now().toString(36).toUpperCase()
  return `BK-${ts}`
}
