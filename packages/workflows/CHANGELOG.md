# @voyant-travel/workflows

## 0.122.1

## 0.122.0

## 0.121.0

## 0.120.4

## 0.120.3

### Patch Changes

- 73ab096: Standardize first-party packages on package-owned deployment manifests, provider selection,
  access metadata, concrete event contracts, selected admin navigation, and published runtime
  references. Add Bookings Extras as an independently selected graph unit and remove the central
  admin navigation catalog.
  Link facets now distinguish entity `linkable` metadata from executable `definition` exports, and
  generated Node registries reject malformed definitions before service registration.
  Provider-owned required config and secrets now apply only when that provider is selected, so
  local and in-memory deployments do not require credentials for inactive remote providers.

## 0.120.2

### Patch Changes

- 8d62a7c: Republish every affected TypeScript package without broken declaration maps so the corrected artifact
  policy reaches npm instead of applying only to future incidental package releases.

## 0.120.1

## 0.120.0

### Patch Changes

- 818ea84: Ensure the published package root exports `defineWorkflow` for workflow authoring.

## 0.119.0

## 0.118.0

## 0.117.0

## 0.116.0

## 0.115.2

## 0.115.1

## 0.115.0

### Minor Changes

- 8576451: Remove the legacy core application manifest API so applications use
  `@voyant-travel/framework` `defineConfig` exclusively. Rename standalone
  workflow runtime configuration to `defineWorkflowConfig` and
  `VoyantWorkflowConfig`.

## 0.114.0

### Minor Changes

- d41872a: Add an explicit workflow resolver dependency to step handlers and runtime
  drivers, and use an entry-scoped workflow registry for self-host execution.

## 0.113.0

### Minor Changes

- ec75753: Add a pure `defineWorkflow` authoring API for explicitly collected workflow definitions while preserving legacy global registration through `workflow`.

## 0.112.0

## 0.111.19

## 0.111.18

## 0.111.17

### Patch Changes

- 621f989: Allow modules to register workflow and event-filter manifest metadata without importing run-bearing workflow definitions into request-serving apps.

## 0.111.16

## 0.111.15

## 0.111.14

## 0.111.13

## 0.111.12

## 0.111.11

## 0.111.10

## 0.111.9

## 0.111.8

## 0.111.7

## 0.111.6

## 0.111.5

## 0.111.4

## 0.111.3

## 0.111.2

## 0.111.1

## 0.111.0

## 0.110.0

## 0.109.4

## 0.109.3

## 0.109.2

## 0.109.1

## 0.109.0

## 0.108.0

### Minor Changes

- 0c003f3: Make workflows node-only and remove the stale Cloudflare edge/Node step split.

  Workflow runtime annotations now accept only `runtime: "node"`, legacy
  `runtime: "edge"` is rejected, and the old split-runner wiring has been removed.
  The legacy Cloudflare workflow adapter packages, Worker reference apps, and
  standalone external step-server artifact have been removed. Managed Cloud apps
  should forward workflow calls to the hosted Node runtime, and self-hosted
  deployments should use the Node/Postgres runtime package.

## 0.107.11

## 0.107.10

### Patch Changes

- 419edac: Expose a managed Cloud resume continuation contract with waitpoint snapshots,
  resume activation metadata, and a helper that builds resume step requests from
  persisted journals without repeating completed steps.

## 0.107.9

### Patch Changes

- 7d129be: Add a client-safe managed Cloud workflows subpath for trigger/event forwarding,
  enrich workflow release manifest metadata, and gate tenant-admin workflow
  management actions by deployment surface. Release registration stays disabled
  by default in managed Cloud app runtimes. Manifests now emit structured
  release/runtime capabilities and per-workflow definition capabilities. The
  client preserves queued trigger statuses returned by managed Cloud. Zod
  workflow schemas are serialized into manifest schema metadata before manifest
  identity hashing. Orchestrator manifest fixtures and deserializers now support
  the structured manifest capabilities shape.

## 0.107.8

## 0.107.7

## 0.107.6

## 0.107.5

## 0.107.4

## 0.107.3

## 0.107.2

## 0.107.1

## 0.107.0

## 0.106.0

## 0.105.2

## 0.105.1

## 0.105.0

## 0.104.1

## 0.104.0

## 0.103.0

## 0.102.0

## 0.101.2

## 0.101.1

## 0.101.0

## 0.100.0

## 0.99.0

## 0.98.0

## 0.97.0

## 0.96.0

## 0.95.0

## 0.94.0

## 0.93.0

## 0.92.0

## 0.91.0

## 0.90.0

## 0.89.0

## 0.88.0

## 0.87.1

## 0.87.0

## 0.86.0

## 0.85.4

## 0.85.3

## 0.85.2

## 0.85.1

## 0.85.0

## 0.84.4

## 0.84.3

## 0.84.2

## 0.84.1

## 0.84.0

## 0.83.1

## 0.83.0

## 0.82.1

## 0.82.0

## 0.81.21

## 0.81.20

## 0.81.19

## 0.81.18

## 0.81.17

## 0.81.16

