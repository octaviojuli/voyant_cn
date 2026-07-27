import {
  type ActionLedgerInventoryDriftRuntime,
  actionLedgerInventoryDriftRuntimePort,
} from "@voyant-travel/action-ledger/runtime-port"
import {
  type BookingsInventoryRuntime,
  bookingsInventoryRuntimePort,
} from "@voyant-travel/bookings/runtime-port"
import { catalogInventoryRuntimeExtensionPort } from "@voyant-travel/catalog/runtime-contracts"
import {
  type CommerceInventoryRuntime,
  commerceInventoryRuntimePort,
} from "@voyant-travel/commerce/runtime-port"
import type { VoyantRuntimeHostPrimitives } from "@voyant-travel/core"
import {
  type FinanceInventoryPaymentPolicyRuntime,
  financeInventoryPaymentPolicyRuntimePort,
} from "@voyant-travel/finance/runtime-port"
import { and, eq } from "drizzle-orm"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"
import { checkProductActionLedgerDrift } from "./action-ledger-drift.js"
import {
  createInventoryPaymentPolicyRuntime,
  readPolicySourceFromInternalNotes,
  stampPolicySourceOnBooking,
} from "./booking-payment-policy-runtime.js"
import { createInventoryBrochureRuntime, resolveBrochurePrinter } from "./brochure-runtime.js"
import { catalogInventoryRuntimeExtension } from "./catalog-runtime-extension.js"
import {
  type InventoryRuntime,
  inventoryBrochureRuntimePort,
  inventoryRuntimePort,
} from "./runtime-ports.js"
import { productCapabilities, products } from "./schema.js"
import { productsService } from "./service.js"
import { createBasicPdfProductBrochurePrinter } from "./tasks/brochure-printers.js"
import {
  createProductsGeneratePdfWorkflowRuntime,
  PRODUCTS_GENERATE_PDF_WORKFLOW_RUNTIME_KEY,
} from "./workflow-runtime.js"

type RuntimePortValue<T> = T | Promise<T>

export interface InventoryRuntimePortContribution {
  inventory: RuntimePortValue<InventoryRuntime>
  brochure: RuntimePortValue<ReturnType<typeof createInventoryBrochureRuntime>>
}

export interface InventoryRuntimeContributorHost {
  primitives: VoyantRuntimeHostPrimitives
}

function createInventoryRuntime(primitives: VoyantRuntimeHostPrimitives): InventoryRuntime {
  return {
    bootstrap: ({ container, bindings }) => {
      const env = primitives.env(bindings)
      container.register(
        PRODUCTS_GENERATE_PDF_WORKFLOW_RUNTIME_KEY,
        createProductsGeneratePdfWorkflowRuntime({
          resolveDb: () => primitives.database.resolve<PostgresJsDatabase>(bindings),
          // 与路由那条入口用同一套选取顺序,免得工作流出来的册子跟界面上
          // 生成的不是同一个版式。都取不到就回落到内置纯文本打印器。
          resolvePrinter: async () =>
            (await resolveBrochurePrinter(env)) ?? createBasicPdfProductBrochurePrinter(),
        }),
      )
    },
  }
}

/** Package-owned registration map for Inventory deployment adapters. */
export function createInventoryRuntimePortContribution(
  host: InventoryRuntimeContributorHost,
): Readonly<Record<string, unknown>> {
  const inventory = createInventoryRuntime(host.primitives)
  const brochure = createInventoryBrochureRuntime(host.primitives)
  return {
    [catalogInventoryRuntimeExtensionPort.id]: catalogInventoryRuntimeExtension,
    [commerceInventoryRuntimePort.id]: {
      async getOwnedProductName(db, entityModule, entityId) {
        if (entityModule !== "products") return null
        return (await productsService.getProductById(db, entityId))?.name ?? null
      },
      listAllProductIds: (db) =>
        db
          .select({ id: products.id })
          .from(products)
          .then((rows) => rows.map((row) => row.id)),
    } satisfies CommerceInventoryRuntime,
    [actionLedgerInventoryDriftRuntimePort.id]: {
      checkProductDrift: checkProductActionLedgerDrift,
    } satisfies ActionLedgerInventoryDriftRuntime,
    [inventoryRuntimePort.id]: inventory,
    [inventoryBrochureRuntimePort.id]: brochure,
    [bookingsInventoryRuntimePort.id]: {
      resolveProductSnapshot: async (db, productId) => {
        const [product, capabilityRows] = await Promise.all([
          db
            .select()
            .from(products)
            .where(eq(products.id, productId))
            .limit(1)
            .then((rows) => rows[0] ?? null),
          db
            .select({ capability: productCapabilities.capability })
            .from(productCapabilities)
            .where(
              and(
                eq(productCapabilities.productId, productId),
                eq(productCapabilities.enabled, true),
              ),
            ),
        ])
        if (!product) return null
        return {
          id: product.id,
          bookingMode: product.bookingMode,
          capabilities: capabilityRows.map((row) => row.capability),
        }
      },
    } satisfies BookingsInventoryRuntime,
    [financeInventoryPaymentPolicyRuntimePort.id]: {
      createPaymentPolicyRuntime: createInventoryPaymentPolicyRuntime,
      stampPolicySourceOnBooking,
      readPolicySourceFromInternalNotes,
    } satisfies FinanceInventoryPaymentPolicyRuntime,
  }
}
