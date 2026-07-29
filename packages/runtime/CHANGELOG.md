# @voyant-travel/runtime

## 0.11.5

### Patch Changes

- @voyant-travel/framework@0.47.1
- @voyant-travel/admin-host@0.13.0
- @voyant-travel/auth@0.132.2
- @voyant-travel/workflow-runs@0.122.1

## 0.11.4

### Patch Changes

- Updated dependencies [8f0fa26]
  - @voyant-travel/framework@0.47.0
  - @voyant-travel/hono@0.128.0
  - @voyant-travel/storage@0.111.0
  - @voyant-travel/workflow-runs@0.122.0
  - @voyant-travel/auth@0.132.1
  - @voyant-travel/admin-host@0.12.0
  - @voyant-travel/db@0.114.8

## 0.11.3

### Patch Changes

- Updated dependencies [a1842a7]
  - @voyant-travel/hono@0.127.2
  - @voyant-travel/admin-host@0.11.0
  - @voyant-travel/auth@0.132.0
  - @voyant-travel/framework@0.46.2

## 0.11.2

### Patch Changes

- Updated dependencies [cabf662]
- Updated dependencies [848b581]
- Updated dependencies [c9b6144]
- Updated dependencies [ff87f68]
  - @voyant-travel/core@0.124.0
  - @voyant-travel/auth@0.131.0
  - @voyant-travel/framework@0.46.1
  - @voyant-travel/workflow-runs@0.121.0
  - @voyant-travel/db@0.114.7
  - @voyant-travel/hono@0.127.1
  - @voyant-travel/storage@0.110.2
  - @voyant-travel/webhook-delivery@0.3.3
  - @voyant-travel/admin-host@0.10.0

## 0.11.1

### Patch Changes

- Updated dependencies [7e9f77a]
- Updated dependencies [7e9f77a]
- Updated dependencies [75494ca]
- Updated dependencies [82ffd12]
- Updated dependencies [a98ec27]
- Updated dependencies [9c85101]
- Updated dependencies [6147b93]
  - @voyant-travel/vite-config@0.3.4
  - @voyant-travel/admin-host@0.9.0
  - @voyant-travel/core@0.123.0
  - @voyant-travel/framework@0.46.0
  - @voyant-travel/hono@0.127.0
  - @voyant-travel/auth@0.130.0
  - @voyant-travel/db@0.114.6
  - @voyant-travel/storage@0.110.1
  - @voyant-travel/webhook-delivery@0.3.2
  - @voyant-travel/workflow-runs@0.120.4

## 0.11.0

### Minor Changes

- 73ab096: Standardize first-party packages on package-owned deployment manifests, provider selection,
  access metadata, concrete event contracts, selected admin navigation, and published runtime
  references. Add Bookings Extras as an independently selected graph unit and remove the central
  admin navigation catalog.
  Link facets now distinguish entity `linkable` metadata from executable `definition` exports, and
  generated Node registries reject malformed definitions before service registration.
  Provider-owned required config and secrets now apply only when that provider is selected, so
  local and in-memory deployments do not require credentials for inactive remote providers.

### Patch Changes

- Updated dependencies [46e7edf]
- Updated dependencies [73ab096]
  - @voyant-travel/framework@0.45.0
  - @voyant-travel/auth@0.129.0
  - @voyant-travel/storage@0.110.0
  - @voyant-travel/core@0.122.2
  - @voyant-travel/db@0.114.5
  - @voyant-travel/workflow-runs@0.120.3
  - @voyant-travel/admin-host@0.8.0

## 0.10.5

### Patch Changes

- f9a2d77: Keep deployment search selection authoritative while allowing custom hosts to
  supply either a catalog indexer adapter or provider through one shared runtime
  port.

## 0.10.4

### Patch Changes

- @voyant-travel/admin-host@0.7.0
- @voyant-travel/framework@0.44.4

## 0.10.3

### Patch Changes

- 8d62a7c: Embed TypeScript sources in published JavaScript source maps so consumer dev servers can resolve
  them without the omitted `src` tree. Stop emitting declaration maps that cannot embed their sources,
  and reject publish tarballs whose maps reference sources that are neither packed nor embedded.
- Updated dependencies [8d62a7c]
- Updated dependencies [8d62a7c]
  - @voyant-travel/auth@0.128.3
  - @voyant-travel/core@0.122.1
  - @voyant-travel/db@0.114.4
  - @voyant-travel/runtime-core@0.6.3
  - @voyant-travel/webhook-delivery@0.3.1
  - @voyant-travel/admin-host@0.6.1
  - @voyant-travel/framework@0.44.3
  - @voyant-travel/hono@0.126.3
  - @voyant-travel/storage@0.109.4
  - @voyant-travel/vite-config@0.3.3
  - @voyant-travel/workflow-runs@0.120.2

## 0.10.2

### Patch Changes

