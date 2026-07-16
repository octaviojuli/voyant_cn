import type { BookingsUiMessages } from "./messages.js"
import { bookingsUiZhBase } from "./zh-base.js"
import { bookingsUiZhCreateList } from "./zh-create-list.js"
import { bookingsUiZhJourney } from "./zh-journey.js"
import { bookingsUiZhOperations } from "./zh-operations.js"
import { bookingsUiZhSections } from "./zh-sections.js"

export const bookingsUiZh = {
  ...bookingsUiZhBase,
  ...bookingsUiZhSections,
  ...bookingsUiZhJourney,
  ...bookingsUiZhOperations,
  ...bookingsUiZhCreateList,
} satisfies BookingsUiMessages
