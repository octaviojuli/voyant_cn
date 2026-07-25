// agent-quality: file-size exception -- owner: framework; runtime metadata normalization, validation, and lazy loader construction share one contract boundary.
import {
  isExternalWebhookPayloadSchema,
  VOYANT_EVENT_CATALOG_SCHEMA_VERSION,
  type VoyantGraphActionBindings,
  type VoyantGraphActionDeclaration,
  type VoyantGraphConfigDeclaration,
  type VoyantGraphEventCatalog,
  type VoyantGraphJsonObject,
  type VoyantGraphProviderDeclaration,
  type VoyantGraphResourceDeclaration,
  type VoyantGraphRouteBundle,
  type VoyantGraphRuntimeReference,
  type VoyantGraphSecretDeclaration,
  type VoyantGraphUnitKind,
  type VoyantGraphWorkflow,
} from "@voyant-travel/core/project"
import type { ToolRegistry } from "@voyant-travel/tools"
import type { AccessCatalog } from "@voyant-travel/types/api-keys"

import type {
  VoyantGraphInboundWebhookPlanEntry,
  VoyantGraphOutboundWebhookPlanEntry,
  VoyantGraphWebhookPlan,
} from "./deployment-graph.js"

export type VoyantGraphRuntimeReferenceFacet =
  | "runtime"
  | "api"
  | "config.validator"
  | "secrets.validator"
  | "providers.runtime"
  | "admin.copy.runtime"
  | "admin.routes.runtime"
  | "admin.contributions.runtime"
  | "tools.runtime"
  | "workflows.runtime"
  | "subscribers.runtime"

export interface VoyantGraphRuntimeReferenceDefinition {
  /** Stable graph-scoped identifier used by generic runtime consumers. */
  id: string
  unitId: string
  facet: VoyantGraphRuntimeReferenceFacet
  entityId: string
  runtime: VoyantGraphRuntimeReference
  /** Package import specifier after owner-relative references have been lowered. */
  importEntry: string
}

export const VOYANT_GRAPH_RUNTIME_LOAD_ERROR_CODES = {
  VOYANT_GRAPH_RUNTIME_REFERENCE_UNKNOWN:
    "A runtime reference is not present in the admitted generated graph.",
  VOYANT_GRAPH_RUNTIME_IMPORT_FAILED:
    "A lowered graph runtime package entry could not be imported.",
  VOYANT_GRAPH_RUNTIME_EXPORT_MISSING:
    "A lowered graph runtime package entry does not contain the declared export.",
  VOYANT_GRAPH_RUNTIME_EXPORT_INVALID:
    "A lowered graph runtime package export is not a runtime object or factory.",
} as const

export type VoyantGraphRuntimeLoadErrorCode = keyof typeof VOYANT_GRAPH_RUNTIME_LOAD_ERROR_CODES

export interface VoyantGraphRuntimeLoadErrorContext {
  referenceId: string
  unitId?: string
  facet?: VoyantGraphRuntimeReferenceFacet
  entityId?: string
  routeId?: string
  entry?: string
  exportName?: string
}

export class VoyantGraphRuntimeLoadError extends Error {
  readonly code: VoyantGraphRuntimeLoadErrorCode
  readonly context: VoyantGraphRuntimeLoadErrorContext
  override readonly cause?: unknown

  constructor(
    code: VoyantGraphRuntimeLoadErrorCode,
    context: VoyantGraphRuntimeLoadErrorContext,
    detail: string,
    cause?: unknown,
  ) {
    super(formatRuntimeLoadError(code, context, detail))
    this.name = "VoyantGraphRuntimeLoadError"
    this.code = code
    this.context = context
    this.cause = cause
  }
}

export interface VoyantGraphRuntimeRouteDefinition {
  route: VoyantGraphRouteBundle
  /** Package import specifier after owner-relative references have been lowered. */
  importEntry: string
  referenceId: string
}

export interface VoyantGraphRuntimeToolDefinition {
  id: string
  unitId: string
  name: string
  referenceId: string
  requiredScopes: readonly string[]
  context?: readonly string[]
  risk?: "low" | "medium" | "high" | "critical"
}

export interface VoyantGraphRuntimeWorkflowDefinition {
  unitId: string
  declaration: VoyantGraphWorkflow
  referenceId: string
}

export interface VoyantGraphRuntimeConfigDefinition {
  unitId: string
  declaration: VoyantGraphConfigDeclaration
  validatorReferenceId?: string
}

export interface VoyantGraphRuntimeSecretDefinition {
  unitId: string
  declaration: VoyantGraphSecretDeclaration
  validatorReferenceId?: string
}

export interface VoyantGraphRuntimeResourceDefinition {
  unitId: string
  declaration: VoyantGraphResourceDeclaration
}

export interface VoyantGraphRuntimeProviderDefinition {
  unitId: string
  declaration: VoyantGraphProviderDeclaration
  referenceId: string
}

export interface VoyantGraphRuntimeSelectedIds {
  routes: readonly string[]
  tools: readonly string[]
  workflows: readonly string[]
  events: readonly string[]
  webhooks: readonly string[]
}

export interface VoyantGraphRuntimeActionDefinition
  extends Omit<VoyantGraphActionDeclaration, "requiredScopes" | "from"> {
  unitId: string
  requiredScopes: readonly string[]
  from: Required<VoyantGraphActionBindings>
}

