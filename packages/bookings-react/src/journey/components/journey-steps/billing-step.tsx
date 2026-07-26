"use client"

import { Separator } from "@voyant-travel/ui/components"
import { Card, CardContent, CardHeader, CardTitle } from "@voyant-travel/ui/components/card"
import { CountryCombobox } from "@voyant-travel/ui/components/country-combobox"
import { Label } from "@voyant-travel/ui/components/label"
import { RadioGroup, RadioGroupItem } from "@voyant-travel/ui/components/radio-group"
import { useBookingsUiMessagesOrDefault } from "../../../i18n/index.js"
import { patchBilling, setBillingBuyerType } from "../../lib/draft-state.js"
import { isValidOptionalEmail } from "../../lib/email-validation.js"
import type { LeadContactPickerProps } from "../../types.js"
import {
  Field,
  JourneyErrors,
  JourneyWarnings,
  NameFields,
  PhoneField,
  type StepCommonProps,
} from "./shared.js"

// ─────────────────────────────────────────────────────────────────
// Billing
// ─────────────────────────────────────────────────────────────────

export function BillingStep({
  draft,
  setDraft,
  defaultPhoneCountry,
  renderLeadContactPicker,
  renderExtras,
  warnings,
  errors,
}: StepCommonProps & {
  renderLeadContactPicker?: (props: LeadContactPickerProps) => React.ReactNode
  renderExtras?: () => React.ReactNode
  warnings?: ReadonlyArray<string>
  errors?: ReadonlyArray<string>
}): React.ReactElement {
  const messages = useBookingsUiMessagesOrDefault()
  const billing = draft.billing
  const emailError = isValidOptionalEmail(billing.contact.email)
    ? undefined
    : messages.bookingJourney.validation.invalidEmail
  // Merge each partial from the picker (person record, org record, address
  // lookup) into the billing draft without clobbering the other slices.
  const apply: LeadContactPickerProps["apply"] = (next) => {
    const patch: Partial<typeof billing> = {}
    if (
      next.firstName !== undefined ||
      next.lastName !== undefined ||
      next.email !== undefined ||
      next.phone !== undefined ||
      next.personId !== undefined
    ) {
      patch.contact = {
        ...billing.contact,
        ...(next.firstName !== undefined ? { firstName: next.firstName } : {}),
        ...(next.lastName !== undefined ? { lastName: next.lastName } : {}),
        ...(next.email !== undefined ? { email: next.email } : {}),
        ...(next.phone !== undefined ? { phone: next.phone } : {}),
        ...(next.personId !== undefined ? { personId: next.personId } : {}),
      }
    }
    if (next.organizationId !== undefined) {
      patch.organizationId = next.organizationId
    }
    if (next.companyName !== undefined || next.taxId !== undefined) {
      patch.company = {
        name: next.companyName ?? billing.company?.name ?? "",
        vatId: next.taxId ?? billing.company?.vatId,
      }
    }
    if (next.address) {
      patch.address = { ...billing.address, ...next.address }
    }
    setDraft(patchBilling(draft, patch))
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>{messages.bookingJourney.billing.title}</CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>{messages.bookingJourney.billing.buyerType}</Label>
          <RadioGroup
            value={billing.buyerType}
            onValueChange={(v) => setDraft(setBillingBuyerType(draft, v as "B2C" | "B2B"))}
            className="flex gap-4"
          >
            {/* RadioGroupItem from radix wires its own internal label association — biome can't see it */}
            {/* biome-ignore lint/a11y/noLabelWithoutControl: radix RadioGroupItem provides the control  -- owner: bookings-react; existing suppression is intentional pending typed cleanup. */}
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="B2C" /> {messages.bookingJourney.billing.individual}
            </label>
            {/* biome-ignore lint/a11y/noLabelWithoutControl: radix RadioGroupItem provides the control  -- owner: bookings-react; existing suppression is intentional pending typed cleanup. */}
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="B2B" /> {messages.bookingJourney.billing.company}
            </label>
          </RadioGroup>
        </div>

        {renderLeadContactPicker ? (
          <div>{renderLeadContactPicker({ apply, buyerType: billing.buyerType })}</div>
        ) : null}

        {/* Operator (CRM picker present): identity, address, and company all
            come from the picked person/org — created/edited via the picker,
            which already shows the selection — so nothing else to render here;
            the warnings flag any gaps. Storefront / no CRM: enter directly. */}
        {renderLeadContactPicker ? null : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <NameFields
                givenNameId="bj-billing-firstName"
                familyNameId="bj-billing-lastName"
                givenNameLabel={messages.bookingJourney.billing.firstName}
                familyNameLabel={messages.bookingJourney.billing.lastName}
                givenName={billing.contact.firstName}
                familyName={billing.contact.lastName}
                onGivenNameChange={(v) =>
                  setDraft(
                    patchBilling(draft, {
                      contact: { ...billing.contact, firstName: v },
                    }),
                  )
                }
                onFamilyNameChange={(v) =>
                  setDraft(
                    patchBilling(draft, {
                      contact: { ...billing.contact, lastName: v },
                    }),
                  )
                }
              />
              <Field
                id="bj-billing-email"
                label={messages.bookingJourney.billing.email}
                type="email"
                value={billing.contact.email}
                error={emailError}
                onChange={(v) =>
                  setDraft(
                    patchBilling(draft, {
                      contact: { ...billing.contact, email: v },
                    }),
                  )
                }
              />
              <PhoneField
                id="bj-billing-phone"
                label={messages.bookingJourney.billing.phone}
                defaultCountry={defaultPhoneCountry}
                value={billing.contact.phone ?? ""}
                onChange={(v) =>
                  setDraft(
                    patchBilling(draft, {
                      contact: { ...billing.contact, phone: v },
                    }),
                  )
                }
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field
                id="bj-billing-line1"
                label={messages.bookingJourney.billing.addressLine1}
                value={billing.address.line1 ?? ""}
                onChange={(v) =>
                  setDraft(
                    patchBilling(draft, {
                      address: { ...billing.address, line1: v },
                    }),
                  )
                }
              />
              <Field
                id="bj-billing-line2"
                label={messages.bookingJourney.billing.addressLine2Optional}
                value={billing.address.line2 ?? ""}
                onChange={(v) =>
                  setDraft(
                    patchBilling(draft, {
                      address: { ...billing.address, line2: v },
                    }),
                  )
                }
              />
              <Field
                id="bj-billing-city"
                label={messages.bookingJourney.billing.city}
                value={billing.address.city ?? ""}
                onChange={(v) =>
                  setDraft(
                    patchBilling(draft, {
                      address: { ...billing.address, city: v },
                    }),
                  )
                }
              />
              <Field
                id="bj-billing-postal"
                label={messages.bookingJourney.billing.postalCode}
                value={billing.address.postal ?? ""}
                onChange={(v) =>
                  setDraft(
                    patchBilling(draft, {
                      address: { ...billing.address, postal: v },
                    }),
                  )
                }
              />
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="bj-billing-country">
                  {messages.bookingJourney.billing.country}
                </Label>
                <CountryCombobox
                  value={billing.address.country ?? null}
                  onChange={(code) =>
                    setDraft(
                      patchBilling(draft, {
                        address: { ...billing.address, country: code ?? "" },
                      }),
                    )
                  }
                />
              </div>
            </div>

            {billing.buyerType === "B2B" ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field
                  id="bj-billing-companyName"
                  label={messages.bookingJourney.billing.companyName}
                  value={billing.company?.name ?? ""}
                  onChange={(v) =>
                    setDraft(
                      patchBilling(draft, {
                        company: {
                          ...(billing.company ?? { name: "" }),
                          name: v,
                        },
                      }),
                    )
                  }
                />
                <Field
                  id="bj-billing-vatId"
                  label={messages.bookingJourney.billing.vatId}
                  value={billing.company?.vatId ?? ""}
                  onChange={(v) =>
                    setDraft(
                      patchBilling(draft, {
                        company: {
                          ...(billing.company ?? { name: "" }),
                          vatId: v,
                        },
                      }),
                    )
                  }
                />
              </div>
            ) : null}
          </>
        )}

        {renderExtras ? <div>{renderExtras()}</div> : null}
        <JourneyErrors errors={errors} />
        <JourneyWarnings warnings={warnings} />
      </CardContent>
    </Card>
  )
}
