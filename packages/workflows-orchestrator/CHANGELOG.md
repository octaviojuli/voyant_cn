# @voyant-travel/workflows-orchestrator

## 0.122.1

### Patch Changes

- @voyant-travel/workflows@0.122.1

## 0.122.0

### Patch Changes

- @voyant-travel/workflows@0.122.0

## 0.121.0

### Patch Changes

- @voyant-travel/workflows@0.121.0

## 0.120.4

### Patch Changes

- @voyant-travel/workflows@0.120.4

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
- Updated dependencies [73ab096]
  - @voyant-travel/workflows@0.120.3

## 0.120.2

### Patch Changes

- 8d62a7c: Republish every affected TypeScript package without broken declaration maps so the corrected artifact
  policy reaches npm instead of applying only to future incidental package releases.
- Updated dependencies [8d62a7c]
  - @voyant-travel/workflows@0.120.2

## 0.120.1

### Patch Changes

- @voyant-travel/workflows@0.120.1

## 0.120.0

### Minor Changes

- 07a6ee3: Make `deployment.providers.workflows` authoritative for Node workflow execution and Workflow Runs admin ownership. Self-hosted Operators now use the durable Postgres driver and receive package-owned orchestrator migrations; local mode uses the in-memory adapter, `none` omits workflow composition, and Voyant Cloud fails closed when credentials are missing.

  Scheduled one-shot dispatch disables resident scheduler and time-wheel loops and always shuts down its driver. Managed Cloud snapshots must select `voyant-cloud` before this release is deployed.

  See the [Framework 0.42 migration guide](../docs/migrations/migrating-to-0.42.md) for provider, migration, and rollout steps.

### Patch Changes

- Updated dependencies [818ea84]
  - @voyant-travel/workflows@0.120.0

## 0.119.0

### Patch Changes

- @voyant-travel/workflows@0.119.0

## 0.118.0

### Patch Changes

- @voyant-travel/workflows@0.118.0

## 0.117.0

### Patch Changes

- @voyant-travel/workflows@0.117.0

## 0.116.0

### Patch Changes

- @voyant-travel/workflows@0.116.0

## 0.115.2

### Patch Changes

- @voyant-travel/workflows@0.115.2

## 0.115.1

### Patch Changes

- @voyant-travel/workflows@0.115.1

## 0.115.0

### Patch Changes

- Updated dependencies [8576451]
  - @voyant-travel/workflows@0.115.0

## 0.114.0

### Patch Changes

- d41872a: Add an explicit workflow resolver dependency to step handlers and runtime
  drivers, and use an entry-scoped workflow registry for self-host execution.
- Updated dependencies [d41872a]
  - @voyant-travel/workflows@0.114.0

## 0.113.0

### Patch Changes

- Updated dependencies [ec75753]
  - @voyant-travel/workflows@0.113.0

## 0.112.0

### Patch Changes

- @voyant-travel/workflows@0.112.0

## 0.111.19

### Patch Changes

- @voyant-travel/workflows@0.111.19

## 0.111.18

### Patch Changes

- @voyant-travel/workflows@0.111.18

## 0.111.17

### Patch Changes

- Updated dependencies [621f989]
  - @voyant-travel/workflows@0.111.17

## 0.111.16

### Patch Changes

- @voyant-travel/workflows@0.111.16

## 0.111.15

### Patch Changes

- @voyant-travel/workflows@0.111.15

## 0.111.14

### Patch Changes

- @voyant-travel/workflows@0.111.14

## 0.111.13

### Patch Changes

- @voyant-travel/workflows@0.111.13

## 0.111.12

### Patch Changes

- @voyant-travel/workflows@0.111.12

## 0.111.11

### Patch Changes

- 5b432f6: Validate self-host resume `seedResults` with the existing bounded, serializable payload checks.
  - @voyant-travel/workflows@0.111.11

## 0.111.10

### Patch Changes

