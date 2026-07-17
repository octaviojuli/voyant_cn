import type { StorefrontSettingsRecord } from "../schemas.js"

export type StorefrontPaymentMethodCode = NonNullable<
  StorefrontSettingsRecord["payment"]["defaultMethod"]
>

/**
 * Message contract for the operator-facing storefront settings surface.
 *
 * The customer-facing storefront surfaces keep their own seam in
 * `../storefront/messages.tsx`; this seam only covers admin settings UI.
 */
export type StorefrontSettingsUiMessages = {
  page: {
    title: string
    intro: string
    emptyNotice: string
  }
  loadError: {
    title: string
    fallbackBody: string
    retry: string
  }
  branding: {
    title: string
    description: string
    logoUrl: string
    logoUrlPlaceholder: string
    faviconUrl: string
    brandMarkUrl: string
    primaryColor: string
    primaryColorPlaceholder: string
    accentColor: string
    accentColorPlaceholder: string
    supportedLanguages: string
    supportedLanguagesPlaceholder: string
    supportedLanguagesHint: string
  }
  support: {
    title: string
    description: string
    email: string
    phone: string
    contactLinks: string
    linkLabelPlaceholder: string
    linkUrlPlaceholder: string
    linkLabelAria: string
    linkUrlAria: string
    removeLinkAria: string
    addLink: string
  }
  legalLocalization: {
    title: string
    description: string
    termsUrl: string
    privacyUrl: string
    cancellationUrl: string
    contractTemplateId: string
    defaultLocale: string
    defaultLocalePlaceholder: string
    currencyDisplay: string
    currencyDisplayLabels: Record<
      StorefrontSettingsRecord["localization"]["currencyDisplay"],
      string
    >
  }
  payment: {
    title: string
    description: string
    methodsLegend: string
    methodLabels: Record<StorefrontPaymentMethodCode, string>
    defaultMethod: string
    defaultMethodNone: string
    paymentStructure: string
    structureLabels: Record<StorefrontSettingsRecord["payment"]["structure"], string>
    depositPercent: string
    balanceDueDays: string
    bankDetailsLegend: string
    provider: string
    currency: string
    accountHolder: string
    bankName: string
    iban: string
    bic: string
    dueDays: string
    paymentReference: string
    instructions: string
  }
  save: {
    button: string
    fallbackError: string
  }
  validation: {
    invalidUrl: string
    invalidColor: string
    depositPercentRange: string
    balanceDueDaysInvalid: string
    bankDueDaysInvalid: string
    defaultMethodDisabled: string
  }
}