- @voyant-travel/db@0.114.3
- @voyant-travel/admin-host@0.6.0
- @voyant-travel/auth@0.128.2
- @voyant-travel/workflow-runs@0.120.1
- @voyant-travel/framework@0.44.2

## 0.10.1

### Patch Changes

- d83d237: Repair packaged consumer development and production startup, keep shared UI
  contexts single-instanced under Vite, make unconfigured realtime quiet, and
  restore narrow client-safe validation and Finance voucher setup exports. Resolve
  legacy frontend imports through product-owned browser facades and allow clean CI
  installs to fetch metadata for external dependencies.
- Updated dependencies [d83d237]
  - @voyant-travel/admin-host@0.5.1
  - @voyant-travel/framework@0.44.1
  - @voyant-travel/vite-config@0.3.2

## 0.10.0

### Minor Changes

- df3e4ec: Publish the engine-neutral catalog indexer adapter and provider contracts under
  `./indexer/contract`, including optional admin lifecycle operations. Add the
  framework-neutral `./indexer/conformance` kit for external adapter packages.

  Make `deployment.providers.search` authoritative through the `catalog.indexer`
  runtime port, ship Typesense as the selected first-party provider, support
  explicit project-owned overrides, and remove direct Typesense search and
  maintenance bypasses.

### Patch Changes

- Updated dependencies [df3e4ec]
  - @voyant-travel/framework@0.44.0

## 0.9.0

### Minor Changes

