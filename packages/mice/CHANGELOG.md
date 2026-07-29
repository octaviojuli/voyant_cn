# @voyant-travel/mice

## 0.19.0

### Patch Changes

- Updated dependencies [89fe90a]
  - @voyant-travel/operations@0.8.1
  - @voyant-travel/quotes@0.130.1
  - @voyant-travel/bookings@0.163.0
  - @voyant-travel/distribution@0.153.0
  - @voyant-travel/accommodations@0.123.0
  - @voyant-travel/relationships@0.127.1

## 0.18.0

### Minor Changes

- 8f0fa26: Make Hono the explicit sole server API runtime while moving package and
  deployment interfaces to role-based API vocabulary. Replace Hono-prefixed module,
  extension, bundle, lazy-route, and factory names with `Api*` names; move
  router-named domain runtime entry points to `./api-runtime`; and remove the old
  names without compatibility aliases.

### Patch Changes

- Updated dependencies [8f0fa26]
  - @voyant-travel/accommodations@0.122.0
  - @voyant-travel/bookings@0.162.0
  - @voyant-travel/distribution@0.152.0
  - @voyant-travel/hono@0.128.0
  - @voyant-travel/operations@0.8.0
  - @voyant-travel/quotes@0.130.0
  - @voyant-travel/relationships@0.127.0
  - @voyant-travel/db@0.114.8

## 0.17.0

### Patch Changes

- Updated dependencies [a1842a7]
  - @voyant-travel/hono@0.127.2
  - @voyant-travel/bookings@0.161.0
  - @voyant-travel/distribution@0.151.0
  - @voyant-travel/accommodations@0.121.0
  - @voyant-travel/relationships@0.126.1
  - @voyant-travel/operations@0.7.1
  - @voyant-travel/quotes@0.129.1

## 0.16.0

### Minor Changes

- 4f66e89: Add guarded MCP Tools for the MICE program lifecycle.

### Patch Changes

- Updated dependencies [5617f37]
- Updated dependencies [cabf662]
- Updated dependencies [701ccc4]
- Updated dependencies [5f15e2e]
- Updated dependencies [372f4f4]
- Updated dependencies [6c8d46a]
- Updated dependencies [b8cef4c]
- Updated dependencies [db5adce]
- Updated dependencies [90e8d6d]
- Updated dependencies [f819273]
- Updated dependencies [bf19d5a]
- Updated dependencies [c9b6144]
- Updated dependencies [6604f9e]
- Updated dependencies [ff87f68]
  - @voyant-travel/accommodations@0.120.0
  - @voyant-travel/core@0.124.0
  - @voyant-travel/tools@0.3.0
  - @voyant-travel/bookings@0.160.0
  - @voyant-travel/operations@0.7.0
  - @voyant-travel/quotes@0.129.0
  - @voyant-travel/distribution@0.150.0
  - @voyant-travel/relationships@0.126.0
  - @voyant-travel/db@0.114.7
  - @voyant-travel/hono@0.127.1

## 0.15.0

### Patch Changes

- Updated dependencies [7e9f77a]
- Updated dependencies [49f55d0]
- Updated dependencies [552acbf]
- Updated dependencies [9c85101]
  - @voyant-travel/core@0.123.0
  - @voyant-travel/hono@0.127.0
  - @voyant-travel/bookings@0.159.0
  - @voyant-travel/operations@0.6.14
  - @voyant-travel/accommodations@0.119.0
  - @voyant-travel/db@0.114.6
  - @voyant-travel/distribution@0.149.0
  - @voyant-travel/quotes@0.128.8
  - @voyant-travel/relationships@0.125.4

## 0.14.0

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
  - @voyant-travel/bookings@0.158.0
  - @voyant-travel/accommodations@0.118.0
  - @voyant-travel/core@0.122.2
  - @voyant-travel/db@0.114.5
  - @voyant-travel/distribution@0.148.0
  - @voyant-travel/operations@0.6.13
  - @voyant-travel/quotes@0.128.7
  - @voyant-travel/relationships@0.125.3

## 0.13.0

### Patch Changes

- @voyant-travel/bookings@0.157.0
- @voyant-travel/distribution@0.147.0
- @voyant-travel/accommodations@0.117.0
- @voyant-travel/operations@0.6.12
- @voyant-travel/quotes@0.128.6
- @voyant-travel/relationships@0.125.2

## 0.12.1

### Patch Changes

