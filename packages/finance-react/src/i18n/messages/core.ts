import type { CreditNoteRecord, InvoiceRecord, SupplierPaymentRecord } from "../../index.js"

export type {
  ApServiceType,
  CreditNoteRecord,
  InvoiceNumberResetStrategy,
  InvoiceNumberSeriesScope,
  InvoiceRecord,
  SupplierInvoiceStatus,
  SupplierPaymentRecord,
} from "../../index.js"

export type CostAllocationTargetType =
  | "departure"
  | "product"
  | "booking"
  | "traveler"
  | "unattributed"

export type SupplierInvoiceDetailPaymentMethod =
  | "bank_transfer"
  | "credit_card"
  | "cash"
  | "cheque"
  | "other"

export const invoiceStatuses = [
  "draft",
  "pending_external_allocation",
  "issued",
  "partially_paid",
  "paid",
  "overdue",
  "void",
] as const

export const supplierPaymentMethods = [
  "bank_transfer",
  "credit_card",
  "cash",
  "cheque",
  "other",
] as const

export const paymentMethods = [
  "bank_transfer",
  "credit_card",
  "debit_card",
  "cash",
  "cheque",
  "wallet",
  "direct_bill",
  "travel_credit",
  "other",
] as const

export const supplierPaymentStatuses = ["pending", "completed", "failed", "refunded"] as const
export const taxRegimeCodes = [
  "standard",
  "reduced",
  "exempt",
  "reverse_charge",
  "margin_scheme_art311",
  "zero_rated",
  "out_of_scope",
  "other",
] as const
export const invoiceNumberSeriesScopes = ["invoice", "proforma", "credit_note"] as const
export const invoiceNumberResetStrategies = ["never", "annual", "monthly"] as const

export type InvoiceStatus = InvoiceRecord["status"]
export type InvoiceType = NonNullable<InvoiceRecord["invoiceType"]>
export type PaymentMethod = (typeof paymentMethods)[number]
export type SupplierPaymentMethod = (typeof supplierPaymentMethods)[number]
export type SupplierPaymentStatus = SupplierPaymentRecord["status"]
export type CreditNoteStatus = CreditNoteRecord["status"]
export type TaxRegimeCodeOption = (typeof taxRegimeCodes)[number]

export type TaxesPageMessageKey =
  | "title"
  | "description"
  | "addTax"
  | "empty"
  | "inactive"
  | "edit"
  | "delete"
  | "deleteConfirm"
  | "editSheetTitle"
  | "newSheetTitle"
  | "taxClassBadge"
  | "defaultRegimeLabel"
  | "regimeOverridesLabel"
  | "regimeOverrideCount"
  | "taxClassSectionTitle"
  | "taxClassSectionDescription"
  | "defaultRegimeSectionTitle"
  | "defaultRegimeSectionDescription"
  | "regimeOverridesSectionTitle"
  | "regimeOverridesSectionDescription"
  | "addRegimeOverride"
  | "removeRegimeOverride"
  | "noRegimeOverrides"
  | "appliesToLabel"
  | "taxRegimeLabel"
  | "appliesToBase"
  | "appliesToAddon"
  | "appliesToAccommodation"
  | "appliesToAll"
  | "taxClassLabelLabel"
  | "taxClassLabelPlaceholder"
  | "taxClassCodeLabel"
  | "taxClassCodePlaceholder"
  | "taxClassDescriptionLabel"
  | "taxClassDescriptionPlaceholder"
  | "regimeNameLabel"
  | "regimeNamePlaceholder"
  | "regimeCodeLabel"
  | "rateLabel"
  | "jurisdictionLabel"
  | "legalReferenceLabel"
  | "legalReferencePlaceholder"
  | "regimeDescriptionLabel"
  | "regimeDescriptionPlaceholder"
  | "activeLabel"
  | "cancel"
  | "saveChanges"
  | "createTax"
  | "validationNameRequired"
  | "validationRateInvalid"
  | "saveFailed"
  | "policyTitle"
  | "policyDescription"
  | "addPolicyProfile"
  | "addPolicyRule"
  | "policyEmpty"
  | "policyRulesEmpty"
  | "deletePolicyProfileConfirm"
  | "deletePolicyRuleConfirm"
  | "editPolicyProfileSheetTitle"
  | "newPolicyProfileSheetTitle"
  | "editPolicyRuleSheetTitle"
  | "newPolicyRuleSheetTitle"
  | "policyProfileNameLabel"
  | "policyProfileNamePlaceholder"
  | "policyProfileCodeLabel"
  | "policyProfileCodePlaceholder"
  | "policyProfileDescriptionLabel"
  | "policyProfileDescriptionPlaceholder"
  | "policyPriorityLabel"
  | "policySideLabel"
  | "policyRuleNameLabel"
  | "policyRuleNamePlaceholder"
  | "policyConditionLabel"
  | "policyConditionSectionTitle"
  | "policyConditionSectionDescription"
  | "policyConditionModeLabel"
  | "policyConditionAlways"
  | "policyConditionAlwaysDescription"
  | "policyConditionModeAll"
  | "policyConditionModeAny"
  | "addPolicyCondition"
  | "removePolicyCondition"
  | "policyFactLabel"
  | "policyFactHasAccommodation"
  | "policyFactAccommodationCountries"
  | "policyOperatorLabel"
  | "policyOperatorEquals"
  | "policyOperatorContains"
  | "policyValueLabel"
  | "policyValueYes"
  | "policyValueNo"
  | "customCondition"
  | "policyActionsLabel"
  | "policySideSell"
  | "policySideBuy"
  | "createPolicyProfile"
  | "createPolicyRule"
  | "validationPolicyProfileNameRequired"
  | "validationPolicyProfileRequired"
  | "validationPolicyRuleNameRequired"
  | "validationPolicyRuleRegimeRequired"
  | "validationPolicyRulePriorityInvalid"
  | "validationPolicyRuleConditionInvalid"
  | "savePolicyProfileFailed"
  | "savePolicyRuleFailed"