export interface VoyantGraphRuntimeUnitDefinition {
  id: string
  localId?: string
  kind: VoyantGraphUnitKind
  packageName: string
  order: number
  projectConfig?: VoyantGraphJsonObject
  runtimeReferenceId?: string
  references?: readonly VoyantGraphRuntimeReferenceDefinition[]
  config?: readonly VoyantGraphRuntimeConfigDefinition[]
  secrets?: readonly VoyantGraphRuntimeSecretDefinition[]
  resources?: readonly VoyantGraphRuntimeResourceDefinition[]
  providers?: readonly VoyantGraphRuntimeProviderDefinition[]
  requiredPorts?: readonly string[]
  runtimePorts?: readonly string[]
  manyRuntimePorts?: readonly string[]
  requiredRuntimePorts?: readonly string[]
  accessScopes?: readonly string[]
  tools?: readonly VoyantGraphRuntimeToolDefinition[]
  workflows?: readonly VoyantGraphRuntimeWorkflowDefinition[]
  actions?: readonly VoyantGraphRuntimeActionDefinition[]
  setupSteps?: readonly { id: string; skippable: boolean }[]
  selectedIds: VoyantGraphRuntimeSelectedIds
  routes: readonly VoyantGraphRuntimeRouteDefinition[]
}

export interface VoyantGraphRuntimeRouteLoader extends VoyantGraphRuntimeRouteDefinition {
  load: () => Promise<unknown>
}

export interface VoyantGraphRuntimeReferenceLoader extends VoyantGraphRuntimeReferenceDefinition {
  load: <T = unknown>() => Promise<T>
  /** Load the admitted module namespace that owns this reference. */
  loadModule: <T extends Record<string, unknown> = Record<string, unknown>>() => Promise<T>
}

export interface VoyantGraphRuntimeToolLoader extends VoyantGraphRuntimeToolDefinition {
  load: <T = unknown>() => Promise<T>
}

export interface VoyantGraphRuntimeWorkflowLoader extends VoyantGraphRuntimeWorkflowDefinition {
  load: <T = unknown>() => Promise<T>
}

export interface VoyantGraphRuntimeConfigLoader extends VoyantGraphRuntimeConfigDefinition {
  loadValidator?: <T = unknown>() => Promise<T>
}

export interface VoyantGraphRuntimeSecretLoader extends VoyantGraphRuntimeSecretDefinition {
  loadValidator?: <T = unknown>() => Promise<T>
}

export interface VoyantGraphRuntimeProviderLoader extends VoyantGraphRuntimeProviderDefinition {
  load: <T = unknown>() => Promise<T>
}

export interface VoyantGraphRuntimeUnitLoader
  extends Omit<
    VoyantGraphRuntimeUnitDefinition,
    | "config"
    | "projectConfig"
    | "providers"
    | "references"
    | "routes"
    | "secrets"
    | "tools"
    | "workflows"
  > {
  readonly projectConfig: Readonly<VoyantGraphJsonObject>
  references: readonly VoyantGraphRuntimeReferenceLoader[]
  config: readonly VoyantGraphRuntimeConfigLoader[]
  secrets: readonly VoyantGraphRuntimeSecretLoader[]
  resources: readonly VoyantGraphRuntimeResourceDefinition[]
  providers: readonly VoyantGraphRuntimeProviderLoader[]
  requiredPorts: readonly string[]
  runtimePorts: readonly string[]
  manyRuntimePorts: readonly string[]
  requiredRuntimePorts: readonly string[]
  accessScopes: readonly string[]
  tools: readonly VoyantGraphRuntimeToolLoader[]
  workflows: readonly VoyantGraphRuntimeWorkflowLoader[]
  actions: readonly VoyantGraphRuntimeActionDefinition[]
  setupSteps: readonly { id: string; skippable: boolean }[]
  selectedIds: VoyantGraphRuntimeSelectedIds
  routes: readonly VoyantGraphRuntimeRouteLoader[]
  /** Load the unit runtime, or each distinct route runtime for legacy units. */
  load: () => Promise<readonly unknown[]>
}

export interface VoyantGraphRuntimeWebhookPlan extends VoyantGraphWebhookPlan {
  inboundApiIds: readonly string[]
  outboundEventTypes: readonly string[]
  isInboundApi: (apiId: string) => boolean
  isOutboundEventEligible: (eventType: string) => boolean
}

export interface VoyantGraphRuntime {
  graphHash: string
  providerSelections: Readonly<Record<string, string>>
  modules: readonly VoyantGraphRuntimeUnitLoader[]
  extensions: readonly VoyantGraphRuntimeUnitLoader[]
  plugins: readonly VoyantGraphRuntimeUnitLoader[]
  references: readonly VoyantGraphRuntimeReferenceLoader[]
  config: readonly VoyantGraphRuntimeConfigLoader[]
  secrets: readonly VoyantGraphRuntimeSecretLoader[]
  resources: readonly VoyantGraphRuntimeResourceDefinition[]
  providers: readonly VoyantGraphRuntimeProviderLoader[]
  requiredPorts: readonly string[]
  accessCatalog: AccessCatalog
  eventCatalog: VoyantGraphEventCatalog
  accessScopes: readonly string[]
  tools: readonly VoyantGraphRuntimeToolLoader[]
  workflows: readonly VoyantGraphRuntimeWorkflowLoader[]
  actions: readonly VoyantGraphRuntimeActionDefinition[]
  setupSteps: readonly { id: string; skippable: boolean }[]
  selectedIds: VoyantGraphRuntimeSelectedIds
  webhooks: VoyantGraphRuntimeWebhookPlan
  loadReference: <T = unknown>(referenceId: string) => Promise<T>
}

export interface CreateVoyantGraphRuntimeInput {
  graphHash: string
  accessCatalog?: AccessCatalog
  eventCatalog?: VoyantGraphEventCatalog
  providerSelections?: Readonly<Record<string, string>>
  entries: Readonly<Record<string, () => Promise<unknown>>>
  modules: readonly VoyantGraphRuntimeUnitDefinition[]
  extensions?: readonly VoyantGraphRuntimeUnitDefinition[]
  plugins: readonly VoyantGraphRuntimeUnitDefinition[]
  webhookPlan?: VoyantGraphWebhookPlan
}

