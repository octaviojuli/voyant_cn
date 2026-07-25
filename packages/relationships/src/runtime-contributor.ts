import {
  type BookingsRelationshipsRuntime,
  bookingsRelationshipsRuntimePort,
} from "@voyant-travel/bookings/runtime-port"
import type { VoyantRuntimeHostPrimitives } from "@voyant-travel/core"
import {
  type CustomFieldRegistryResolver,
  createCustomFieldRegistry,
  mergeCustomFieldDefinitions,
} from "@voyant-travel/core/custom-fields"
import type { RelationshipsRouteRuntimeOptions } from "./route-runtime.js"
import {
  type RelationshipsMiceRuntime,
  relationshipsMiceRuntimePort,
  relationshipsRouteRuntimePort,
} from "./runtime-port.js"
import { loadCustomFieldDefinitions } from "./service/custom-fields-registry.js"
import { relationshipsService } from "./service/index.js"
import { createStorefrontIntakePersistence } from "./storefront-intake-runtime.js"

const storefrontIntakeRuntimePortReference = {
  id: "storefront.intake.runtime",
} as const

export interface RelationshipsRuntimeContributorHost {
  primitives: VoyantRuntimeHostPrimitives
}

/** Package-owned registration map for Relationships deployment adapters. */
export function createRelationshipsRuntimePortContribution(
  host: RelationshipsRuntimeContributorHost,
): Readonly<Record<string, unknown>> {
  const customFields: CustomFieldRegistryResolver = async (db) => {
    const resolver = host.primitives.config.read(db, "customFields")
    if (typeof resolver === "function") {
      return (resolver as CustomFieldRegistryResolver)(db)
    }
    if (resolver != null) {
      throw new Error("Relationships customFields config must be a resolver function.")
    }
    // No deployment-supplied resolver (`host.config.customFields`): default to
    // the unified system's runtime half — admin-managed `custom_field_definitions`
    // only, i.e. an empty registry until fields are declared. Deployments with
    // code-declared fields supply their own resolver and merge both sources
    // (see docs/architecture/custom-fields.md).
    return createCustomFieldRegistry(
      mergeCustomFieldDefinitions([await loadCustomFieldDefinitions(db as never)]),
    )
  }
  return {
    [storefrontIntakeRuntimePortReference.id]: createStorefrontIntakePersistence(),
    [relationshipsRouteRuntimePort.id]: {
      customFields,
    } satisfies RelationshipsRouteRuntimeOptions,
    [relationshipsMiceRuntimePort.id]: {
      personExists: async (db, personId) =>
        (await relationshipsService.getPersonById(db as never, personId)) != null,
    } satisfies RelationshipsMiceRuntime,
    [bookingsRelationshipsRuntimePort.id]: {
      loadPersonTravelSnapshot: (...args) => relationshipsService.loadPersonTravelSnapshot(...args),
      upsertPersonFromContact: (...args) => relationshipsService.upsertPersonFromContact(...args),
      getPersonById: (...args) => relationshipsService.getPersonById(...args),
      getOrganizationById: (...args) => relationshipsService.getOrganizationById(...args),
    } satisfies BookingsRelationshipsRuntime,
  }
}
