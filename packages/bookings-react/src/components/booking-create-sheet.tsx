// agent-quality: file-size exception -- owner: bookings-react; existing UI surface stays co-located until a dedicated split preserves behavior and tests.
"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  type PricingAssignmentUnit,
  resolveBookingDraft,
  resolveBookingExtraLines,
  travelersToRows,
} from "@voyant-travel/bookings/pricing-assignment"
import {
  useOptionUnitPriceRules,
  usePricingCategories,
} from "@voyant-travel/commerce-react/pricing"
import { useAddresses } from "@voyant-travel/identity-react"
import { useProduct } from "@voyant-travel/inventory-react"
import {
  availabilityQueryKeys,
  getSlotQueryOptions,
  useSlots,
  useSlotUnitAvailability,
  useVoyantAvailabilityContext,
} from "@voyant-travel/operations-react/availability"
import { useOrganization, usePerson } from "@voyant-travel/relationships-react"
import {
  Button,
  Checkbox,
  Label,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Textarea,
} from "@voyant-travel/ui/components"
import { AsyncCombobox } from "@voyant-travel/ui/components/async-combobox"
import { Loader2 } from "lucide-react"
import * as React from "react"
import {
  formatMessage,
  useBookingsUiI18nOrDefault,
  useBookingsUiMessagesOrDefault,
} from "../i18n/provider.js"
import {
  type BookingCreateExtraLineInput,
  type BookingCreateGroupMembershipInput,
  type BookingCreateTravelCreditRedemptionInput,
  type BookingRecord,
  useBookingCreateMutation,
  usePricingPreview,
  VoyantApiError,
} from "../index.js"
import {
  findAlreadyPaidInstallmentMissingPaymentDate,
  formatPayloadResolverMismatchError,
  generateBookingNumber,
  hasAnyPaidPayment,
  inferTravelerPricingCategoryId,
  isBookingInventoryUnit,
  isPayloadResolverMismatchBody,
  mergePricingRoomMetadata,
  normalizeBookingUnit,
  type PricingCategoryLike,
  paymentScheduleToRows,
  pricingSnapshotRoomUnits,
  sameRoomUnits,
  stripOptionPrefix,
  stripUnitSuffix,
} from "./booking-create-form-utils.js"
import { BookingPreviewCard } from "./booking-create-preview-card.js"
import { ProductExtrasPickerSection } from "./booking-create-product-extras-picker.js"
import {
  getBookableDepartureSlots,
  getOverCapacityInventoryAssignments,
  getSelectedSharedRoomUnitId,
  getTravelerAssignableStepperUnits,
  isRealBookingEmail,
  itemLinesToRows,
  validateBillingPersonContact,
} from "./booking-create-utils.js"
import {
  emptyOptionUnitsStepperValue,
  OptionUnitsStepperSection,
  type OptionUnitsStepperUnit,
  type OptionUnitsStepperValue,
} from "./option-units-stepper-section.js"
import {
  emptyPaymentScheduleValue,
  PaymentScheduleSection,
  type PaymentScheduleValue,
} from "./payment-schedule-section.js"
import {
  emptyPersonPickerValue,
  PersonPickerSection,
  type PersonPickerValue,
} from "./person-picker-section.js"
import type { PriceBreakdownValue } from "./price-breakdown-section.js"
import { ProductPickerSection, type ProductPickerValue } from "./product-picker-section.js"
import {
  emptySharedRoomValue,
  SharedRoomSection,
  type SharedRoomValue,
} from "./shared-room-section.js"
import {
  emptyTravelCreditPickerValue,
  TravelCreditPickerSection,
  type TravelCreditPickerValue,
} from "./travel-credit-picker-section.js"
import {
  emptyTravelerListValue,
  type RoomGroup,
  type RoomUnitOption,
  type TravelerListValue,
  type TravelerPricingCategoryOption,
  TravelersSection,
} from "./travelers-section.js"

export interface BookingCreateSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (booking: BookingRecord) => void
  /** When provided, pre-selects this product and hides the product picker. */
  defaultProductId?: string
  /** When provided, pre-selects and locks the departure slot. */
  defaultSlotId?: string
}

export interface BookingCreateFormProps {
  onCreated?: (booking: BookingRecord) => void
  /** When provided, pre-selects this product and hides the product picker. */
  defaultProductId?: string
  /** When provided, pre-selects and locks the departure slot. */
  defaultSlotId?: string
  /** Gates data fetching and resets transient form state when false. */
  enabled?: boolean
  onCancel?: () => void
}

/**
 * Operator booking-create sheet. Composes the booking-create picker
 * sections — product, departure, rooms, person, shared-room, travelers,
 * price breakdown, Travel Credit, payment schedule, and submits via the atomic
 * `POST /v1/admin/bookings/create` endpoint so partial failures can't
 * leave orphan state.
 *
 * Normally consumed via `BookingDialog` which delegates here when no
 * `booking` prop is passed. Apps that need a bespoke flow can install the
 * sections individually and assemble their own sheet instead of forking.
 */
