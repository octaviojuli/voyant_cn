import { localizedCountriesWithRegionsEnPart1 } from "./localized-countries-regions/en-part-1.js"
import { localizedCountriesWithRegionsEnPart2 } from "./localized-countries-regions/en-part-2.js"
import { localizedCountriesWithRegionsEnPart3 } from "./localized-countries-regions/en-part-3.js"
import { localizedCountriesWithRegionsRoPart1 } from "./localized-countries-regions/ro-part-1.js"
import { localizedCountriesWithRegionsRoPart2 } from "./localized-countries-regions/ro-part-2.js"
import { localizedCountriesWithRegionsRoPart3 } from "./localized-countries-regions/ro-part-3.js"
import { localizedCountriesWithRegionsZhPart1 } from "./localized-countries-regions/zh-part-1.js"
import { localizedCountriesWithRegionsZhPart2 } from "./localized-countries-regions/zh-part-2.js"
import { localizedCountriesWithRegionsZhPart3 } from "./localized-countries-regions/zh-part-3.js"

export const localizedCountriesWithRegions = {
  en: [
    ...localizedCountriesWithRegionsEnPart1,
    ...localizedCountriesWithRegionsEnPart2,
    ...localizedCountriesWithRegionsEnPart3,
  ],
  ro: [
    ...localizedCountriesWithRegionsRoPart1,
    ...localizedCountriesWithRegionsRoPart2,
    ...localizedCountriesWithRegionsRoPart3,
  ],
  zh: [
    ...localizedCountriesWithRegionsZhPart1,
    ...localizedCountriesWithRegionsZhPart2,
    ...localizedCountriesWithRegionsZhPart3,
  ],
}
