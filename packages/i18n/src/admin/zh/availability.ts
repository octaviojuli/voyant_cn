import type { AdminAvailabilityMessages } from "../availability.js"
import { adminAvailabilityZhPart1 } from "./availability-part-1.js"
import { adminAvailabilityZhPart2 } from "./availability-part-2.js"

export const adminAvailabilityZh: AdminAvailabilityMessages = {
  availability: {
    ...adminAvailabilityZhPart1,
    ...adminAvailabilityZhPart2,
  },
}
