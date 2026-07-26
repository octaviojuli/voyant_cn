/**
 * Owned-arm booking handler for the `products` vertical.
 * agent-quality: file-size exception -- Product booking handler keeps quote, commit, cancel, and status behavior together until booking-engine handlers are split by operation.
 *
 * Per `docs/architecture/booking-journey-architecture.md` §6 +
 * §10 Phase A. Composes:
 *
 *   - The products vertical's existing pricing primitives
 *     (`products.sellAmountCents` / `sellCurrency`) for pricing
 *     basis, with option/unit-specific pax tiers from
 *     `product_pax_pricing_tiers` when the draft selects units.
 *   - `getProductContent` + `buildProductDraftShape` for the journey
 *     wizard's step descriptor.
 *   - An injected `createBooking` function for the commit path
 *     — keeps the Inventory-owned Product handler from depending on
 *     `@voyant-travel/finance` (no workspace cycle).
 *
 * Phase A scope (deliberately narrow):
 *   - Price = product.sellAmountCents × pax_count unless option/unit
 *     pricing, taxes, addons, or Travel Credits are present.
 *   - Commit goes through the bridge into `bookingsCreate`'s input
 *     shape — products-only, no extras / accommodations / cruises / encrypted
 *     travel details / snapshot graph.
 *
 * Phase C+ extensions land on this same handler without re-architecting
 * the dispatch.
 */

import {
  type AddonOffer,
  type BookingDraftShape,
  type CommitOwnedRequest,
  type CommitOwnedResult,
  type ComputeQuoteRequest,
  type ComputeQuoteResult,
  DEFAULT_PAX_BANDS,
  DEFAULT_PAYMENT_INTENTS,
  defaultBookingFields,
  defaultDraftShapeFlags,
  defaultTravelerFields,
  type OwnedBookingHandler,
  type OwnedHandlerContext,
  type PaxBandDependency,
  type PaxBandSpec,
  type ProductVariantOption,
  paxBandsAllowedTotalFrom,
  paxBandsFromOptionUnits,
  resolveTravelerBandCode,
  type TravelerFieldRequirement,
  withResolvedBandUnits,
} from "@voyant-travel/catalog/booking-engine"

import {
  applyAddonSelections,
  bookingExtraLinesFromAddonSelections,
  bookingItemLinesFromOptionSelections,
  bookingItemLinesFromPaxBands,
  defaultBookingNumber,
  extractBillingParty,
  extractInternalNotes,
  extractPartyTravelers,
  extractTaxLines,
  isRealBillingEmail,
  loadProduct,
  normalizeOptionSelections,
  priceOptionSelections,
  priceQuote,
  readInitialStatus,
  resolveBandUnitPrices,
  resolveEffectivePaxCounts,
  resolveSellAmountCentsOverride,
  selectShapeOption,
  sumPax,
} from "./handler-support.js"

// ─────────────────────────────────────────────────────────────────
// Bridged commit path — caller-supplied so the Inventory package
// doesn't depend on @voyant-travel/finance.
// ─────────────────────────────────────────────────────────────────

/**
 * Subset of `bookingsCreate`'s input the bridge builds.
 * Mirrors the schema in `service-booking-create.ts` — kept
 * structural here so we don't pull a dependency into products.
 */
export interface BookingCreateBridgeInput {
  productId: string
  optionId?: string | null
  slotId?: string | null
  pax?: number | null
  /** Hold token created before /book; converted atomically by booking create. */
  availabilityHoldToken?: string
  bookingNumber: string
  personId?: string | null
  organizationId?: string | null
  contactFirstName?: string | null
  contactLastName?: string | null
  contactEmail?: string | null
  contactPhone?: string | null
  internalNotes?: string | null
  /**
   * Override the seed sellAmountCents the booking lands at. The owned
   * commit passes this when the catalog booking-engine's promotion hook
   * has discounted the quote — without it, customers would be charged
   * the product's list price even with a successful promotion. Per
   * docs/architecture/promotions-architecture.md §7.1.
   */
  sellAmountCentsOverride?: number | null
  /**
   * Status the booking lands in. When omitted, `@voyant-travel/finance`'s
   * `createBooking` defaults to `"draft"`. Callers that compose bookings
   * via the catalog booking engine (e.g. trips reserve, journey
   * commit) typically want `"awaiting_payment"` so the booking shows in
   * the operator's queue with a payable balance. The handler forwards
   * whatever value is passed via `commit`'s `request.parameters.initialStatus`.
   */
  initialStatus?:
    | "draft"
    | "on_hold"
    | "awaiting_payment"
    | "confirmed"
    | "in_progress"
    | "completed"
    | "cancelled"
    | "expired"
  travelers?: Array<{
    firstName: string
    lastName: string
    email?: string | null
    phone?: string | null
    personId?: string | null
    participantType: "traveler" | "occupant" | "other"
    travelerCategory?: "adult" | "child" | "infant" | "senior" | "other" | null
    isPrimary?: boolean | null
  }>
  paymentSchedules?: Array<{
    scheduleType: "deposit" | "installment" | "balance" | "hold" | "other"
    status: "pending" | "due" | "paid" | "waived" | "cancelled" | "expired"
    dueDate: string
    currency: string
    amountCents: number
    notes?: string | null
  }>
  documentGeneration?: {
    contractDocument: boolean
    invoiceDocument: boolean
    invoiceType: "invoice" | "proforma"
  }
  /** Suppress post-commit notifications (operator-only). */
  suppressNotifications?: boolean
  /** List/quote price before a manual override (drives the override audit + reason check). */
  catalogSellAmountCents?: number | null
  /** Manual operator price override — wins over the quote/promotion price. */
  confirmedSellAmountCents?: number | null
  /** Required by booking-create when confirmed != catalog. */
  priceOverrideReason?: string | null
  /**
   * Travel Credit to redeem atomically inside the create
   * transaction. booking-create re-validates status / expiry / balance.
   */
  travelCreditRedemption?: { travelCreditId: string; amountCents: number }
  taxLines?: Array<{
    code?: string | null
    name: string
    jurisdiction?: string | null
    scope?: "included" | "excluded" | "withheld"
    currency: string
    amountCents: number
    rateBasisPoints?: number | null
    includedInPrice?: boolean
    remittanceParty?: string | null
    sortOrder?: number
  }>
  itemLines?: Array<{
    optionId?: string | null
    optionUnitId: string
    quantity: number
    title?: string | null
    description?: string | null
    unitSellAmountCents?: number | null
    totalSellAmountCents?: number | null
  }>
  extraLines?: Array<{
    productExtraId: string
    name: string
    description?: string | null
    pricingMode?: string | null
    pricedPerPerson?: boolean | null
    quantity: number
    sellCurrency: string
    unitSellAmountCents?: number | null
    totalSellAmountCents?: number | null
  }>
}

