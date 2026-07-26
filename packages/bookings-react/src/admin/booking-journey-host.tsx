"use client"

/**
 * Packaged admin host for the unified `<BookingJourney />` wizard —
 * supplies CRM-backed contact pickers, the B2B billing default, real
 * departure/units/Travel Credit pickers over operator inventory, and post-commit
 * navigation to the new booking's detail page.
 *
 * Per booking-journey-architecture §8.1 + §10 Phase B, packaged per the
 * packaged-admin RFC Phase 3: cross-route navigation resolves through
 * semantic destinations (`booking.detail` on commit, `catalog.browse` on
 * cancel), and the data client comes from the host-mounted
 * `VoyantReactProvider` — no app route tree, no app fetcher import.
 */

import { useQuery } from "@tanstack/react-query"
import { useAdminNavigate, useOperatorAdminMessages } from "@voyant-travel/admin"
// Type-only: binds catalog-react's `AdminDestinations` augmentation
// (`catalog.browse`) into this module without pulling its runtime in.
import type {} from "@voyant-travel/catalog-react/admin"
import type { CatalogDetailSurface } from "@voyant-travel/catalog-react/ui"
import { useAddresses } from "@voyant-travel/identity-react"
import { getProductMediaQueryOptions, getProductQueryOptions } from "@voyant-travel/inventory-react"
import { useOrganization, usePerson } from "@voyant-travel/relationships-react"
import { useEffect, useMemo, useRef, useState } from "react"

import {
  emptyPersonPickerValue,
  PersonPickerSection,
  type PersonPickerValue,
} from "../components/person-picker-section.js"
import {
  type BookingEntitySummary,
  BookingJourney,
  type BookingJourneyProps,
  type LeadContactPickerProps,
} from "../journey/index.js"
import { useVoyantBookingsContext } from "../provider.js"
import { JourneyBillingDuplicateWarning } from "./journey-billing-duplicate-warning.js"
import { JourneyDeparturePicker } from "./journey-departure-picker.js"
import { JourneyTravelCreditPicker } from "./journey-travel-credit-picker.js"
import { JourneyUnitsPicker } from "./journey-units-picker.js"

/** The catalog browse surface the journey returns to when cancelled. */
function journeyReturnSurface(vertical: string): CatalogDetailSurface {
  switch (vertical) {
    case "cruises":
      return "cruises"
    case "accommodations":
      return "accommodations"
    default:
      return "products"
  }
}

export interface BookingJourneyHostProps {
  entityModule: string
  entityId: string
  /** Usually omitted — the server resolves provenance from `(module, id)`. */
  sourceKind?: string
  sourceConnectionId?: string
  sourceRef?: string
  departureId?: string
  /** Free-form departure date (ISO) for sourced products with no slot id. */
  departureDate?: string
  optionId?: string
  /** Sourced stays/package rate pin — the exact room + rate plan to re-resolve. */
  roomTypeId?: string
  ratePlanId?: string
  board?: string
  /** Preview hints (name + hero image) for sourced entities, which aren't in
   *  the owned products table. */
  entityName?: string
  entityImageUrl?: string
  draftId: string
  className?: string
  /** Buyer type the billing step starts on. Defaults to `"B2C"` (个人). */
  defaultBuyerType?: BookingJourneyProps["defaultBuyerType"]
}

