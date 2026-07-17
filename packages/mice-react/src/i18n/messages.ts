/** Program types + lifecycle statuses the MICE backend accepts (`validation.ts`). */
export const miceProgramTypes = [
  "meeting",
  "incentive",
  "conference",
  "exhibition",
  "other",
] as const

export const miceProgramStatuses = [
  "lead",
  "planning",
  "contracted",
  "operating",
  "completed",
  "cancelled",
] as const

/** The session types the MICE backend accepts (`createSessionSchema`). */
export const miceSessionTypes = [
  "keynote",
  "breakout",
  "meal",
  "networking",
  "gala",
  "excursion",
  "free",
] as const

/** Delegate roles + statuses the MICE backend accepts (`validation-delegates`). */
export const miceDelegateRoles = [
  "attendee",
  "speaker",
  "sponsor",
  "vip",
  "staff",
  "exhibitor",
  "organizer",
] as const

export const miceDelegateStatuses = [
  "invited",
  "registered",
  "confirmed",
  "checked_in",
  "no_show",
  "cancelled",
] as const

export const miceEnrollmentStatuses = ["registered", "waitlisted", "attended", "cancelled"] as const

/** RFP lifecycle statuses (`validation-rfp`), including the award-controlled one. */
export const miceRfpStatuses = ["draft", "issued", "closed", "awarded", "cancelled"] as const

export const miceBidStatuses = [
  "draft",
  "submitted",
  "under_review",
  "accepted",
  "rejected",
] as const

export type MiceProgramType = (typeof miceProgramTypes)[number]
export type MiceProgramStatus = (typeof miceProgramStatuses)[number]
export type MiceSessionType = (typeof miceSessionTypes)[number]
export type MiceDelegateRole = (typeof miceDelegateRoles)[number]
export type MiceDelegateStatus = (typeof miceDelegateStatuses)[number]
export type MiceEnrollmentStatus = (typeof miceEnrollmentStatuses)[number]
export type MiceRfpStatus = (typeof miceRfpStatuses)[number]
export type MiceBidStatus = (typeof miceBidStatuses)[number]

export type MiceUiMessages = {
  common: {
    cancel: string
    loading: string
    programTypeLabels: Record<MiceProgramType, string>
    programStatusLabels: Record<MiceProgramStatus, string>
  }
  programsPage: {
    title: string
    description: string
    create: string
    nameColumn: string
    typeColumn: string
    statusColumn: string
    datesColumn: string
    paxColumn: string
    empty: string
    capped: string
  }
  programDetailPage: {
    notFound: string
    edit: string
    paxMeta: string
  }
  programFormDialog: {
    editTitle: string
    createTitle: string
    nameLabel: string
    namePlaceholder: string
    typeLabel: string
    statusLabel: string
    destinationLabel: string
    destinationPlaceholder: string
    startDateLabel: string
    endDateLabel: string
    estimatedPaxLabel: string
    confirmedPaxLabel: string
    currencyLabel: string
    budgetLabel: string
    budgetCurrencyFallback: string
    budgetPlaceholder: string
    paxInvalid: string
    budgetInvalid: string
    saveChanges: string
    create: string
  }
  costSheetPanel: {
    title: string
    description: string
    mixedCurrencyNote: string
    multiCurrencyBadge: string
    category: string
    cost: string
    sell: string
    margin: string
    marginBadge: string
    rooms: string
    space: string
    sessions: string
    total: string
    empty: string
  }
  sessionsSection: {
    heading: string
    create: string
    titleColumn: string
    typeColumn: string
    dayColumn: string
    timeColumn: string
    trackColumn: string
    capacityColumn: string
    empty: string
    capped: string
    sessionTypeLabels: Record<MiceSessionType, string>
    dialog: {
      title: string
      titleLabel: string
      titlePlaceholder: string
      typeLabel: string
      dayLabel: string
      dayPlaceholder: string
      trackLabel: string
      trackPlaceholder: string
      capacityLabel: string
      capacityInvalid: string
      requiresRegistration: string
      submit: string
    }
  }
  delegatesSection: {
    heading: string
    add: string
    delegateColumn: string
    roleColumn: string
    statusColumn: string
    bookingColumn: string
    empty: string
    capped: string
    enrollAction: string
    bookingAction: string
    roleLabels: Record<MiceDelegateRole, string>
    statusLabels: Record<MiceDelegateStatus, string>
    enrollmentStatusLabels: Record<MiceEnrollmentStatus, string>
    createDialog: {
      title: string
      roleLabel: string
      statusLabel: string
      personLabel: string
      personPlaceholder: string
      personEmpty: string
      submit: string
    }
    enrollDialog: {
      title: string
      sessionLabel: string
      sessionPlaceholder: string
      noSessions: string
      statusLabel: string
      submit: string
    }
    linkBookingDialog: {
      title: string
      bookingIdLabel: string
      bookingIdPlaceholder: string
      delegateLine: string
      submit: string
    }
  }
  roomingSection: {
    heading: string
    create: string
    roomBlockColumn: string
    roomTypeColumn: string
    stayColumn: string
    bedColumn: string
    sharingGroupColumn: string
    empty: string
    capped: string
    stayRange: string
    occupantsAction: string
    createDialog: {
      title: string
      roomBlockLabel: string
      roomBlockPlaceholder: string
      roomTypeLabel: string
      roomTypePlaceholder: string
      checkInLabel: string
      checkOutLabel: string
      bedConfigLabel: string
      bedConfigPlaceholder: string
      sharingGroupLabel: string
      sharingGroupPlaceholder: string
      specialRequestsLabel: string
      specialRequestsPlaceholder: string
      submit: string
    }
    occupantsDialog: {
      title: string
      delegateColumn: string
      primaryColumn: string
      bedLabelColumn: string
      bedLabelPlaceholder: string
      assignAria: string
      markPrimaryAria: string
      submit: string
    }
  }
  rfpsSection: {
    heading: string
    create: string
    titleColumn: string
    statusColumn: string
    dueColumn: string
    empty: string
    capped: string
    manageAction: string
    rfpStatusLabels: Record<MiceRfpStatus, string>
    bidStatusLabels: Record<MiceBidStatus, string>
    createDialog: {
      title: string
      titleLabel: string
      titlePlaceholder: string
      statusLabel: string
      submit: string
    }
    manageDialog: {
      fallbackTitle: string
      recordBidLabel: string
      bidSupplierPlaceholder: string
      bidTotalPlaceholder: string
      addBid: string
      totalInvalid: string
      currencyMissing: string
      inviteLabel: string
      invitePlaceholder: string
      invite: string
      invitedCount: string
      close: string
    }
    bids: {
      heading: string
      supplierColumn: string
      totalColumn: string
      statusColumn: string
      empty: string
      awardedBadge: string
      award: string
    }
  }
}
