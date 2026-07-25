# Custom Fields

Custom fields add typed, visibility-aware fields to core entities without
forking their owning packages. They are appropriate when a value must be
validated or intentionally exposed to exports, invoices, or search.

## Why Not Metadata?

Free-form `metadata` remains the escape hatch for opaque application data. It
cannot provide system-wide guarantees: readers do not know which keys are
valid, which values are sensitive, or which channels may expose them.

A custom-field declaration supplies that contract:

- `entity` and stable `key`
- `type`, `required`, options, and optional custom validation
- channel visibility for export, invoice, and search
- a `pii` marker for storage and redaction policy

Values remain stored with the owning entity, normally in a `custom_fields`
JSONB column. Custom fields do not introduce a cross-domain value table.

## Registry Primitive

`@voyant-travel/core/custom-fields` is dependency-free and owns declaration,
merge, validation, and visibility helpers:

```ts
import {
  createCustomFieldRegistry,
  customFieldsVisibleIn,
  defineCustomField,
  validateCustomFields,
} from "@voyant-travel/core/custom-fields"

const registry = createCustomFieldRegistry([
  defineCustomField({
    entity: "booking",
    key: "group_size",
    type: "number",
    label: "Group size",
    required: true,
  }),
])

const result = validateCustomFields(registry, "booking", input.customFields)
if (!result.ok) throw badRequest(result.errors)

const exported = customFieldsVisibleIn(registry, "booking", "export")
```

Unknown keys, missing required fields, invalid types, unsupported options, and
failed custom rules are rejected before persistence.

## Runtime Ownership

Custom-field injection follows the selected deployment graph. It does not use
`FrameworkProviders.customFields` and the generic Operator host does not import
Bookings or Relationships to wire their route options.

The current authority chain is:

1. Selected package manifests declare their runtime and required typed ports.
2. Generated graph composition loads only the selected package runtime
   contributors.
3. The Node host exposes domain-neutral configuration through
   `VoyantRuntimeHostPrimitives.config.read`.
4. The Bookings contributor exposes that input through
   `bookings.configuration.runtime`; the Bookings package composes it into its
   own route runtime.
5. The Relationships contributor exposes a resolver through
   `relationships.route-runtime`; the Relationships package consumes it in its
   own routes.

This keeps package behavior package-owned while allowing the application to
supply deployment-specific field declarations.

When a deployment supplies no `customFields` config, the Relationships
contributor defaults to the runtime half of the unified system: it resolves the
registry from the admin-managed `custom_field_definitions` table alone (an
empty registry until definitions exist). Supplying a resolver through
`host.config.customFields` overrides this default and is how code-declared
fields are merged in; a non-function config value is still rejected as a
configuration error.

## Project Declarations

`src/custom-fields/` is the recommended source layout, but it is not a runtime
scan and it is not currently one of the graph's automatic project conventions.
The project assembles declarations at build time and supplies one
`CustomFieldRegistryResolver` through the generic host configuration.

For example, a field file may default-export one declaration or an array:

```ts
// src/custom-fields/booking.ts
import { defineCustomField } from "@voyant-travel/core/custom-fields"

export default defineCustomField({
  entity: "booking",
  key: "tour_guide",
  type: "text",
  label: "Tour guide",
})
```

The project server can collect those files with Vite's eager, build-time glob
and merge them with definitions managed through Relationships:

```ts
// src/server.ts
import {
  createCustomFieldRegistry,
  customFieldsFromGlob,
  mergeCustomFieldDefinitions,
  type CustomFieldRegistryResolver,
} from "@voyant-travel/core/custom-fields"
import { loadCustomFieldDefinitions } from "@voyant-travel/relationships/custom-fields-registry"
import { createVoyantProjectServerEntry } from "@voyant-travel/runtime"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"

const codeFields = customFieldsFromGlob(
  import.meta.glob("./custom-fields/*.ts", { eager: true }),
)

const customFields: CustomFieldRegistryResolver = async (database) =>
  createCustomFieldRegistry(
    mergeCustomFieldDefinitions([
      codeFields,
      await loadCustomFieldDefinitions(database as PostgresJsDatabase),
    ]),
  )

const server = createVoyantProjectServerEntry({
  host: { config: { customFields } },
})

export default { fetch: server.fetch }
```

Code declarations are passed first, so they win when a database-managed
definition has the same `(entity, key)`. The eager glob is compiled by Vite; no
filesystem scan occurs after the application starts.

## Entity Adoption

An owning package adopts custom fields by implementing all of these boundaries:

1. **Storage:** persist a validated object in the owning entity's
   `custom_fields` column.
2. **Write validation:** resolve the selected registry and run
   `validateCustomFields` before create or update.
3. **Read policy:** call `customFieldsVisibleIn` before including fields in
   exports, invoices, or search indexes.
4. **Runtime declaration:** request the narrow typed port in the package
   manifest and adapt it in package-owned runtime composition.

Bookings and Relationships use the graph-selected runtime path described above.
Additional entities adopt the same contract incrementally; a generic host-level
provider or package-specific starter branch must not be reintroduced.

## Invariants

- Packages never import project code.
- The project supplies one resolver, not per-package route options.
- Runtime packages request custom fields through declared ports only.
- Code and database definitions merge deterministically.
- Unknown fields fail closed on writes.
- Visibility defaults remain conservative: export on, invoice and search off.
- Adding custom fields must not require forking a standard package.