export interface BookingCreateBridgeResult {
  status: "ok" | "product_not_found" | string
  bookingId?: string
  bookingNumber?: string
}

/**
 * Caller-supplied bridge to `bookingsCreate`. Templates wire
 * this up — `(input, opts) => createBooking(db as PostgresJsDatabase, input, opts)`.
 */
export type BookingCreateBridge = (
  input: BookingCreateBridgeInput,
  options?: { userId?: string },
) => Promise<BookingCreateBridgeResult>

/** Billing contact snapshot handed to `ResolveOwnedBillingPerson`. */
export interface OwnedBillingContact {
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
}

/**
 * Caller-supplied bridge that resolves (or creates) a CRM person from a
 * booking's billing contact when the commit carries no `personId` /
 * `organizationId` — e.g. an anonymous storefront checkout for an owned
 * product. Mirrors the bookings module's `resolveBillingPerson` runtime
 * hook (both wire to `relationshipsService.upsertPersonFromContact`), so
 * the owned catalog arm links a customer the same way the session/sourced
 * arm does. Returns the resolved person id, or `null` to leave the
 * booking person unset (the finance layer then rejects a party with no
 * person/org). The operator + trips reserve paths always supply a
 * `personId` directly, so the resolver only fires for anonymous
 * storefront commits. Keeps Inventory free of a direct
 * `@voyant-travel/relationships` dependency.
 */
export type ResolveOwnedBillingPerson = (
  contact: OwnedBillingContact,
  ctx: { bookingId: string; source: string; sourceRef: string },
) => Promise<string | null>

// ─────────────────────────────────────────────────────────────────
// Draft shape — what the wizard reads off the quote response
// ─────────────────────────────────────────────────────────────────

export interface DraftLike {
  configure?: {
    pax?: Partial<Record<string, number>>
    departureSlotId?: string
    departureDate?: string
    departureTime?: string
    variantId?: string
    optionSelections?: Array<{
      optionId: string
      optionName?: string
      optionUnitId?: string
      optionUnitName?: string
      quantity: number
    }>
  }
  billing?: {
    buyerType?: "B2C" | "B2B"
    contact?: { firstName?: string; lastName?: string; email?: string; phone?: string }
    address?: { country?: string }
  }
  travelers?: Array<{
    firstName: string
    lastName: string
    email?: string
    phone?: string
    /** Pax-band code the operator picked; superseded by `dateOfBirth`. */
    band?: string
    /** ISO yyyy-mm-dd. Derives the band — see `resolveTravelerBandCode`. */
    dateOfBirth?: string
  }>
  paymentSchedules?: BookingCreateBridgeInput["paymentSchedules"]
  documentGeneration?: BookingCreateBridgeInput["documentGeneration"]
  suppressNotifications?: boolean
  priceOverride?: { amountCents: number; reason: string }
  travelCreditRedemption?: { travelCreditId: string; amountCents: number }
  addons?: Array<{
    extraId: string
    quantity: number
  }>
}

export interface BuildOwnedProductDraftShapeOptions {
  /**
   * Per-traveler field requirements pulled from
   * `@voyant-travel/bookings/requirements` for this product. Caller-supplied
   * so the Inventory package doesn't depend on booking requirements.
   */
  travelerFields?: ReadonlyArray<TravelerFieldRequirement>
  /**
   * Add-on catalog projected from extras. Caller-supplied so products
   * doesn't depend on the Inventory/Bookings extras owner facades. When omitted,
   * `showsAddons` is false.
   */
  addonCatalog?: ReadonlyArray<AddonOffer>
  /**
   * Product options / variants. These select `draft.configure.variantId`
   * and are distinct from extras: one option changes the underlying
   * booking configuration, while extras add optional line items.
   */
  productOptions?: ReadonlyArray<ProductVariantOption>
  /**
   * Traveler bands derived from the product's configured traveler types
   * (e.g. pricing categories like "Adult" / "Child under 6"). When
   * omitted or empty, falls back to the generic adult/child/infant
   * defaults. `code` must stay aligned with the pricing resolver's
   * traveler-category codes so per-band pricing keeps matching.
   */
  paxBands?: ReadonlyArray<PaxBandSpec>
  /**
   * Cross-band occupancy rules (e.g. "Child under 6 requires an Adult"),
   * derived from the product's pricing-category dependencies. Codes must
   * match the `paxBands` codes.
   */
  paxBandDependencies?: ReadonlyArray<PaxBandDependency>
  /**
   * The option the draft has picked (`draft.configure.variantId`). Its
   * person units are what the occupancy bands resolve against. When
   * omitted, the default option (or the only option) is used.
   */
  selectedOptionId?: string | null
}