- @voyant-travel/workflows@0.111.10

## 0.111.9

### Patch Changes

- @voyant-travel/workflows@0.111.9

## 0.111.8

### Patch Changes

- @voyant-travel/workflows@0.111.8

## 0.111.7

### Patch Changes

- ab95d11: `findDashboardDir` no longer probes the in-repo `apps/workflows-local-dashboard/dist` path (that example app has been removed). It now falls back to a generic sibling `local-dashboard/dist`; production self-host should pass `staticDir` explicitly.
  - @voyant-travel/workflows@0.111.7

## 0.111.6

### Patch Changes

- @voyant-travel/workflows@0.111.6

## 0.111.5

### Patch Changes

- @voyant-travel/workflows@0.111.5

## 0.111.4

### Patch Changes

- @voyant-travel/workflows@0.111.4

## 0.111.3

### Patch Changes

- @voyant-travel/workflows@0.111.3

## 0.111.2

### Patch Changes

- @voyant-travel/workflows@0.111.2

## 0.111.1

### Patch Changes

- @voyant-travel/workflows@0.111.1

## 0.111.0

### Patch Changes

- @voyant-travel/workflows@0.111.0

## 0.110.0

### Minor Changes

- 4f92198: Expose the in-memory orchestration driver via a dedicated `./in-memory` export so deployments (e.g. the operator starter) can run workflows locally without an external orchestrator.

### Patch Changes

- @voyant-travel/workflows@0.110.0

## 0.109.4

### Patch Changes

- @voyant-travel/workflows@0.109.4

## 0.109.3

### Patch Changes

- e46200d: Call workflow bundle `bootstrapWorkflowBundle` exports after loading entries so
  detached workflow runners can initialize process-local dependencies before
  executing workflow steps.
  - @voyant-travel/workflows@0.109.3

## 0.109.2

### Patch Changes

- @voyant-travel/workflows@0.109.2

## 0.109.1

### Patch Changes

- @voyant-travel/workflows@0.109.1

## 0.109.0

### Minor Changes

- 2691801: Fold the Postgres self-host runtime into `@voyant-travel/workflows-orchestrator`
  and remove the separate `@voyant-travel/workflows-orchestrator-node` package.

  Self-host deployments should import the Postgres driver, migration helpers,
  scheduler/wakeup stores, dashboard helpers, and self-host server helpers from
  the `@voyant-travel/workflows-orchestrator/selfhost` runtime subpath.

### Patch Changes

- @voyant-travel/workflows@0.109.0

## 0.108.0

### Patch Changes

- Updated dependencies [0c003f3]
  - @voyant-travel/workflows@0.108.0

## 0.107.11

### Patch Changes

- @voyant-travel/workflows@0.107.11

## 0.107.10

### Patch Changes

- Updated dependencies [419edac]
  - @voyant-travel/workflows@0.107.10

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
- Updated dependencies [7d129be]
  - @voyant-travel/workflows@0.107.9

## 0.107.8

### Patch Changes

- bed090c: Give the exported driver compliance DATETIME wakeup assertion a CI-safe wait budget without changing the behavior under test.
  - @voyant-travel/workflows@0.107.8

## 0.107.7

### Patch Changes

- a0f1a13: Keep the in-memory workflow driver from dropping a chained DATETIME wakeup when a timer callback fires before the stored wake time is due.
  - @voyant-travel/workflows@0.107.7

## 0.107.6

### Patch Changes

- @voyant-travel/workflows@0.107.6

## 0.107.5

### Patch Changes

- @voyant-travel/workflows@0.107.5

## 0.107.4

### Patch Changes

- @voyant-travel/workflows@0.107.4

## 0.107.3

### Patch Changes

- @voyant-travel/workflows@0.107.3

## 0.107.2

### Patch Changes

- @voyant-travel/workflows@0.107.2

## 0.107.1

### Patch Changes

- @voyant-travel/workflows@0.107.1