- 8d62a7c: Republish every affected TypeScript package without broken declaration maps so the corrected artifact
  policy reaches npm instead of applying only to future incidental package releases.
- Updated dependencies [8d62a7c]
- Updated dependencies [8d62a7c]
  - @voyant-travel/core@0.122.1
  - @voyant-travel/db@0.114.4
  - @voyant-travel/accommodations@0.116.1
  - @voyant-travel/bookings@0.156.1
  - @voyant-travel/distribution@0.146.1
  - @voyant-travel/hono@0.126.3
  - @voyant-travel/operations@0.6.11
  - @voyant-travel/quotes@0.128.5
  - @voyant-travel/relationships@0.125.1

## 0.12.0

### Patch Changes

- Updated dependencies [bbe6396]
  - @voyant-travel/bookings@0.156.0
  - @voyant-travel/relationships@0.125.0
  - @voyant-travel/distribution@0.146.0
  - @voyant-travel/accommodations@0.116.0
  - @voyant-travel/quotes@0.128.4
  - @voyant-travel/db@0.114.3
  - @voyant-travel/operations@0.6.10

## 0.11.1

### Patch Changes

- Updated dependencies [cc85042]
- Updated dependencies [07a6ee3]
  - @voyant-travel/core@0.122.0
  - @voyant-travel/bookings@0.155.1
  - @voyant-travel/db@0.114.2
  - @voyant-travel/hono@0.126.2
  - @voyant-travel/distribution@0.145.1
  - @voyant-travel/accommodations@0.115.1
  - @voyant-travel/operations@0.6.9
  - @voyant-travel/quotes@0.128.3
  - @voyant-travel/relationships@0.124.4

## 0.11.0

### Patch Changes

- Updated dependencies [3f6694b]
  - @voyant-travel/core@0.121.0
  - @voyant-travel/accommodations@0.115.0
  - @voyant-travel/bookings@0.155.0
  - @voyant-travel/db@0.114.1
  - @voyant-travel/distribution@0.145.0
  - @voyant-travel/hono@0.126.1
  - @voyant-travel/operations@0.6.8
  - @voyant-travel/quotes@0.128.2
  - @voyant-travel/relationships@0.124.3

## 0.10.0

### Patch Changes

- Updated dependencies [4d0eeed]
- Updated dependencies [bef5b7c]
  - @voyant-travel/hono@0.126.0
  - @voyant-travel/db@0.114.0
  - @voyant-travel/core@0.120.0
  - @voyant-travel/accommodations@0.114.0
  - @voyant-travel/bookings@0.154.0
  - @voyant-travel/distribution@0.144.0
  - @voyant-travel/operations@0.6.7
  - @voyant-travel/quotes@0.128.1
  - @voyant-travel/relationships@0.124.2

## 0.9.0

### Minor Changes

- 047c3f9: Move Quotes, proposal, quote-version snapshot, and MICE graph runtime assembly behind package-owned typed ports and factories.

### Patch Changes

- 490d132: Move the final Operator runtime-port registrations into package-owned contributor surfaces.
- 490d132: Move capability-derived Node runtime binding assembly into package-owned contributors.
- 490d132: Move standard cross-package links from the operator starter to package-owned
  manifests and explicit standard-product selections, and generate executable
  links from the selected deployment graph.
- 490d132: Move standard first-party admin factories, package copy, slots, contributions, and icons into selected deployment graph composition.
- 490d132: Declare Action Ledger, Distribution, MICE, and Relationships OpenAPI documents in their package-owned deployment manifests and ship their committed admin contracts from the owning packages.
- 490d132: Declare package-owned runtime contributors in `voyant.package.v1` metadata and statically lower selected contributors into generated Node graph source. Node hosts now compose one generated contributor set from opaque host resources without enumerating first-party factories or package IDs.
- c65b05c: Move standard cross-package link tables and the person directory view into
  upgrade-safe package migration histories, use stable package ledger identities,
  and remove aggregate Drizzle and migration authority from the Operator starter.
- 490d132: Compose package runtimes from generic Node primitives and typed graph ports instead of Operator capability wiring.
- Updated dependencies [047c3f9]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [c65b05c]
- Updated dependencies [c65b05c]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [047c3f9]
- Updated dependencies [c65b05c]
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
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [c65b05c]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [047c3f9]
- Updated dependencies [cda53b6]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [047c3f9]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [282892e]
- Updated dependencies [490d132]
  - @voyant-travel/bookings@0.153.0
  - @voyant-travel/distribution@0.143.0
  - @voyant-travel/relationships@0.124.1
  - @voyant-travel/quotes@0.128.0
  - @voyant-travel/db@0.113.0
  - @voyant-travel/accommodations@0.113.0
  - @voyant-travel/core@0.119.0
  - @voyant-travel/operations@0.6.6
  - @voyant-travel/hono@0.125.1