/**
 * Turn generated graph metadata and static import closures into lazy runtime
 * loaders. Target adapters decide how to invoke the loaded package exports.
 */
export function createVoyantGraphRuntime(input: CreateVoyantGraphRuntimeInput): VoyantGraphRuntime {
  const definitions = normalizeRuntimeDefinition(input)
  const usedEntries = validateRuntimeDefinition(definitions)
  const importEntries = new Map<string, () => Promise<unknown>>()

  for (const entry of usedEntries) {
    const importEntry = input.entries[entry]
    if (!importEntry) {
      throw new Error(
        `createVoyantGraphRuntime: no lazy importer was generated for runtime entry "${entry}".`,
      )
    }
    importEntries.set(entry, memoizePromise(importEntry))
  }

  const modules = definitions.modules.map((unit) => createRuntimeUnitLoader(unit, importEntries))
  const extensions = definitions.extensions.map((unit) =>
    createRuntimeUnitLoader(unit, importEntries),
  )
  const plugins = definitions.plugins.map((unit) => createRuntimeUnitLoader(unit, importEntries))
  const units = [...modules, ...extensions, ...plugins]
  const references = units.flatMap((unit) => unit.references)
  const config = units.flatMap((unit) => unit.config)
  const secrets = units.flatMap((unit) => unit.secrets)
  const resources = units.flatMap((unit) => unit.resources)
  const providers = units.flatMap((unit) => unit.providers)
  const requiredPorts = sortedUnique(units.flatMap((unit) => unit.requiredPorts))
  const accessScopes = sortedUnique(units.flatMap((unit) => unit.accessScopes))
  const tools = units.flatMap((unit) => unit.tools)
  const workflows = units.flatMap((unit) => unit.workflows)
  const actions = units.flatMap((unit) => unit.actions)
  const setupSteps = units.flatMap((unit) => unit.setupSteps)
  const selectedIds = mergeSelectedIds(units.map((unit) => unit.selectedIds))
  const referenceById = new Map(references.map((reference) => [reference.id, reference]))
  const webhooks = createRuntimeWebhookPlan(definitions.webhookPlan)

  return {
    graphHash: input.graphHash,
    providerSelections: { ...(input.providerSelections ?? {}) },
    modules,
    extensions,
    plugins,
    references,
    config,
    secrets,
    resources,
    providers,
    requiredPorts,
    accessCatalog: definitions.accessCatalog,
    eventCatalog: definitions.eventCatalog,
    accessScopes,
    tools,
    workflows,
    actions,
    setupSteps,
    selectedIds,
    webhooks,
    loadReference: async <T = unknown>(referenceId: string): Promise<T> => {
      const reference = referenceById.get(referenceId)
      if (!reference) {
        throw new VoyantGraphRuntimeLoadError(
          "VOYANT_GRAPH_RUNTIME_REFERENCE_UNKNOWN",
          { referenceId },
          "the reference is not present in the admitted generated graph",
        )
      }
      return reference.load<T>()
    },
  }
}

interface NormalizedVoyantGraphRuntimeUnitDefinition
  extends Omit<
    VoyantGraphRuntimeUnitDefinition,
    | "actions"
    | "config"
    | "projectConfig"
    | "providers"
    | "references"
    | "requiredPorts"
    | "requiredRuntimePorts"
    | "runtimePorts"
    | "resources"
    | "routes"
    | "secrets"
    | "selectedIds"
    | "tools"
    | "workflows"
  > {
  projectConfig: VoyantGraphJsonObject
  references: readonly VoyantGraphRuntimeReferenceDefinition[]
  config: readonly VoyantGraphRuntimeConfigDefinition[]
  secrets: readonly VoyantGraphRuntimeSecretDefinition[]
  resources: readonly VoyantGraphRuntimeResourceDefinition[]
  providers: readonly VoyantGraphRuntimeProviderDefinition[]
  requiredPorts: readonly string[]
  runtimePorts: readonly string[]
  manyRuntimePorts: readonly string[]
  requiredRuntimePorts: readonly string[]
  accessScopes: readonly string[]
  tools: readonly VoyantGraphRuntimeToolDefinition[]
  workflows: readonly VoyantGraphRuntimeWorkflowDefinition[]
  actions: readonly VoyantGraphRuntimeActionDefinition[]
  setupSteps: readonly { id: string; skippable: boolean }[]
  selectedIds: VoyantGraphRuntimeSelectedIds
  routes: readonly VoyantGraphRuntimeRouteDefinition[]
}

interface NormalizedVoyantGraphRuntimeInput
  extends Omit<
    CreateVoyantGraphRuntimeInput,
    "accessCatalog" | "eventCatalog" | "modules" | "extensions" | "plugins" | "webhookPlan"
  > {
  accessCatalog: AccessCatalog
  eventCatalog: VoyantGraphEventCatalog
  modules: readonly NormalizedVoyantGraphRuntimeUnitDefinition[]
  extensions: readonly NormalizedVoyantGraphRuntimeUnitDefinition[]
  plugins: readonly NormalizedVoyantGraphRuntimeUnitDefinition[]
  webhookPlan: VoyantGraphWebhookPlan
}

function normalizeRuntimeDefinition(
  input: CreateVoyantGraphRuntimeInput,
): NormalizedVoyantGraphRuntimeInput {
  const webhookPlan = normalizeWebhookPlan(input.webhookPlan)
  const normalizeUnit = (unit: VoyantGraphRuntimeUnitDefinition) =>
    normalizeRuntimeUnitDefinition(unit)
  return {
    ...input,
    accessCatalog: normalizeAccessCatalog(input.accessCatalog, [
      ...input.modules,
      ...(input.extensions ?? []),
      ...input.plugins,
    ]),
    eventCatalog: normalizeEventCatalog(input.eventCatalog),
    webhookPlan,
    modules: input.modules.map(normalizeUnit),
    extensions: (input.extensions ?? []).map(normalizeUnit),
    plugins: input.plugins.map(normalizeUnit),
  }
}

