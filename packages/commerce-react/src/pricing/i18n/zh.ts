import type { PricingUiMessages } from "./messages.js"
import { pricingUiZhCore } from "./zh-core.js"
import { pricingUiZhRules } from "./zh-rules.js"

export const pricingUiZh = {
  ...pricingUiZhCore,
  ...pricingUiZhRules,
} satisfies PricingUiMessages