## 0.8.0

### Minor Changes

- c54cd3d: Declare the package-owned MICE admin factory as a selected-graph runtime while
  preserving its existing routes, destinations, localized navigation, icon, and
  selection behavior.

### Patch Changes

- Updated dependencies [8f4c242]
- Updated dependencies [d771be3]
- Updated dependencies [8f537b0]
- Updated dependencies [d26a820]
- Updated dependencies [d771be3]
- Updated dependencies [bd7a830]
  - @voyant-travel/core@0.118.0
  - @voyant-travel/accommodations@0.112.5
  - @voyant-travel/hono@0.125.0
  - @voyant-travel/operations@0.6.5
  - @voyant-travel/db@0.112.2

## 0.7.4

### Patch Changes

- Updated dependencies [c66f9a5]
  - @voyant-travel/core@0.117.0
  - @voyant-travel/accommodations@0.112.4
  - @voyant-travel/db@0.112.1
  - @voyant-travel/hono@0.124.1
  - @voyant-travel/operations@0.6.4

## 0.7.3

### Patch Changes

- Updated dependencies [ca90eb5]
  - @voyant-travel/db@0.112.0
  - @voyant-travel/hono@0.124.0
  - @voyant-travel/accommodations@0.112.3
  - @voyant-travel/operations@0.6.3

## 0.7.2

### Patch Changes

- Updated dependencies [8576451]
  - @voyant-travel/core@0.116.0
  - @voyant-travel/accommodations@0.112.2
  - @voyant-travel/db@0.111.2
  - @voyant-travel/hono@0.123.2
  - @voyant-travel/operations@0.6.2

## 0.7.1

### Patch Changes

- e4e6621: Model package-owned Hono extensions as first-class deployment graph units while keeping externally distributed integrations in the plugin lane.
- Updated dependencies [e4e6621]
- Updated dependencies [953e418]
- Updated dependencies [2153e48]
  - @voyant-travel/core@0.115.0
  - @voyant-travel/accommodations@0.112.1
  - @voyant-travel/hono@0.123.0
  - @voyant-travel/db@0.111.1
  - @voyant-travel/operations@0.6.1

## 0.7.0

### Minor Changes

- a370024: Publish package-owned deployment manifests for booking requirements and the
  bookings, distribution, MICE, and quotes extension surfaces.
- e3dc5a9: Declare package-owned admin route and copy facets for vertical modules with existing public admin extensions.
- e3dc5a9: Declare package-owned Node deployment facets for product events, subscribers, workflows, access resources, tools, actions, and retain-data lifecycle behavior.

### Patch Changes

- a370024: Correct package-owned API mounts and runtime references for distribution, MICE,
  workflow runs, and flights deployment manifests.
- Updated dependencies [a370024]
- Updated dependencies [e3dc5a9]
- Updated dependencies [e3dc5a9]
- Updated dependencies [e3dc5a9]
- Updated dependencies [a370024]
- Updated dependencies [a370024]
- Updated dependencies [e3dc5a9]
- Updated dependencies [e3dc5a9]
- Updated dependencies [a370024]
- Updated dependencies [a370024]
- Updated dependencies [e3dc5a9]
- Updated dependencies [a370024]
- Updated dependencies [e3dc5a9]
- Updated dependencies [a370024]
- Updated dependencies [e3dc5a9]
- Updated dependencies [e3dc5a9]
- Updated dependencies [e3dc5a9]
  - @voyant-travel/core@0.114.0
  - @voyant-travel/accommodations@0.112.0
  - @voyant-travel/db@0.111.0
  - @voyant-travel/operations@0.6.0
  - @voyant-travel/hono@0.122.4

## 0.6.10

### Patch Changes

- Updated dependencies [496f2ef]
  - @voyant-travel/core@0.113.0
  - @voyant-travel/accommodations@0.111.6
  - @voyant-travel/db@0.110.2
  - @voyant-travel/hono@0.122.3
  - @voyant-travel/operations@0.5.23

## 0.6.9

### Patch Changes

- 5e1d221: Publish `voyant.package.v1` compatibility metadata from first-party
  schema-owning packages so deployment graph package admission can validate their
  framework, target, and deployment-mode compatibility before runtime imports.
