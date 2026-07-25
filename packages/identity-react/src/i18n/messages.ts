import type { AddressRecord, ContactPointRecord, NamedContactRecord } from "../index.js"

export type AddressLabel = AddressRecord["label"]
export type ContactPointKind = ContactPointRecord["kind"]
export type NamedContactRole = NamedContactRecord["role"]

export type IdentityUiMessages = {
  common: {
    cancel: string
    saveChanges: string
    primary: string
    pagination: {
      showing: string
      page: string
      previous: string
      next: string
    }
    addressLabelLabels: Record<AddressLabel, string>
    contactPointKindLabels: Record<ContactPointKind, string>
    namedContactRoleLabels: Record<NamedContactRole, string>
  }
  identityPage: {
    title: string
    description: string
    fields: {
      entityType: string
      entity: string
      customEntityType: string
    }
    placeholders: {
      entityType: string
      entity: string
    }
    entityTypeLabels: Record<"person" | "organization" | "supplier" | "booking" | "product", string>
    emptyScope: string
    tabs: {
      contactPoints: string
      addresses: string
      namedContacts: string
    }
  }
  contactPointsTab: {
    description: string
    add: string
    empty: {
      loading: string
      none: string
    }
    columns: {
      kind: string
      value: string
      label: string
      primary: string
    }
    actions: {
      deleteConfirm: string
    }
  }
  addressesTab: {
    description: string
    add: string
    empty: {
      loading: string
      none: string
    }
    columns: {
      label: string
      street: string
      city: string
      country: string
      primary: string
    }
    actions: {
      deleteConfirm: string
    }
  }
  namedContactsTab: {
    description: string
    add: string
    empty: {
      loading: string
      none: string
    }
    columns: {
      role: string
      name: string
      title: string
      email: string
      phone: string
      primary: string
    }
    actions: {
      deleteConfirm: string
    }
  }
  addressDialog: {
    titles: {
      create: string
      edit: string
    }
    fields: {
      label: string
      line1: string
      line2: string
      city: string
      region: string
      postalCode: string
      country: string
      timezone: string
      latitude: string
      longitude: string
      notes: string
    }
    placeholders: {
      timezone: string
    }
    actions: {
      create: string
    }
  }
  contactPointDialog: {
    titles: {
      create: string
      edit: string
    }
    fields: {
      kind: string
      label: string
      value: string
      notes: string
    }
    placeholders: {
      label: string
      value: string
    }
    actions: {
      create: string
    }
    validation: {
      valueRequired: string
    }
  }
  namedContactDialog: {
    titles: {
      create: string
      edit: string
    }
    fields: {
      role: string
      name: string
      title: string
      email: string
      phone: string
      notes: string
    }
    placeholders: {
      name: string
      title: string
      email: string
    }
    actions: {
      create: string
    }
    validation: {
      nameRequired: string
    }
  }
}
