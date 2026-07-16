import type { CrmUiMessages } from "./messages.js"
import { crmUiZhBaseMessages } from "./zh/base.js"
import { crmUiZhCommerceMessages } from "./zh/commerce.js"
import { crmUiZhDetailMessages } from "./zh/detail.js"
import { crmUiZhListsMessages } from "./zh/lists.js"

export const crmUiZh = {
  ...crmUiZhBaseMessages,
  ...crmUiZhListsMessages,
  ...crmUiZhDetailMessages,
  ...crmUiZhCommerceMessages,
} satisfies CrmUiMessages