- Updated dependencies [5e1d221]
- Updated dependencies [682d7d0]
  - @voyant-travel/accommodations@0.111.5
  - @voyant-travel/db@0.110.1
  - @voyant-travel/operations@0.5.22
  - @voyant-travel/hono@0.122.2

## 0.6.8

### Patch Changes

- Updated dependencies [4829ef3]
  - @voyant-travel/accommodations@0.111.0
  - @voyant-travel/operations@0.5.17

## 0.6.7

### Patch Changes

- Updated dependencies [ba6c30a]
  - @voyant-travel/accommodations@0.110.0
  - @voyant-travel/operations@0.5.16

## 0.6.6

### Patch Changes

- Updated dependencies [425f92e]
  - @voyant-travel/db@0.110.0
  - @voyant-travel/hono@0.122.0
  - @voyant-travel/core@0.112.3
  - @voyant-travel/accommodations@0.109.11
  - @voyant-travel/operations@0.5.15

## 0.6.5

### Patch Changes

- 2453207: Validate configured MICE delegate person references during create and update, while allowing omitted or cleared person links.
- 922d0fd: Preserve omitted enum fields on MICE update payloads instead of applying create-time defaults.
- f000bb3: Reject MICE program create and update payloads whose end date is before the start date.
- 28c59ea: Emit a `mice.rfp.awarded` domain event after a MICE RFP award succeeds, and clarify that downstream booking, room-block, and contract artifact creation belongs to deployment-level subscribers.
- Updated dependencies [c9a356f]
- Updated dependencies [6474f42]
- Updated dependencies [5786f63]
  - @voyant-travel/core@0.112.0
  - @voyant-travel/hono@0.121.0
  - @voyant-travel/operations@0.5.10
  - @voyant-travel/accommodations@0.109.5
  - @voyant-travel/db@0.109.5

## 0.6.4

### Patch Changes

- Updated dependencies [1cb9cba]
- Updated dependencies [131ff9b]
- Updated dependencies [f1090b7]
- Updated dependencies [42f662c]
- Updated dependencies [fead555]
  - @voyant-travel/hono@0.120.0
  - @voyant-travel/operations@0.5.9
  - @voyant-travel/accommodations@0.109.4

## 0.6.3

### Patch Changes

- Updated dependencies [86fbb05]
  - @voyant-travel/hono@0.119.0
  - @voyant-travel/accommodations@0.109.3
  - @voyant-travel/operations@0.5.8

## 0.6.2

### Patch Changes

- Updated dependencies [6d3e0a5]
  - @voyant-travel/accommodations@0.109.0

## 0.6.1

### Patch Changes

- Updated dependencies [9a1197b]
  - @voyant-travel/hono@0.118.0
  - @voyant-travel/accommodations@0.108.3
  - @voyant-travel/operations@0.5.3

## 0.6.0

### Minor Changes

- ed31e95: MICE Programs — create and edit a program (the list was previously a dead end).

  `@voyant-travel/mice`: `updateProgramSchema` now accepts `null` on the optional
  fields (destination, dates, pax, currency, budget, code, org/contact refs) so a
  PATCH can **clear** them — `.partial()` alone only allowed omitting a key, which
  left the previous value in place. The columns are already nullable and
  `updateProgram` spreads the body into `.set()`, so no migration is needed.

  `@voyant-travel/mice-react`:

  - New `ProgramFormDialog` (`./ui`): a create/edit form covering name, type,
    lifecycle status, destination, dates, estimated/confirmed pax, currency, and
    budget. Pax/budget are validated as non-negative numbers; the dialog resets
    on close.
  - `ProgramsPage` now always shows a **New program** button wired to the dialog,
    and lands the operator straight in the new program's detail on create — so
    the agenda / delegates / sourcing surfaces are reachable. (The button used to
    render only when the host passed an `onCreate` callback, which it never did,
    leaving the list with no way to create anything.)
  - `ProgramDetailPage` gains an **Edit** action (same dialog) so the lifecycle
    status, pax, dates, and budget are operable after creation, plus a
    dates · pax meta line in the header.

## 0.5.2

### Patch Changes

- Updated dependencies [7c5ee80]
  - @voyant-travel/hono@0.117.0
  - @voyant-travel/accommodations@0.108.2
  - @voyant-travel/operations@0.5.2

## 0.5.1

### Patch Changes