## 0.107.0

### Patch Changes

- @voyant-travel/workflows@0.107.0

## 0.106.0

### Patch Changes

- @voyant-travel/workflows@0.106.0

## 0.105.2

### Patch Changes

- @voyant-travel/workflows@0.105.2

## 0.105.1

### Patch Changes

- @voyant-travel/workflows@0.105.1

## 0.105.0

### Patch Changes

- @voyant-travel/workflows@0.105.0

## 0.104.1

### Patch Changes

- @voyant-travel/workflows@0.104.1

## 0.104.0

### Patch Changes

- @voyant-travel/workflows@0.104.0

## 0.103.0

### Patch Changes

- @voyant-travel/workflows@0.103.0

## 0.102.0

### Patch Changes

- @voyant-travel/workflows@0.102.0

## 0.101.2

### Patch Changes

- @voyant-travel/workflows@0.101.2

## 0.101.1

### Patch Changes

- @voyant-travel/workflows@0.101.1

## 0.101.0

### Patch Changes

- @voyant-travel/workflows@0.101.0

## 0.100.0

### Patch Changes

- @voyant-travel/workflows@0.100.0

## 0.99.0

### Patch Changes

- @voyant-travel/workflows@0.99.0

## 0.98.0

### Patch Changes

- @voyant-travel/workflows@0.98.0

## 0.97.0

### Patch Changes

- @voyant-travel/workflows@0.97.0

## 0.96.0

### Patch Changes

- @voyant-travel/workflows@0.96.0

## 0.95.0

### Patch Changes

- @voyant-travel/workflows@0.95.0

## 0.94.0

### Patch Changes

- @voyant-travel/workflows@0.94.0

## 0.93.0

### Patch Changes

- @voyant-travel/workflows@0.93.0

## 0.92.0

### Patch Changes

- @voyant-travel/workflows@0.92.0

## 0.91.0

### Patch Changes

- @voyant-travel/workflows@0.91.0

## 0.90.0

### Patch Changes

- @voyant-travel/workflows@0.90.0

## 0.89.0

### Patch Changes

- @voyant-travel/workflows@0.89.0

## 0.88.0

### Patch Changes

- @voyant-travel/workflows@0.88.0

## 0.87.1

### Patch Changes

- @voyant-travel/workflows@0.87.1

## 0.87.0

### Patch Changes

- @voyant-travel/workflows@0.87.0

## 0.86.0

### Patch Changes

- @voyant-travel/workflows@0.86.0

## 0.85.4

### Patch Changes

- @voyant-travel/workflows@0.85.4

## 0.85.3

### Patch Changes

- @voyant-travel/workflows@0.85.3

## 0.85.2

### Patch Changes

- @voyant-travel/workflows@0.85.2

## 0.85.1

### Patch Changes

- @voyant-travel/workflows@0.85.1

## 0.85.0

### Patch Changes

- @voyant-travel/workflows@0.85.0

## 0.84.4

### Patch Changes

- @voyant-travel/workflows@0.84.4

## 0.84.3

### Patch Changes

- @voyant-travel/workflows@0.84.3

## 0.84.2

### Patch Changes

- @voyant-travel/workflows@0.84.2

## 0.84.1

### Patch Changes

- @voyant-travel/workflows@0.84.1

## 0.84.0

### Patch Changes

- @voyant-travel/workflows@0.84.0

## 0.83.1

### Patch Changes

- @voyant-travel/workflows@0.83.1

## 0.83.0

### Patch Changes

- @voyant-travel/workflows@0.83.0

## 0.82.1

### Patch Changes

- @voyant-travel/workflows@0.82.1

## 0.82.0

### Patch Changes

- @voyant-travel/workflows@0.82.0

## 0.81.21

### Patch Changes

- @voyant-travel/workflows@0.81.21

## 0.81.20

### Patch Changes

- @voyant-travel/workflows@0.81.20

