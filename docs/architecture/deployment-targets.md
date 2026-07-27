# Deployment Targets

Which runtime each Voyant application class runs on, and why. The short version:
**the unified composed application deployment graph is Node-only.** Cloudflare
Workers may still host separate edge-native storefront or federated
applications, but Workers are not a target adapter for that unified graph.

## Node is the first-class target for the operator

A fully composed operator API **cannot stay resident on Cloudflare Workers for
Platforms**. The evaluated composition heap — route trees, drizzle/zod graphs,
module registries — is evicted at zero idle in every container (request
isolates, slim dedicated workers, and Durable Objects all fail; only small heaps
like the lean-auth path are reused). Every request then pays multi-second graph
evaluation.

Measured, in production: warm handler **1–2 ms** on Node (Cloud Run, resident
process) vs **4–6 s/request** on Workers for Platforms. Full evidence chain:
voyant-travel/platform#935 (RFC + probe ladder, voyant#2915/#2925/#2926/#2941/
#2944/#2945) and the pilot on pro-travel (protravel-ro/protravel#391, Node
residency confirmed). Decision: voyant#2966.

The months of workerd-accommodation work (SSR lazy-loading, vendor-chunk
surgery, code-splitting constraints, `pg` stubs, `require` shims, per-isolate
memoization) was rent paid to a runtime that structurally cannot host this
workload class well. On Node none of it is necessary.

### How the operator runs on Node

- **Entry:** `starters/operator/src/server.ts` is a generic bootstrap for
  `@voyant-travel/runtime`. The package loads the admitted generated
  graph, links, access catalog, workflow graph, schedules, and provider plan;
  owns API/auth dispatch, admin SSR/static hosting, `waitUntil`, scheduled
  workflow execution, origin trust, and graceful shutdown; and serves the
  client build from `dist/client`. Product composition and package-specific
  services must not return to the starter entry.
- **Managed Cloud entry:** `@voyant-travel/framework/node-runtime` boots the
  admitted generated graph with provisioned environment and secrets. Cloud does
  not synthesize or load a serialized product profile; the same graph-native
  Node entry serves managed-cloud, self-hosted, and local deployment modes.
  Storefront/site artifacts remain separate apps that consume the Node API.
- **Bindings are real Node providers, not Cloudflare emulation.** The resolved
  deployment graph's `deployment.providers` map selects the concrete Node
  providers. `memory` uses in-process KV/object storage, `redis`/`postgres`
  back selected KV and rate-limit stores, `filesystem` writes objects under
  `STORAGE_FILESYSTEM_ROOT`, and `s3-compatible` uses AWS SDK v3
  for AWS S3 or compatible services. `custom` resolves the selected
  `storage.object` provider factory from an adapter package. Env vars configure
  the graph-selected provider; their mere presence must not change provider
  choice. There is no `caches.default` shim (the public-cache middleware reads
  `env.CACHE` directly).
- **Build:** `pnpm --filter operator build` (Vite, no `@cloudflare/vite-plugin`)
  emits `dist/client` + `dist/server/server.js`. **Run:** `pnpm --filter operator
  start` (`node dist/server/server.js`).
- **Docker target:** `starters/operator/Dockerfile` is the reference
  self-hosted Node image. Its build stage must call `pnpm --filter operator
  build`, not raw Vite, so graph freshness and graph artifact copying stay on
  the same path as local build. The runtime image boots `dist/server/server.js`,
  which validates the graph artifacts and required graph resource env before
  serving traffic.
- **Graph contract:** `pnpm --filter operator dev`, `pnpm --filter operator
  db:migrate`, and standalone Node boot all load the generated deployment graph
  artifacts and fail before serving traffic or touching the database when
  graph-declared required resource env or graph-selected provider env is
  missing. Local `.env` loading is only a source for satisfying the same graph
  contract; it is not a parallel deployment shape.
- **Cloud export:** a managed deployment exits through a validated
  `voyant.self-host-export-bundle.v2` containing its admitted resolved graph and
  data manifests. The framework projects that same graph to self-hosted
  `deployment.providers`; an external generator consumes the projection and
  `STANDARD_NODE_STARTER`. It does not boot a profile snapshot or select a
  second product composition. See
  [Exporting From Voyant Cloud](../exporting-from-voyant-cloud.md).