- 12a1eb2: Expose client-safe subpaths for validation schemas, linkable metadata, template authoring metadata, finance payment-policy primitives, and Hono reporter utilities. Move browser-facing React/operator imports off mixed runtime barrels so client bundles do not pull Hono request context or other server-only runtime code.
- Updated dependencies [12a1eb2]
  - @voyant-travel/accommodations@0.108.1
  - @voyant-travel/hono@0.116.2
  - @voyant-travel/operations@0.5.1

## 0.5.0

### Minor Changes

- 4ad1bf7: Consolidated commercials — program cost sheet / P&L (Phase 5).

  `getProgramCostSheet` aggregates the program's committed inventory into a P&L —
  room blocks (accommodations), space blocks (operations), and session inclusions
  (mice) — reporting contracted exposure (held × net), realized cost/sell (picked
  × net/sell), and program margin + margin %. No new spine tables (RFC §7): a
  read model over what Phases 1–4 already persist. Exposed at
  `GET /v1/admin/mice/programs/:id/cost-sheet`.

  Follow-ups (not blocking): master/split billing via bookingDistributionDetails.
  paymentOwner, attrition invoicing, and the mice.rfp.awarded auto-spawn workflow.

## 0.4.0

### Minor Changes

- 722455d: RFP → bid → award sourcing funnel (Phase 4).

  - mice: `mice_rfps` + `mice_rfp_invitations` + `mice_bids` + `mice_bid_lines` +
    `mice_bid_evaluations` — multi-supplier bid solicitation, comparison, and
    scoring (the gap CRM quote/opportunity didn't cover). `awardRfp` atomically
    accepts the winning bid, rejects the rest, and moves the RFP to `awarded`.
    Service + admin routes + rfp/bid linkables; supplier-FK refs handled.
  - schema-kit: TypeID prefixes mrfp/mrfi/mbid/mbln/mbev.
  - Deployment link: bid↔supplier.

  Follow-up (workflow): the `mice.rfp.awarded` subscriber that auto-spawns the
  legal contract + provisional room block + booking is operator-side automation,
  deferred to a workflow PR.

### Patch Changes

- @voyant-travel/db@0.109.4

## 0.3.0

### Minor Changes

- 06cfcf5: Delegate registry + rooming manifest + booking extension (Phase 3).

  - mice: `mice_program_delegates` (role + lifecycle status; PII stays on the
    linked CRM person/booking per §9-Q7) + `mice_delegate_session_enrollments`
    (idempotent per delegate+session); first-class rooming manifest
    (`mice_rooming_assignments` + `mice_rooming_assignment_delegates` join for
    shared rooms, §9-Q5); `booking_mice_details` HonoExtension on bookings.
    Services + admin routes + delegate/rooming linkables. FK refs validated
    up-front (4xx, not FK 500).
  - schema-kit: TypeID prefixes mpdl/mdse/mrma/mrad/bkmd.
  - Deployment links: delegate↔person, delegate↔booking, rooming↔roomBlock.

### Patch Changes

- @voyant-travel/db@0.109.3

## 0.2.0

### Minor Changes

- 924d201: Room-block allotment (Phase 1) + MICE program spine.

  - accommodations: `room_blocks` / `room_block_nights` / `room_block_pickups` with
    per-night counters, CHECK invariants, an append-only pickup ledger, and a
    transactional pickup/reversal/cutoff-release service; first
    `accommodationsHonoModule` (registered in the framework standard set) +
    `roomBlockLinkable`.
  - operations: `property` / `facility` linkable definitions.
  - mice (new): `mice_programs` umbrella + admin routes + `programLinkable`,
    mounted operator-local.
  - schema-kit: TypeID prefixes `hrbn` / `hrbp` / `prog`.

- f311826: Function spaces + capacity-by-layout (operations) and agenda sessions (mice) — Phase 2.

  - operations: `function_spaces` (venue sub-spaces, nestable via `parentSpaceId`
    for combinable rooms / exhibition booths) + `function_space_capacities`
    (per-layout headcount: theater / classroom / banquet / cabaret / boardroom /
    u_shape / reception / hollow_square); service + admin routes + `functionSpaceLinkable`.
  - mice: `mice_program_sessions` (timed, capacity-bound agenda items with
    session type + optional function-space link) + `mice_session_inclusions`
    (F&B / AV / materials / signage); service + admin routes + `sessionLinkable`.
  - schema-kit: TypeID prefixes `fnsp` / `fnsc` / `mpss` / `mssi`.

### Patch Changes

- @voyant-travel/db@0.109.1