## 0.81.19

### Patch Changes

- @voyant-travel/workflows@0.81.19

## 0.81.18

### Patch Changes

- @voyant-travel/workflows@0.81.18

## 0.81.17

### Patch Changes

- @voyant-travel/workflows@0.81.17

## 0.81.16

### Patch Changes

- @voyant-travel/workflows@0.81.16

## 0.81.15

### Patch Changes

- @voyant-travel/workflows@0.81.15

## 0.81.14

### Patch Changes

- @voyant-travel/workflows@0.81.14

## 0.81.13

### Patch Changes

- @voyant-travel/workflows@0.81.13

## 0.81.12

### Patch Changes

- @voyant-travel/workflows@0.81.12

## 0.81.11

### Patch Changes

- @voyant-travel/workflows@0.81.11

## 0.81.10

### Patch Changes

- @voyant-travel/workflows@0.81.10

## 0.81.9

### Patch Changes

- @voyant-travel/workflows@0.81.9

## 0.81.8

### Patch Changes

- @voyant-travel/workflows@0.81.8

## 0.81.7

### Patch Changes

- @voyant-travel/workflows@0.81.7

## 0.81.6

### Patch Changes

- @voyant-travel/workflows@0.81.6

## 0.81.5

### Patch Changes

- @voyant-travel/workflows@0.81.5

## 0.81.4

### Patch Changes

- @voyant-travel/workflows@0.81.4

## 0.81.3

### Patch Changes

- @voyant-travel/workflows@0.81.3

## 0.81.2

### Patch Changes

- @voyant-travel/workflows@0.81.2

## 0.81.1

### Patch Changes

- @voyant-travel/workflows@0.81.1

## 0.81.0

### Patch Changes

- @voyant-travel/workflows@0.81.0

## 0.80.18

### Patch Changes

- @voyant-travel/workflows@0.80.18

## 0.80.17

### Patch Changes

- @voyant-travel/workflows@0.80.17

## 0.80.16

### Patch Changes

- @voyant-travel/workflows@0.80.16

## 0.80.15

### Patch Changes

- @voyant-travel/workflows@0.80.15

## 0.80.14

### Patch Changes

- @voyant-travel/workflows@0.80.14

## 0.80.13

### Patch Changes

- @voyant-travel/workflows@0.80.13

## 0.80.12

### Patch Changes

- @voyant-travel/workflows@0.80.12

## 0.80.11

### Patch Changes

- @voyant-travel/workflows@0.80.11

## 0.80.10

### Patch Changes

- @voyant-travel/workflows@0.80.10

## 0.80.9

### Patch Changes

- @voyant-travel/workflows@0.80.9

## 0.80.8

### Patch Changes

- @voyant-travel/workflows@0.80.8

## 0.80.7

### Patch Changes

- @voyant-travel/workflows@0.80.7

## 0.80.6

### Patch Changes

- @voyant-travel/workflows@0.80.6

## 0.80.5

### Patch Changes

- @voyant-travel/workflows@0.80.5

## 0.80.4

### Patch Changes

- @voyant-travel/workflows@0.80.4

## 0.80.3

### Patch Changes

- @voyant-travel/workflows@0.80.3

## 0.80.2

### Patch Changes

- @voyant-travel/workflows@0.80.2

## 0.80.1

### Patch Changes

- @voyant-travel/workflows@0.80.1

## 0.80.0

### Patch Changes

- @voyant-travel/workflows@0.80.0

## 0.79.0

### Patch Changes

- @voyant-travel/workflows@0.79.0

## 0.78.0

### Patch Changes

- @voyant-travel/workflows@0.78.0

## 0.77.13

### Patch Changes

- @voyant-travel/workflows@0.77.13

## 0.77.12

### Patch Changes

- @voyant-travel/workflows@0.77.12

## 0.77.11

### Patch Changes

- @voyant-travel/workflows@0.77.11

## 0.77.10