/**
 * Resolve the occupancy bands a product offers, in priority order:
 *
 *   1. Caller-supplied bands (Commerce pricing categories), enriched
 *      with the `option_unit` each band bills as so pricing + the
 *      committed `booking_items.option_unit_id` stay in sync.
 *   2. Bands derived directly from the selected option's person units —
 *      the common case. A band the product has no unit for is **not
 *      offered**, so the journey can never collect a Child count that
 *      would silently bill at the adult price.
 *   3. The generic `DEFAULT_PAX_BANDS` when the option carries no
 *      person units at all (charters, room-only products, or a product
 *      configured before units existed).
 */
function resolveShapePaxBands(options: BuildOwnedProductDraftShapeOptions): {
  paxBands: ReadonlyArray<PaxBandSpec>
  option: ProductVariantOption | undefined
} {
  const option = selectShapeOption(options.productOptions ?? [], options.selectedOptionId)
  const units = option?.units ?? []
  if (options.paxBands && options.paxBands.length > 0) {
    return { paxBands: withResolvedBandUnits(options.paxBands, units), option }
  }
  const derived = paxBandsFromOptionUnits(units)
  return { paxBands: derived.length > 0 ? derived : DEFAULT_PAX_BANDS, option }
}

export function buildOwnedProductDraftShape(
  options: BuildOwnedProductDraftShapeOptions = {},
): BookingDraftShape {
  const { paxBands } = resolveShapePaxBands(options)
  const fields = options.travelerFields ?? defaultTravelerFields()
  const addons = options.addonCatalog ?? []
  const variants = options.productOptions ?? []
  const flags = defaultDraftShapeFlags()
  // Room/vehicle-style products sell inventory units (rooms) the operator
  // must pick a quantity of; person-only products price by pax band alone.
  const hasInventoryUnits = variants.some((variant) =>
    variant.units?.some((unit) => unit.unitType === "room" || unit.unitType === "vehicle"),
  )
  return {
    ...flags,
    showsAddons: addons.length > 0,
    paxBands,
    paxBandsAllowedTotal: paxBandsAllowedTotalFrom(paxBands),
    ...(options.paxBandDependencies && options.paxBandDependencies.length > 0
      ? { paxBandDependencies: options.paxBandDependencies }
      : {}),
    travelerFields: fields,
    bookingFields: defaultBookingFields(),
    // Full engine allow list; deployment/surface capabilities narrow it
    // at render time (storefront → card + bank transfer + inquiry). Owned
    // products previously hardcoded ["hold", "card"], which collapsed the
    // storefront's Payment step to card-only (voyant#2741).
    paymentIntents: DEFAULT_PAYMENT_INTENTS,
    configureSubSteps: [
      ...(variants.length > 0 ? [{ kind: "product-option" as const, options: variants }] : []),
      // Owned products are scheduled — the operator picks a real departure.
      // The journey renders an injected slot picker for this kind, falling
      // back to a free date when the product has no scheduled departures.
      { kind: "departure" as const, required: true },
      // Inventory products: the operator picks room/unit quantities for the
      // chosen option + departure. The journey renders an injected units
      // picker that writes `configure.optionSelections`.
      ...(hasInventoryUnits ? [{ kind: "option-units" as const }] : []),
      { kind: "occupancy", bands: paxBands },
    ],
    addons: addons.length > 0 ? { catalog: addons } : undefined,
  }
}

// ─────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────

/** A per-unit price within a resolved option price rule, returned by
 *  `loadResolvedOptionPrice`. The handler matches `travelerCategory`
 *  to the draft's pax-band codes ("adult" / "child" / "infant" /
 *  "senior") to compute per-band totals. Units that don't map to a
 *  band — or whose band has zero count — are dropped. */
export interface ResolvedUnitPrice {
  unitId: string
  unitType: "person" | "room" | "vehicle" | "service" | "group" | "other" | string
  travelerCategory: "adult" | "child" | "infant" | "senior" | null
  sellAmountCents: number | null
}

/** Output of `loadResolvedOptionPrice`. The handler prefers
 *  `unitPrices` (per-band pricing) when present and any unit matches a
 *  pax band; otherwise falls back to `baseSellAmountCents × paxCount`
 *  for per-booking rules; otherwise back to `product.sellAmountCents`. */
export interface ResolvedOptionPrice {
  baseSellAmountCents: number | null
  unitPrices: ReadonlyArray<ResolvedUnitPrice>
}

/** Option/unit-specific pax-tier price from `product_pax_pricing_tiers`. */
export interface ResolvedPaxPricingTier {
  pricePerPaxCents: number
}

/** A resolved tax-rate decision — resolved from `tax_classes` ×
 *  `tax_regimes` × buyer country at quote time. */
export interface ResolvedTaxRate {
  /** Stable code (e.g. "vat-ro-19", "exempt-art311"). */
  code: string
  /** Display label for the breakdown. */
  label: string
  /** Rate as a fraction (0..1). 0 means exempt / zero-rated. */
  rate: number
  /** Whether the configured product price already includes this tax. */
  priceMode?: "inclusive" | "exclusive"
}