function normalizeAccessCatalog(
  catalog: AccessCatalog | undefined,
  units: readonly VoyantGraphRuntimeUnitDefinition[],
): AccessCatalog {
  if (!catalog) {
    const declaredScopes = units.flatMap((unit) => unit.accessScopes ?? [])
    if (declaredScopes.length > 0) {
      throw new Error(
        "createVoyantGraphRuntime: accessCatalog is required when selected units declare access scopes.",
      )
    }
    return { resources: [], presets: [] }
  }
  return {
    resources: [...catalog.resources]
      .map((resource) => ({
        ...resource,
        actions: [...resource.actions].sort((left, right) =>
          left.action.localeCompare(right.action),
        ),
        ...(resource.legacyActions?.length
          ? { legacyActions: sortedUnique(resource.legacyActions) }
          : {}),
      }))
      .sort((left, right) => left.resource.localeCompare(right.resource)),
    presets: [...catalog.presets]
      .map((preset) => ({ ...preset, grants: sortedUnique(preset.grants) }))
      .sort((left, right) => left.id.localeCompare(right.id)),
  }
}

function normalizeEventCatalog(
  catalog: VoyantGraphEventCatalog | undefined,
): VoyantGraphEventCatalog {
  return {
    schemaVersion: catalog?.schemaVersion ?? VOYANT_EVENT_CATALOG_SCHEMA_VERSION,
    events: [...(catalog?.events ?? [])]
      .map((event) => ({ ...event, redactedFields: sortedUnique(event.redactedFields) }))
      .sort(
        (left, right) =>
          left.eventType.localeCompare(right.eventType) ||
          left.version.localeCompare(right.version) ||
          left.id.localeCompare(right.id),
      ),
  }
}

function normalizeRuntimeUnitDefinition(
  unit: VoyantGraphRuntimeUnitDefinition,
): NormalizedVoyantGraphRuntimeUnitDefinition {
  const references = [...(unit.references ?? [])]
  const referenceIds = new Set(references.map((reference) => reference.id))
  const runtimePorts = sortedUnique(unit.runtimePorts ?? [])

  const routes = unit.routes.map((definition) => {
    if (!referenceIds.has(definition.referenceId)) {
      throw new Error(
        `createVoyantGraphRuntime: route "${definition.route.id}" selects unknown runtime reference "${definition.referenceId}".`,
      )
    }
    return { ...definition }
  })

  return {
    ...unit,
    projectConfig: unit.projectConfig ?? {},
    references,
    config: [...(unit.config ?? [])],
    secrets: [...(unit.secrets ?? [])],
    resources: [...(unit.resources ?? [])],
    providers: [...(unit.providers ?? [])],
    requiredPorts: sortedUnique(unit.requiredPorts ?? []),
    runtimePorts,
    manyRuntimePorts: sortedUnique(unit.manyRuntimePorts ?? []),
    requiredRuntimePorts:
      unit.requiredRuntimePorts === undefined
        ? runtimePorts
        : sortedUnique(unit.requiredRuntimePorts),
    accessScopes: sortedUnique(unit.accessScopes ?? []),
    tools: [...(unit.tools ?? [])],
    workflows: [...(unit.workflows ?? [])],
    actions: [...(unit.actions ?? [])],
    setupSteps: [...(unit.setupSteps ?? [])],
    selectedIds: normalizeSelectedIds(unit.selectedIds),
    routes,
  }
}

function createRuntimeUnitLoader(
  unit: NormalizedVoyantGraphRuntimeUnitDefinition,
  entries: ReadonlyMap<string, () => Promise<unknown>>,
): VoyantGraphRuntimeUnitLoader {
  const references = unit.references.map((definition) =>
    createRuntimeReferenceLoader(definition, entries),
  )
  const referenceById = new Map(references.map((reference) => [reference.id, reference]))
  const unitRuntime = unit.runtimeReferenceId
    ? requireDeclarationReference(
        unit.id,
        unit.id,
        unit.runtimeReferenceId,
        "runtime",
        referenceById,
      )
    : undefined
  const config = unit.config.map((definition) =>
    createRuntimeValueDeclarationLoader(definition, "config.validator", referenceById),
  )
  const secrets = unit.secrets.map((definition) =>
    createRuntimeValueDeclarationLoader(definition, "secrets.validator", referenceById),
  )
  const providers = unit.providers.map((definition) => {
    const reference = requireDeclarationReference(
      definition.unitId,
      definition.declaration.id,
      definition.referenceId,
      "providers.runtime",
      referenceById,
    )
    return {
      ...definition,
      load: <T = unknown>() => reference.load<T>(),
    }
  })
  const routes = unit.routes.map((definition) => {
    const reference = definition.referenceId ? referenceById.get(definition.referenceId) : undefined
    if (!reference) {
      throw new Error(
        `createVoyantGraphRuntime: runtime reference "${String(definition.referenceId)}" for route "${definition.route.id}" is not registered.`,
      )
    }
    return {
      ...definition,
      load: reference.load,
    }
  })
  const tools = unit.tools.map((definition) => {
    const reference = requireDeclarationReference(
      definition.unitId,
      definition.id,
      definition.referenceId,
      "tools.runtime",
      referenceById,
    )
    return {
      ...definition,
      load: <T = unknown>() => loadDeclaredTool<T>(definition, reference),
    }
  })
  const workflows = unit.workflows.map((definition) => {
    const reference = requireDeclarationReference(
      definition.unitId,
      definition.declaration.id,
      definition.referenceId,
      "workflows.runtime",
      referenceById,
    )
    return {
      ...definition,
      load: <T = unknown>() => loadDeclaredWorkflow<T>(definition, reference),
    }
  })

  return {
    id: unit.id,
    ...(unit.localId ? { localId: unit.localId } : {}),
    kind: unit.kind,
    packageName: unit.packageName,
    order: unit.order,
    projectConfig: unit.projectConfig,
    ...(unit.runtimeReferenceId ? { runtimeReferenceId: unit.runtimeReferenceId } : {}),
    references,
    config,
    secrets,
    resources: unit.resources,
    providers,
    requiredPorts: unit.requiredPorts,
    runtimePorts: unit.runtimePorts,
    manyRuntimePorts: unit.manyRuntimePorts,
    requiredRuntimePorts: unit.requiredRuntimePorts,
    accessScopes: unit.accessScopes,
    tools,
    workflows,
    actions: unit.actions,
    setupSteps: unit.setupSteps,
    selectedIds: unit.selectedIds,
    routes,
    load: memoizePromise(() =>
      unitRuntime
        ? unitRuntime.load().then((runtimeExport) => [runtimeExport])
        : Promise.all(uniqueRuntimeRouteLoaders(routes).map((route) => route.load())),
    ),
  }
}