export function BookingCreateSheet({
  open,
  onOpenChange,
  onCreated,
  defaultProductId,
  defaultSlotId,
}: BookingCreateSheetProps) {
  const messages = useBookingsUiMessagesOrDefault()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-[64rem]!"
      >
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle>{messages.bookingCreateDialog.title}</SheetTitle>
          <SheetDescription className="sr-only">
            {messages.bookingCreateDialog.title}
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <BookingCreateForm
            enabled={open}
            defaultProductId={defaultProductId}
            defaultSlotId={defaultSlotId}
            onCancel={() => onOpenChange(false)}
            onCreated={(booking) => {
              onOpenChange(false)
              onCreated?.(booking)
            }}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function BookingCreateForm({
  onCreated,
  defaultProductId,
  defaultSlotId,
  enabled = true,
  onCancel,
}: BookingCreateFormProps) {
  const [product, setProduct] = React.useState<ProductPickerValue>({
    productId: defaultProductId ?? "",
    optionId: null,
  })
  const [slotId, setSlotId] = React.useState<string | null>(defaultSlotId ?? null)
  const [rooms, setRooms] = React.useState<OptionUnitsStepperValue>(emptyOptionUnitsStepperValue)
  const [roomUnits, setRoomUnits] = React.useState<OptionUnitsStepperUnit[]>([])
  const [extraLines, setExtraLines] = React.useState<BookingCreateExtraLineInput[]>([])
  const [person, setPerson] = React.useState<PersonPickerValue>(emptyPersonPickerValue)
  const [sharedRoom, setSharedRoom] = React.useState<SharedRoomValue>(emptySharedRoomValue)
  const [travelers, setTravelers] = React.useState<TravelerListValue>(emptyTravelerListValue)
  const [travelCredit, setTravelCredit] = React.useState<TravelCreditPickerValue>(
    emptyTravelCreditPickerValue,
  )
  const [pricing, setPricing] = React.useState<PriceBreakdownValue | null>(null)
  const [paymentSchedule, setPaymentScheduleState] =
    React.useState<PaymentScheduleValue>(emptyPaymentScheduleValue)
  // Tracks whether the operator has manually touched the schedule. The
  // "default the due date to departure" effect below uses this to bow
  // out once the operator has typed their own dates / amounts / paid
  // markers — otherwise we'd thrash their input every time the slot's
  // startsAt re-resolves (combobox re-renders, slot query refetch, …).
  const paymentScheduleTouchedRef = React.useRef(false)
  const setPaymentSchedule = React.useCallback((next: PaymentScheduleValue) => {
    paymentScheduleTouchedRef.current = true
    setPaymentScheduleState(next)
  }, [])
  /**
   * Mutually-exclusive document toggles. "Proforma" issues a single
   * placeholder invoice; "Invoice + contract" issues a final invoice
   * alongside the customer contract. Either off → no documents.
   */
  const [generateProforma, setGenerateProformaState] = React.useState(false)
  const [generateInvoiceAndContract, setGenerateInvoiceAndContractState] = React.useState(false)
  const setGenerateProforma = (next: boolean) => {
    setGenerateProformaState(next)
    if (next) setGenerateInvoiceAndContractState(false)
  }
  const setGenerateInvoiceAndContract = (next: boolean) => {
    setGenerateInvoiceAndContractState(next)
    if (next) setGenerateProformaState(false)
  }
  const [notes, setNotes] = React.useState("")
  // Only relevant when the derived status is `confirmed`: when off,
  // the status transition carries `suppressNotifications: true` so
  // the auto-dispatch subscriber skips the customer email + document
  // bundle. Defaults on so the operator opts out, not in.
  const [notifyTraveler, setNotifyTraveler] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [payloadMismatchUnitIds, setPayloadMismatchUnitIds] = React.useState<string[]>([])
  const { formatDate } = useBookingsUiI18nOrDefault()
  const messages = useBookingsUiMessagesOrDefault()
  const availabilityClient = useVoyantAvailabilityContext()
  const defaultSlotQuery = useQuery({
    ...getSlotQueryOptions(availabilityClient, defaultSlotId),
    enabled: enabled && Boolean(defaultSlotId),
  })
  const defaultSlot = defaultSlotQuery.data?.data ?? null
  const resolvedDefaultProductId = defaultProductId ?? defaultSlot?.productId ?? ""

  React.useEffect(() => {
    if (!enabled) {
      setProduct({
        productId: resolvedDefaultProductId,
        optionId: defaultSlotId ? (defaultSlot?.optionId ?? null) : null,
      })
      setSlotId(defaultSlotId ?? null)
      setRooms(emptyOptionUnitsStepperValue)
      setRoomUnits([])
      setExtraLines([])
      setPerson(emptyPersonPickerValue)
      setSharedRoom(emptySharedRoomValue)
      setTravelers(emptyTravelerListValue)
      setTravelCredit(emptyTravelCreditPickerValue)
      setPricing(null)
      setPaymentScheduleState(emptyPaymentScheduleValue)
      paymentScheduleTouchedRef.current = false
      setGenerateProformaState(false)
      setGenerateInvoiceAndContractState(false)
      setNotes("")
      setNotifyTraveler(true)
      setError(null)
      setPayloadMismatchUnitIds([])
    } else if (resolvedDefaultProductId) {
      setProduct((prev) => {
        const optionId = defaultSlotId
          ? (defaultSlot?.optionId ?? null)
          : prev.productId === resolvedDefaultProductId
            ? prev.optionId
            : null
        return prev.productId === resolvedDefaultProductId && prev.optionId === optionId
          ? prev
          : { productId: resolvedDefaultProductId, optionId }
      })
      if (defaultSlotId) setSlotId(defaultSlotId)
    }
  }, [enabled, resolvedDefaultProductId, defaultSlotId, defaultSlot?.optionId])

  // biome-ignore lint/correctness/useExhaustiveDependencies: booking-create intentionally resets transient departure state only when product id changes; option changes are reconciled against the selected departure below.
  React.useEffect(() => {
    setSlotId(defaultSlotId ?? null)
    setRooms(emptyOptionUnitsStepperValue)
    setRoomUnits([])
    setSharedRoom(emptySharedRoomValue)
    setExtraLines([])
    setPayloadMismatchUnitIds([])
  }, [product.productId, defaultSlotId])

  const [slotsFromIso, setSlotsFromIso] = React.useState(() => new Date().toISOString())
  React.useEffect(() => {
    if (enabled && product.productId) setSlotsFromIso(new Date().toISOString())
  }, [enabled, product.productId])

  const { data: slotsData } = useSlots({
    productId: product.productId || undefined,
    status: "open",
    startsAtFrom: slotsFromIso,
    limit: 100,
    enabled: enabled && Boolean(product.productId),
  })
  const allOpenSlots = React.useMemo(() => {
    return getBookableDepartureSlots(slotsData?.data ?? [], {
      nowIso: slotsFromIso,
      optionId: null,
    })
  }, [slotsData?.data, slotsFromIso])
  const slots = React.useMemo(() => {
    const optionSlots = getBookableDepartureSlots(slotsData?.data ?? [], {
      nowIso: slotsFromIso,
      optionId: product.optionId,
    })
    return optionSlots.length > 0 ? optionSlots : allOpenSlots
  }, [slotsData?.data, slotsFromIso, product.optionId, allOpenSlots])
  const selectedSlot = React.useMemo(
    () =>
      slots.find((slot) => slot.id === slotId) ?? (defaultSlot?.id === slotId ? defaultSlot : null),
    [slots, slotId, defaultSlot],
  )
  // Default the single Full-mode installment's due date to the departure
  // day so a trip starting weeks/months later doesn't surface today's
  // date as the payment due date. Skip once the operator has touched
  // the schedule (mode change, custom amount, alternate date, …) so we
  // never overwrite their edits.
  const departureDateIso = selectedSlot?.startsAt?.slice(0, 10) ?? null
  React.useEffect(() => {
    if (!departureDateIso || paymentScheduleTouchedRef.current) return
    setPaymentScheduleState((prev) => {
      if (prev.mode !== "full" || prev.installments.length !== 1) return prev
      const installment = prev.installments[0]
      if (!installment || installment.dueDate === departureDateIso) return prev
      return {
        ...prev,
        installments: [{ ...installment, dueDate: departureDateIso }],
      }
    })
  }, [departureDateIso])
  const setSelectedSlot = React.useCallback(
    (nextSlotId: string | null) => {
      setPayloadMismatchUnitIds([])
      const selectedSlot = nextSlotId ? allOpenSlots.find((slot) => slot.id === nextSlotId) : null
      if (selectedSlot?.optionId && selectedSlot.optionId !== product.optionId) {
        setProduct((prev) => ({ ...prev, optionId: selectedSlot.optionId }))
      }
      setSlotId(nextSlotId)
    },
    [allOpenSlots, product.optionId],
  )
  React.useEffect(() => {
    setRooms(emptyOptionUnitsStepperValue)
    setRoomUnits([])
    setPayloadMismatchUnitIds([])
    if (!slotId || !product.optionId) return
    const selectedDeparture =
      allOpenSlots.find((slot) => slot.id === slotId) ??
      (defaultSlot?.id === slotId ? defaultSlot : null)
    if (selectedDeparture?.optionId && selectedDeparture.optionId !== product.optionId) {
      if (defaultSlotId && selectedDeparture.id === defaultSlotId) {
        setProduct((prev) => ({ ...prev, optionId: selectedDeparture.optionId }))
        return
      }
      setSlotId(null)
    }
  }, [allOpenSlots, product.optionId, slotId, defaultSlotId, defaultSlot])

  const formatSlotLabel = React.useCallback(
    (slot: (typeof slots)[number]) => {
      const date = formatDate(slot.startsAt, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
      const remaining =
        !slot.unlimited && typeof slot.remainingPax === "number"
          ? ` · ${formatMessage(messages.bookingCreateDialog.labels.remainingCapacityCount, {
              count: slot.remainingPax,
            })}`
          : ""
      return `${date}${remaining}`
    },
    [formatDate, messages],
  )

  const slotUnitAvailability = useSlotUnitAvailability({
    slotId: slotId ?? undefined,
    enabled: enabled && Boolean(slotId),
  })
  const pricingPreview = usePricingPreview({
    productId: product.productId,
    optionId: product.optionId,
    enabled: enabled && Boolean(product.productId),
  })
  const pricingCategoriesQuery = usePricingCategories({
    active: true,
    limit: 200,
    enabled: enabled && Boolean(product.productId),
  })
  const optionUnitPriceRulesQuery = useOptionUnitPriceRules({
    optionId: product.optionId ?? selectedSlot?.optionId ?? undefined,
    active: true,
    limit: 200,
    enabled: enabled && Boolean(product.productId),
  })
  const handleRoomUnitsChange = React.useCallback((units: OptionUnitsStepperUnit[]) => {
    setRoomUnits((prev) => (sameRoomUnits(prev, units) ? prev : units))
  }, [])
  const pricingRoomUnits = React.useMemo(
    () => pricingSnapshotRoomUnits(pricingPreview.data?.data),
    [pricingPreview.data],
  )
  const hasRoomPricingMatrix = pricingRoomUnits.length > 0
  const bookingUnits = React.useMemo(
    () => mergePricingRoomMetadata(roomUnits, pricingRoomUnits),
    [roomUnits, pricingRoomUnits],
  )
  // Room choices presented to the traveler row are inventory options
  // (e.g. "Standard double", "Junior suite upgrade"). The age-band
  // lives separately on the traveler as a pricing unit.
  const roomUnitOptions: RoomUnitOption[] = React.useMemo(() => {
    type UnitLike = {
      optionId?: string | null
      optionUnitId: string
      unitName: string
      unitCode?: string | null
      unitType?: OptionUnitsStepperUnit["unitType"]
      occupancyMax: number | null
    }
    const sourceUnits: UnitLike[] =
      bookingUnits.length > 0 ? bookingUnits : (slotUnitAvailability.data?.data ?? [])
    const units = sourceUnits.filter(isBookingInventoryUnit)
    if (units.length === 0) return []
    return units
      .filter((unit) => (rooms.quantities[unit.optionUnitId] ?? 0) > 0)
      .map((unit) => {
        const totalQty = rooms.quantities[unit.optionUnitId] ?? 0
        const occupancyMax = Math.max(1, unit.occupancyMax ?? 1)
        const seats = totalQty * occupancyMax
        const assigned = travelers.travelers.filter(
          (traveler) => traveler.inventoryUnitId === unit.optionUnitId,
        ).length
        return {
          unitId: unit.optionUnitId,
          unitName: stripOptionPrefix(unit.unitName),
          remainingCapacity: Math.max(0, seats - assigned),
        }
      })
  }, [bookingUnits, slotUnitAvailability.data, rooms.quantities, travelers.travelers])

  // Per-option breakdown of all configured units, with the
  // attributes the TravelersSection's dynamic category buttons need
  // (unitCode/min-max/unitType). Mirrors the grouping logic in
  // `roomUnitOptions` but exposes every unit instead of collapsing
  // to one primary.
  const roomGroups: RoomGroup[] = React.useMemo(() => {
    if (bookingUnits.length === 0) return []
    const groups = new Map<string, RoomGroup>()
    for (const rawUnit of bookingUnits) {
      const u = normalizeBookingUnit(rawUnit)
      if (!u.optionId) continue
      const groupKey = u.optionId
      const isInventory = isBookingInventoryUnit(u)
      const isAdultCoded = (u.unitCode ?? "").toUpperCase() === "ADULT"
      const unit = {
        unitId: u.optionUnitId,
        // Strip the "Option name - " prefix the stepper applies when
        // an option has multiple units; the per-unit label is enough
        // for a category button.
        unitName: stripOptionPrefix(u.unitName),
        unitCode: u.unitCode ?? null,
        minAge: u.minAge ?? null,
        maxAge: u.maxAge ?? null,
        unitType: (u.unitType ?? null) as RoomGroup["units"][number]["unitType"],
      }
      const existing = groups.get(groupKey)
      if (existing) {
        existing.units.push(unit)
        if (isInventory) existing.primaryUnitId = u.optionUnitId
        else if (
          isAdultCoded &&
          !existing.units.some(
            (candidate) => candidate.unitType === "room" || candidate.unitType === "vehicle",
          )
        ) {
          existing.primaryUnitId = u.optionUnitId
        }
      } else {
        groups.set(groupKey, {
          optionId: groupKey,
          optionName: stripUnitSuffix(u.unitName),
          primaryUnitId: u.optionUnitId,
          units: [unit],
        })
      }
    }
    return Array.from(groups.values())
  }, [bookingUnits])

  const travelerPricingCategories: TravelerPricingCategoryOption[] = React.useMemo(() => {
    const snapshot = pricingPreview.data?.data
    const categoriesById = new Map<string, PricingCategoryLike>()
    const bookingUnitIds = new Set(bookingUnits.map((unit) => unit.optionUnitId))
    for (const category of pricingCategoriesQuery.data?.data ?? []) {
      categoriesById.set(category.id, category)
    }
    for (const category of snapshot?.pricingCategories ?? []) {
      categoriesById.set(category.id, category)
    }
    const unitIdsByCategoryId = new Map<string, Set<string>>()
    for (const unitPrice of snapshot?.unitPrices ?? []) {
      if (!unitPrice.pricingCategoryId) continue
      if (bookingUnitIds.size > 0 && !bookingUnitIds.has(unitPrice.unitId)) continue
      const existing = unitIdsByCategoryId.get(unitPrice.pricingCategoryId) ?? new Set<string>()
      existing.add(unitPrice.unitId)
      unitIdsByCategoryId.set(unitPrice.pricingCategoryId, existing)
    }
    for (const unitPriceRule of optionUnitPriceRulesQuery.data?.data ?? []) {
      if (!unitPriceRule.pricingCategoryId) continue
      if (bookingUnitIds.size > 0 && !bookingUnitIds.has(unitPriceRule.unitId)) continue
      const existing = unitIdsByCategoryId.get(unitPriceRule.pricingCategoryId) ?? new Set<string>()
      existing.add(unitPriceRule.unitId)
      unitIdsByCategoryId.set(unitPriceRule.pricingCategoryId, existing)
    }

    return Array.from(unitIdsByCategoryId.entries())
      .flatMap(([categoryId, unitIds]) => {
        const category = categoriesById.get(categoryId)
        if (!category) return []
        return [
          {
            categoryId,
            name: category.name,
            code: category.code,
            categoryType: category.categoryType,
            minAge: category.minAge,
            maxAge: category.maxAge,
            unitIds: Array.from(unitIds),
          },
        ]
      })
      .sort((left, right) => {
        const leftSort = categoriesById.get(left.categoryId)?.sortOrder ?? 0
        const rightSort = categoriesById.get(right.categoryId)?.sortOrder ?? 0
        return leftSort - rightSort || left.name.localeCompare(right.name)
      })
  }, [
    pricingPreview.data,
    pricingCategoriesQuery.data?.data,
    optionUnitPriceRulesQuery.data?.data,
    bookingUnits,
  ])

  const travelerPricingCategoryLabels = React.useMemo(
    () =>
      Object.fromEntries(
        travelerPricingCategories.map((category) => [category.categoryId, category.name]),
      ),
    [travelerPricingCategories],
  )

  const travelerPricingCategoryQuantities = React.useMemo(() => {
    const quantities: Record<string, Record<string, number>> = {}
    if (travelerPricingCategories.length === 0) return quantities
    for (const traveler of travelers.travelers) {
      if (!traveler.inventoryUnitId) continue
      const pricingCategoryId = inferTravelerPricingCategoryId(traveler, travelerPricingCategories)
      if (!pricingCategoryId) continue
      const unitCategoryQuantities = quantities[traveler.inventoryUnitId] ?? {}
      unitCategoryQuantities[pricingCategoryId] =
        (unitCategoryQuantities[pricingCategoryId] ?? 0) + 1
      quantities[traveler.inventoryUnitId] = unitCategoryQuantities
    }
    return quantities
  }, [travelers.travelers, travelerPricingCategories])

  // Apply the same draft resolver we use at submit so live pricing
  // and persisted item lines cannot drift. Person-priced options
  // (excursions) derive line quantities from the traveler list;
  // accommodation options preserve operator-picked stepper quantities.
  const displayDraft = React.useMemo(
    () =>
      resolveBookingDraft({
        quantities: rooms.quantities,
        travelers: travelers.travelers,
        units: bookingUnits as PricingAssignmentUnit[],
      }),
    [rooms.quantities, travelers.travelers, bookingUnits],
  )
  const displayQuantities = displayDraft.quantities
  const displayExtraLines = React.useMemo(
    () =>
      resolveBookingExtraLines({
        extraLines,
        travelerCount: travelers.travelers.length,
      }),
    [extraLines, travelers.travelers.length],
  )

  // Currency placeholder used for Travel Credit and payment schedule display.
  // Consumers hooking in real product data should override this by wrapping
  // the component or swapping in their own currency-aware hook.
  const currency = messages.bookingCreateDialog.labels.currency
  // Source-of-truth currency for the payment-schedule wire payload: prefer
  // the product's own `sellCurrency` (what the server stamps on the new
  // booking via `convertProductToBooking`), fall back to the pricing
  // preview's currency, and only then fall back to the placeholder. The
  // server rejects the create with `invalid_payment_schedules` when any
  // schedule row's currency drifts from the booking's, so this trio has to
  // resolve to the same value the server will pick.
  const bookingProductQuery = useProduct(product.productId || undefined, {
    enabled: enabled && Boolean(product.productId),
  })
  const productSellCurrency = bookingProductQuery.data?.sellCurrency ?? null
  const pricingCurrency = productSellCurrency ?? pricing?.currency ?? currency
  const pricingTotalAmountCents = pricing?.confirmedAmountCents ?? undefined
  const roomUnitLabels = React.useMemo(
    () => Object.fromEntries(bookingUnits.map((unit) => [unit.optionUnitId, unit.unitName])),
    [bookingUnits],
  )

  const createBookingMutation = useBookingCreateMutation()
  const queryClient = useQueryClient()

  // Resolve the billing person/org once at the dialog level so we can
  // snapshot their contact details into the booking row at create time.
  // The booking row's `contact_*` columns are the source of truth for
  // billing on the detail page — the linked CRM record can change (or
  // be deleted) later without retroactively rewriting history.
  const billingPersonRecord = usePerson(
    (person.billTo ?? "person") === "person" ? (person.personId ?? undefined) : undefined,
    { enabled: (person.billTo ?? "person") === "person" && Boolean(person.personId) },
  ).data
  const billingOrganizationRecord = useOrganization(
    person.billTo === "organization" ? (person.organizationId ?? undefined) : undefined,
    { enabled: person.billTo === "organization" && Boolean(person.organizationId) },
  ).data
  // Primary address for whichever billing record was picked. Filter by
  // `entityType` + `entityId` to keep the response small; the first
  // address with `isPrimary` wins (the server returns at most one).
  const billingPrimaryAddressKind: "person" | "organization" | null =
    (person.billTo ?? "person") === "person" && person.personId
      ? "person"
      : person.billTo === "organization" && person.organizationId
        ? "organization"
        : null
  const billingPrimaryAddressEntityId =
    billingPrimaryAddressKind === "person"
      ? (person.personId ?? undefined)
      : billingPrimaryAddressKind === "organization"
        ? (person.organizationId ?? undefined)
        : undefined
  const billingAddressQuery = useAddresses({
    entityType: billingPrimaryAddressKind ?? undefined,
    entityId: billingPrimaryAddressEntityId,
    isPrimary: true,
    limit: 1,
    enabled: Boolean(billingPrimaryAddressKind && billingPrimaryAddressEntityId),
  })
  const billingPrimaryAddress = billingAddressQuery.data?.data?.[0] ?? null
  const hasSelectedUnits = React.useMemo(
    () => Object.values(rooms.quantities).some((qty) => qty > 0),
    [rooms.quantities],
  )

  const handleSubmit = async () => {
    setError(null)
    setPayloadMismatchUnitIds([])

    if (!product.productId) {
      setError(messages.bookingCreateDialog.validation.selectProduct)
      return
    }

    if (!slotId) {
      setError(messages.bookingCreateDialog.validation.selectDeparture)
      return
    }

    if (!hasSelectedUnits) {
      setError(messages.bookingCreateDialog.validation.selectUnits)
      return
    }

    let resolvedPersonId: string | null = null
    let resolvedOrganizationId: string | null = null
    if ((person.billTo ?? "person") === "person") {
      if (!person.personId) {
        setError(messages.bookingCreateDialog.validation.selectPerson)
        return
      }
      resolvedPersonId = person.personId
      const billingContactValidation = validateBillingPersonContact(billingPersonRecord)
      if (billingContactValidation === "missing-contact") {
        setError(messages.bookingCreateDialog.validation.billingContactRequired)
        return
      }
      if (billingContactValidation === "invalid-email") {
        setError(messages.bookingCreateDialog.validation.billingEmailInvalid)
        return
      }
    } else {
      if (!person.organizationId) {
        setError(messages.bookingCreateDialog.validation.selectOrganization)
        return
      }
      resolvedOrganizationId = person.organizationId
    }

    if (travelers.travelers.length === 0) {
      setError(messages.bookingCreateDialog.validation.travelerRequired)
      return
    }

    const invalidTraveler = travelers.travelers.find(
      (traveler) =>
        (!traveler.personId && (!traveler.firstName.trim() || !traveler.lastName.trim())) ||
        (traveler.email.trim() ? !isRealBookingEmail(traveler.email) : false),
    )
    if (invalidTraveler) {
      setError(messages.bookingCreateDialog.validation.firstAndLastNameRequired)
      return
    }

    const overCapacity = getOverCapacityInventoryAssignments(
      bookingUnits,
      rooms.quantities,
      travelers.travelers,
    )[0]
    if (overCapacity) {
      setError(
        formatMessage(messages.bookingCreateDialog.validation.roomCapacityExceeded, {
          room: overCapacity.unitName,
          assigned: overCapacity.assignedTravelers,
          capacity: overCapacity.capacity,
        }),
      )
      return
    }

    try {
      if (sharedRoom.enabled && sharedRoom.mode === "join" && !sharedRoom.groupId) {
        setError(messages.bookingCreateDialog.validation.selectSharedRoomGroup)
        return
      }

      const bookingNumber = generateBookingNumber()
      const confirmedSellAmountCents = pricing?.confirmedAmountCents ?? null
      const catalogSellAmountCents = pricing?.catalogAmountCents ?? null
      const priceOverrideReason = pricing?.priceOverrideReason.trim() ?? ""

      if (pricing?.requiresReason) {
        setError(messages.bookingCreateDialog.labels.breakdownOverrideReasonRequired)
        return
      }

      if (findAlreadyPaidInstallmentMissingPaymentDate(paymentSchedule) !== null) {
        setError(messages.bookingCreateDialog.validation.paidPaymentDateRequired)
        return
      }

      const paymentSchedules = paymentScheduleToRows(
        paymentSchedule,
        pricingCurrency,
        confirmedSellAmountCents,
      )
      // Resolve the draft once, then derive every shape the wire
      // format needs from the result. Person-priced options get
      // per-band quantities (1 adult + 1 child + 1 infant, not
      // "3 x Adult"); accommodation options keep operator-picked
      // room quantities. Server gets `clientLineKey` + `travelerKeys`
      // on each line so it can write `booking_item_travelers` rows.
      const submitUnits =
        bookingUnits.length > 0
          ? bookingUnits
          : getTravelerAssignableStepperUnits(
              (slotUnitAvailability.data?.data ?? []).map((unit) => ({
                ...unit,
                optionId: product.optionId,
              })),
            )
      const redistributed = resolveBookingDraft({
        quantities: rooms.quantities,
        travelers: travelers.travelers,
        units: submitUnits as PricingAssignmentUnit[],
      })
      const travelerKeysByUnitId = Object.fromEntries(
        Object.entries(redistributed.travelerIndexesByUnitId).map(([unitId, indexes]) => [
          unitId,
          indexes.every((index) => Boolean(redistributed.travelers[index]?.clientTravelerKey))
            ? indexes
                .map((index) => redistributed.travelers[index]?.clientTravelerKey)
                .filter((key): key is string => Boolean(key))
            : [],
        ]),
      )
      const travelerIndexesByUnitAndCategoryId: Record<string, Record<string, number[]>> = {}
      const travelerKeysByUnitAndCategoryId: Record<string, Record<string, string[]>> = {}
      for (const [unitId, indexes] of Object.entries(redistributed.travelerIndexesByUnitId)) {
        for (const index of indexes) {
          const traveler = redistributed.travelers[index]
          if (!traveler) continue
          const pricingCategoryId = inferTravelerPricingCategoryId(
            traveler,
            travelerPricingCategories,
          )
          if (!pricingCategoryId) continue
          travelerIndexesByUnitAndCategoryId[unitId] ??= {}
          travelerIndexesByUnitAndCategoryId[unitId][pricingCategoryId] ??= []
          travelerIndexesByUnitAndCategoryId[unitId][pricingCategoryId].push(index)
          const key = traveler.clientTravelerKey
          if (key) {
            travelerKeysByUnitAndCategoryId[unitId] ??= {}
            travelerKeysByUnitAndCategoryId[unitId][pricingCategoryId] ??= []
            travelerKeysByUnitAndCategoryId[unitId][pricingCategoryId].push(key)
          }
        }
      }
      const travelerKeys = redistributed.travelers
        .map((traveler) => traveler.clientTravelerKey)
        .filter((key): key is string => Boolean(key))

      const itemLines = itemLinesToRows(
        redistributed.quantities,
        submitUnits,
        pricing,
        redistributed.travelerIndexesByUnitId,
        travelerKeysByUnitId,
        travelerIndexesByUnitAndCategoryId,
        travelerKeysByUnitAndCategoryId,
      )
      const resolvedExtraLines = resolveBookingExtraLines({
        extraLines,
        travelerCount: travelers.travelers.length,
        travelerKeys:
          travelerKeys.length === redistributed.travelers.length ? travelerKeys : undefined,
      })

      const travelerRows = travelersToRows({ travelers: redistributed.travelers })

      const travelCreditRedemption: BookingCreateTravelCreditRedemptionInput | undefined =
        travelCredit.picked && travelCredit.picked.remainingAmountCents != null
          ? {
              travelCreditId: travelCredit.picked.id,
              amountCents: travelCredit.picked.remainingAmountCents,
            }
          : undefined

      const selectedSharedRoomUnitId = getSelectedSharedRoomUnitId(rooms.quantities)
      const groupMembership: BookingCreateGroupMembershipInput | undefined = sharedRoom.enabled
        ? sharedRoom.mode === "create"
          ? {
              action: "create",
              kind: "shared_room",
              label:
                sharedRoom.groupLabel?.trim() ||
                `${messages.bookingCreateDialog.labels.sharedRoomGeneratedLabelPrefix} - ${bookingNumber}`,
              optionUnitId: selectedSharedRoomUnitId,
              makeBookingPrimary: true,
            }
          : sharedRoom.groupId
            ? { action: "join", groupId: sharedRoom.groupId, role: "shared" }
            : undefined
        : undefined

      // Smart-default status from payment state — any payment marked
      // "Already paid" implies the booking is effectively confirmed,
      // otherwise it lands in `awaiting_payment` so the operator can
      // dispatch a payment link. The server commits this status in
      // the create transaction and emits `booking.confirmed`
      // post-commit when applicable — no second roundtrip.
      const initialStatus = hasAnyPaidPayment(paymentSchedule)
        ? ("confirmed" as const)
        : ("awaiting_payment" as const)

      // Build the billing-contact snapshot from whichever CRM record
      // the operator picked, plus the primary identity address when
      // present. Falls back to nulls when a record is missing — the
      // server stores nulls and the detail page hydrates from the live
      // CRM record at read time.
      const addressSnapshot = billingPrimaryAddress
        ? {
            contactAddressLine1: billingPrimaryAddress.line1,
            contactAddressLine2: billingPrimaryAddress.line2,
            contactCity: billingPrimaryAddress.city,
            contactRegion: billingPrimaryAddress.region,
            contactPostalCode: billingPrimaryAddress.postalCode,
            contactCountry: billingPrimaryAddress.country,
          }
        : {}
      const contactSnapshot: Pick<
        Parameters<typeof createBookingMutation.mutateAsync>[0],
        | "contactFirstName"
        | "contactLastName"
        | "contactPartyType"
        | "contactTaxId"
        | "contactEmail"
        | "contactPhone"
        | "contactPreferredLanguage"
        | "contactAddressLine1"
        | "contactAddressLine2"
        | "contactCity"
        | "contactRegion"
        | "contactPostalCode"
        | "contactCountry"
      > = billingPersonRecord
        ? {
            contactPartyType: "individual",
            contactTaxId: null,
            contactFirstName: billingPersonRecord.firstName,
            contactLastName: billingPersonRecord.lastName,
            contactEmail: billingPersonRecord.email,
            contactPhone: billingPersonRecord.phone,
            contactPreferredLanguage: billingPersonRecord.preferredLanguage,
            ...addressSnapshot,
          }
        : billingOrganizationRecord
          ? {
              contactPartyType: "company",
              contactTaxId: billingOrganizationRecord.taxId,
              contactFirstName: billingOrganizationRecord.name,
              contactLastName: null,
              contactEmail: null,
              contactPhone: null,
              contactPreferredLanguage: billingOrganizationRecord.preferredLanguage,
              ...addressSnapshot,
            }
          : {}

      const { booking } = await createBookingMutation.mutateAsync({
        productId: product.productId,
        bookingNumber,
        optionId: product.optionId,
        slotId,
        personId: resolvedPersonId,
        organizationId: resolvedOrganizationId,
        internalNotes: notes.trim() || null,
        catalogSellAmountCents,
        confirmedSellAmountCents,
        priceOverrideReason: priceOverrideReason || null,
        itemLines: itemLines.length > 0 ? itemLines : undefined,
        extraLines: resolvedExtraLines.length > 0 ? resolvedExtraLines : undefined,
        travelers: travelerRows.length > 0 ? travelerRows : undefined,
        paymentSchedules: paymentSchedules.length > 0 ? paymentSchedules : undefined,
        travelCreditRedemption,
        groupMembership,
        documentGeneration: generateProforma
          ? { contractDocument: false, invoiceDocument: true, invoiceType: "proforma" as const }
          : generateInvoiceAndContract
            ? {
                contractDocument: true,
                invoiceDocument: true,
                invoiceType: "invoice" as const,
              }
            : { contractDocument: false, invoiceDocument: false },
        initialStatus,
        // Suppression only matters when transitioning to `confirmed` —
        // `awaiting_payment` doesn't trigger the auto-dispatch
        // subscriber today.
        suppressNotifications: initialStatus === "confirmed" && !notifyTraveler ? true : undefined,
        ...contactSnapshot,
      })

      // The booking mutation invalidates booking caches, but the
      // availability surface (slot allocation manifest, slot detail,
      // unit availability, slot list) hosts its own cache under
      // `availabilityQueryKeys.slots()`. Without this, the slot-detail
      // page that opened the sheet keeps showing stale traveler counts /
      // empty rooms / unconsumed capacity until the user refreshes.
      // Nuking the whole slots subtree is cheap and avoids tracking
      // exactly which keys to bust (slotAllocation, slotDetail,
      // slotUnitAvailability, slotsList, …).
      await queryClient.invalidateQueries({ queryKey: availabilityQueryKeys.slots() })

      onCreated?.(booking)
    } catch (err) {
      if (err instanceof VoyantApiError && isPayloadResolverMismatchBody(err.body)) {
        setPayloadMismatchUnitIds(
          Array.from(new Set(err.body.mismatches.map((mismatch) => mismatch.optionUnitId))),
        )
        setError(
          formatPayloadResolverMismatchError(
            err.body,
            roomUnitLabels,
            messages.bookingCreateDialog.validation,
          ),
        )
        return
      }
      setError(
        err instanceof Error ? err.message : messages.bookingCreateDialog.validation.createFailed,
      )
    }
  }

  const isSubmitting = createBookingMutation.isPending

  return (
    <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-12">
      {/* Form column — form sections scroll above the inline footer buttons. */}
      <div className="flex min-h-0 min-w-0 flex-col lg:col-span-8">
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-1 pb-2">
          <ProductPickerSection
            value={product}
            onChange={(next) => {
              setPayloadMismatchUnitIds([])
              setProduct(next)
            }}
            enabled={enabled}
            lockProduct={Boolean(defaultProductId || defaultSlotId)}
            labels={{
              optionNone: messages.bookingCreateDialog.labels.noSpecificOption,
            }}
            showOptionPicker={false}
          />

          {product.productId ? (
            <div className="flex flex-col gap-1">
              <Label>{messages.bookingCreateDialog.fields.departure}</Label>
              <AsyncCombobox
                value={slotId}
                onChange={(v) => setSelectedSlot(v)}
                items={slots}
                selectedItem={selectedSlot}
                getKey={(slot) => slot.id}
                getLabel={(slot) => formatSlotLabel(slot)}
                placeholder={messages.bookingCreateDialog.placeholders.departure}
                emptyText={messages.bookingCreateDialog.placeholders.departureEmpty}
                triggerClassName="w-full"
                disabled={Boolean(defaultSlotId)}
                clearable={!defaultSlotId}
              />
            </div>
          ) : null}

          {product.productId && slotId ? (
            <OptionUnitsStepperSection
              value={rooms}
              onChange={(next) => {
                setPayloadMismatchUnitIds([])
                setRooms(next)
              }}
              productId={product.productId}
              slotId={slotId}
              optionId={product.optionId}
              enabled={enabled}
              onUnitsChange={handleRoomUnitsChange}
              slotHasFiniteCapacity={
                Boolean(selectedSlot) &&
                !selectedSlot?.unlimited &&
                typeof selectedSlot?.remainingPax === "number"
              }
              invalidOptionUnitIds={payloadMismatchUnitIds}
              labels={{
                heading: messages.bookingCreateDialog.labels.roomsHeading,
                noOption: messages.bookingCreateDialog.labels.roomsNoOption,
                noSlot: messages.bookingCreateDialog.labels.roomsNoSlot,
                noUnits: messages.bookingCreateDialog.labels.roomsNoUnits,
                remaining: messages.bookingCreateDialog.labels.roomsRemaining,
                unlimited: messages.bookingCreateDialog.labels.roomsUnlimited,
              }}
            />
          ) : null}

          {product.productId && slotId ? (
            <ProductExtrasPickerSection
              productId={product.productId}
              optionId={product.optionId}
              currency={pricingCurrency}
              travelerCount={travelers.travelers.length}
              value={extraLines}
              onChange={setExtraLines}
              enabled={enabled}
              labels={{
                heading: messages.bookingCreateDialog.labels.extrasHeading,
                empty: messages.bookingCreateDialog.labels.extrasEmpty,
                included: messages.bookingCreateDialog.labels.extrasIncluded,
                onRequest: messages.bookingCreateDialog.labels.extrasOnRequest,
                perPerson: messages.bookingCreateDialog.labels.extrasPerPerson,
              }}
            />
          ) : null}

          {product.productId && slotId ? (
            <div className="flex flex-col gap-2 rounded-md border p-3">
              <Label>{messages.bookingCreateDialog.labels.billingHeading}</Label>
              <PersonPickerSection
                value={person}
                onChange={setPerson}
                enabled={enabled}
                labels={{
                  createNewPerson: messages.bookingCreateDialog.labels.createNewPerson,
                  selectExistingPerson: messages.bookingCreateDialog.labels.selectExistingPerson,
                  organizationNone: messages.bookingCreateDialog.labels.organizationNone,
                }}
              />
            </div>
          ) : null}

          {product.productId && slotId ? (
            <SharedRoomSection
              value={sharedRoom}
              onChange={setSharedRoom}
              productId={product.productId || undefined}
              enabled={enabled}
              labels={{
                toggle: messages.bookingCreateDialog.labels.sharedRoomToggle,
                createMode: messages.bookingCreateDialog.labels.sharedRoomCreateMode,
                joinMode: messages.bookingCreateDialog.labels.sharedRoomJoinMode,
                selectPlaceholder: messages.bookingCreateDialog.labels.sharedRoomSelectPlaceholder,
                noGroups: messages.bookingCreateDialog.labels.sharedRoomNoGroups,
                createHint: messages.bookingCreateDialog.labels.sharedRoomCreateHint,
                remove: messages.bookingCreateDialog.labels.sharedRoomRemove,
              }}
            />
          ) : null}

          {product.productId && slotId ? (
            <TravelersSection
              value={travelers}
              onChange={(next) => {
                setPayloadMismatchUnitIds([])
                setTravelers(next)
              }}
              roomUnits={roomUnitOptions.length > 0 ? roomUnitOptions : undefined}
              roomGroups={roomGroups.length > 0 ? roomGroups : undefined}
              pricingCategories={
                hasRoomPricingMatrix || roomUnitOptions.length > 0
                  ? travelerPricingCategories
                  : undefined
              }
              billingPersonId={(person.billTo ?? "person") === "person" ? person.personId : null}
              labels={{
                heading: messages.bookingCreateDialog.labels.travelerHeading,
                addTraveler: messages.bookingCreateDialog.labels.addTraveler,
                person: messages.bookingCreateDialog.labels.travelerPerson,
                personSearchPlaceholder:
                  messages.bookingCreateDialog.labels.travelerPersonSearchPlaceholder,
                personEmpty: messages.bookingCreateDialog.labels.travelerPersonEmpty,
                createNewPerson: messages.bookingCreateDialog.labels.createNewPerson,
                createPersonSheetTitle: messages.bookingCreateDialog.labels.createPersonSheetTitle,
                addBillingPerson: messages.bookingCreateDialog.labels.addBillingPersonAsTraveler,
                role: messages.bookingCreateDialog.labels.travelerRole,
                roleLead: messages.bookingCreateDialog.labels.travelerLead,
                roleAdult: messages.bookingCreateDialog.labels.travelerAdult,
                roleChild: messages.bookingCreateDialog.labels.travelerChild,
                roleInfant: messages.bookingCreateDialog.labels.travelerInfant,
                room: messages.bookingCreateDialog.labels.travelerRoom,
                noRoom: messages.bookingCreateDialog.labels.travelerNoRoom,
                remove: messages.bookingCreateDialog.labels.travelerRemove,
                empty: messages.bookingCreateDialog.labels.travelerEmpty,
              }}
            />
          ) : null}

          {product.productId && slotId ? (
            <div className="flex flex-col gap-2">
              <Label>{messages.bookingCreateDialog.fields.internalNotes}</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={messages.bookingCreateDialog.placeholders.internalNotes}
              />
            </div>
          ) : null}

          {/* On-create actions — document generation and confirm-and-notify
            live in one card since both control what happens immediately
            after the booking is created. */}
          {product.productId && slotId ? (
            <div className="flex flex-col gap-3 rounded-md border p-3">
              <Label>{messages.bookingCreateDialog.labels.documentGenerationHeading}</Label>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <Checkbox
                    id="new-booking-generate-proforma"
                    checked={generateProforma}
                    onCheckedChange={(value) => setGenerateProforma(value === true)}
                  />
                  <Label htmlFor="new-booking-generate-proforma" className="cursor-pointer">
                    {messages.bookingCreateDialog.labels.generateProforma}
                  </Label>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Checkbox
                    id="new-booking-generate-invoice-and-contract"
                    checked={generateInvoiceAndContract}
                    onCheckedChange={(value) => setGenerateInvoiceAndContract(value === true)}
                  />
                  <Label
                    htmlFor="new-booking-generate-invoice-and-contract"
                    className="cursor-pointer"
                  >
                    {messages.bookingCreateDialog.labels.generateInvoiceAndContract}
                  </Label>
                </div>
                {hasAnyPaidPayment(paymentSchedule) ? (
                  <div className="flex items-start gap-2 border-t pt-2 text-sm">
                    <Checkbox
                      id="new-booking-notify-traveler"
                      checked={notifyTraveler}
                      onCheckedChange={(v) => setNotifyTraveler(v === true)}
                      className="mt-0.5"
                    />
                    <div className="flex flex-col gap-1">
                      <Label
                        htmlFor="new-booking-notify-traveler"
                        className="cursor-pointer text-sm"
                      >
                        {messages.bookingCreateDialog.fields.notifyTraveler}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {messages.bookingCreateDialog.fields.notifyTravelerHint}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
        {/* Footer buttons live INSIDE the form column so they don't span the preview column. */}
        {error ? (
          <div
            role="alert"
            className="mt-3 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive"
          >
            {error}
          </div>
        ) : null}
        <div className="mt-4 flex items-center justify-end gap-2 border-t px-1 pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {messages.common.cancel}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting || !product.productId || !slotId || !hasSelectedUnits}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {hasAnyPaidPayment(paymentSchedule)
              ? messages.bookingCreateDialog.actions.createConfirmedBooking
              : messages.bookingCreateDialog.actions.createAwaitingPaymentBooking}
          </Button>
        </div>
      </div>
      {/* Right column: preview, pricing, and Travel Credit. Stays out of the
          form column so the footer buttons don't sit beneath it. */}
      <div className="flex flex-col gap-4 lg:col-span-4">
        <BookingPreviewCard
          productId={product.productId}
          optionId={product.optionId}
          slotId={slotId}
          slotLabel={(() => {
            const slot = slots.find((s) => s.id === slotId)
            return slot ? formatSlotLabel(slot) : null
          })()}
          unitQuantities={displayQuantities}
          unitLabels={roomUnitLabels}
          pricingCategoryQuantities={travelerPricingCategoryQuantities}
          pricingCategoryLabels={travelerPricingCategoryLabels}
          extraLines={displayExtraLines}
          travelers={travelers.travelers}
          messages={messages}
          onPricingChange={setPricing}
        />
        {product.productId && slotId ? (
          <TravelCreditPickerSection
            value={travelCredit}
            onChange={setTravelCredit}
            currency={currency}
            labels={{
              heading: messages.bookingCreateDialog.labels.travelCreditHeading,
              codePlaceholder: messages.bookingCreateDialog.labels.travelCreditCodePlaceholder,
              apply: messages.bookingCreateDialog.labels.travelCreditApply,
              clear: messages.bookingCreateDialog.labels.travelCreditClear,
              remainingLabel: messages.bookingCreateDialog.labels.travelCreditRemainingLabel,
              invalidLabel: messages.bookingCreateDialog.labels.travelCreditInvalidLabel,
            }}
          />
        ) : null}
        {product.productId && slotId ? (
          <PaymentScheduleSection
            value={paymentSchedule}
            onChange={setPaymentSchedule}
            currency={pricingCurrency}
            totalAmountCents={pricingTotalAmountCents}
            departureDate={selectedSlot?.startsAt?.slice(0, 10) ?? null}
            labels={{
              heading: messages.bookingCreateDialog.labels.paymentHeading,
              modeUnpaid: messages.bookingCreateDialog.labels.paymentModeUnpaid,
              modeFull: messages.bookingCreateDialog.labels.paymentModeFull,
              modeAdvance: messages.bookingCreateDialog.labels.paymentModeAdvance,
              modeSplit: messages.bookingCreateDialog.labels.paymentModeSplit,
              dueDate: messages.bookingCreateDialog.labels.paymentDueDate,
              amount: messages.bookingCreateDialog.labels.paymentAmount,
              firstInstallment: messages.bookingCreateDialog.labels.paymentFirstInstallment,
              secondInstallment: messages.bookingCreateDialog.labels.paymentSecondInstallment,
              preset5050: messages.bookingCreateDialog.labels.paymentPreset5050,
              unpaidHint: messages.bookingCreateDialog.labels.paymentUnpaidHint,
              totalDue: messages.bookingCreateDialog.labels.paymentTotalDue,
              scheduledTotal: messages.bookingCreateDialog.labels.paymentScheduledTotal,
              remaining: messages.bookingCreateDialog.labels.paymentRemaining,
              alreadyPaid: messages.bookingCreateDialog.labels.paymentAlreadyPaid,
              paymentDate: messages.bookingCreateDialog.labels.paymentDate,
              paymentMethod: messages.bookingCreateDialog.labels.paymentMethod,
              paymentReference: messages.bookingCreateDialog.labels.paymentReference,
            }}
          />
        ) : null}
      </div>
    </div>
  )
}