## 0.81.15

## 0.81.14

## 0.81.13

## 0.81.12

## 0.81.11

## 0.81.10

## 0.81.9

## 0.81.8

## 0.81.7

## 0.81.6

## 0.81.5

## 0.81.4

## 0.81.3

## 0.81.2

## 0.81.1

## 0.81.0

## 0.80.18

## 0.80.17

## 0.80.16

## 0.80.15

## 0.80.14

## 0.80.13

## 0.80.12

## 0.80.11

## 0.80.10

## 0.80.9

## 0.80.8

## 0.80.7

## 0.80.6

## 0.80.5

## 0.80.4

## 0.80.3

## 0.80.2

## 0.80.1

## 0.80.0

## 0.79.0

## 0.78.0

## 0.77.13

## 0.77.12

## 0.77.11

## 0.77.10

## 0.77.9

## 0.77.8

## 0.77.7

## 0.77.6

## 0.77.5

## 0.77.4

## 0.77.3

## 0.77.2

## 0.77.1

## 0.77.0

## 0.76.0

## 0.75.7

## 0.75.6

## 0.75.5

## 0.75.4

## 0.75.3

## 0.75.2

## 0.75.1

## 0.75.0

## 0.74.2

## 0.74.1

## 0.74.0

## 0.73.1

## 0.73.0

## 0.72.0

## 0.71.0

## 0.70.0

## 0.69.1

## 0.69.0

## 0.68.0

## 0.67.0

## 0.66.6

## 0.66.5

## 0.66.4

## 0.66.3

## 0.66.2

## 0.66.1

## 0.66.0

## 0.65.0

## 0.64.1

## 0.64.0

## 0.63.1

## 0.63.0

## 0.62.3

## 0.62.2

## 0.62.1

## 0.62.0

## 0.61.0

## 0.60.0

## 0.59.0

## 0.58.0

## 0.57.0

## 0.56.0

## 0.55.1

## 0.55.0

## 0.54.0

## 0.53.2

## 0.53.1

## 0.53.0

## 0.52.4

## 0.52.3

## 0.52.2

## 0.52.1

## 0.52.0

## 0.51.1

## 0.51.0

## 0.50.8

## 0.50.7

## 0.50.6

## 0.50.5

## 0.50.4

## 0.50.3

## 0.50.2

## 0.50.1

## 0.50.0

## 0.49.0

## 0.48.0

## 0.47.0

## 0.46.0

## 0.45.0

## 0.44.0

## 0.43.0

## 0.42.0

## 0.41.3

### Patch Changes

- 2c3bd2e: Add default export conditions to the published workflows subpaths so tooling that uses default/CJS-style resolution can load `@voyant-travel/workflows/events`.

## 0.41.2

## 0.41.1

## 0.41.0

## 0.40.1

## 0.40.0

## 0.39.0

## 0.38.2

## 0.38.1

## 0.38.0

### Minor Changes

- 885afc8: Consolidate the public workflows package surface around `@voyant-travel/workflows`
  subpaths and `@voyant-travel/workflows-ui`.

  Use `@voyant-travel/workflows/errors`, `@voyant-travel/workflows/config`, and
  `@voyant-travel/workflows/bindings` instead of the former one-file packages. Use
  `@voyant-travel/workflows-ui` instead of `@voyant-travel/workflow-runs-ui`.

## 0.37.1

### Patch Changes

- @voyant-travel/workflows-errors@0.37.1

## 0.37.0

### Patch Changes

- @voyant-travel/workflows-errors@0.37.0

## 0.36.0

### Patch Changes

- @voyant-travel/workflows-errors@0.36.0

## 0.35.0

### Patch Changes

- @voyant-travel/workflows-errors@0.35.0

## 0.34.0

### Patch Changes

- @voyant-travel/workflows-errors@0.34.0

## 0.33.1

### Patch Changes

- @voyant-travel/workflows-errors@0.33.1

## 0.33.0

### Patch Changes

- @voyant-travel/workflows-errors@0.33.0

## 0.32.3

### Patch Changes

- @voyant-travel/workflows-errors@0.32.3

## 0.32.2

### Patch Changes

- @voyant-travel/workflows-errors@0.32.2

## 0.32.1

### Patch Changes

- @voyant-travel/workflows-errors@0.32.1

## 0.32.0

### Patch Changes

- @voyant-travel/workflows-errors@0.32.0

## 0.31.4

### Patch Changes

- @voyant-travel/workflows-errors@0.31.4

## 0.31.3

### Patch Changes

- @voyant-travel/workflows-errors@0.31.3

## 0.31.2

### Patch Changes

- @voyant-travel/workflows-errors@0.31.2

## 0.31.1

### Patch Changes

- @voyant-travel/workflows-errors@0.31.1

## 0.31.0

### Patch Changes

- @voyant-travel/workflows-errors@0.31.0

## 0.30.7

### Patch Changes

- @voyant-travel/workflows-errors@0.30.7

## 0.30.6

### Patch Changes

- @voyant-travel/workflows-errors@0.30.6

## 0.30.5

### Patch Changes