export function BookingJourneyHost({
  entityModule,
  entityId,
  sourceKind,
  sourceConnectionId,
  sourceRef,
  departureId,
  departureDate,
  optionId,
  roomTypeId,
  ratePlanId,
  board,
  entityName,
  entityImageUrl,
  draftId,
  className,
  defaultBuyerType,
}: BookingJourneyHostProps): React.ReactElement {
  const navigate = useAdminNavigate()
  const entitySummary = useEntitySummary(entityModule, entityId, {
    name: entityName,
    heroImageUrl: entityImageUrl,
  })

  const slots: Pick<
    BookingJourneyProps,
    | "renderLeadContactPicker"
    | "renderTravelerContactPicker"
    | "renderDeparturePicker"
    | "renderUnitsPicker"
    | "renderTravelCreditPicker"
    | "renderBillingExtras"
    | "renderPaymentProviderStep"
    | "onCommitted"
    | "onCancelled"
  > = {
    renderLeadContactPicker({ apply, buyerType }) {
      return <CrmLeadPicker key={buyerType} apply={apply} buyerType={buyerType} />
    },
    renderBillingExtras(ctx) {
      // Warn if the picked lead already booked this departure.
      return <JourneyBillingDuplicateWarning {...ctx} />
    },
    renderDeparturePicker(pickerProps) {
      // Owned: real scheduled departures from availability. Sourced products
      // have none; when one was booked from a specific offer the date came in
      // pre-selected, so we lock it (a different date = a different offer).
      return <JourneyDeparturePicker {...pickerProps} lockDeparture={Boolean(departureDate)} />
    },
    renderUnitsPicker(pickerProps) {
      // Rooms/units for the picked option + departure (operator inventory).
      return <JourneyUnitsPicker {...pickerProps} />
    },
    renderTravelCreditPicker(pickerProps) {
      // Admin searches and selects a Travel Credit without needing to know the code.
      return <JourneyTravelCreditPicker {...pickerProps} />
    },
    renderTravelerContactPicker({ apply, selectedPersonId }) {
      // Travelers reuse the same picker (person-only). Adapt the picker's
      // partial lead-apply to the traveler apply (always a person), and
      // reflect the row's linked person so "Copy from billing" selects it.
      return (
        <CrmLeadPicker
          variant="traveler"
          linkedPersonId={selectedPersonId}
          apply={(contact) =>
            apply({
              firstName: contact.firstName ?? "",
              lastName: contact.lastName ?? "",
              email: contact.email,
              phone: contact.phone,
              personId: contact.personId,
              dateOfBirth: contact.dateOfBirth,
            })
          }
        />
      )
    },
    onCommitted(result) {
      // Land on the new booking's detail page.
      navigate("booking.detail", { bookingId: result.bookingId })
    },
    onCancelled() {
      navigate("catalog.browse", { surface: journeyReturnSurface(entityModule) })
    },
  }

  return (
    <BookingJourney
      surface="admin"
      entityModule={entityModule}
      entityId={entityId}
      sourceKind={sourceKind}
      sourceConnectionId={sourceConnectionId}
      sourceRef={sourceRef}
      draftId={draftId}
      initialConfigure={{
        ...(departureId ? { departureSlotId: departureId } : {}),
        ...(departureDate ? { departureDate } : {}),
        ...(optionId ? { variantId: optionId } : {}),
        ...(roomTypeId ? { roomTypeId } : {}),
        ...(ratePlanId ? { ratePlanId } : {}),
        ...(board ? { board } : {}),
      }}
      // No hardcoded buyer type — the journey defaults to 个人 / B2C, which is
      // right for a leisure operator; a B2B-first deployment overrides it.
      {...(defaultBuyerType ? { defaultBuyerType } : {})}
      // The admin in-process commit route can reserve/hold bookings. Tokenized
      // card charges, bank-transfer checkout instructions, and agency-credit
      // account collection are separate flows that this packaged host does not
      // wire yet, so do not advertise them here.
      paymentCapabilities={{
        acceptsCard: false,
        acceptsHold: true,
        acceptsBankTransfer: false,
        acceptsTicketOnCredit: false,
      }}
      entitySummary={entitySummary}
      className={className}
      {...slots}
    />
  )
}

/**
 * Builds the "what you're booking" preview shown atop the journey side
 * panel — the product's name + first image, for an instant preview before
 * the quote returns. Owned products in the `products` table resolve via the
 * client fetch; a sourced/connect id isn't in that table, so it falls back to
 * the `hints` (name + hero image) carried from the catalog detail page. We
 * can't (and needn't) tell owned from sourced on the client — the URL no
 * longer carries `sourceKind` — so we try the products fetch for the
 * `products` vertical and let the hints cover everything else.
 */