### Patch Changes

- @voyant-travel/workflows@0.77.10

## 0.77.9

### Patch Changes

- @voyant-travel/workflows@0.77.9

## 0.77.8

### Patch Changes

- @voyant-travel/workflows@0.77.8

## 0.77.7

### Patch Changes

- @voyant-travel/workflows@0.77.7

## 0.77.6

### Patch Changes

- @voyant-travel/workflows@0.77.6

## 0.77.5

### Patch Changes

- @voyant-travel/workflows@0.77.5

## 0.77.4

### Patch Changes

- @voyant-travel/workflows@0.77.4

## 0.77.3

### Patch Changes

- @voyant-travel/workflows@0.77.3

## 0.77.2

### Patch Changes

- @voyant-travel/workflows@0.77.2

## 0.77.1

### Patch Changes

- @voyant-travel/workflows@0.77.1

## 0.77.0

### Patch Changes

- @voyant-travel/workflows@0.77.0

## 0.76.0

### Patch Changes

- @voyant-travel/workflows@0.76.0

## 0.75.7

### Patch Changes

- @voyant-travel/workflows@0.75.7

## 0.75.6

### Patch Changes

- @voyant-travel/workflows@0.75.6

## 0.75.5

### Patch Changes

- @voyant-travel/workflows@0.75.5

## 0.75.4

### Patch Changes

- @voyant-travel/workflows@0.75.4

## 0.75.3

### Patch Changes

- @voyant-travel/workflows@0.75.3

## 0.75.2

### Patch Changes

- @voyant-travel/workflows@0.75.2

## 0.75.1

### Patch Changes

- @voyant-travel/workflows@0.75.1

## 0.75.0

### Patch Changes

- @voyant-travel/workflows@0.75.0

## 0.74.2

### Patch Changes

- @voyant-travel/workflows@0.74.2

## 0.74.1

### Patch Changes

- @voyant-travel/workflows@0.74.1

## 0.74.0

### Patch Changes

- @voyant-travel/workflows@0.74.0

## 0.73.1

### Patch Changes

- @voyant-travel/workflows@0.73.1

## 0.73.0

### Patch Changes

- @voyant-travel/workflows@0.73.0

## 0.72.0

### Patch Changes

- @voyant-travel/workflows@0.72.0

## 0.71.0

### Patch Changes

- @voyant-travel/workflows@0.71.0

## 0.70.0

### Patch Changes

- @voyant-travel/workflows@0.70.0

## 0.69.1

### Patch Changes

- @voyant-travel/workflows@0.69.1

## 0.69.0

### Patch Changes

- @voyant-travel/workflows@0.69.0

## 0.68.0

### Patch Changes

- @voyant-travel/workflows@0.68.0

## 0.67.0

### Patch Changes

- @voyant-travel/workflows@0.67.0

## 0.66.6

### Patch Changes

- @voyant-travel/workflows@0.66.6

## 0.66.5

### Patch Changes

- @voyant-travel/workflows@0.66.5

## 0.66.4

### Patch Changes

- @voyant-travel/workflows@0.66.4

## 0.66.3

### Patch Changes

- @voyant-travel/workflows@0.66.3

## 0.66.2

### Patch Changes

- @voyant-travel/workflows@0.66.2

## 0.66.1

### Patch Changes

- @voyant-travel/workflows@0.66.1

## 0.66.0

### Patch Changes

- @voyant-travel/workflows@0.66.0

## 0.65.0

### Patch Changes

- @voyant-travel/workflows@0.65.0

## 0.64.1

### Patch Changes

- @voyant-travel/workflows@0.64.1

## 0.64.0

### Patch Changes

- @voyant-travel/workflows@0.64.0

## 0.63.1

### Patch Changes

- @voyant-travel/workflows@0.63.1

## 0.63.0

### Patch Changes

- @voyant-travel/workflows@0.63.0

## 0.62.3

