import { composeLocaleMessageDefinitions, type LocaleMessageDefinitions } from "../runtime.js"
import {
  type OperatorAdminActionLedgerMessages,
  operatorAdminActionLedgerMessages,
} from "./action-ledger-operator.js"
import { type AdminAuthMessages, adminAuthMessages } from "./auth.js"
import { type AdminAvailabilityMessages, adminAvailabilityMessages } from "./availability.js"
import { type AdminBookingsMessages, adminBookingsMessages } from "./bookings.js"
import { type AdminChromeMessages, adminChromeMessages } from "./chrome.js"
import { type OperatorAdminCoreMessages, operatorAdminCoreMessages } from "./core-operator.js"
import { type OperatorAdminCrmMessages, operatorAdminCrmMessages } from "./crm-operator.js"
import {
  type OperatorAdminDashboardMessages,
  operatorAdminDashboardMessages,
} from "./dashboard-operator.js"
import { type AdminFinanceMessages, adminFinanceMessages } from "./finance.js"
import { type OperatorAdminLegalMessages, operatorAdminLegalMessages } from "./legal-operator.js"
import { type OperatorAdminNavMessages, operatorAdminNavMessages } from "./operator-nav.js"
import {
  type OperatorAdminPricingMessages,
  operatorAdminPricingMessages,
} from "./pricing-operator.js"
import {
  type OperatorAdminProductsMessages,
  operatorAdminProductsMessages,
} from "./products-operator.js"
import { type AdminResourcesMessages, adminResourcesMessages } from "./resources.js"
import {
  type OperatorAdminSettingsMessages,
  operatorAdminSettingsMessages,
} from "./settings-operator.js"
import {
  type OperatorAdminSuppliersMessages,
  operatorAdminSuppliersMessages,
} from "./suppliers-operator.js"
import { type AdminTeamMessages, adminTeamMessages } from "./team.js"
import { type AdminTripsMessages, adminTripsMessages } from "./trips.js"
import { operatorAdminZh } from "./zh/index.js"

export type OperatorAdminMessages = AdminChromeMessages & {
  auth: AdminAuthMessages
} & OperatorAdminCoreMessages &
  OperatorAdminActionLedgerMessages &
  AdminTeamMessages &
  AdminAvailabilityMessages &
  AdminBookingsMessages &
  AdminFinanceMessages &
  AdminResourcesMessages &
  OperatorAdminDashboardMessages &
  OperatorAdminSettingsMessages &
  OperatorAdminPricingMessages &
  OperatorAdminCrmMessages &
  OperatorAdminLegalMessages &
  OperatorAdminProductsMessages &
  OperatorAdminSuppliersMessages &
  AdminTripsMessages & {
    nav: OperatorAdminNavMessages
  }

export const operatorAdminMessageDefinitions =
  composeLocaleMessageDefinitions<OperatorAdminMessages>(
    adminChromeMessages,
    adminAuthMessages,
    operatorAdminCoreMessages,
    operatorAdminActionLedgerMessages,
    adminTeamMessages,
    adminAvailabilityMessages,
    adminBookingsMessages,
    operatorAdminDashboardMessages,
    operatorAdminPricingMessages,
    operatorAdminSettingsMessages,
    operatorAdminCrmMessages,
    operatorAdminLegalMessages,
    operatorAdminProductsMessages,
    operatorAdminSuppliersMessages,
    adminTripsMessages,
    adminFinanceMessages,
    adminResourcesMessages,
    operatorAdminNavMessages,
    { zh: operatorAdminZh },
  ) satisfies LocaleMessageDefinitions<OperatorAdminMessages>