function createRuntimeValueDeclarationLoader<
  T extends VoyantGraphRuntimeConfigDefinition | VoyantGraphRuntimeSecretDefinition,
>(
  definition: T,
  facet: "config.validator" | "secrets.validator",
  references: ReadonlyMap<string, VoyantGraphRuntimeReferenceLoader>,
): T & { loadValidator?: <TValidator = unknown>() => Promise<TValidator> } {
  if (!definition.validatorReferenceId) return { ...definition }
  const reference = requireDeclarationReference(
    definition.unitId,
    definition.declaration.id,
    definition.validatorReferenceId,
    facet,
    references,
  )
  return {
    ...definition,
    loadValidator: <TValidator = unknown>() => reference.load<TValidator>(),
  }
}

function requireDeclarationReference(
  unitId: string,
  declarationId: string,
  referenceId: string,
  facet: VoyantGraphRuntimeReferenceFacet,
  references: ReadonlyMap<string, VoyantGraphRuntimeReferenceLoader>,
): VoyantGraphRuntimeReferenceLoader {
  const reference = references.get(referenceId)
  if (
    !reference ||
    reference.unitId !== unitId ||
    reference.facet !== facet ||
    reference.entityId !== declarationId
  ) {
    throw new Error(
      `createVoyantGraphRuntime: declaration "${declarationId}" selects invalid ${facet} reference "${referenceId}".`,
    )
  }
  return reference
}

function createRuntimeReferenceLoader(
  definition: VoyantGraphRuntimeReferenceDefinition,
  entries: ReadonlyMap<string, () => Promise<unknown>>,
): VoyantGraphRuntimeReferenceLoader {
  const importEntry = entries.get(definition.importEntry)
  if (!importEntry) {
    throw new Error(
      `createVoyantGraphRuntime: runtime entry "${definition.importEntry}" for reference "${definition.id}" is not registered.`,
    )
  }
  const load = memoizePromise(() => loadRuntimeReferenceExport(definition, importEntry))
  return {
    ...definition,
    load: <T = unknown>() => load() as Promise<T>,
    loadModule: <T extends Record<string, unknown> = Record<string, unknown>>() =>
      loadRuntimeReferenceModule(definition, importEntry) as Promise<T>,
  }
}

async function loadRuntimeReferenceModule(
  definition: VoyantGraphRuntimeReferenceDefinition,
  importEntry: () => Promise<unknown>,
): Promise<Record<string, unknown>> {
  const namespace = await importEntry()
  if (isRecord(namespace)) return namespace
  throw new VoyantGraphRuntimeLoadError(
    "VOYANT_GRAPH_RUNTIME_EXPORT_INVALID",
    {
      referenceId: definition.id,
      unitId: definition.unitId,
      facet: definition.facet,
      entityId: definition.entityId,
      entry: definition.importEntry,
    },
    "the package import did not return a module namespace object",
  )
}

