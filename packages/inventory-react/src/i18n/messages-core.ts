import type {
  ProductBookingMode,
  ProductCapacityMode,
  ProductStatus,
  ProductVisibility,
} from "./message-shared.js"

export type ProductsUiCoreMessages = {
  common: {
    cancel: string
    saveChanges: string
    create: string
    add: string
    loading: string
    none: string
    previous: string
    next: string
    page: string
    active: string
    inactive: string
    mediaTypeLabels: {
      image: string
      video: string
      document: string
    }
    optionUnitTypeLabels: {
      person: string
      group: string
      room: string
      vehicle: string
      service: string
      other: string
    }
    optionStatusLabels: {
      draft: string
      active: string
      archived: string
    }
    productStatusLabels: Record<ProductStatus, string>
    productBookingModeLabels: Record<ProductBookingMode, string>
    productCapacityModeLabels: Record<ProductCapacityMode, string>
    productVisibilityLabels: Record<ProductVisibility, string>
  }
  comboboxes: {
    product: {
      placeholder: string
      empty: string
    }
    productCategory: {
      placeholder: string
      empty: string
    }
    productType: {
      placeholder: string
      empty: string
    }
    facility: {
      placeholder: string
      empty: string
    }
    taxClass: {
      placeholder: string
      empty: string
    }
    contractTemplate: {
      placeholder: string
      empty: string
    }
  }
  catalogCard: {
    untitled: string
  }
  productCategoriesPage: {
    title: string
    description: string
  }
  productsPage: {
    title: string
    description: string
  }
  routeImportPage: {
    title: string
    description: string
    upload: {
      label: string
      hint: string
      button: string
      uploading: string
      failed: string
    }
    empty: string
    columns: {
      file: string
      route: string
      days: string
      status: string
      created: string
    }
    status: {
      pending_review: string
      in_review: string
      committed: string
      discarded: string
    }
    detail: {
      back: string
      sourceFile: string
      routeMap: string
      routeMapEmpty: string
      basics: string
      itinerary: string
      pricing: string
      inclusions: string
      exclusions: string
      terms: string
      unresolved: string
      unresolvedHint: string
      meals: string
      accommodation: string
      distance: string
      noContent: string
      day: string
      save: string
      saving: string
      saved: string
      commit: string
      committing: string
      committed: string
      commitHint: string
      commitFailed: string
      openProduct: string
      discard: string
      discarded: string
    }
  }
  productDetailPage: {
    actions: {
      back: string
      edit: string
      delete: string
      createBooking: string
      addItinerary: string
      editItinerary: string
      deleteItinerary: string
      addDay: string
      viewFullProduct: string
    }
    sections: {
      overview: {
        title: string
        description: string
      }
      inclusions: {
        title: string
        description: string
      }
      exclusions: {
        title: string
        description: string
      }
      terms: {
        title: string
        description: string
      }
      details: {
        title: string
        description: string
      }
      commercial: {
        title: string
        description: string
      }
      itinerary: {
        title: string
        description: string
      }
      sidebar: {
        title: string
        description: string
      }
    }
    fields: {
      status: string
      bookingMode: string
      visibility: string
      capacityMode: string
      timezone: string
      productType: string
      facility: string
      taxClass: string
      contractTemplate: string
      sellAmount: string
      costAmount: string
      margin: string
      pax: string
      startDate: string
      endDate: string
      reservationTimeout: string
      tags: string
      createdAt: string
      updatedAt: string
    }
    states: {
      loading: string
      loadFailed: string
      notFoundTitle: string
      notFoundDescription: string
      noDescription: string
      noInclusions: string
      noExclusions: string
      noTerms: string
      noItineraries: string
      noDays: string
      deleteConfirm: string
      deleteItineraryConfirm: string
      deleteDayConfirm: string
      deleteServiceConfirm: string
      deleteFailed: string
      minutes: string
    }
  }
  productDialog: {
    titles: {
      create: string
      edit: string
    }
    descriptions: {
      create: string
      edit: string
    }
  }
  productForm: {
    fields: {
      name: string
      description: string
      inclusions: string
      exclusions: string
      terms: string
      tags: string
      status: string
      bookingMode: string
      productType: string
      facility: string
      taxClass: string
      contractTemplate: string
      visibility: string
      activated: string
      capacityMode: string
      timezone: string
      pax: string
      reservationTimeout: string
      sellCurrency: string
      sellAmount: string
      costAmount: string
    }
    placeholders: {
      name: string
      description: string
      inclusions: string
      exclusions: string
      terms: string
      tagInput: string
      productTypeSearch: string
      facilitySearch: string
      taxClassSearch: string
      contractTemplateSearch: string
      timezone: string
      pax: string
      reservationTimeout: string
      currencySearch: string
      amount: string
    }
    validation: {
      nameRequired: string
      sellCurrencyInvalid: string
      paxInvalid: string
      reservationTimeoutInvalid: string
      saveFailed: string
    }
    actions: {
      cancel: string
      saving: string
      create: string
      saveChanges: string
    }
  }
  productTranslationsCard: {
    title: string
    description: string
    languageSelectLabel: string
    newLanguageLabel: string
    fields: {
      languageTag: string
      name: string
      slug: string
      shortDescription: string
      description: string
      inclusions: string
      exclusions: string
      terms: string
      seoTitle: string
      seoDescription: string
    }
    placeholders: {
      languageTag: string
      newLanguage: string
      name: string
      slug: string
      shortDescription: string
      description: string
      inclusions: string
      exclusions: string
      terms: string
      seoTitle: string
      seoDescription: string
    }
    actions: {
      addLanguage: string
      copyBase: string
      save: string
      saving: string
      delete: string
      deleting: string
    }
    states: {
      loading: string
      loadFailed: string
      noTranslations: string
      deleteConfirm: string
      deleteFailed: string
      saveFailed: string
      languageRequired: string
      nameRequired: string
    }
  }
  productList: {
    searchPlaceholder: string
    newProduct: string
    createFailed: string
    filters: {
      button: string
      statusLabel: string
      statusAll: string
      dateLabel: string
      datePlaceholder: string
      paxLabel: string
      sellAmountLabel: string
      min: string
      max: string
      clear: string
    }
    columns: {
      name: string
      status: string
      sellAmount: string
      type: string
      bookingMode: string
      nextDeparture: string
    }
    loadFailed: string
    empty: string
    noValue: string
    paginationShowing: string
    paginationPage: string
    paginationPrevious: string
    paginationNext: string
  }
}
