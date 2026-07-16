import type { FinanceUiMessages } from "./messages.js"
import { common, invoiceDetailPage, invoiceDialog, invoicesPage } from "./zh/invoices.js"
import {
  invoiceNumberSeriesDialog,
  invoiceNumberSeriesPage,
  paymentDetailPage,
  paymentPolicy,
  paymentsPage,
  recordBookingPaymentDialog,
  taxesPage,
} from "./zh/numberingAndPayments.js"
import { costCategories, profitability } from "./zh/profitability.js"
import {
  supplierInvoiceDetail,
  supplierInvoicesPage,
  supplierPaymentDialog,
} from "./zh/suppliers.js"

export const financeUiZh = {
  common,
  invoiceDialog,
  invoicesPage,
  supplierInvoicesPage,
  supplierInvoiceDetail,
  invoiceNumberSeriesPage,
  invoiceNumberSeriesDialog,
  paymentsPage,
  paymentDetailPage,
  invoiceDetailPage,
  paymentPolicy,
  taxesPage,
  supplierPaymentDialog,
  recordBookingPaymentDialog,
  profitability,
  costCategories,
} satisfies FinanceUiMessages