/** Caller-supplied loaders for descriptor enrichment. Each is
 *  optional — when omitted the handler returns the default shape.
 *  Templates wire these to the modules they have on hand
 *  (booking requirements, Inventory/Bookings extras, finance). */
export interface OwnedProductsShapeLoaders {
  /**
   * Resolve per-traveler field requirements from
   * @voyant-travel/bookings/requirements. Called per-quote so the descriptor
   * reflects current configuration.
   */
  loadTravelerFields?: (
    ctx: OwnedHandlerContext,
    productId: string,
  ) => Promise<ReadonlyArray<TravelerFieldRequirement>>

  /**
   * Resolve the addon catalog for the product (typically a projection
   * over `extras` + `option_extra_configs`). Caller-supplied to keep
   * the Inventory package free of an extras-owner dependency.
   */
  loadAddonCatalog?: (
    ctx: OwnedHandlerContext,
    productId: string,
  ) => Promise<ReadonlyArray<AddonOffer>>

  /**
   * Resolve product options / variants from the owning products module.
   * Optional for tests and deployments that do not expose option
   * variants in the booking flow.
   */
  loadProductOptions?: (
    ctx: OwnedHandlerContext,
    productId: string,
  ) => Promise<ReadonlyArray<ProductVariantOption>>

  /**
   * Resolve the product's configured traveler types as pax bands
   * (e.g. from Commerce pricing categories). Caller-supplied
   * so the journey's Configure step offers exactly the traveler types
   * the product is priced for ("Adult", "Child under 6", …) instead of
   * the generic adult/child/infant defaults. Returns undefined/empty to
   * fall back to the defaults.
   */
  loadPaxBands?: (
    ctx: OwnedHandlerContext,
    productId: string,
  ) => Promise<ReadonlyArray<PaxBandSpec> | undefined>

  /**
   * Resolve cross-band occupancy rules (e.g. "Child requires an Adult")
   * from the product's pricing-category dependencies. Caller-supplied;
   * codes must match `loadPaxBands`. Returns undefined/empty when the
   * product has no dependency rules.
   */
  loadPaxBandDependencies?: (
    ctx: OwnedHandlerContext,
    productId: string,
  ) => Promise<ReadonlyArray<PaxBandDependency> | undefined>

  /**
   * Resolve the tax rate for a given (product, buyer country) pair.
   * Templates wire this to a function that reads
   * `products.tax_class_id`, `tax_classes.default_regime_id`, and
   * `tax_regimes.rate_percent`. Returns null when tax can't be
   * resolved — the engine renders the breakdown without a tax line.
   *
   * Per booking-journey-architecture §9.
   */
  loadTaxRate?: (
    ctx: OwnedHandlerContext,
    args: {
      productId: string
      buyerCountry?: string
      buyerType?: "B2C" | "B2B"
    },
  ) => Promise<ResolvedTaxRate | null>

  /**
   * Resolve the option price rule for a given (product, option, date)
   * — typically backed by Commerce's
   * `resolveOptionPriceRulesForDate` plus a join into per-unit prices.
   * Returns null when no rule applies or the resolver can't run; the
   * handler then falls back to `product.sellAmountCents × pax`.
   *
   * Caller-supplied so Inventory does not import
   * `@voyant-travel/commerce` (the dependency direction is commerce →
   * inventory, not the reverse).
   */
  loadResolvedOptionPrice?: (
    ctx: OwnedHandlerContext,
    args: {
      productId: string
      optionId: string
      /** ISO yyyy-mm-dd in the slot's local timezone. */
      date: string
      catalogId?: string
    },
  ) => Promise<ResolvedOptionPrice | null>

  /**
   * Resolve Inventory-owned pax pricing for a selected option unit.
   * Defaults to `product_pax_pricing_tiers`, with the selected unit's
   * tier winning over product-level tiers.
   */
  loadPaxPricingTier?: (
    ctx: OwnedHandlerContext,
    args: {
      productId: string
      optionUnitId: string
      tierPax: number
      /** ISO yyyy-mm-dd when the quote is tied to a departure. */
      date?: string | null
    },
  ) => Promise<ResolvedPaxPricingTier | null>

  /**
   * Look up the local date of a departure slot (`availability_slots`).
   * Caller-supplied so the Inventory package does not import
   * `@voyant-travel/operations`. Returns null when the slot is missing.
   *
   * Used together with `loadResolvedOptionPrice` to convert a draft's
   * `departureSlotId` into a date the resolver can match against.
   */
  loadSlotDate?: (ctx: OwnedHandlerContext, slotId: string) => Promise<string | null>
}

/**
 * Caller-supplied availability-hold bridge — keeps the products
 * package free of an `@voyant-travel/operations` dependency. When
 * wired, the handler's `placeHold/extendHold/releaseHold` route
 * through `availability_holds` (real inventory locks). When
 * omitted, the handler falls back to stamping no-ops.
 */
export interface AvailabilityHoldBridge {
  place: (input: {
    draftId: string
    productId: string
    slotId: string
    paxCount: number
    ttlMs: number
    holdToken?: string
  }) => Promise<
    | { status: "ok"; holdToken: string; expiresAt: Date }
    | { status: "slot_not_found" }
    | { status: "insufficient_capacity"; remaining: number; needed: number }
  >
  extend: (input: {
    holdToken: string
    ttlMs: number
  }) => Promise<{ status: "ok"; expiresAt: Date } | { status: "not_found" }>
  release: (holdToken: string) => Promise<void>
}

