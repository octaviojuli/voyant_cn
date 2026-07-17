import type { OperatorAdminProductsMessages } from "../products-operator.js"
import { operatorAdminProductsZhCore } from "./products-operator-core.js"
import { operatorAdminProductsZhOperations } from "./products-operator-operations.js"
import { operatorAdminProductsZhTaxonomy } from "./products-operator-taxonomy.js"

export const operatorAdminProductsZh: OperatorAdminProductsMessages = {
  products: {
    taxonomy: operatorAdminProductsZhTaxonomy,
    core: operatorAdminProductsZhCore,
    operations: operatorAdminProductsZhOperations,
  },
}
