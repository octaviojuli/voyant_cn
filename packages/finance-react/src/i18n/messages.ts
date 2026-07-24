export * from "./messages/core.js"
export type * from "./messages/invoices.js"
export type * from "./messages/numberingAndPayments.js"
export type * from "./messages/profitability.js"
export type * from "./messages/suppliers.js"

import type { TaxesPageMessageKey, TaxRegimeCodeOption } from "./messages/core.js"
import type {
  CommonMessages,
  InvoiceDetailPageMessages,
  InvoiceDialogMessages,
  InvoicesPageMessages,
} from "./messages/invoices.js"
import type {
  InvoiceNumberSeriesDialogMessages,
  InvoiceNumberSeriesPageMessages,
  PaymentDetailPageMessages,
  PaymentPolicyMessages,
  PaymentsPageMessages,
  RecordBookingPaymentDialogMessages,
} from "./messages/numberingAndPayments.js"
import type { CostCategoriesMessages, ProfitabilityMessages } from "./messages/profitability.js"
import type {
  SupplierInvoiceDetailMessages,
  SupplierInvoicesPageMessages,
  SupplierPaymentDialogMessages,
} from "./messages/suppliers.js"

export type FinanceUiMessages = {
  common: CommonMessages
  invoiceDialog: InvoiceDialogMessages
  invoicesPage: InvoicesPageMessages
  supplierInvoicesPage: SupplierInvoicesPageMessages
  supplierInvoiceDetail: SupplierInvoiceDetailMessages
  invoiceNumberSeriesPage: InvoiceNumberSeriesPageMessages
  invoiceNumberSeriesDialog: InvoiceNumberSeriesDialogMessages
  paymentsPage: PaymentsPageMessages
  paymentDetailPage: PaymentDetailPageMessages
  invoiceDetailPage: InvoiceDetailPageMessages
  paymentPolicy: PaymentPolicyMessages
  taxesPage: Record<TaxesPageMessageKey, string> & {
    taxCodeLabels: Record<TaxRegimeCodeOption, string>
  }
  supplierPaymentDialog: SupplierPaymentDialogMessages
  recordBookingPaymentDialog: RecordBookingPaymentDialogMessages
  profitability: ProfitabilityMessages
  costCategories: CostCategoriesMessages
}