function useEntitySummary(
  entityModule: string,
  entityId: string,
  hints: { name?: string; heroImageUrl?: string },
): BookingEntitySummary | undefined {
  const tryProductSummary = entityModule === "products" && Boolean(entityId)
  const client = useVoyantBookingsContext()

  const productQuery = useQuery({
    ...getProductQueryOptions(client, entityId),
    enabled: tryProductSummary,
    retry: false,
  })
  const mediaQuery = useQuery({
    ...getProductMediaQueryOptions(client, entityId, { mediaType: "image" }),
    enabled: tryProductSummary,
    retry: false,
  })

  return useMemo<BookingEntitySummary | undefined>(() => {
    const product = productQuery.data
    if (product) {
      // First product-level (not day-scoped) image, if any.
      const heroImageUrl = (mediaQuery.data?.data ?? [])
        .filter((media) => media.mediaType === "image" && media.dayId == null)
        .map((media) => media.url)
        .find(Boolean)
      return {
        name: product.name,
        vertical: "products",
        ...(heroImageUrl ? { heroImageUrl } : {}),
      }
    }
    // Sourced/connect entity (not in the owned table) — use the preview hints.
    if (hints.name) {
      return {
        name: hints.name,
        vertical: entityModule,
        ...(hints.heroImageUrl ? { heroImageUrl: hints.heroImageUrl } : {}),
      }
    }
    return undefined
  }, [productQuery.data, mediaQuery.data, hints.name, hints.heroImageUrl, entityModule])
}

/**
 * CRM-backed picker for the journey's contact slots. Buyer type drives the
 * mode (there's no bill-to toggle): for the LEAD slot it searches PEOPLE on
 * B2C and ORGANIZATIONS on B2B — picking either hydrates the journey from the
 * CRM record (person → name/email/phone; org → company name/tax id). The
 * per-traveler slot is always a person picker.
 */
