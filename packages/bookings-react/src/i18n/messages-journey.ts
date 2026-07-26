export type BookingsUiJourneyMessages = {
  bookingJourney: {
    steps: Record<
      | "departure"
      | "billing"
      | "travelers"
      | "options"
      | "accommodation"
      | "addons"
      | "payment"
      | "documents"
      | "review",
      string
    > & {
      billingAndContact: string
      reviewAndConfirm: string
    }
    navigation: {
      back: string
      next: string
      checking: string
      continue: string
      edit: string
      done: string
      cancel: string
    }
    values: {
      noValue: string
      notSet: string
      none: string
      selectPlaceholder: string
    }
    validation: {
      completeStepBeforeContinuing: string
      unableToContinue: string
      quoteFailed: string
      retryQuote: string
      quoteUnavailable: string
      pricingUnavailable: string
      checkoutFailed: string
      paidPaymentDateRequired: string
      addAtLeastTravelers: string
      maxTravelersPerBooking: string
      ageOutOfRange: string
      dependencyRequires: string
      dependencyExcludes: string
      dependencyLimitPerMaster: string
      dependencyLimitSum: string
      invalidEmail: string
    }
    /**
     * Commit (Confirm booking) failures rendered under the form. The
     * server's raw message is English and leaks internals, so the
     * journey renders one of these instead.
     */
    commitErrors: {
      /** Slot ran out of seats and the server told us how many are left. */
      noAvailability: string
      /** Slot ran out of seats, remaining count unknown. */
      noAvailabilityUnknown: string
      /** Anything else the commit can fail with. */
      fallback: string
    }
    warnings: {
      phoneMissing: string
      billingCountryMissing: string
      vatMissing: string
      travelerFieldRequired: string
      paymentIntentMissing: string
      noTravelers: string
    }
    configure: {
      travelers: string
      departureDate: string
      option: string
      timeOptional: string
      checkIn: string
      checkOutWithNights: string
      cabinCategory: string
      cabinNumber: string
      airArrangements: string
      airOptions: Record<
        "cruise_line" | "independent" | "none",
        { label: string; description: string }
      >
      ageHintRange: string
      ageHintMinimum: string
      ageHintMaximum: string
    }
    billing: {
      title: string
      buyerType: string
      individual: string
      company: string
      firstName: string
      lastName: string
      email: string
      phone: string
      addressLine1: string
      addressLine2Optional: string
      city: string
      postalCode: string
      country: string
      companyName: string
      vatId: string
      leadContactSummaryNote: string
      leadContactSummaryEmpty: string
    }
    travelers: {
      title: string
      partySize: string
      details: string
      decrease: string
      increase: string
      empty: string
      addTraveler: string
      travelerType: string
      travelerNumber: string
      ageLabel: string
      copyFromBilling: string
      remove: string
      /**
       * Pax-band labels keyed by the band's stable `code`. The server
       * ships an English `label` on the band contract; the UI renders
       * by code so the operator sees localized copy, falling back to
       * the server label for vertical-specific codes not listed here.
       */
      bandLabels: Record<"adult" | "child" | "infant" | "senior" | "youth" | "student", string>
    }
    accommodation: {
      title: string
      empty: string
      extensionsAvailable: string
      ratePlan: string
      cancellationPrefix: string
      includesPrefix: string
    }
    addons: {
      title: string
      empty: string
      otherBucket: string
    }
    payment: {
      title: string
      empty: string
      redirectedAfterConfirm: string
      linkSentAfterConfirm: string
      cardOperatorLabel: string
      cardOperatorDescription: string
      generateLinkLabel: string
      generateLinkHint: string
      inquiryNotice: string
      bankTransferInstructions: string
      bankTransferDefaultNote: string
      intentLabels: Record<
        "card" | "bank_transfer" | "hold" | "ticket_on_credit" | "inquiry",
        string
      >
      intentDescriptions: Record<
        "card" | "bank_transfer" | "hold" | "ticket_on_credit" | "inquiry",
        string
      >
    }
    review: {
      title: string
      leadContact: string
      travelers: string
      customerNotes: string
      customerNotesPlaceholder: string
      internalNotes: string
      confirmBooking: string
      confirming: string
      completeToConfirm: string
      priceOverrideToggle: string
      priceOverrideAmount: string
      priceOverrideReason: string
      priceOverrideReasonPlaceholder: string
      priceOverrideReasonRequired: string
    }
    documents: {
      saveAsDraft: string
      saveAsDraftHint: string
    }
    contract: {
      defaultTitle: string
      description: string
      errorPrefix: string
      iframeTitle: string
      termsLabel: string
      marketingLabel: string
      cancel: string
      acceptAndContinue: string
      previewRequestFailed: string
      previewMissing: string
    }
    sidePanel: {
      youAreBooking: string
      total: string
      pricingHint: string
      pricingHintRooms: string
      guestSingular: string
      guestPlural: string
      filledOf: string
      roomSingular: string
      roomPlural: string
      addOnSingular: string
      addOnPlural: string
      card: string
      hold: string
      onCredit: string
      confirmAndBook: string
      reviewDetails: string
      noTravelersYet: string
      notSelected: string
      noAddonsSelected: string
      adults: string
      children: string
      infants: string
      departure: string
      date: string
      checkIn: string
      checkOut: string
      cabin: string
      name: string
      email: string
      phone: string
      buyer: string
      company: string
      individual: string
      vat: string
      address: string
      travelerNumber: string
      dob: string
      method: string
      schedule: string
      payByCard: string
      ticketOnCredit: string
      holdNoChargeYet: string
    }
  }
}