- 2cc954a: Make outbound webhook enqueue authority an explicit deployment provider. Standard Operator and managed-cloud deployments select `outboundWebhooks: "postgres"`; projects may instead select `"host"` with an injected `host.deliverEvent`, or `"none"` to omit graph outbound composition. `@voyant-travel/webhook-delivery` now owns provider resolution and the Postgres enqueuer adapter, while generic Runtime no longer calls the concrete Postgres enqueue function. Regenerate graphs so the provider role is present. See [Migrating to Framework 0.42](../docs/migrations/migrating-to-0.42.md#outbound-webhook-enqueue-provider).
- 07a6ee3: Make `deployment.providers.workflows` authoritative for Node workflow execution and Workflow Runs admin ownership. Self-hosted Operators now use the durable Postgres driver and receive package-owned orchestrator migrations; local mode uses the in-memory adapter, `none` omits workflow composition, and Voyant Cloud fails closed when credentials are missing.

  Scheduled one-shot dispatch disables resident scheduler and time-wheel loops and always shuts down its driver. Managed Cloud snapshots must select `voyant-cloud` before this release is deployed.

  See the [Framework 0.42 migration guide](../docs/migrations/migrating-to-0.42.md) for provider, migration, and rollout steps.

### Patch Changes

- 2669577: Start production operator projects through their Vite-built TanStack server
  entry so virtual router imports and the React SSR singleton resolve from the
  generated server graph.
- cc85042: Make deployment provider selection authoritative for Node storage, cache, shared
  state, and rate limiting. Replace vendor-specific object-store bindings and R2
  shims with logical media/document stores, a memory provider, an AWS SDK v3
  S3-compatible provider, and package-selected custom adapters. Add a portable
  storage provider conformance runner, resolve adapters from the `storage.object`
  graph provider, and make provider config/secret/resource usage explicit. Keep
  distributed shared state and rate-limit KV authoritative by bypassing the
  cache-only process-local L1, and move guest booking lookups onto the selected
  atomic rate-limit store. Remove the former R2/SigV4 exports.
- Updated dependencies [2669577]
- Updated dependencies [2cc954a]
- Updated dependencies [cc85042]
- Updated dependencies [07a6ee3]
  - @voyant-travel/framework@0.43.0
  - @voyant-travel/vite-config@0.3.1
  - @voyant-travel/webhook-delivery@0.3.0
  - @voyant-travel/core@0.122.0
  - @voyant-travel/db@0.114.2
  - @voyant-travel/hono@0.126.2
  - @voyant-travel/runtime-core@0.6.2
  - @voyant-travel/storage@0.109.3
  - @voyant-travel/workflow-runs@0.120.0
  - @voyant-travel/auth@0.128.1

## 0.8.0

### Minor Changes

- 3f6694b: Select the customer Storefront presentation through the deployment graph. Project resolution now emits a selected presentation factory artifact, and the standard Operator emits Storefront routes only when that presentation is selected.
- 37031e9: Move Workflow Runs registry and route composition behind its selected-graph runtime port. The generic Node runtime no longer mounts Workflow Runs routes when the module is not selected.

  Direct applications can continue to instantiate `WorkflowRunnerRegistry` and call `mountWorkflowRunsAdminRoutes`. Runtime-port implementations must now expose both `register()` and `get()`.

  See the [Workflow Runs 0.119 migration guide](../docs/migrations/migrating-to-0.119.md) for the custom provider update.

### Patch Changes

- Updated dependencies [4bc540f]
- Updated dependencies [318ca57]
- Updated dependencies [3f6694b]
- Updated dependencies [37031e9]
  - @voyant-travel/auth@0.128.0
  - @voyant-travel/framework@0.42.0
  - @voyant-travel/core@0.121.0
  - @voyant-travel/workflow-runs@0.119.0
  - @voyant-travel/db@0.114.1
  - @voyant-travel/hono@0.126.1
  - @voyant-travel/webhook-delivery@0.2.2
  - @voyant-travel/admin-host@0.5.0

## 0.7.4

### Patch Changes

- Updated dependencies [4d0eeed]
- Updated dependencies [abbb9cd]
- Updated dependencies [bef5b7c]
- Updated dependencies [d4fa159]
  - @voyant-travel/hono@0.126.0
  - @voyant-travel/db@0.114.0
  - @voyant-travel/framework@0.41.0
  - @voyant-travel/core@0.120.0
  - @voyant-travel/auth@0.127.0
  - @voyant-travel/workflow-runs@0.118.0
  - @voyant-travel/admin-host@0.4.0
  - @voyant-travel/runtime-core@0.6.1
  - @voyant-travel/webhook-delivery@0.2.1

## 0.7.3

### Patch Changes

- a5d25ea: Keep project Vite configuration from redirecting the lifecycle-owned Node distribution output.

## 0.7.2

### Patch Changes

- a7d14cd: Load an optional project-root Vite configuration during both development and production builds.

## 0.7.1

### Patch Changes

- 0ddd848: Build every Vite application environment for clean projects so `voyant build`
  emits both the client assets and the TanStack Start Node server.

## 0.7.0

### Minor Changes

- c65b05c: Move the complete graph-native Node application host into runtime,
  including generated graph admission, local and managed auth, API/admin serving,
  workflow services and schedules, outbound delivery, links, and runtime ports.
  Move the generic Postgres webhook enqueue boundary out of Distribution and into
  the neutral webhook-delivery package.
- 1f6effe: Add the versioned `@voyant-travel/runtime/tooling` project build and development server API for external CLI consumers, and keep generated standard frontend routes resolvable through the selected product distribution.
- 490d132: Add the graph-native generic Node runtime API and boot generated project and
  deployment artifacts without constructing or reading a managed-profile
  compatibility snapshot.
- 047c3f9: Release the generic Node operator host and minimal project authoring surface, with standard product
  BOM expansion, convention-driven project runtime adapters, and an independently bootable starter.
- 490d132: Boot packaged Operator projects with the statically selected package runtime contributors and reusable generic Node host primitives instead of fail-on-use runtime port stubs.
- 282892e: Make `@voyant-travel/runtime` the single public Node project host, move low-level
  host primitives to `@voyant-travel/runtime-core`, and remove the package-owned
  runtime CLI. Rename remaining first-party operator-specific subpaths to generic
  runtime or runtime-support surfaces.

### Patch Changes

- c65b05c: Generate standard Operator TypeScript, environment, Vite, and Vitest metadata beneath `.voyant` instead of shipping copied starter configuration.
- c65b05c: Move generic selected-graph OpenAPI host assembly out of the Operator starter and into the Node runtime package.
- cda53b6: Preserve legacy migration and route behavior in the unified Node host, align generated admin assets with their graph artifacts, restore auth email and media compatibility, and publish the selected-graph OpenAPI entry.
- c65b05c: Validate required auth secrets at the Operator auth boundary, adapt the generic
  Node host contracts to auth, webhook, and scheduled workflow runtimes, and
  exclude test sources from the published package build.
- c65b05c: Own generic Operator deployment-resource composition in the runtime package so projects inject only concrete Node primitives and generated graph ports.
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [c65b05c]
- Updated dependencies [490d132]
- Updated dependencies [c65b05c]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [c65b05c]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [c65b05c]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [047c3f9]
- Updated dependencies [490d132]
- Updated dependencies [c65b05c]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [c65b05c]
- Updated dependencies [c65b05c]
- Updated dependencies [490d132]
- Updated dependencies [c65b05c]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [c65b05c]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [c65b05c]
- Updated dependencies [490d132]
- Updated dependencies [047c3f9]
- Updated dependencies [490d132]
- Updated dependencies [c65b05c]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [c65b05c]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [c65b05c]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [cda53b6]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [047c3f9]
- Updated dependencies [490d132]
- Updated dependencies [282892e]
  - @voyant-travel/auth@0.126.0
  - @voyant-travel/framework@0.40.0
  - @voyant-travel/workflow-runs@0.117.0
  - @voyant-travel/admin-host@0.3.0
  - @voyant-travel/db@0.113.0
  - @voyant-travel/core@0.119.0
  - @voyant-travel/webhook-delivery@0.2.0
  - @voyant-travel/vite-config@0.3.0
  - @voyant-travel/hono@0.125.1
  - @voyant-travel/runtime-core@0.6.0