export interface CreateProductsBookingHandlerOptions extends OwnedProductsShapeLoaders {
  /**
   * Caller-supplied bridge to `bookingsCreate`. Wired by the
   * template at boot, since Inventory does not import
   * `@voyant-travel/finance`.
   */
  createBooking: BookingCreateBridge
  /**
   * Optional bridge that resolves/creates a CRM person from the billing
   * contact when a commit carries no `personId`/`organizationId` (the
   * anonymous storefront checkout case). Wired by the template to
   * `relationshipsService.upsertPersonFromContact`. When omitted, the
   * commit forwards the raw contact snapshot and the finance layer's
   * billing-party check rejects a party with no person/org.
   */
  resolveBillingPerson?: ResolveOwnedBillingPerson
  /**
   * Generator for booking numbers. May be async so deployments can
   * allocate from a persisted number series (the operator runtime wires
   * `allocateBookingNumber`, which continues whatever series the
   * workspace already issues — `VYT-CN-2026-00003` after
   * `VYT-CN-2026-00002`). Falls back to a timestamp-based `BK-…` value
   * only when nothing is wired and no series can be inferred.
   */
  generateBookingNumber?: () => string | Promise<string>
  /**
   * Optional inventory-hold bridge. When wired, `placeHold`
   * decrements `availability_slots.remainingPax` against the
   * draft's chosen slot; `releaseHold` restores it. When omitted,
   * the handler returns a stamping token without touching
   * inventory.
   */
  holds?: AvailabilityHoldBridge
}

/**
 * Run an optional enrichment loader so a single failure (a missing
 * migration, a flaky query) never rejects the quote. The journey
 * descriptor — steps, pax bands, options, extras, units — must always
 * render; a broken enrichment source degrades to `undefined`, not a
 * collapsed booking shape. Logs the cause for diagnosis.
 */
async function safeLoad<T>(label: string, promise: Promise<T> | undefined): Promise<T | undefined> {
  if (!promise) return undefined
  try {
    return await promise
  } catch (error) {
    console.warn(`[products/booking-engine] ${label} failed; continuing without it`, error)
    return undefined
  }
}

/**
 * Narrow a resolved band code onto the traveler-category enum the
 * booking row stores. Vertical-specific bands (`student`, …) have no
 * column value and fall back to `adult`.
 */
function travelerCategoryForBand(
  code: string,
): NonNullable<NonNullable<BookingCreateBridgeInput["travelers"]>[number]["travelerCategory"]> {
  return code === "child" || code === "infant" || code === "senior" ? code : "adult"
}