function uniqueRuntimeRouteLoaders(
  routes: readonly VoyantGraphRuntimeRouteLoader[],
): VoyantGraphRuntimeRouteLoader[] {
  const seen = new Set<string>()
  return routes.filter((route) => {
    const key = JSON.stringify([route.importEntry, route.route.runtime?.export ?? null])
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

async function loadRuntimeReferenceExport(
  definition: VoyantGraphRuntimeReferenceDefinition,
  importEntry: () => Promise<unknown>,
): Promise<unknown> {
  const runtime = definition.runtime
  const context: VoyantGraphRuntimeLoadErrorContext = {
    referenceId: definition.id,
    unitId: definition.unitId,
    facet: definition.facet,
    entityId: definition.entityId,
    ...(definition.facet === "api" ? { routeId: definition.entityId } : {}),
    entry: definition.importEntry,
    ...(runtime.export ? { exportName: runtime.export } : {}),
  }

  let namespace: unknown
  try {
    namespace = await importEntry()
  } catch (error) {
    throw new VoyantGraphRuntimeLoadError(
      "VOYANT_GRAPH_RUNTIME_IMPORT_FAILED",
      context,
      errorMessage(error),
      error,
    )
  }

  if (!isRecord(namespace)) {
    throw new VoyantGraphRuntimeLoadError(
      "VOYANT_GRAPH_RUNTIME_EXPORT_INVALID",
      context,
      "the package import did not return a module namespace object",
    )
  }

  if (!runtime.export) return namespace
  if (!Object.hasOwn(namespace, runtime.export)) {
    throw new VoyantGraphRuntimeLoadError(
      "VOYANT_GRAPH_RUNTIME_EXPORT_MISSING",
      context,
      `export "${runtime.export}" was not found`,
    )
  }

  const value = namespace[runtime.export]
  if (!isRuntimeExport(value)) {
    throw new VoyantGraphRuntimeLoadError(
      "VOYANT_GRAPH_RUNTIME_EXPORT_INVALID",
      context,
      `export "${runtime.export}" must be a runtime object or factory, got ${describeValue(value)}`,
    )
  }
  return value
}

function validateRuntimeDefinition(input: NormalizedVoyantGraphRuntimeInput): string[] {
  if (!input.graphHash.trim()) {
    throw new Error("createVoyantGraphRuntime: graphHash must be a non-empty string.")
  }

  const usedEntries = new Set<string>()
  const referenceIds = new Set<string>()
  const declarationIds = new Set<string>()
  const toolIds = new Set<string>()
  const toolNames = new Set<string>()
  const actionIds = new Set<string>()
  const units = [...input.modules, ...input.extensions, ...input.plugins]
  const selectedIds = mergeSelectedIds(units.map((unit) => unit.selectedIds))
  const selectedActionBindings = {
    routes: new Set(selectedIds.routes),
    tools: new Set(selectedIds.tools),
    workflows: new Set(selectedIds.workflows),
    events: new Set(selectedIds.events),
    webhooks: new Set(selectedIds.webhooks),
  } as const
  const accessScopes = new Set(units.flatMap((unit) => unit.accessScopes))
  const catalogScopes = new Set(
    input.accessCatalog.resources.flatMap((resource) =>
      resource.actions.map((action) => `${resource.resource}:${action.action}`),
    ),
  )
  if (
    accessScopes.size !== catalogScopes.size ||
    [...accessScopes].some((scope) => !catalogScopes.has(scope))
  ) {
    throw new Error(
      "createVoyantGraphRuntime: accessCatalog does not match selected unit access scopes.",
    )
  }
  validateRuntimeEventCatalog(input.eventCatalog, units)
  for (const [expectedKind, units] of [
    ["module", input.modules],
    ["extension", input.extensions],
    ["plugin", input.plugins],
  ] as const) {
    for (const unit of units) {
      if (unit.kind !== expectedKind) {
        throw new Error(
          `createVoyantGraphRuntime: ${expectedKind} loader "${unit.id}" declares kind "${unit.kind}".`,
        )
      }
      for (const reference of unit.references) {
        if (reference.unitId !== unit.id) {
          throw new Error(
            `createVoyantGraphRuntime: reference "${reference.id}" belongs to unit "${reference.unitId}", not "${unit.id}".`,
          )
        }
        if (referenceIds.has(reference.id)) {
          throw new Error(
            `createVoyantGraphRuntime: duplicate runtime reference id "${reference.id}".`,
          )
        }
        referenceIds.add(reference.id)
        usedEntries.add(reference.importEntry)
      }
      for (const [facet, declarations] of [
        ["config", unit.config],
        ["secrets", unit.secrets],
        ["resources", unit.resources],
        ["providers", unit.providers],
        ["workflows", unit.workflows],
      ] as const) {
        for (const definition of declarations) {
          const declarationId = definition.declaration.id
          if (definition.unitId !== unit.id) {
            throw new Error(
              `createVoyantGraphRuntime: ${facet} declaration "${declarationId}" belongs to unit "${definition.unitId}", not "${unit.id}".`,
            )
          }
          if (declarationIds.has(declarationId)) {
            throw new Error(
              `createVoyantGraphRuntime: duplicate runtime declaration id "${declarationId}".`,
            )
          }
          declarationIds.add(declarationId)
        }
      }
      for (const definition of [...unit.config, ...unit.secrets]) {
        const hasValidator = definition.declaration.validator !== undefined
        if (hasValidator !== (definition.validatorReferenceId !== undefined)) {
          throw new Error(
            `createVoyantGraphRuntime: value declaration "${definition.declaration.id}" validator metadata is inconsistent.`,
          )
        }
      }
      for (const definition of unit.routes) {
        if (!definition.route.runtime) {
          throw new Error(
            `createVoyantGraphRuntime: route "${definition.route.id}" does not declare a runtime reference.`,
          )
        }
      }
      for (const tool of unit.tools) {
        if (tool.unitId !== unit.id) {
          throw new Error(
            `createVoyantGraphRuntime: tool "${tool.id}" belongs to unit "${tool.unitId}", not "${unit.id}".`,
          )
        }
        if (toolIds.has(tool.id)) {
          throw new Error(`createVoyantGraphRuntime: duplicate tool id "${tool.id}".`)
        }
        if (toolNames.has(tool.name)) {
          throw new Error(`createVoyantGraphRuntime: duplicate tool name "${tool.name}".`)
        }
        toolIds.add(tool.id)
        toolNames.add(tool.name)
        for (const scope of tool.requiredScopes) {
          if (!accessScopes.has(scope)) {
            throw new Error(
              `createVoyantGraphRuntime: tool "${tool.id}" requires undeclared access scope "${scope}".`,
            )
          }
        }
      }
      for (const action of unit.actions) {
        if (action.unitId !== unit.id) {
          throw new Error(
            `createVoyantGraphRuntime: action "${action.id}" belongs to unit "${action.unitId}", not "${unit.id}".`,
          )
        }
        if (actionIds.has(action.id)) {
          throw new Error(`createVoyantGraphRuntime: duplicate action id "${action.id}".`)
        }
        actionIds.add(action.id)
        for (const scope of action.requiredScopes) {
          if (!accessScopes.has(scope)) {
            throw new Error(
              `createVoyantGraphRuntime: action "${action.id}" requires undeclared access scope "${scope}".`,
            )
          }
        }
        for (const kind of Object.keys(
          selectedActionBindings,
        ) as (keyof typeof selectedActionBindings)[]) {
          for (const id of action.from[kind]) {
            if (selectedActionBindings[kind].has(id)) continue
            throw new Error(
              `createVoyantGraphRuntime: action "${action.id}" selects undeclared ${kind} reference "${id}".`,
            )
          }
        }
      }
    }
  }
  validateRuntimeWebhookPlan(input)
  return [...usedEntries].sort((left, right) => left.localeCompare(right))
}

function normalizeWebhookPlan(plan: VoyantGraphWebhookPlan | undefined): VoyantGraphWebhookPlan {
  const byIdentity = <T extends { id: string; unitId: string }>(left: T, right: T) =>
    left.id.localeCompare(right.id) || left.unitId.localeCompare(right.unitId)
  return {
    inbound: [...(plan?.inbound ?? [])]
      .map((entry) => ({ ...entry, secretIds: sortedUnique(entry.secretIds) }))
      .sort(byIdentity),
    outbound: [...(plan?.outbound ?? [])]
      .map((entry) => ({ ...entry, secretIds: sortedUnique(entry.secretIds) }))
      .sort(byIdentity),
  }
}

function validateRuntimeEventCatalog(
  catalog: VoyantGraphEventCatalog,
  units: readonly NormalizedVoyantGraphRuntimeUnitDefinition[],
): void {
  if (catalog.schemaVersion !== VOYANT_EVENT_CATALOG_SCHEMA_VERSION) {
    throw new Error(
      `createVoyantGraphRuntime: eventCatalog schemaVersion must be "${VOYANT_EVENT_CATALOG_SCHEMA_VERSION}".`,
    )
  }
  const unitById = new Map(units.map((unit) => [unit.id, unit]))
  const keys = new Set<string>()
  const eventTypeOwners = new Map<string, string>()
  for (const entry of catalog.events) {
    const owner = unitById.get(entry.unitId)
    if (
      !owner ||
      owner.packageName !== entry.packageName ||
      !owner.selectedIds.events.includes(entry.id)
    ) {
      throw new Error(
        `createVoyantGraphRuntime: event catalog entry "${entry.key}" is not declared by selected owner "${entry.unitId}".`,
      )
    }
    if (
      entry.key !== `${entry.eventType}@${entry.version}` ||
      !entry.eventType.trim() ||
      !/^\d+\.\d+\.\d+$/.test(entry.version) ||
      !isRecord(entry.payloadSchema) ||
      (entry.visibility !== "internal" && entry.visibility !== "external") ||
      !entry.audit?.sourceModule.trim() ||
      (entry.audit.category !== "domain" && entry.audit.category !== "internal")
    ) {
      throw new Error(
        `createVoyantGraphRuntime: event catalog entry "${entry.key}" is not a valid versioned event contract.`,
      )
    }
    if (keys.has(entry.key)) {
      throw new Error(`createVoyantGraphRuntime: duplicate event catalog key "${entry.key}".`)
    }
    const eventTypeOwner = eventTypeOwners.get(entry.eventType)
    if (eventTypeOwner && eventTypeOwner !== entry.unitId) {
      throw new Error(
        `createVoyantGraphRuntime: event catalog eventType "${entry.eventType}" has multiple selected owners "${eventTypeOwner}" and "${entry.unitId}".`,
      )
    }
    keys.add(entry.key)
    eventTypeOwners.set(entry.eventType, entry.unitId)
  }
}

function validateRuntimeWebhookPlan(input: NormalizedVoyantGraphRuntimeInput): void {
  const units = [...input.modules, ...input.extensions, ...input.plugins]
  const unitById = new Map(units.map((unit) => [unit.id, unit]))
  const routeById = new Map(
    units.flatMap((unit) => unit.routes.map((route) => [route.route.id, { route, unit }] as const)),
  )
  const webhookIds = new Set<string>()

  const validateOwner = (
    entry: VoyantGraphInboundWebhookPlanEntry | VoyantGraphOutboundWebhookPlanEntry,
  ) => {
    const owner = unitById.get(entry.unitId)
    if (!owner || owner.packageName !== entry.packageName) {
      throw new Error(
        `createVoyantGraphRuntime: webhook "${entry.id}" owner "${entry.unitId}" is not present with package "${entry.packageName}".`,
      )
    }
    if (webhookIds.has(entry.id)) {
      throw new Error(`createVoyantGraphRuntime: duplicate webhook plan id "${entry.id}".`)
    }
    if (!owner.selectedIds.webhooks.includes(entry.id)) {
      throw new Error(
        `createVoyantGraphRuntime: webhook "${entry.id}" is not declared by selected owner "${entry.unitId}".`,
      )
    }
    webhookIds.add(entry.id)
  }

  for (const entry of input.webhookPlan.inbound) {
    validateOwner(entry)
    const target = routeById.get(entry.apiId)
    if (
      !target ||
      target.unit.id !== entry.apiUnitId ||
      target.route.route.surface !== "webhook" ||
      !target.route.route.runtime
    ) {
      throw new Error(
        `createVoyantGraphRuntime: inbound webhook "${entry.id}" selects invalid webhook API "${entry.apiId}".`,
      )
    }
  }
  for (const entry of input.webhookPlan.outbound) {
    validateOwner(entry)
    const eventOwner = unitById.get(entry.eventUnitId)
    if (
      !eventOwner?.selectedIds.events.includes(entry.eventId) ||
      !entry.eventType.trim() ||
      !/^\d+\.\d+\.\d+$/.test(entry.eventVersion) ||
      !isExternalWebhookPayloadSchema(entry.payloadSchema) ||
      entry.visibility !== "external" ||
      !entry.audit?.sourceModule.trim()
    ) {
      throw new Error(
        `createVoyantGraphRuntime: outbound webhook "${entry.id}" selects an invalid event target.`,
      )
    }
  }
}

function createRuntimeWebhookPlan(plan: VoyantGraphWebhookPlan): VoyantGraphRuntimeWebhookPlan {
  const inboundApiIds = sortedUnique(plan.inbound.map((entry) => entry.apiId))
  const outboundEventTypes = sortedUnique(plan.outbound.map((entry) => entry.eventType))
  const inbound = new Set(inboundApiIds)
  const outbound = new Set(outboundEventTypes)
  return {
    ...plan,
    inboundApiIds,
    outboundEventTypes,
    isInboundApi: (apiId) => inbound.has(apiId),
    isOutboundEventEligible: (eventType) => outbound.has(eventType),
  }
}

type RegisteredTool = Parameters<ToolRegistry["register"]>[0]

/** Load and register exactly the tool definitions selected by the admitted graph. */
export async function registerVoyantGraphTools(
  runtime: VoyantGraphRuntime,
  registry: ToolRegistry,
): Promise<void> {
  for (const tool of runtime.tools) {
    registry.register(await tool.load<RegisteredTool>())
  }
}

async function loadDeclaredTool<T>(
  definition: VoyantGraphRuntimeToolDefinition,
  reference: VoyantGraphRuntimeReferenceLoader,
): Promise<T> {
  const value = await reference.load<unknown>()
  if (!isRecord(value) || value.name !== definition.name) {
    throw invalidToolExport(
      definition,
      reference,
      `loaded tool must declare name "${definition.name}"`,
    )
  }
  const requiredScopes = value.requiredScopes
  if (
    !Array.isArray(requiredScopes) ||
    requiredScopes.some((scope) => typeof scope !== "string") ||
    !sameStringSet(requiredScopes, definition.requiredScopes)
  ) {
    throw invalidToolExport(
      definition,
      reference,
      `loaded tool requiredScopes must match [${definition.requiredScopes.join(", ")}]`,
    )
  }
  return value as T
}

async function loadDeclaredWorkflow<T>(
  definition: VoyantGraphRuntimeWorkflowDefinition,
  reference: VoyantGraphRuntimeReferenceLoader,
): Promise<T> {
  const value = await reference.load<unknown>()
  if (!isRecord(value) || value.id !== definition.declaration.id) {
    throw new VoyantGraphRuntimeLoadError(
      "VOYANT_GRAPH_RUNTIME_EXPORT_INVALID",
      {
        referenceId: reference.id,
        unitId: definition.unitId,
        facet: "workflows.runtime",
        entityId: definition.declaration.id,
        entry: reference.importEntry,
        ...(reference.runtime.export ? { exportName: reference.runtime.export } : {}),
      },
      `loaded workflow must declare id "${definition.declaration.id}"`,
    )
  }
  return value as T
}

function invalidToolExport(
  definition: VoyantGraphRuntimeToolDefinition,
  reference: VoyantGraphRuntimeReferenceLoader,
  detail: string,
): VoyantGraphRuntimeLoadError {
  return new VoyantGraphRuntimeLoadError(
    "VOYANT_GRAPH_RUNTIME_EXPORT_INVALID",
    {
      referenceId: reference.id,
      unitId: definition.unitId,
      facet: "tools.runtime",
      entityId: definition.id,
      entry: reference.importEntry,
      ...(reference.runtime.export ? { exportName: reference.runtime.export } : {}),
    },
    detail,
  )
}

function sameStringSet(left: readonly string[], right: readonly string[]): boolean {
  const normalizedLeft = sortedUnique(left)
  const normalizedRight = sortedUnique(right)
  return (
    normalizedLeft.length === normalizedRight.length &&
    normalizedLeft.every((value, index) => value === normalizedRight[index])
  )
}

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right))
}