### Patch Changes

- @voyant-travel/workflows@0.62.3

## 0.62.2

### Patch Changes

- @voyant-travel/workflows@0.62.2

## 0.62.1

### Patch Changes

- @voyant-travel/workflows@0.62.1

## 0.62.0

### Patch Changes

- @voyant-travel/workflows@0.62.0

## 0.61.0

### Patch Changes

- @voyant-travel/workflows@0.61.0

## 0.60.0

### Patch Changes

- @voyant-travel/workflows@0.60.0

## 0.59.0

### Patch Changes

- @voyant-travel/workflows@0.59.0

## 0.58.0

### Patch Changes

- @voyant-travel/workflows@0.58.0

## 0.57.0

### Patch Changes

- @voyant-travel/workflows@0.57.0

## 0.56.0

### Patch Changes

- @voyant-travel/workflows@0.56.0

## 0.55.1

### Patch Changes

- @voyant-travel/workflows@0.55.1

## 0.55.0

### Patch Changes

- @voyant-travel/workflows@0.55.0

## 0.54.0

### Patch Changes

- @voyant-travel/workflows@0.54.0

## 0.53.2

### Patch Changes

- @voyant-travel/workflows@0.53.2

## 0.53.1

### Patch Changes

- @voyant-travel/workflows@0.53.1

## 0.53.0

### Patch Changes

- @voyant-travel/workflows@0.53.0

## 0.52.4

### Patch Changes

- @voyant-travel/workflows@0.52.4

## 0.52.3

### Patch Changes

- @voyant-travel/workflows@0.52.3

## 0.52.2

### Patch Changes

- @voyant-travel/workflows@0.52.2

## 0.52.1

### Patch Changes

- @voyant-travel/workflows@0.52.1

## 0.52.0

### Patch Changes

- @voyant-travel/workflows@0.52.0

## 0.51.1

### Patch Changes

- @voyant-travel/workflows@0.51.1

## 0.51.0

### Patch Changes

- @voyant-travel/workflows@0.51.0

## 0.50.8

### Patch Changes

- @voyant-travel/workflows@0.50.8

## 0.50.7

### Patch Changes

- @voyant-travel/workflows@0.50.7

## 0.50.6

### Patch Changes

- @voyant-travel/workflows@0.50.6

## 0.50.5

### Patch Changes

- @voyant-travel/workflows@0.50.5

## 0.50.4

### Patch Changes

- @voyant-travel/workflows@0.50.4

## 0.50.3

### Patch Changes

- @voyant-travel/workflows@0.50.3

## 0.50.2

### Patch Changes

- @voyant-travel/workflows@0.50.2

## 0.50.1

### Patch Changes

- @voyant-travel/workflows@0.50.1

## 0.50.0

### Patch Changes

- @voyant-travel/workflows@0.50.0

## 0.49.0

### Patch Changes

- @voyant-travel/workflows@0.49.0

## 0.48.0

### Patch Changes

- @voyant-travel/workflows@0.48.0

## 0.47.0

### Patch Changes

- @voyant-travel/workflows@0.47.0

## 0.46.0

### Patch Changes

- @voyant-travel/workflows@0.46.0

## 0.45.0

### Patch Changes

- @voyant-travel/workflows@0.45.0

## 0.44.0

### Patch Changes

- @voyant-travel/workflows@0.44.0

## 0.43.0

### Patch Changes

- @voyant-travel/workflows@0.43.0

## 0.42.0

### Patch Changes

- @voyant-travel/workflows@0.42.0

## 0.41.3

### Patch Changes

- Updated dependencies [2c3bd2e]
  - @voyant-travel/workflows@0.41.3

## 0.41.2

### Patch Changes

- @voyant-travel/workflows@0.41.2

## 0.41.1

### Patch Changes

- @voyant-travel/workflows@0.41.1

## 0.41.0

### Patch Changes

- @voyant-travel/workflows@0.41.0