- 3f323e9: Serialize workflow concurrency declarations into runtime manifests and enforce workflow concurrency policies for the in-memory, Node, and Cloudflare orchestrator drivers.
  - @voyant-travel/workflows-errors@0.30.5

## 0.30.4

### Patch Changes

- @voyant-travel/workflows-errors@0.30.4

## 0.30.3

### Patch Changes

- 05a1b19: Serialize workflow schedule declarations into manifests, preserve schedule config when Hono registers runtime manifests, and expose shared schedule fire-time helpers from the orchestrator package.
  - @voyant-travel/workflows-errors@0.30.3

## 0.30.2

### Patch Changes

- @voyant-travel/workflows-errors@0.30.2

## 0.30.1

### Patch Changes

- @voyant-travel/workflows-errors@0.30.1

## 0.30.0

### Patch Changes

- @voyant-travel/workflows-errors@0.30.0

## 0.29.0

### Patch Changes

- @voyant-travel/workflows-errors@0.29.0

## 0.28.3

### Patch Changes

- @voyant-travel/workflows-errors@0.28.3

## 0.28.2

### Patch Changes

- @voyant-travel/workflows-errors@0.28.2

## 0.28.1

### Patch Changes

- @voyant-travel/workflows-errors@0.28.1

## 0.28.0

### Patch Changes

- @voyant-travel/workflows-errors@0.28.0

## 0.27.0

### Patch Changes

- @voyant-travel/workflows-errors@0.27.0

## 0.26.9

### Patch Changes

- @voyant-travel/workflows-errors@0.26.9

## 0.26.8

### Patch Changes

- @voyant-travel/workflows-errors@0.26.8

## 0.26.7

### Patch Changes

- @voyant-travel/workflows-errors@0.26.7

## 0.26.6

### Patch Changes

- @voyant-travel/workflows-errors@0.26.6

## 0.26.5

### Patch Changes

- @voyant-travel/workflows-errors@0.26.5

## 0.26.4

### Patch Changes

- @voyant-travel/workflows-errors@0.26.4

## 0.26.3

### Patch Changes

- @voyant-travel/workflows-errors@0.26.3

## 0.26.2

### Patch Changes

- @voyant-travel/workflows-errors@0.26.2

## 0.26.1

### Patch Changes

- @voyant-travel/workflows-errors@0.26.1

## 0.26.0

### Patch Changes

- @voyant-travel/workflows-errors@0.26.0

## 0.25.0

### Patch Changes

- @voyant-travel/workflows-errors@0.25.0

## 0.24.3

### Patch Changes

- @voyant-travel/workflows-errors@0.24.3

## 0.24.2

### Patch Changes

- @voyant-travel/workflows-errors@0.24.2

## 0.24.1

### Patch Changes

- @voyant-travel/workflows-errors@0.24.1

## 0.24.0

### Patch Changes

- @voyant-travel/workflows-errors@0.24.0

## 0.23.0

### Patch Changes

- @voyant-travel/workflows-errors@0.23.0

## 0.22.0

### Patch Changes

- @voyant-travel/workflows-errors@0.22.0

## 0.21.1

### Patch Changes

- @voyant-travel/workflows-errors@0.21.1

## 0.21.0

### Patch Changes

- @voyant-travel/workflows-errors@0.21.0

## 0.20.0

### Patch Changes

- @voyant-travel/workflows-errors@0.20.0

## 0.19.0

### Patch Changes

- @voyant-travel/workflows-errors@0.19.0

## 0.18.0

### Patch Changes

- @voyant-travel/workflows-errors@0.18.0

## 0.17.0

### Patch Changes

- 66d722d: De-flake the `ctx.parallel > defaults concurrency to total items` test by asserting on elapsed time (`elapsed < SLEEP_MS * ITEMS.length`) instead of completion order. Sleep-based ordering tests are fragile under CI runner scheduler resolution; the elapsed-time invariant verifies the actual contract (real concurrency, not serialized) without relying on `setTimeout` precision.
  - @voyant-travel/workflows-errors@0.17.0

## 0.16.0

### Patch Changes

- @voyant-travel/workflows-errors@0.16.0

## 0.15.0

### Patch Changes

- @voyant-travel/workflows-errors@0.15.0

## 0.14.0

### Patch Changes

- @voyant-travel/workflows-errors@0.14.0

## 0.13.0

### Patch Changes

- @voyant-travel/workflows-errors@0.13.0

## 0.12.0

### Patch Changes

- @voyant-travel/workflows-errors@0.12.0

## 0.11.0

### Patch Changes

- @voyant-travel/workflows-errors@0.11.0

## 0.10.0

### Patch Changes

- @voyant-travel/workflows-errors@0.10.0

## 0.9.0

### Patch Changes

- @voyant-travel/workflows-errors@0.9.0

## 0.8.0

### Patch Changes

- @voyant-travel/workflows-errors@0.8.0

## 0.7.0

### Patch Changes

- @voyant-travel/workflows-errors@0.7.0

## 0.6.9

### Patch Changes

- @voyant-travel/workflows-errors@0.6.9