function normalizeSelectedIds(
  selectedIds: VoyantGraphRuntimeSelectedIds,
): VoyantGraphRuntimeSelectedIds {
  return {
    routes: sortedUnique(selectedIds.routes),
    tools: sortedUnique(selectedIds.tools),
    workflows: sortedUnique(selectedIds.workflows),
    events: sortedUnique(selectedIds.events),
    webhooks: sortedUnique(selectedIds.webhooks),
  }
}

function mergeSelectedIds(
  selectedIds: readonly VoyantGraphRuntimeSelectedIds[],
): VoyantGraphRuntimeSelectedIds {
  return normalizeSelectedIds({
    routes: selectedIds.flatMap((ids) => ids.routes),
    tools: selectedIds.flatMap((ids) => ids.tools),
    workflows: selectedIds.flatMap((ids) => ids.workflows),
    events: selectedIds.flatMap((ids) => ids.events),
    webhooks: selectedIds.flatMap((ids) => ids.webhooks),
  })
}

function memoizePromise<T>(load: () => Promise<T>): () => Promise<T> {
  let promise: Promise<T> | undefined
  return () => {
    promise ??= Promise.resolve().then(load)
    return promise
  }
}

function formatRuntimeLoadError(
  code: VoyantGraphRuntimeLoadErrorCode,
  context: VoyantGraphRuntimeLoadErrorContext,
  detail: string,
): string {
  const selectedExport = context.exportName ? ` export "${context.exportName}"` : ""
  const location = context.unitId
    ? ` for ${context.unitId}${context.facet ? ` ${context.facet}` : ""}${context.entityId ? ` ${context.entityId}` : ""}`
    : ""
  const entry = context.entry ? ` from "${context.entry}"` : ""
  return `${code}: failed to load${selectedExport}${entry}${location} (reference ${context.referenceId}): ${detail}.`
}

function isRuntimeExport(value: unknown): boolean {
  return (value !== null && typeof value === "object") || typeof value === "function"
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function describeValue(value: unknown): string {
  if (value === null) return "null"
  if (Array.isArray(value)) return "array"
  return typeof value
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