## 0.40.1

### Patch Changes

- @voyant-travel/workflows@0.40.1

## 0.40.0

### Patch Changes

- @voyant-travel/workflows@0.40.0

## 0.39.0

### Patch Changes

- @voyant-travel/workflows@0.39.0

## 0.38.2

### Patch Changes

- @voyant-travel/workflows@0.38.2

## 0.38.1

### Patch Changes

- 9a345d1: Add Cloudflare `POST /api/runs/:id/resume` support for starting a new run from a failed parent run with a seeded journal. Resume now carries the metadata replay cursor with the seeded journal, and public trigger requests strip internal resume seed fields.
  - @voyant-travel/workflows@0.38.1

## 0.38.0

### Patch Changes

- Updated dependencies [885afc8]
  - @voyant-travel/workflows@0.38.0

## 0.37.1

### Patch Changes

- @voyant-travel/workflows@0.37.1

## 0.37.0

### Patch Changes

- @voyant-travel/workflows@0.37.0

## 0.36.0

### Patch Changes

- @voyant-travel/workflows@0.36.0

## 0.35.0

### Patch Changes

- @voyant-travel/workflows@0.35.0

## 0.34.0

### Patch Changes

- @voyant-travel/workflows@0.34.0

## 0.33.1

### Patch Changes

- @voyant-travel/workflows@0.33.1

## 0.33.0

### Patch Changes

- @voyant-travel/workflows@0.33.0

## 0.32.3

### Patch Changes

- @voyant-travel/workflows@0.32.3

## 0.32.2

### Patch Changes

- @voyant-travel/workflows@0.32.2

## 0.32.1

### Patch Changes

- @voyant-travel/workflows@0.32.1

## 0.32.0

### Patch Changes

- @voyant-travel/workflows@0.32.0

## 0.31.4

### Patch Changes

- @voyant-travel/workflows@0.31.4

## 0.31.3

### Patch Changes

- @voyant-travel/workflows@0.31.3

## 0.31.2

### Patch Changes

- @voyant-travel/workflows@0.31.2

## 0.31.1

### Patch Changes

- @voyant-travel/workflows@0.31.1

## 0.31.0

### Patch Changes

- @voyant-travel/workflows@0.31.0

## 0.30.7

### Patch Changes

- @voyant-travel/workflows@0.30.7

## 0.30.6

### Patch Changes

- @voyant-travel/workflows@0.30.6

## 0.30.5

### Patch Changes

- 3f323e9: Serialize workflow concurrency declarations into runtime manifests and enforce workflow concurrency policies for the in-memory, Node, and Cloudflare orchestrator drivers.
- Updated dependencies [3f323e9]
  - @voyant-travel/workflows@0.30.5

## 0.30.4

### Patch Changes

- fcffe2d: Fire manifest-registered workflow schedules from the in-memory and Node standalone drivers.
  - @voyant-travel/workflows@0.30.4

## 0.30.3

### Patch Changes

- 05a1b19: Serialize workflow schedule declarations into manifests, preserve schedule config when Hono registers runtime manifests, and expose shared schedule fire-time helpers from the orchestrator package.
- Updated dependencies [05a1b19]
  - @voyant-travel/workflows@0.30.3

## 0.30.2

### Patch Changes

- 16e2134: Wire `TriggerOptions.priority` through the workflow orchestrator drivers and claim due wakeups by priority before wake time.
  - @voyant-travel/workflows@0.30.2

## 0.30.1

### Patch Changes

- 49fa324: Wire `TriggerOptions.delay` through the workflow orchestrator drivers so delayed runs park on a DATETIME waitpoint and wake through the existing time wheel.
  - @voyant-travel/workflows@0.30.1

## 0.30.0

### Patch Changes

- @voyant-travel/workflows@0.30.0

## 0.29.0

### Patch Changes

- @voyant-travel/workflows@0.29.0

## 0.28.3