- **Reusable host contract:** `@voyant-travel/framework/node-host` owns graph
  artifact admission and graph-selected provider planning, while
  `@voyant-travel/runtime` owns the complete resident application host.
  An application keeps only the generic server bootstrap and explicit project
  customization inputs.
- **Database:** the pooled node-postgres lane (`DATABASE_URL_DIRECT`, `adapter:
  "node"`) is the production default — one resident pool per process. neon-http/WS
  remain the fallback adapters. See
  [performance-enterprise-scale-assessment.md](./performance-enterprise-scale-assessment.md)
  §2.6.
  The canonical graph `DATABASE_URL` requirement accepts `DATABASE_URL_DIRECT`
  as a compatible alias, so either value satisfies pre-boot validation. The
  graph also verifies Postgres/Redis connection URLs and selected object-storage
  requirements before boot.
- **Crons:** declared runtime-neutrally by selected package manifests. On Node
  they can't run on a timer inside the process, so deployment tooling consumes
  the admitted graph and fans them out to Cloud Scheduler jobs that POST
  `/__voyant/scheduled?schedule=<stable-id>` with the
  origin-trust header. During rollout the emitted URL also carries `cron` as a
  compatibility fallback for older runtimes.
- **CI:** the `node-smoke` job builds the operator, boots it under Node, and
  asserts `/healthz`, API dispatch, and a TanStack SSR page. `/healthz` is only
  a liveness signal; packaged-starter acceptance gates the complete server
  graph.

## Workers host separate edge applications

These surfaces can still be deployed as independent Worker applications:

- storefronts, small/public cacheable surfaces, demo deployments, UI shells;
- future edge-native, per-domain applications, if their graphs are proven small
  enough to remain resident. This is not the current federated operating mode
  and Voyant ships no federated Worker starter (see
  [federated-operating-mode.md](./federated-operating-mode.md)).

They do not consume or statically compose the unified application deployment
graph. A `cloudflare-worker` target must not be offered by its CLI target
adapters.

**Known limitation for composed operator APIs on Workers:** no isolate residency
→ a per-request composition toll (multi-second graph evaluation). This is a
structural property of the runtime for this workload, not a bug for app authors
to fix. Do not accept further framework complexity whose only purpose is workerd
accommodation for composed apps.

## Keep the app entry lazy

Even on Node the app entry (`src/entry.ts`) keeps SSR behind a lazy import: the
`@tanstack/react-start/server` graph (React + `react-dom/server`, ~2.2 MB) is
imported on first render, not at module top level, which keeps boot fast. Heavy
API and workflow graphs stay lazy for the same reason.

Prefer:

- cache a dynamic `import("./api/app")` inside the `/api/*` branch;
- keep the start handler in `./ssr-handler` and load it with `lazySsr(() =>
  import("./ssr-handler"))`;
- route scheduled events by cron string, then dynamic-import the matching job.

Avoid:

- `import { app as apiApp } from "./api/app"`;
- `import { createStartHandler } from "@tanstack/react-start/server"` in `entry.ts`;
- `import "./workflows.js"`.

The mechanical checks live in `scripts/check-node-entrypoint.mjs`,
`scripts/check-generic-node-bootstrap-authority.mjs`, and
`scripts/check-operator-docker-target.mjs` and are part of
`pnpm verify:architecture`: they assert `src/server.ts` wires `createNodeServer`
and graph artifact/resource validation, that `pnpm --filter operator dev` and
`pnpm --filter operator db:migrate` preflight graph resource env, that the Docker
target consumes the graph-checked build artifacts, and that the app entry keeps
those graphs lazy. The Node entrypoint check also asserts provider bindings are
selected from `deployment.providers`, so adding Redis, database, or object-store
credentials cannot silently alter runtime providers unless the graph selects
those providers.

## Stop-the-bleed policy

New performance work whose target is workerd residency for **composed** apps is
declined by default — that runtime structurally cannot host the workload well, so
the effort has no ceiling worth paying. Direct that effort at Node-lane boot time
instead (staged composition, compile caching). This does not touch the supported
Workers surfaces above, whose graphs are small by construction.