export function createProductsBookingHandler(
  options: CreateProductsBookingHandlerOptions,
): OwnedBookingHandler {
  const generateNumber = options.generateBookingNumber ?? defaultBookingNumber

  return {
    entityModule: "products",

    async computeQuote(
      ctx: OwnedHandlerContext,
      request: ComputeQuoteRequest,
    ): Promise<ComputeQuoteResult> {
      const product = await loadProduct(ctx.db, request.entityId)
      if (!product) {
        return { available: false, invalidReason: "product_not_found" }
      }
      if (product.status !== "active" && product.status !== "draft") {
        return {
          available: false,
          invalidReason: `product_status_${product.status}`,
        }
      }

      const draft = (request.draft ?? {}) as DraftLike
      const optionId = draft.configure?.variantId
      const optionSelections = normalizeOptionSelections(draft.configure?.optionSelections)
      const slotId = draft.configure?.departureSlotId

      // Concurrent enrichment + slot-date lookup. The slot date is
      // needed before we can call loadResolvedOptionPrice, so it
      // joins this batch.
      const [
        travelerFields,
        addonCatalog,
        productOptionCatalog,
        paxBands,
        paxBandDependencies,
        taxRate,
        slotDate,
      ] = await Promise.all([
        safeLoad("loadTravelerFields", options.loadTravelerFields?.(ctx, request.entityId)),
        safeLoad("loadAddonCatalog", options.loadAddonCatalog?.(ctx, request.entityId)),
        safeLoad("loadProductOptions", options.loadProductOptions?.(ctx, request.entityId)),
        safeLoad("loadPaxBands", options.loadPaxBands?.(ctx, request.entityId)),
        safeLoad(
          "loadPaxBandDependencies",
          options.loadPaxBandDependencies?.(ctx, request.entityId),
        ),
        safeLoad(
          "loadTaxRate",
          options.loadTaxRate?.(ctx, {
            productId: request.entityId,
            buyerCountry: draft.billing?.address?.country,
            buyerType: draft.billing?.buyerType,
          }),
        ),
        slotId && options.loadSlotDate
          ? safeLoad("loadSlotDate", options.loadSlotDate(ctx, slotId)).then(
              (date) => date ?? draft.configure?.departureDate ?? null,
            )
          : Promise.resolve(draft.configure?.departureDate ?? null),
      ])

      // The journey descriptor never depends on pricing — build it
      // unconditionally so the wizard always renders the right steps,
      // bands, options, extras and units. Pricing is best-effort: a
      // failure here returns the shape with no price rather than 500ing
      // the quote (which would collapse the shape to the bare default).
      const shape = buildOwnedProductDraftShape({
        travelerFields,
        addonCatalog,
        productOptions: productOptionCatalog,
        paxBands,
        paxBandDependencies,
        selectedOptionId: optionId,
      })

      // The traveler roster is the more specific statement of who is
      // travelling — a traveler moved to the Child band (or carrying a
      // child's date of birth) must reprice, not stay billed as an
      // adult. `resolveEffectivePaxCounts` documents when the roster
      // wins over the Configure-step counts.
      const effectiveCounts = resolveEffectivePaxCounts({
        pax: draft.configure?.pax,
        travelers: draft.travelers,
        bands: shape.paxBands,
      })

      let available = false
      let pricing: ComputeQuoteResult["pricing"]
      try {
        const resolvedPrice =
          optionSelections.length === 0 && optionId && slotDate && options.loadResolvedOptionPrice
            ? await options.loadResolvedOptionPrice(ctx, {
                productId: request.entityId,
                optionId,
                date: slotDate,
              })
            : null

        const paxCount = sumPax(effectiveCounts.counts)
        // Per-pax pricing fallback: when no pax is supplied yet, quote a
        // single-occupant baseline so the wizard can render a starter
        // total before the user picks counts.
        const effectivePax = paxCount > 0 ? paxCount : 1

        const priced =
          optionSelections.length > 0
            ? await priceOptionSelections({
                ctx,
                options,
                product,
                productOptions: productOptionCatalog ?? [],
                selections: optionSelections,
                slotDate,
                effectivePax,
              })
            : priceQuote({
                product,
                resolvedPrice,
                pax: effectiveCounts.counts,
                effectivePax,
                bands: shape.paxBands,
              })
        const pricedWithAddons = applyAddonSelections({
          priced,
          addons: draft.addons,
          addonCatalog: addonCatalog ?? [],
          effectivePax,
        })

        // Tax computation. The base is taxable; addons/accommodation
        // get the same rate in this MVP cut. Per-line override (the
        // `applies_to` axis on tax_classes.lines) lands in a follow-up
        // when the catalog actually carries mixed treatments.
        const taxIsInclusive = taxRate?.priceMode === "inclusive"
        const grossCents = pricedWithAddons.totalCents
        const taxCents =
          taxRate && taxRate.rate > 0
            ? taxIsInclusive
              ? Math.round(grossCents - grossCents / (1 + taxRate.rate))
              : Math.round(grossCents * taxRate.rate)
            : 0
        const netCents = taxIsInclusive ? grossCents - taxCents : grossCents
        const payableCents = taxIsInclusive ? grossCents : netCents + taxCents

        available = grossCents > 0
        pricing = available
          ? {
              base_amount: netCents,
              taxes: taxCents,
              fees: 0,
              surcharges: 0,
              currency: product.sellCurrency,
              breakdown: {
                // `currency` is required for the API serializer to use this
                // itemized breakdown instead of synthesizing a single "Base"
                // line from base_amount.
                currency: product.sellCurrency,
                lines: pricedWithAddons.lines.map((line) => ({
                  ...line,
                  taxIncluded: taxIsInclusive,
                })),
                taxes:
                  taxRate && taxCents > 0
                    ? [
                        {
                          code: taxRate.code,
                          label: taxRate.label,
                          rate: taxRate.rate,
                          amount: taxCents,
                          base: netCents,
                          includedInPrice: taxIsInclusive,
                          scope: taxIsInclusive ? "included" : "excluded",
                        },
                      ]
                    : [],
                subtotal: netCents,
                taxTotal: taxCents,
                total: payableCents,
                paxCount: effectivePax,
              } as Record<string, unknown>,
            }
          : undefined
      } catch (error) {
        console.warn(
          "[products/booking-engine] pricing failed; returning shape without a price",
          error,
        )
        available = false
        pricing = undefined
      }

      return {
        available,
        invalidReason: available ? undefined : "no_sell_amount_configured",
        pricing,
        shape,
      }
    },

    /**
     * Place a soft hold on the row's chosen slot. When the
     * `holds` bridge is wired, decrements
     * `availability_slots.remainingPax` against the slot for the
     * pax count; concurrent placeHold attempts are serialized via
     * a row-level lock inside the bridge. When omitted, returns a
     * stamping token without touching inventory.
     *
     * The slot id and pax count are pulled off
     * `request.parameters.slotId` / `request.parameters.paxCount`
     * — the journey wizard threads these from the draft's
     * Configure step (`departureSlotId` + summed `pax`).
     */
    async placeHold(_ctx: OwnedHandlerContext, request) {
      const token = request.draftId ?? defaultBookingNumber()
      const expiresAt = new Date(Date.now() + request.ttlMs)
      if (!options.holds) {
        return { holdToken: token, expiresAt }
      }
      const params = (request.parameters ?? {}) as {
        slotId?: string
        paxCount?: number
        productId?: string
      }
      const slotId = params.slotId
      const paxCount = params.paxCount ?? 1
      if (!slotId || !request.draftId) {
        // No slot chosen yet → no inventory to lock. Return a
        // stamping token so the journey can still call extend /
        // release.
        return { holdToken: token, expiresAt }
      }
      const result = await options.holds.place({
        draftId: request.draftId,
        productId: params.productId ?? request.entityId,
        slotId,
        paxCount,
        ttlMs: request.ttlMs,
        holdToken: token,
      })
      if (result.status === "ok") {
        return { holdToken: result.holdToken, expiresAt: result.expiresAt }
      }
      // Capacity / lookup failures fall back to a stamping token
      // — the journey commit will revalidate via the engine's
      // re-quote and reject if capacity has dried up.
      return { holdToken: token, expiresAt }
    },

    async extendHold(_ctx: OwnedHandlerContext, holdToken: string, request?: { ttlMs?: number }) {
      const ttlMs = request?.ttlMs ?? 30 * 60 * 1000
      if (options.holds) {
        const result = await options.holds.extend({ holdToken, ttlMs })
        if (result.status === "ok") {
          return { holdToken, expiresAt: result.expiresAt }
        }
      }
      return { holdToken, expiresAt: new Date(Date.now() + ttlMs) }
    },

    async releaseHold(_ctx: OwnedHandlerContext, holdToken: string) {
      if (options.holds) {
        await options.holds.release(holdToken)
      }
    },

    async commit(
      ctx: OwnedHandlerContext,
      request: CommitOwnedRequest,
    ): Promise<CommitOwnedResult> {
      const draft = (request.draft ?? {}) as DraftLike
      const configuredPax = sumPax(draft.configure?.pax)
      const availabilityHoldToken =
        typeof request.parameters?.availabilityHoldToken === "string"
          ? request.parameters.availabilityHoldToken
          : undefined
      // Defensive product load — the bridge will fail with
      // `product_not_found` anyway, but a clean early-return keeps the
      // commit path's error envelope predictable.
      const product = await loadProduct(ctx.db, request.entityId)
      if (!product) {
        return {
          status: "failed",
          orderRef: "",
          upstreamPayload: { reason: "product_not_found" },
        }
      }

      const partyBilling = extractBillingParty(request.party)
      const partyTravelers = extractPartyTravelers(request.party)

      // Billing arrives two ways. The operator/trips paths pass an explicit
      // `party`. The anonymous storefront path POSTs only a draftId to
      // `/v1/public/catalog/book`, so `request.party` is empty and the billing
      // contact lives in the saved draft (`draft.billing.contact`). Prefer the
      // explicit party, fall back to the draft, so BOTH paths stamp the booking
      // contact and can resolve a customer.
      const draftBillingContact = draft.billing?.contact
      // Normalize contact points the way `createBooking`'s
      // `requireCompleteBookingParty` does, so the resolver only fires for a
      // contact it will actually accept. The draft schema defaults `email` to ""
      // and a saved draft can carry whitespace-only or placeholder values
      // (`traveler@example.com`, `foo`). `createBooking` rejects a blank OR
      // placeholder/invalid email even when a phone is present, so any of those
      // must be treated as absent here — otherwise the resolver creates a CRM
      // person that `createBooking` then rejects, orphaning a row on every retry.
      const trimToNull = (value: string | null | undefined): string | null => {
        const trimmed = value?.trim()
        return trimmed ? trimmed : null
      }
      const candidateEmail = partyBilling.contactEmail ?? draftBillingContact?.email
      const billingContact = {
        firstName: partyBilling.contactFirstName ?? draftBillingContact?.firstName ?? null,
        lastName: partyBilling.contactLastName ?? draftBillingContact?.lastName ?? null,
        email: isRealBillingEmail(candidateEmail) ? candidateEmail.trim() : null,
        phone: trimToNull(partyBilling.contactPhone ?? draftBillingContact?.phone),
      }

      // Generate the booking number up front so it can double as the resolved
      // person's provenance ref below. `request.bookingId` is only the
      // provisional id `bookEntity` allocates — the finance bridge mints its own
      // persisted booking id (which `bookEntity` then adopts), so stamping
      // `request.bookingId` would point new CRM people at a booking row that
      // never exists. The booking NUMBER is caller-supplied, written straight to
      // the booking row, and known before the create — a stable, resolvable ref.
      const bookingNumber = await generateNumber()

      // Resolve the same bands the quote used so the committed booking
      // records the unit each traveler is actually billed as. Enrichment
      // failures degrade to the pre-existing behaviour (finance seeds a
      // single required-unit row) rather than failing the commit.
      const commitOptionId = draft.configure?.variantId ?? null
      const commitProductOptions = await safeLoad(
        "loadProductOptions",
        options.loadProductOptions?.(ctx, request.entityId),
      )
      const { paxBands: commitBands, option: commitBandOption } = resolveShapePaxBands({
        productOptions: commitProductOptions,
        paxBands: await safeLoad("loadPaxBands", options.loadPaxBands?.(ctx, request.entityId)),
        selectedOptionId: commitOptionId,
      })
      const commitCounts = resolveEffectivePaxCounts({
        pax: draft.configure?.pax,
        travelers: draft.travelers,
        bands: commitBands,
      })

      const travelers = (draft.travelers ?? []).map((t, index) => ({
        firstName: t.firstName,
        lastName: t.lastName,
        email: t.email,
        phone: t.phone,
        personId: partyTravelers[index]?.personId ?? null,
        participantType: "traveler" as const,
        // Date of birth wins over the picked band when it resolves to
        // one of the product's bands — the band is derivable, so a
        // stale hand-picked value must not outrank a real birthday.
        travelerCategory: travelerCategoryForBand(resolveTravelerBandCode(t, commitBands)),
      }))

      // Resolve (or create) a customer person from the billing contact when no
      // CRM person/organization id is supplied — the anonymous storefront case
      // — same as the sourced/session arm's `resolveBillingPerson`, so
      // `createBooking`'s billing-party check passes and the owned booking links
      // a real CRM record instead of 400ing "Select a billing person or
      // organization". No-op when a person/org is already supplied
      // (operator/trips) or no resolver is wired.
      let billingPersonId = partyBilling.personId ?? null
      const billingOrganizationId = partyBilling.organizationId ?? null
      if (!billingPersonId && !billingOrganizationId && options.resolveBillingPerson) {
        // Resolving persists a CRM person BEFORE `createBooking` runs, so only
        // resolve when the WHOLE party will pass `createBooking`'s
        // `requireCompleteBookingParty` — otherwise the commit rejects after a
        // person already exists, orphaning it (with a booking-number `sourceRef`
        // that never materializes). Mirror the checks that apply to the
        // anonymous storefront input: the billing person needs BOTH a first and
        // last name AND a real email or phone, and there must be at least one
        // traveler, each with a name (or linked person) and no placeholder
        // email. (The person/org-supplied operator + trips paths skip this
        // block entirely; Travel Credit/price-override rejections are operator-only
        // fields absent from anonymous drafts.)
        const hasBillingContactPoint =
          Boolean(billingContact.email) || Boolean(billingContact.phone)
        const hasBillingName =
          Boolean(billingContact.firstName?.trim()) && Boolean(billingContact.lastName?.trim())
        const hasBookableTravelers =
          travelers.length > 0 &&
          travelers.every(
            (t) =>
              (Boolean(t.personId) ||
                (Boolean(t.firstName?.trim()) && Boolean(t.lastName?.trim()))) &&
              (!t.email || isRealBillingEmail(t.email)),
          )
        if (hasBillingContactPoint && hasBillingName && hasBookableTravelers) {
          billingPersonId = await options.resolveBillingPerson(billingContact, {
            bookingId: bookingNumber,
            source: "storefront-booking",
            sourceRef: bookingNumber,
          })
        }
      }

      // Promotion-discounted quotes: thread the discounted customer-
      // facing amount into the booking's seed sellAmountCents so
      // checkout / payment see the quoted amount, not the product list
      // price. Inclusive-tax quotes rewrite `base_amount` to net
      // subtotal during tax recompute, so derive the override from the
      // gross breakdown total when an included tax line is present.
      const sellAmountCentsOverride = resolveSellAmountCentsOverride(request.pricing)
      const optionSelections = normalizeOptionSelections(draft.configure?.optionSelections)
      const selectedOptionIds = [
        ...new Set(optionSelections.map((selection) => selection.optionId)),
      ]
      const primaryOptionId =
        selectedOptionIds.length === 1
          ? selectedOptionIds[0]
          : optionSelections.length === 0
            ? (draft.configure?.variantId ?? null)
            : null

      // Per-band item lines. Without them the finance converter seeds a
      // single row against the option's *required* unit (成人) for the
      // whole party, so a mixed booking committed 2 × Adult even though
      // one traveler was a child. Emitted only when every positively
      // counted band resolves to a unit AND a per-unit sell amount — a
      // partial mapping would put wrong money on the line, so we fall
      // back to the converter's seeding instead.
      const bandUnitPrices =
        optionSelections.length === 0 && commitBandOption && commitOptionId
          ? await resolveBandUnitPrices({
              ctx,
              options,
              productId: product.id,
              optionId: commitOptionId,
              draft,
            })
          : null
      const bandItemLines = bookingItemLinesFromPaxBands({
        optionId: commitOptionId,
        bands: commitBands,
        counts: commitCounts.counts,
        unitPriceCentsByUnitId: bandUnitPrices,
      })

      const bridge = await options.createBooking({
        productId: product.id,
        optionId: primaryOptionId,
        // Link the departure so the booking item carries availability_slot_id
        // (powers the duplicate-departure check + slot-level reporting).
        slotId: draft.configure?.departureSlotId ?? null,
        pax: configuredPax > 0 ? configuredPax : travelers.length || null,
        availabilityHoldToken,
        bookingNumber,
        personId: billingPersonId,
        organizationId: billingOrganizationId,
        contactFirstName: billingContact.firstName,
        contactLastName: billingContact.lastName,
        contactEmail: billingContact.email,
        contactPhone: billingContact.phone,
        internalNotes: extractInternalNotes(request.party),
        travelers: travelers.length > 0 ? travelers : undefined,
        paymentSchedules: draft.paymentSchedules,
        documentGeneration: draft.documentGeneration
          ? {
              contractDocument: draft.documentGeneration.contractDocument === true,
              invoiceDocument: draft.documentGeneration.invoiceDocument === true,
              invoiceType:
                draft.documentGeneration.invoiceType === "proforma" ? "proforma" : "invoice",
            }
          : undefined,
        suppressNotifications: draft.suppressNotifications,
        sellAmountCentsOverride,
        // Manual operator override: `confirmedSellAmountCents` wins over the
        // quote/promotion price; the quote total is the `catalog` baseline so
        // booking-create's override audit + required-reason check fire correctly.
        ...(draft.priceOverride
          ? {
              catalogSellAmountCents: sellAmountCentsOverride ?? null,
              confirmedSellAmountCents: draft.priceOverride.amountCents,
              priceOverrideReason: draft.priceOverride.reason.trim() || null,
            }
          : {}),
        // Operator-applied Travel Credit. booking-create
        // redeems it atomically and re-checks status / expiry / balance.
        travelCreditRedemption: draft.travelCreditRedemption,
        taxLines: extractTaxLines(request.pricing),
        itemLines: bookingItemLinesFromOptionSelections(optionSelections) ?? bandItemLines,
        extraLines: bookingExtraLinesFromAddonSelections({
          addons: draft.addons,
          addonCatalog: await options.loadAddonCatalog?.(ctx, product.id),
          currency: product.sellCurrency,
          quantityMultiplier: Math.max(1, travelers.length || 1),
        }),
        initialStatus: readInitialStatus(request.parameters) ?? "on_hold",
      })

      if (bridge.status !== "ok" || !bridge.bookingId) {
        return {
          status: "failed",
          orderRef: "",
          upstreamPayload: { bridge },
        }
      }

      return {
        status: "held",
        bookingId: bridge.bookingId,
        orderRef: bridge.bookingNumber ?? bridge.bookingId,
        pricing: request.pricing,
        upstreamPayload: { bridgeBookingId: bridge.bookingId },
      }
    },
  }
}
