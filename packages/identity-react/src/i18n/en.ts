import type { IdentityUiMessages } from "./messages.js"

export const identityUiEn = {
  common: {
    cancel: "Cancel",
    saveChanges: "Save Changes",
    primary: "Primary",
    pagination: {
      showing: "Showing {start}-{end} of {total}",
      page: "Page {page} of {pageCount}",
      previous: "Previous",
      next: "Next",
    },
    addressLabelLabels: {
      primary: "Primary",
      billing: "Billing",
      shipping: "Shipping",
      mailing: "Mailing",
      meeting: "Meeting",
      service: "Service",
      legal: "Legal",
      other: "Other",
    },
    contactPointKindLabels: {
      email: "Email",
      phone: "Phone",
      mobile: "Mobile",
      whatsapp: "WhatsApp",
      website: "Website",
      sms: "SMS",
      fax: "Fax",
      social: "Social",
      other: "Other",
    },
    namedContactRoleLabels: {
      general: "General",
      primary: "Primary",
      reservations: "Reservations",
      operations: "Operations",
      front_desk: "Front desk",
      sales: "Sales",
      emergency: "Emergency",
      accounting: "Accounting",
      legal: "Legal",
      other: "Other",
    },
  },
  identityPage: {
    title: "Identity",
    description: "Manage contact points, addresses and named contacts attached to any entity.",
    fields: {
      entityType: "Entity type",
      entity: "Entity",
      customEntityType: "Other entity type",
    },
    placeholders: {
      entityType: "person, organization, supplier...",
      entity: "Paste a reference for custom entity types",
    },
    entityTypeLabels: {
      person: "Person",
      organization: "Organization",
      supplier: "Supplier",
      booking: "Booking",
      product: "Product",
    },
    emptyScope: "Choose an entity above to browse its identity records.",
    tabs: {
      contactPoints: "Contact Points",
      addresses: "Addresses",
      namedContacts: "Named Contacts",
    },
  },
  contactPointsTab: {
    description: "Phone numbers, emails and other communication channels for this entity.",
    add: "Add Contact Point",
    empty: {
      loading: "Loading contact points...",
      none: "No contact points yet.",
    },
    columns: {
      kind: "Kind",
      value: "Value",
      label: "Label",
      primary: "Primary",
    },
    actions: {
      deleteConfirm: "Delete contact point?",
    },
  },
  addressesTab: {
    description: "Physical and postal addresses associated with this entity.",
    add: "Add Address",
    empty: {
      loading: "Loading addresses...",
      none: "No addresses yet.",
    },
    columns: {
      label: "Label",
      street: "Street",
      city: "City",
      country: "Country",
      primary: "Primary",
    },
    actions: {
      deleteConfirm: "Delete address?",
    },
  },
  namedContactsTab: {
    description: "Named people associated with this entity.",
    add: "Add Named Contact",
    empty: {
      loading: "Loading named contacts...",
      none: "No named contacts yet.",
    },
    columns: {
      role: "Role",
      name: "Name",
      title: "Title",
      email: "Email",
      phone: "Phone",
      primary: "Primary",
    },
    actions: {
      deleteConfirm: "Delete named contact?",
    },
  },
  addressDialog: {
    titles: {
      create: "Add Address",
      edit: "Edit Address",
    },
    fields: {
      label: "Label",
      line1: "Line 1",
      line2: "Line 2",
      city: "City",
      region: "Region",
      postalCode: "Postal code",
      country: "Country",
      timezone: "Timezone",
      latitude: "Latitude",
      longitude: "Longitude",
      notes: "Notes",
    },
    placeholders: {
      timezone: "Europe/Istanbul",
    },
    actions: {
      create: "Add Address",
    },
  },
  contactPointDialog: {
    titles: {
      create: "Add Contact Point",
      edit: "Edit Contact Point",
    },
    fields: {
      kind: "Kind",
      label: "Label",
      value: "Value",
      notes: "Notes",
    },
    placeholders: {
      label: "work, personal...",
      value: "name@example.com",
    },
    actions: {
      create: "Add Contact Point",
    },
    validation: {
      valueRequired: "Value is required",
    },
  },
  namedContactDialog: {
    titles: {
      create: "Add Named Contact",
      edit: "Edit Named Contact",
    },
    fields: {
      role: "Role",
      name: "Name",
      title: "Title",
      email: "Email",
      phone: "Phone",
      notes: "Notes",
    },
    placeholders: {
      name: "Jane Doe",
      title: "Director of Sales",
      email: "jane@example.com",
    },
    actions: {
      create: "Add Named Contact",
    },
    validation: {
      nameRequired: "Name is required",
    },
  },
} satisfies IdentityUiMessages
