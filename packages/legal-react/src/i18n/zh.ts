import type { LegalUiMessages } from "./messages.js"
import { legalUiZhContracts } from "./zh-contracts.js"
import { legalUiZhPolicies } from "./zh-policies.js"

export const legalUiZh = {
  ...legalUiZhContracts,
  ...legalUiZhPolicies,
} satisfies LegalUiMessages
