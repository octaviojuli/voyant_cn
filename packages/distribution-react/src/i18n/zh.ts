import type { DistributionUiMessages } from "./messages.js"
import { distributionUiZhBaseMessages } from "./zh/base.js"
import { distributionUiZhPagesMessages } from "./zh/pages.js"
import { distributionUiZhSyncMessages } from "./zh/sync.js"

export const distributionUiZh = {
  ...distributionUiZhBaseMessages,
  ...distributionUiZhSyncMessages,
  ...distributionUiZhPagesMessages,
} satisfies DistributionUiMessages