### Patch Changes

- @voyant-travel/workflows@0.28.3

## 0.28.2

### Patch Changes

- @voyant-travel/workflows@0.28.2

## 0.28.1

### Patch Changes

- @voyant-travel/workflows@0.28.1

## 0.28.0

### Patch Changes

- @voyant-travel/workflows@0.28.0

## 0.27.0

### Patch Changes

- @voyant-travel/workflows@0.27.0

## 0.26.9

### Patch Changes

- @voyant-travel/workflows@0.26.9

## 0.26.8

### Patch Changes

- @voyant-travel/workflows@0.26.8

## 0.26.7

### Patch Changes

- @voyant-travel/workflows@0.26.7

## 0.26.6

### Patch Changes

- @voyant-travel/workflows@0.26.6

## 0.26.5

### Patch Changes

- @voyant-travel/workflows@0.26.5

## 0.26.4

### Patch Changes

- @voyant-travel/workflows@0.26.4

## 0.26.3

### Patch Changes

- @voyant-travel/workflows@0.26.3

## 0.26.2

### Patch Changes

- @voyant-travel/workflows@0.26.2

## 0.26.1

### Patch Changes

- @voyant-travel/workflows@0.26.1

## 0.26.0

### Patch Changes

- @voyant-travel/workflows@0.26.0

## 0.25.0

### Minor Changes

- f73e32c: Add a supported self-host failed-step resume path for workflow-run dispatch.

  The Node self-host server now exposes a resume endpoint that can start a new run
  from a stored self-host parent snapshot or from an external admin recorder parent
  id with explicit `workflowId`, `resumeFromStep`, and seeded step results. The
  orchestrator can now trigger runs with a pre-populated journal, and the Node
  self-host package exports a client helper for operator admin integrations.

### Patch Changes

- @voyant-travel/workflows@0.25.0

## 0.24.3

### Patch Changes

- @voyant-travel/workflows@0.24.3

## 0.24.2

### Patch Changes

- @voyant-travel/workflows@0.24.2

## 0.24.1

### Patch Changes

- @voyant-travel/workflows@0.24.1

## 0.24.0

### Patch Changes

- @voyant-travel/workflows@0.24.0

## 0.23.0

### Patch Changes

- @voyant-travel/workflows@0.23.0

## 0.22.0

### Patch Changes

- @voyant-travel/workflows@0.22.0

## 0.21.1

### Patch Changes

- @voyant-travel/workflows@0.21.1

## 0.21.0

### Patch Changes

- @voyant-travel/workflows@0.21.0

## 0.20.0

### Patch Changes

- @voyant-travel/workflows@0.20.0

## 0.19.0

### Patch Changes

- @voyant-travel/workflows@0.19.0

## 0.18.0

### Patch Changes

- @voyant-travel/workflows@0.18.0

## 0.17.0

### Patch Changes

- Updated dependencies [66d722d]
  - @voyant-travel/workflows@0.17.0

## 0.16.0

### Patch Changes

- @voyant-travel/workflows@0.16.0

## 0.15.0

### Patch Changes

- @voyant-travel/workflows@0.15.0

## 0.14.0

### Patch Changes

- @voyant-travel/workflows@0.14.0

## 0.13.0

### Patch Changes

- @voyant-travel/workflows@0.13.0

## 0.12.0

### Patch Changes

- @voyant-travel/workflows@0.12.0

## 0.11.0

### Patch Changes

- @voyant-travel/workflows@0.11.0

## 0.10.0

### Patch Changes

- @voyant-travel/workflows@0.10.0

## 0.9.0

### Patch Changes

- @voyant-travel/workflows@0.9.0

## 0.8.0

### Patch Changes

- @voyant-travel/workflows@0.8.0

## 0.7.0

### Patch Changes

- @voyant-travel/workflows@0.7.0

## 0.6.9

### Patch Changes

- @voyant-travel/workflows@0.6.9
