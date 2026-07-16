import type { OperatorAdminMessages } from "../app-operator.js"
import { operatorAdminActionLedgerZh } from "./action-ledger-operator.js"
import { adminAuthZh } from "./auth.js"
import { adminAvailabilityZh } from "./availability.js"
import { adminBookingsZh } from "./bookings.js"
import { adminChromeZh } from "./chrome.js"
import { operatorAdminCoreZh } from "./core-operator.js"
import { operatorAdminCrmZh } from "./crm-operator.js"
import { operatorAdminDashboardZh } from "./dashboard-operator.js"
import { adminFinanceZh } from "./finance.js"
import { operatorAdminLegalZh } from "./legal-operator.js"
import { operatorAdminNavZh } from "./operator-nav.js"
import { operatorAdminPricingZh } from "./pricing-operator.js"
import { operatorAdminProductsZh } from "./products-operator.js"
import { adminResourcesZh } from "./resources.js"
import { operatorAdminSettingsZh } from "./settings-operator.js"
import { operatorAdminSuppliersZh } from "./suppliers-operator.js"
import { adminTeamZh } from "./team.js"
import { adminTripsZh } from "./trips.js"

export const operatorAdminZh: OperatorAdminMessages = {
  ...adminChromeZh,
  ...adminAuthZh,
  ...operatorAdminCoreZh,
  ...operatorAdminActionLedgerZh,
  ...adminTeamZh,
  ...adminAvailabilityZh,
  ...adminBookingsZh,
  ...operatorAdminDashboardZh,
  ...operatorAdminPricingZh,
  ...operatorAdminSettingsZh,
  ...operatorAdminCrmZh,
  ...operatorAdminLegalZh,
  ...operatorAdminProductsZh,
  ...operatorAdminSuppliersZh,
  ...adminTripsZh,
  ...adminFinanceZh,
  ...adminResourcesZh,
  ...operatorAdminNavZh,
}
