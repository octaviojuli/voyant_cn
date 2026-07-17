import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { AddressDialog } from "./components/address-dialog.js"
import { ContactPointDialog } from "./components/contact-point-dialog.js"
import { NamedContactDialog } from "./components/named-contact-dialog.js"
import {
  getIdentityUiI18n,
  IdentityUiMessagesProvider,
  resolveIdentityUiMessages,
  useIdentityUiMessagesOrDefault,
} from "./i18n/index.js"
import type { AddressRecord, ContactPointRecord, NamedContactRecord } from "./index.js"

const address = {
  id: "address-1",
  entityType: "supplier",
  entityId: "supplier-1",
  label: "billing",
  fullText: null,
  line1: "Street 1",
  line2: null,
  city: "Bucharest",
  region: null,
  postalCode: "010101",
  country: "RO",
  latitude: null,
  longitude: null,
  timezone: "Europe/Bucharest",
  isPrimary: true,
  notes: null,
  metadata: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
} satisfies AddressRecord

const contactPoint = {
  id: "contact-point-1",
  entityType: "supplier",
  entityId: "supplier-1",
  kind: "email",
  label: "work",
  value: "jane@example.com",
  normalizedValue: null,
  isPrimary: true,
  notes: null,
  metadata: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
} satisfies ContactPointRecord

const namedContact = {
  id: "named-contact-1",
  entityType: "supplier",
  entityId: "supplier-1",
  role: "sales",
  name: "Jane Doe",
  title: "Director of Sales",
  email: "jane@example.com",
  phone: "+40 700 000 000",
  isPrimary: true,
  notes: null,
  metadata: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
} satisfies NamedContactRecord

vi.mock("./index.js", () => ({
  useAddressMutation: () => ({
    create: { isPending: false, mutateAsync: async (value: unknown) => value },
    update: { isPending: false, mutateAsync: async (value: unknown) => value },
  }),
  useContactPointMutation: () => ({
    create: { isPending: false, mutateAsync: async (value: unknown) => value },
    update: { isPending: false, mutateAsync: async (value: unknown) => value },
  }),
  useNamedContactMutation: () => ({
    create: { isPending: false, mutateAsync: async (value: unknown) => value },
    update: { isPending: false, mutateAsync: async (value: unknown) => value },
  }),
}))

describe("identity-ui i18n", () => {
  it("resolves localized package messages with fallback and overrides", () => {
    const result = resolveIdentityUiMessages({
      locale: "ro-RO",
      overrides: {
        locales: {
          ro: {
            contactPointDialog: {
              actions: {
                create: "Creeaza Punct de Contact",
              },
            },
          },
        },
      },
    })

    expect(result.contactPointDialog.actions.create).toBe("Creeaza Punct de Contact")
    expect(result.common.namedContactRoleLabels.front_desk).toBe("Receptie")
  })

  it("returns locale-aware formatters from the package helper", () => {
    const result = getIdentityUiI18n({ locale: "ro-RO" })

    expect(result.locale).toBe("ro-RO")
    expect(result.formatNumber(1200)).toBe(new Intl.NumberFormat("ro-RO").format(1200))
  })

  it("renders English copy without a provider", () => {
    const html = renderToStaticMarkup(
      <div>
        <AddressDialog
          open
          onOpenChange={() => {}}
          entityType="supplier"
          entityId="supplier-1"
          address={address}
        />
        <ContactPointDialog
          open
          onOpenChange={() => {}}
          entityType="supplier"
          entityId="supplier-1"
          contactPoint={contactPoint}
        />
        <NamedContactDialog
          open
          onOpenChange={() => {}}
          entityType="supplier"
          entityId="supplier-1"
          namedContact={namedContact}
        />
        <IdentityMessageProbe />
      </div>,
    )

    expect(html).toContain("Edit Address")
    expect(html).toContain("Edit Contact Point")
    expect(html).toContain("Edit Named Contact")
    expect(html).toContain("Billing")
    expect(html).toContain("Phone")
    expect(html).toContain("Sales")
  })

  it("renders Romanian copy with the package provider", () => {
    const html = renderToStaticMarkup(
      <IdentityUiMessagesProvider locale="ro-RO">
        <div>
          <AddressDialog
            open
            onOpenChange={() => {}}
            entityType="supplier"
            entityId="supplier-1"
            address={address}
          />
          <ContactPointDialog
            open
            onOpenChange={() => {}}
            entityType="supplier"
            entityId="supplier-1"
            contactPoint={contactPoint}
          />
          <NamedContactDialog
            open
            onOpenChange={() => {}}
            entityType="supplier"
            entityId="supplier-1"
            namedContact={namedContact}
          />
          <IdentityMessageProbe />
        </div>
      </IdentityUiMessagesProvider>,
    )

    expect(html).toContain("Editeaza Adresa")
    expect(html).toContain("Editeaza Punctul de Contact")
    expect(html).toContain("Editeaza Contactul Nominal")
    expect(html).toContain("Facturare")
    expect(html).toContain("Telefon")
    expect(html).toContain("Vanzari")
  })

  it("renders Chinese copy with the package provider via region fallback", () => {
    const html = renderToStaticMarkup(
      <IdentityUiMessagesProvider locale="zh-CN">
        <IdentityMessageProbe />
      </IdentityUiMessagesProvider>,
    )

    expect(html).toContain("编辑地址")
    expect(html).toContain("编辑联系方式")
    expect(html).toContain("编辑指定联系人")
    expect(html).toContain("账单")
    expect(html).toContain("电话")
    expect(html).toContain("销售")
  })
})

function IdentityMessageProbe() {
  const messages = useIdentityUiMessagesOrDefault()

  return (
    <div>
      <span>{messages.addressDialog.titles.edit}</span>
      <span>{messages.contactPointDialog.titles.edit}</span>
      <span>{messages.namedContactDialog.titles.edit}</span>
      <span>{messages.common.addressLabelLabels.billing}</span>
      <span>{messages.common.contactPointKindLabels.phone}</span>
      <span>{messages.common.namedContactRoleLabels.sales}</span>
    </div>
  )
}
