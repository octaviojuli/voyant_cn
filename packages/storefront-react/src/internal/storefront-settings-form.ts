import { storefrontSettingsUiEn } from "../i18n/en.js"
import type { StorefrontSettingsUiMessages } from "../i18n/messages.js"
import type { StorefrontSettingsPatchInput, StorefrontSettingsRecord } from "../index.js"

export type SupportLinkRow = {
  rowKey: string
  label: string
  url: string
}

export type PaymentMethodCode = NonNullable<StorefrontSettingsRecord["payment"]["defaultMethod"]>

export type FormState = {
  logoUrl: string
  faviconUrl: string
  brandMarkUrl: string
  primaryColor: string
  accentColor: string
  supportedLanguages: string
  supportEmail: string
  supportPhone: string
  supportLinks: SupportLinkRow[]
  termsUrl: string
  privacyUrl: string
  cancellationUrl: string
  defaultContractTemplateId: string
  defaultLocale: string
  currencyDisplay: StorefrontSettingsRecord["localization"]["currencyDisplay"]
  defaultMethod: PaymentMethodCode | "none"
  enabledMethods: Record<PaymentMethodCode, boolean>
  paymentStructure: StorefrontSettingsRecord["payment"]["structure"]
  depositPercent: string
  balanceDueDaysBeforeDeparture: string
  bankTransferDueDays: string
  bankProvider: string
  bankCurrency: string
  accountHolder: string
  bankName: string
  iban: string
  bic: string
  paymentReference: string
  bankInstructions: string
}

export const paymentMethods: Array<{ code: PaymentMethodCode }> = [
  { code: "card" },
  { code: "bank_transfer" },
  { code: "cash" },
  { code: "travel_credit" },
  { code: "invoice" },
]

export const loadingSectionKeys = ["branding", "support", "legal", "payment"] as const

let supportLinkSeq = 0
export const nextSupportLinkKey = () => `support-link-${++supportLinkSeq}`

export const emptyForm: FormState = {
  logoUrl: "",
  faviconUrl: "",
  brandMarkUrl: "",
  primaryColor: "",
  accentColor: "",
  supportedLanguages: "",
  supportEmail: "",
  supportPhone: "",
  supportLinks: [],
  termsUrl: "",
  privacyUrl: "",
  cancellationUrl: "",
  defaultContractTemplateId: "",
  defaultLocale: "",
  currencyDisplay: "code",
  defaultMethod: "none",
  enabledMethods: {
    card: false,
    bank_transfer: false,
    cash: false,
    travel_credit: false,
    invoice: false,
  },
  paymentStructure: "full",
  depositPercent: "",
  balanceDueDaysBeforeDeparture: "",
  bankTransferDueDays: "",
  bankProvider: "",
  bankCurrency: "",
  accountHolder: "",
  bankName: "",
  iban: "",
  bic: "",
  paymentReference: "",
  bankInstructions: "",
}

