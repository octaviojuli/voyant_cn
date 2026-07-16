import type { AdminTripsMessages } from "../trips.js"
import { adminTripsZhPart1 } from "./trips-part-1.js"
import { adminTripsZhPart2 } from "./trips-part-2.js"

export const adminTripsZh: AdminTripsMessages = {
  trips: {
    ...adminTripsZhPart1,
    ...adminTripsZhPart2,
  },
}