function CrmLeadPicker({
  apply,
  buyerType,
  variant = "lead",
  linkedPersonId,
}: {
  apply: LeadContactPickerProps["apply"]
  buyerType?: "B2C" | "B2B"
  variant?: "lead" | "traveler"
  /** Externally-linked person to reflect in the combobox (e.g. a traveler
   *  whose contact was copied from billing). */
  linkedPersonId?: string
}): React.ReactElement {
  const t = useOperatorAdminMessages().bookings.detail.bookingJourney
  // The lead picker bills an organization on B2B; everything else is a person.
  const orgMode = variant === "lead" && buyerType === "B2B"
  const [value, setValue] = useState<PersonPickerValue>(emptyPersonPickerValue)

  // Reflect an externally-set person (copy-from-billing, or a re-opened
  // draft) in the combobox. The hydrate effect below then fills the names;
  // the `appliedPersonId` ref keeps that idempotent.
  useEffect(() => {
    if (!linkedPersonId) return
    setValue((cur) =>
      cur.personId === linkedPersonId
        ? cur
        : { ...cur, mode: "existing", personId: linkedPersonId },
    )
  }, [linkedPersonId])

  // Keep the picker's target aligned with the Buyer type radio.
  useEffect(() => {
    setValue((current) => {
      const desired = orgMode ? "organization" : "person"
      return (current.billTo ?? "person") === desired ? current : { ...current, billTo: desired }
    })
  }, [orgMode])

  // Hydrate from the picked CRM person (B2C). The picker yields just an id;
  // we fetch the record and apply the real name/email/phone.
  const selectedPersonId =
    !orgMode && value.mode === "existing" && value.personId ? value.personId : undefined
  const personQuery = usePerson(selectedPersonId, { enabled: Boolean(selectedPersonId) })
  const appliedPersonId = useRef<string | null>(null)

  // biome-ignore lint/correctness/useExhaustiveDependencies: applies once per resolved record; the ref guards re-entry from apply()->setDraft re-renders -- owner: bookings-react; existing suppression is intentional pending typed cleanup.
  useEffect(() => {
    const person = personQuery.data
    if (!person || appliedPersonId.current === person.id) return
    appliedPersonId.current = person.id
    apply({
      firstName: person.firstName,
      lastName: person.lastName,
      email: person.email ?? undefined,
      phone: person.phone ?? undefined,
      personId: person.id,
      dateOfBirth: person.dateOfBirth ?? undefined,
    })
  }, [personQuery.data])

  // Hydrate the company fields from the picked CRM organization (B2B).
  const selectedOrgId = orgMode && value.organizationId ? value.organizationId : undefined
  const orgQuery = useOrganization(selectedOrgId, { enabled: Boolean(selectedOrgId) })
  const appliedOrgId = useRef<string | null>(null)

  // biome-ignore lint/correctness/useExhaustiveDependencies: applies once per resolved record; the ref guards re-entry -- owner: bookings-react; existing suppression is intentional pending typed cleanup.
  useEffect(() => {
    const org = orgQuery.data
    if (!org || appliedOrgId.current === org.id) return
    appliedOrgId.current = org.id
    const companyName = org.legalName ?? org.name
    apply({
      organizationId: org.id,
      companyName,
      taxId: org.taxId ?? undefined,
    })
  }, [orgQuery.data])

  // Hydrate the billing address from the picked person (B2C) or org (B2B)
  // primary CRM address — so the operator never re-types it and the tax
  // country is set. Missing → surfaced as a warning to fix in the picker.
  const addressEntityType = orgMode ? "organization" : "person"
  // Only the billing lead pulls an address; travelers don't carry one.
  const addressEntityId =
    variant === "lead" ? (orgMode ? selectedOrgId : selectedPersonId) : undefined
  const addressQuery = useAddresses({
    entityType: addressEntityType,
    entityId: addressEntityId,
    isPrimary: true,
    limit: 1,
    enabled: Boolean(addressEntityId),
  })
  const appliedAddressKey = useRef<string | null>(null)

  // biome-ignore lint/correctness/useExhaustiveDependencies: applies once per resolved address; the ref guards re-entry -- owner: bookings-react; existing suppression is intentional pending typed cleanup.
  useEffect(() => {
    const addr = addressQuery.data?.data?.[0]
    if (!addressEntityId || !addr) return
    const key = `${addressEntityType}:${addressEntityId}`
    if (appliedAddressKey.current === key) return
    appliedAddressKey.current = key
    apply({
      address: {
        line1: addr.line1 ?? undefined,
        line2: addr.line2 ?? undefined,
        city: addr.city ?? undefined,
        postal: addr.postalCode ?? undefined,
        country: addr.country ?? undefined,
      },
    })
  }, [addressQuery.data, addressEntityId])

  function commit(next: PersonPickerValue): void {
    setValue(next)
    if ((next.billTo ?? "person") === "organization") {
      if (next.organizationId !== appliedOrgId.current) appliedOrgId.current = null
      return
    }
    if (next.mode === "existing" && next.personId) {
      if (next.personId !== appliedPersonId.current) appliedPersonId.current = null
      return
    }
    appliedPersonId.current = null
    if (next.mode === "new") {
      apply({
        firstName: next.newPerson.firstName,
        lastName: next.newPerson.lastName,
        email: next.newPerson.email || undefined,
        phone: next.newPerson.phone || undefined,
      })
    }
  }

  return (
    <PersonPickerSection
      value={value}
      onChange={commit}
      // Org is an allowed target for the lead (so its CRM org search runs),
      // but the toggle is hidden — Buyer type is the single control.
      showOrganization={variant === "lead"}
      hideTargetToggle
      labels={{
        person: variant === "traveler" ? t.travelerPickerLabel : t.leadContactPickerLabel,
      }}
    />
  )
}