function optional(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function urlLooksValid(value: string) {
  if (!value.trim()) return true
  try {
    const url = new URL(value)
    // i18n-literal-ok: URL scheme tokens compared against URL.protocol, not copy
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

function colorLooksValid(value: string) {
  return !value.trim() || /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim())
}

export function toFormState(settings?: StorefrontSettingsRecord): FormState {
  if (!settings) return emptyForm

  return {
    logoUrl: settings.branding.logoUrl ?? "",
    faviconUrl: settings.branding.faviconUrl ?? "",
    brandMarkUrl: settings.branding.brandMarkUrl ?? "",
    primaryColor: settings.branding.primaryColor ?? "",
    accentColor: settings.branding.accentColor ?? "",
    supportedLanguages: settings.branding.supportedLanguages.join(", "),
    supportEmail: settings.support.email ?? "",
    supportPhone: settings.support.phone ?? "",
    supportLinks: settings.support.links.map((link) => ({
      rowKey: nextSupportLinkKey(),
      label: link.label,
      url: link.url,
    })),
    termsUrl: settings.legal.termsUrl ?? "",
    privacyUrl: settings.legal.privacyUrl ?? "",
    cancellationUrl: settings.legal.cancellationUrl ?? "",
    defaultContractTemplateId: settings.legal.defaultContractTemplateId ?? "",
    defaultLocale: settings.localization.defaultLocale ?? "",
    currencyDisplay: settings.localization.currencyDisplay,
    defaultMethod: settings.payment.defaultMethod ?? "none",
    enabledMethods: Object.fromEntries(
      paymentMethods.map((method) => [
        method.code,
        settings.payment.methods.some((stored) => stored.code === method.code && stored.enabled),
      ]),
    ) as FormState["enabledMethods"],
    paymentStructure: settings.payment.structure,
    depositPercent: settings.payment.defaultSchedule?.depositPercent?.toString() ?? "",
    balanceDueDaysBeforeDeparture:
      settings.payment.defaultSchedule?.balanceDueDaysBeforeDeparture?.toString() ?? "",
    bankTransferDueDays: settings.payment.bankTransfer?.dueDays?.toString() ?? "",
    bankProvider: settings.payment.bankTransfer?.account?.provider ?? "",
    bankCurrency: settings.payment.bankTransfer?.account?.currency ?? "",
    accountHolder:
      settings.payment.bankTransfer?.account?.beneficiary ??
      settings.payment.bankTransfer?.accountHolder ??
      "",
    bankName:
      settings.payment.bankTransfer?.account?.bank ?? settings.payment.bankTransfer?.bankName ?? "",
    iban: settings.payment.bankTransfer?.account?.iban ?? settings.payment.bankTransfer?.iban ?? "",
    bic: settings.payment.bankTransfer?.bic ?? "",
    paymentReference: settings.payment.bankTransfer?.paymentReference ?? "",
    bankInstructions: settings.payment.bankTransfer?.instructions ?? "",
  }
}

export function validateForm(
  form: FormState,
  messages: StorefrontSettingsUiMessages["validation"] = storefrontSettingsUiEn.validation,
) {
  const urls = [
    form.logoUrl,
    form.faviconUrl,
    form.brandMarkUrl,
    form.termsUrl,
    form.privacyUrl,
    form.cancellationUrl,
    ...form.supportLinks.map((link) => link.url),
  ]
  if (urls.some((url) => !urlLooksValid(url))) {
    return messages.invalidUrl
  }

  if (!colorLooksValid(form.primaryColor) || !colorLooksValid(form.accentColor)) {
    return messages.invalidColor
  }

  const deposit = form.depositPercent ? Number(form.depositPercent) : null
  if (deposit !== null && (!Number.isFinite(deposit) || deposit < 0 || deposit > 100)) {
    return messages.depositPercentRange
  }

  const balanceDue = form.balanceDueDaysBeforeDeparture
    ? Number(form.balanceDueDaysBeforeDeparture)
    : null
  if (balanceDue !== null && (!Number.isInteger(balanceDue) || balanceDue < 0)) {
    return messages.balanceDueDaysInvalid
  }

  const bankDueDays = form.bankTransferDueDays ? Number(form.bankTransferDueDays) : null
  if (bankDueDays !== null && (!Number.isInteger(bankDueDays) || bankDueDays < 0)) {
    return messages.bankDueDaysInvalid
  }

  if (form.defaultMethod !== "none" && !form.enabledMethods[form.defaultMethod]) {
    return messages.defaultMethodDisabled
  }

  return null
}

export function toPayload(form: FormState): StorefrontSettingsPatchInput {
  const supportLinks = form.supportLinks
    .map((link) => ({ label: link.label.trim(), url: link.url.trim() }))
    .filter((link) => link.label || link.url)

  return {
    branding: {
      logoUrl: optional(form.logoUrl),
      faviconUrl: optional(form.faviconUrl),
      brandMarkUrl: optional(form.brandMarkUrl),
      primaryColor: optional(form.primaryColor),
      accentColor: optional(form.accentColor),
      supportedLanguages: form.supportedLanguages
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    },
    support: {
      email: optional(form.supportEmail),
      phone: optional(form.supportPhone),
      links: supportLinks,
    },
    legal: {
      termsUrl: optional(form.termsUrl),
      privacyUrl: optional(form.privacyUrl),
      cancellationUrl: optional(form.cancellationUrl),
      defaultContractTemplateId: optional(form.defaultContractTemplateId),
    },
    localization: {
      defaultLocale: optional(form.defaultLocale),
      currencyDisplay: form.currencyDisplay,
    },
    payment: {
      defaultMethod: form.defaultMethod === "none" ? null : form.defaultMethod,
      methods: paymentMethods
        .filter((method) => form.enabledMethods[method.code])
        .map((method) => ({ code: method.code })),
      structure: form.paymentStructure,
      schedule:
        form.paymentStructure === "split" && form.depositPercent
          ? [
              {
                percent: Number(form.depositPercent),
                dueInDays: 0,
                dueCondition: "after_booking",
              },
              {
                percent: 100 - Number(form.depositPercent),
                dueInDays: form.balanceDueDaysBeforeDeparture
                  ? Number(form.balanceDueDaysBeforeDeparture)
                  : 0,
                dueCondition: "before_departure",
              },
            ]
          : [],
      defaultSchedule:
        form.depositPercent || form.balanceDueDaysBeforeDeparture
          ? {
              depositPercent: form.depositPercent ? Number(form.depositPercent) : null,
              balanceDueDaysBeforeDeparture: form.balanceDueDaysBeforeDeparture
                ? Number(form.balanceDueDaysBeforeDeparture)
                : null,
            }
          : null,
      bankTransfer:
        form.bankTransferDueDays ||
        form.bankProvider ||
        form.bankCurrency ||
        form.accountHolder ||
        form.bankName ||
        form.iban ||
        form.bic ||
        form.paymentReference ||
        form.bankInstructions
          ? {
              dueDays: form.bankTransferDueDays ? Number(form.bankTransferDueDays) : null,
              account:
                form.iban && form.accountHolder && form.bankName
                  ? {
                      provider: optional(form.bankProvider),
                      currency: optional(form.bankCurrency),
                      iban: form.iban.trim(),
                      beneficiary: form.accountHolder.trim(),
                      bank: form.bankName.trim(),
                    }
                  : null,
              accountHolder: optional(form.accountHolder),
              bankName: optional(form.bankName),
              iban: optional(form.iban),
              bic: optional(form.bic),
              paymentReference: optional(form.paymentReference),
              instructions: optional(form.bankInstructions),
            }
          : null,
    },
  }
}

export function hasEmptySettings(settings?: StorefrontSettingsRecord) {
  if (!settings) return true
  return (
    !settings.branding.logoUrl &&
    !settings.support.email &&
    !settings.support.phone &&
    !settings.legal.termsUrl &&
    !settings.payment.defaultMethod &&
    settings.payment.methods.length === 0
  )
}
