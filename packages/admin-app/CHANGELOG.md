# @voyant-travel/admin-app

## 0.55.0

### Patch Changes

- Updated dependencies [115b00b]
- Updated dependencies [192a635]
- Updated dependencies [37fac2f]
  - @voyant-travel/inventory-react@0.45.0
  - @voyant-travel/commerce-react@0.45.0
  - @voyant-travel/distribution-react@0.153.0
  - @voyant-travel/finance-react@0.163.0
  - @voyant-travel/admin@0.126.1
  - @voyant-travel/auth-react@0.132.2

## 0.54.0

### Patch Changes

- @voyant-travel/commerce-react@0.44.0
- @voyant-travel/distribution-react@0.152.0
- @voyant-travel/finance-react@0.162.0
- @voyant-travel/inventory-react@0.44.0
- @voyant-travel/auth-react@0.132.1

## 0.53.0

### Patch Changes

- Updated dependencies [c1e37f2]
  - @voyant-travel/admin@0.126.0
  - @voyant-travel/auth-react@0.132.0
  - @voyant-travel/commerce-react@0.43.0
  - @voyant-travel/distribution-react@0.151.0
  - @voyant-travel/finance-react@0.161.0
  - @voyant-travel/inventory-react@0.43.0

## 0.52.0

### Patch Changes

- @voyant-travel/finance-react@0.160.0
- @voyant-travel/inventory-react@0.42.0
- @voyant-travel/auth-react@0.131.0
- @voyant-travel/commerce-react@0.42.0
- @voyant-travel/distribution-react@0.150.0

## 0.51.0

### Minor Changes

- 6147b93: Add a package-owned `/settings/team` surface backed by a graph-selected,
  provider-neutral team-management runtime port. Better Auth and Voyant Cloud now
  adapt roster, invitation, role, deactivation, capability, and nullable activity
  data behind the same server-enforced contract. Move the team route, page, copy,
  and icon from the admin shell into Auth and Auth React.

### Patch Changes

- 7e9f77a: Add organization defaults and member overrides for stable admin navigation IDs. Apply visibility
  after selected navigation composition without exposing ineligible routes, inherit hidden parent
  state through navigation subtrees, and retain structural parents only when a child is explicitly
  re-enabled. Ship the persistence, admin API, provisioning seam, and settings UI in standard Operator
  deployments, with duplicate settings contributions normalized at the host and core boundaries.
- b459761: Accept current Lucide releases in public peer ranges so the standard Operator package closure
  resolves for external npm consumers.
- Updated dependencies [766d24b]
- Updated dependencies [7e9f77a]
- Updated dependencies [82ffd12]
- Updated dependencies [6147b93]
- Updated dependencies [b459761]
  - @voyant-travel/ui@0.109.2
  - @voyant-travel/distribution-react@0.149.0
  - @voyant-travel/inventory-react@0.41.0
  - @voyant-travel/admin@0.125.0
  - @voyant-travel/auth-react@0.130.0
  - @voyant-travel/commerce-react@0.41.0
  - @voyant-travel/finance-react@0.159.0

## 0.50.0

### Patch Changes

- Updated dependencies [73ab096]
  - @voyant-travel/admin@0.124.0
  - @voyant-travel/auth-react@0.129.0
  - @voyant-travel/distribution-react@0.148.0
  - @voyant-travel/finance-react@0.158.0
  - @voyant-travel/commerce-react@0.40.0
  - @voyant-travel/inventory-react@0.40.0
  - @voyant-travel/types@0.109.2

## 0.49.0

### Patch Changes

- @voyant-travel/inventory-react@0.39.0
- @voyant-travel/distribution-react@0.147.0
- @voyant-travel/finance-react@0.157.0
- @voyant-travel/commerce-react@0.39.0

## 0.48.1

### Patch Changes

- 8d62a7c: Republish every affected TypeScript package without broken declaration maps so the corrected artifact
  policy reaches npm instead of applying only to future incidental package releases.
- Updated dependencies [8d62a7c]
- Updated dependencies [8d62a7c]
  - @voyant-travel/commerce-react@0.38.1
  - @voyant-travel/types@0.109.1
  - @voyant-travel/admin@0.123.3
  - @voyant-travel/auth-react@0.128.3
  - @voyant-travel/distribution-react@0.146.1
  - @voyant-travel/finance-react@0.156.1
  - @voyant-travel/inventory-react@0.38.1
  - @voyant-travel/react@0.104.2
  - @voyant-travel/ui@0.109.1

## 0.48.0

### Patch Changes

- Updated dependencies [bbe6396]
  - @voyant-travel/finance-react@0.156.0
  - @voyant-travel/inventory-react@0.38.0
  - @voyant-travel/distribution-react@0.146.0
  - @voyant-travel/admin@0.123.2
  - @voyant-travel/auth-react@0.128.2
  - @voyant-travel/commerce-react@0.38.0

## 0.47.0

### Patch Changes

- @voyant-travel/auth-react@0.128.0
- @voyant-travel/inventory-react@0.37.0
- @voyant-travel/distribution-react@0.145.0
- @voyant-travel/finance-react@0.155.0
- @voyant-travel/commerce-react@0.37.0

## 0.46.0

### Patch Changes

- Updated dependencies [4d0eeed]
- Updated dependencies [8bd906f]
  - @voyant-travel/types@0.109.0
  - @voyant-travel/ui@0.109.0
  - @voyant-travel/admin@0.123.0
  - @voyant-travel/auth-react@0.127.0
  - @voyant-travel/commerce-react@0.36.0
  - @voyant-travel/distribution-react@0.144.0
  - @voyant-travel/finance-react@0.154.0
  - @voyant-travel/inventory-react@0.36.0

## 0.45.0

### Minor Changes

- 490d132: Remove the final snapshot-era managed-profile aliases from the admin and migration package surfaces. Admin hosts now consume `AdminAuthRuntime`, `getAdminApiUrl`, and `adminFetcher`; deployment migration collection is exposed as `collectDeploymentMigrationSources`.

### Patch Changes

- 490d132: Move built-in admin route message providers into route-owned contribution metadata and remove first-party package fallback knowledge from the generic admin host.
- 490d132: Move Operator Settings and Relationships admin presentation authority into selected package graph factories.
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [c65b05c]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
  - @voyant-travel/auth-react@0.126.0
  - @voyant-travel/admin@0.122.0
  - @voyant-travel/commerce-react@0.35.0
  - @voyant-travel/distribution-react@0.143.0
  - @voyant-travel/finance-react@0.153.0
  - @voyant-travel/inventory-react@0.35.0
  - @voyant-travel/types@0.108.1

## 0.44.0

### Minor Changes

- d771be3: Compile selected graph access catalogs, make Bookings the first package-owned access authority, and
  wire exact-pair catalog validation through runtime authorization and permission editors.

### Patch Changes

- Updated dependencies [d771be3]
- Updated dependencies [d771be3]
  - @voyant-travel/types@0.108.0
  - @voyant-travel/auth-react@0.125.0
  - @voyant-travel/admin@0.121.0
  - @voyant-travel/commerce-react@0.34.0
  - @voyant-travel/distribution-react@0.142.0
  - @voyant-travel/finance-react@0.152.0
  - @voyant-travel/inventory-react@0.34.0

## 0.43.0

### Patch Changes

- @voyant-travel/commerce-react@0.33.0
- @voyant-travel/inventory-react@0.33.0
- @voyant-travel/finance-react@0.151.0
- @voyant-travel/distribution-react@0.141.0
- @voyant-travel/auth-react@0.124.1

## 0.42.0

### Patch Changes

- @voyant-travel/distribution-react@0.140.0
- @voyant-travel/finance-react@0.150.0
- @voyant-travel/commerce-react@0.32.0
- @voyant-travel/inventory-react@0.32.0

## 0.41.0

### Patch Changes

- Updated dependencies [a97e845]
  - @voyant-travel/admin@0.120.0
  - @voyant-travel/auth-react@0.124.0
  - @voyant-travel/commerce-react@0.31.0
  - @voyant-travel/distribution-react@0.139.0
  - @voyant-travel/finance-react@0.149.0
  - @voyant-travel/inventory-react@0.31.0

## 0.40.0

### Patch Changes

- Updated dependencies [8a665f3]
  - @voyant-travel/admin@0.119.0
  - @voyant-travel/auth-react@0.123.0
  - @voyant-travel/commerce-react@0.30.0
  - @voyant-travel/distribution-react@0.138.0
  - @voyant-travel/finance-react@0.148.0
  - @voyant-travel/inventory-react@0.30.0

## 0.39.0

### Patch Changes

- @voyant-travel/admin@0.118.0
- @voyant-travel/auth-react@0.122.0
- @voyant-travel/commerce-react@0.29.0
- @voyant-travel/distribution-react@0.137.0
- @voyant-travel/finance-react@0.147.0
- @voyant-travel/inventory-react@0.29.0

## 0.38.0

### Patch Changes

- Updated dependencies [ecdf0fc]
  - @voyant-travel/admin@0.117.0
  - @voyant-travel/auth-react@0.121.0
  - @voyant-travel/commerce-react@0.28.0
  - @voyant-travel/distribution-react@0.136.0
  - @voyant-travel/finance-react@0.146.0
  - @voyant-travel/inventory-react@0.28.0

## 0.37.0

### Minor Changes

- 45735e6: Add `@voyant-travel/admin-app/runtime` — the profile-agnostic client runtime
  glue for the managed-profile admin host (Phase 2 slice 1 of voyant#3044).

  - `managedProfileAdminFetcher` — the isomorphic Voyant fetcher (`createIsomorphicFn`
    over `defaultFetcher`): on the client it normalizes package-emitted admin paths
    and sends session cookies; on the server it forwards the request cookie and
    rewrites absolute URLs onto the request origin. The `.server(...)` branch is
    stripped from client bundles by the TanStack Start build.
  - `normalizeAdminApiUrl(url)` — rewrites package-emitted `/v1/<module>` paths onto
    the `/v1/admin/<module>` surface (generic admin-surface logic).
  - `getManagedProfileAdminApiUrl()` — the same-origin `/api` base-URL helper.

  This lifts the operator starter's `lib/voyant-fetcher.ts` / `lib/env.ts` /
  `lib/operator-admin-api-paths.ts` into a package so the admin host is not
  starter-owned; the starter files become thin re-export shims (their existing
  export names are preserved, so consumers are unaffected). Naming is
  profile-agnostic (no "operator" in the package identifiers).

## 0.36.0

### Patch Changes

- @voyant-travel/distribution-react@0.135.0
- @voyant-travel/inventory-react@0.27.0
- @voyant-travel/finance-react@0.145.0
- @voyant-travel/commerce-react@0.27.0

## 0.35.0

### Patch Changes

- @voyant-travel/distribution-react@0.134.0
- @voyant-travel/finance-react@0.144.0
- @voyant-travel/commerce-react@0.26.0
- @voyant-travel/inventory-react@0.26.0

## 0.34.0

### Patch Changes

- @voyant-travel/commerce-react@0.25.0
- @voyant-travel/inventory-react@0.25.0
- @voyant-travel/ui@0.108.11
- @voyant-travel/distribution-react@0.133.0
- @voyant-travel/finance-react@0.143.0
- @voyant-travel/auth-react@0.120.2

## 0.33.0

### Patch Changes

- @voyant-travel/commerce-react@0.24.0
- @voyant-travel/distribution-react@0.132.0
- @voyant-travel/finance-react@0.142.0
- @voyant-travel/inventory-react@0.24.0

## 0.32.0

### Patch Changes

- @voyant-travel/inventory-react@0.23.0
- @voyant-travel/distribution-react@0.131.0
- @voyant-travel/finance-react@0.141.0
- @voyant-travel/commerce-react@0.23.0

## 0.31.0

### Patch Changes

- Updated dependencies [62e87ee]
  - @voyant-travel/admin@0.116.0
  - @voyant-travel/auth-react@0.120.0
  - @voyant-travel/commerce-react@0.22.0
  - @voyant-travel/distribution-react@0.130.0
  - @voyant-travel/finance-react@0.140.0
  - @voyant-travel/inventory-react@0.22.0

## 0.30.0

### Patch Changes

- Updated dependencies [7d4a405]
- Updated dependencies [2613dfb]
- Updated dependencies [a45a0d3]
- Updated dependencies [f3b8bef]
- Updated dependencies [fcad28b]
  - @voyant-travel/commerce-react@0.21.0
  - @voyant-travel/distribution-react@0.129.0
  - @voyant-travel/admin@0.115.4
  - @voyant-travel/auth-react@0.119.0
  - @voyant-travel/finance-react@0.139.0
  - @voyant-travel/inventory-react@0.21.0

## 0.29.0

### Patch Changes

- @voyant-travel/distribution-react@0.128.0
- @voyant-travel/commerce-react@0.20.0
- @voyant-travel/finance-react@0.138.0
- @voyant-travel/inventory-react@0.20.0

## 0.28.0

### Patch Changes

- @voyant-travel/commerce-react@0.19.0
- @voyant-travel/distribution-react@0.127.0
- @voyant-travel/finance-react@0.137.0
- @voyant-travel/inventory-react@0.19.0

## 0.27.0

### Patch Changes

- @voyant-travel/finance-react@0.136.0
- @voyant-travel/distribution-react@0.126.0
- @voyant-travel/inventory-react@0.18.0
- @voyant-travel/commerce-react@0.18.0

## 0.26.0

### Patch Changes

- @voyant-travel/finance-react@0.135.0
- @voyant-travel/distribution-react@0.125.0
- @voyant-travel/inventory-react@0.17.0
- @voyant-travel/commerce-react@0.17.0

## 0.25.0

### Patch Changes

- Updated dependencies [51f7dea]
- Updated dependencies [0a0a014]
  - @voyant-travel/commerce-react@0.16.0
  - @voyant-travel/distribution-react@0.124.0
  - @voyant-travel/finance-react@0.134.0
  - @voyant-travel/inventory-react@0.16.0
  - @voyant-travel/admin@0.115.1
  - @voyant-travel/auth-react@0.118.0

## 0.24.0

### Patch Changes

- Updated dependencies [4abf9a2]
  - @voyant-travel/admin@0.115.0
  - @voyant-travel/auth-react@0.117.0
  - @voyant-travel/commerce-react@0.15.0
  - @voyant-travel/distribution-react@0.123.0
  - @voyant-travel/finance-react@0.133.0
  - @voyant-travel/inventory-react@0.15.0
  - @voyant-travel/ui@0.108.1

## 0.23.0

### Patch Changes

- @voyant-travel/distribution-react@0.122.0
- @voyant-travel/inventory-react@0.14.0
- @voyant-travel/finance-react@0.132.0
- @voyant-travel/commerce-react@0.14.0

## 0.22.0

### Patch Changes

- @voyant-travel/finance-react@0.131.0
- @voyant-travel/distribution-react@0.121.0
- @voyant-travel/inventory-react@0.13.0
- @voyant-travel/commerce-react@0.13.0

## 0.21.0

### Patch Changes

- @voyant-travel/finance-react@0.130.0
- @voyant-travel/distribution-react@0.120.0
- @voyant-travel/inventory-react@0.12.0
- @voyant-travel/commerce-react@0.12.0

## 0.20.0

### Patch Changes

- @voyant-travel/distribution-react@0.119.0
- @voyant-travel/inventory-react@0.11.0
- @voyant-travel/finance-react@0.129.0
- @voyant-travel/commerce-react@0.11.0

## 0.19.0

### Patch Changes

- @voyant-travel/inventory-react@0.10.0
- @voyant-travel/commerce-react@0.10.0
- @voyant-travel/distribution-react@0.118.0
- @voyant-travel/finance-react@0.128.0

## 0.18.0

### Patch Changes

- @voyant-travel/finance-react@0.127.0
- @voyant-travel/distribution-react@0.117.0
- @voyant-travel/inventory-react@0.9.0
- @voyant-travel/commerce-react@0.9.0
- @voyant-travel/auth-react@0.116.1

## 0.17.0

### Patch Changes

- @voyant-travel/commerce-react@0.8.0
- @voyant-travel/distribution-react@0.116.0
- @voyant-travel/finance-react@0.126.0
- @voyant-travel/inventory-react@0.8.0

## 0.16.0

### Patch Changes

- Updated dependencies [a74471e]
  - @voyant-travel/ui@0.108.0
  - @voyant-travel/admin@0.114.0
  - @voyant-travel/auth-react@0.116.0
  - @voyant-travel/commerce-react@0.7.0
  - @voyant-travel/distribution-react@0.115.0
  - @voyant-travel/finance-react@0.125.0
  - @voyant-travel/inventory-react@0.7.0

## 0.15.0

### Patch Changes

- Updated dependencies [4f92198]
- Updated dependencies [4f92198]
  - @voyant-travel/finance-react@0.124.0
  - @voyant-travel/ui@0.107.0
  - @voyant-travel/admin@0.113.0
  - @voyant-travel/commerce-react@0.6.0
  - @voyant-travel/distribution-react@0.114.0
  - @voyant-travel/inventory-react@0.6.0
  - @voyant-travel/auth-react@0.115.0

## 0.14.0

### Patch Changes

- Updated dependencies [94890c3]
- Updated dependencies [cb9b04b]
  - @voyant-travel/admin@0.112.0
  - @voyant-travel/auth-react@0.114.0
  - @voyant-travel/commerce-react@0.5.0
  - @voyant-travel/distribution-react@0.113.0
  - @voyant-travel/finance-react@0.123.0
  - @voyant-travel/inventory-react@0.5.0

## 0.13.0

### Patch Changes

- @voyant-travel/finance-react@0.122.0
- @voyant-travel/inventory-react@0.4.0
- @voyant-travel/commerce-react@0.4.0
- @voyant-travel/distribution-react@0.112.0

## 0.12.0

### Patch Changes

- @voyant-travel/commerce-react@0.3.0
- @voyant-travel/finance-react@0.121.0
- @voyant-travel/inventory-react@0.3.0
- @voyant-travel/distribution-react@0.111.0

## 0.11.2

### Patch Changes

- ecec979: Improve operator bundle boundaries by adding route-local admin message provider support, exposing admin extension route helpers, keeping pending skeletons structural, and tightening Vite route ignores and vendor chunk splitting so heavy admin route dependencies stay out of the initial entry.
- Updated dependencies [ecec979]
  - @voyant-travel/admin@0.111.3
  - @voyant-travel/distribution-react@0.110.5
  - @voyant-travel/finance-react@0.120.2
  - @voyant-travel/inventory-react@0.2.2

## 0.11.1

### Patch Changes

- eef1a00: Republish notification and UI consumer packages so stale beta artifacts no longer reference legacy notification package specifiers.
- Updated dependencies [eef1a00]
  - @voyant-travel/admin@0.111.2
  - @voyant-travel/auth-react@0.113.5
  - @voyant-travel/commerce-react@0.2.1
  - @voyant-travel/distribution-react@0.110.4
  - @voyant-travel/finance-react@0.120.1
  - @voyant-travel/inventory-react@0.2.1

## 0.11.0

### Patch Changes

- dd71543: Move the packaged admin app shell into `@voyant-travel/admin/app/*` and keep
  `@voyant-travel/admin-app` as a compatibility shim over the new exports.
- 97d520c: Add the Commerce React owner package and retarget first-party UI wiring to the
  Commerce owner path.
- 85f9ce1: Move commercial React/admin source under the Commerce React owner path and
  remove the old Markets, Pricing, Promotions, and Sellability React package
  names from the v1 workspace surface.
- d5c540e: Move first-party operated product authoring imports to the Inventory owner path
  and remove the temporary Products compatibility package names from v1.
- 47fef18: Retarget first-party imports from the removed beta package names to their owner
  packages. Operated product UI now imports Inventory React, commercial UI imports
  Commerce React, supplier UI imports Distribution React, checkout UI imports
  Finance React, and operated place/availability schema references import
  Operations owner paths.
- Updated dependencies [dd71543]
- Updated dependencies [97d520c]
- Updated dependencies [85f9ce1]
- Updated dependencies [3cc83b6]
- Updated dependencies [9e970a5]
- Updated dependencies [3408b2a]
- Updated dependencies [3e160d3]
- Updated dependencies [65b3782]
- Updated dependencies [a101971]
- Updated dependencies [47fef18]
- Updated dependencies [6196b3b]
  - @voyant-travel/admin@0.111.1
  - @voyant-travel/commerce-react@0.2.0
  - @voyant-travel/inventory-react@0.2.0
  - @voyant-travel/finance-react@0.120.0
  - @voyant-travel/distribution-react@0.110.0

## 0.10.0

### Patch Changes

- @voyant-travel/pricing-react@0.119.0
- @voyant-travel/products-react@0.119.0
- @voyant-travel/ui@0.106.1
- @voyant-travel/finance-react@0.119.0
- @voyant-travel/auth-react@0.113.2
- @voyant-travel/distribution-react@0.109.5

## 0.9.0

### Patch Changes

- @voyant-travel/products-react@0.118.0
- @voyant-travel/finance-react@0.118.0
- @voyant-travel/pricing-react@0.118.0
- @voyant-travel/distribution-react@0.109.4

## 0.8.0

### Patch Changes

- @voyant-travel/auth-react@0.113.0
- @voyant-travel/distribution-react@0.109.2
- @voyant-travel/finance-react@0.117.0
- @voyant-travel/pricing-react@0.117.0
- @voyant-travel/products-react@0.117.0

## 0.7.0

### Patch Changes

- @voyant-travel/products-react@0.116.0
- @voyant-travel/finance-react@0.116.0
- @voyant-travel/pricing-react@0.116.0
- @voyant-travel/auth-react@0.112.1
- @voyant-travel/distribution-react@0.109.1

## 0.6.0

### Minor Changes

- 41b08db: Packaged-admin final sweep: the CORE admin pages ship from
  `@voyant-travel/admin-app` as a built-in extension, and index redirects become
  contribution-driven. The operator deleted its last 18 core route files
  (12 settings files, `/account`, the dashboard host, and the 4 domain index
  redirects) plus the superseded settings/account components.

  - `@voyant-travel/admin`: `AdminUiRouteContribution` grows `redirectTo?: string`
    (a redirect contribution counts as implemented on its own — host binders
    emit a before-load redirect, which also covers SSR) and `children?:
AdminUiRouteContribution[]` (nested child contributions under a layout
    contribution; child paths are parent-relative, `"/"` is the index). New
    `findAdminRouteContribution` does the depth-first lookup;
    `requireImplementedAdminRoute` accepts redirect contributions and
    resolves nested children.
  - `@voyant-travel/admin-app`: new `createAdminCoreExtension(options)` (exported
    from the root and `./core-extension`) — the `core` extension contributing
    `/` (the dashboard page behind a lazy chunk; hosts supply an SSR
    aggregates loader via `dashboard.loader`), `/account` (auth-react's
    packaged `AccountPage`), and the `/settings` area: a packaged layout
    (grouped sub-nav + outlet, labels resolved reactively from the operator
    admin messages) with nested children — an index redirect (default
    `/settings/channels`) and the nine built-in pages (team, API tokens,
    channels, taxes, cost categories, pricing categories, price catalogs,
    product types, product tags). Surfaces eject with `false`; built-in
    settings pages drop via `settings.omit`; app-custom settings pages splice
    in via `settings.extraPages` (the operator's Operator Profile page uses
    this). The binder gains redirect support (`beforeLoad` throwing the
    router redirect) and `adminExtensionChildRoutes(...)` for binding
    runtime-known children the generated route module cannot emit
    statically. The new domain peers (auth/distribution/finance/pricing/
    products react) are optional and only loaded by the lazy page/loader
    chunks.
  - `@voyant-travel/catalog-react` / `@voyant-travel/finance-react` /
    `@voyant-travel/legal-react` / `@voyant-travel/notifications-react`: the admin
    extensions contribute their index redirect (`/catalog` →
    `/catalog/products`, `/finance` → `/finance/invoices`, `/legal` →
    `/legal/contracts`, `/notifications` → `/notifications/templates`),
    replacing the operator's redirect route files.
  - Host typed-link merge note: extension routes now REPLACE file routes on
    key conflicts in the merged route-type maps (`Omit` before the
    intersection) — the pathless workspace layout claims `/` in the generated
    file types once the index file route is deleted, while at runtime `/` is
    the core extension's dashboard route.

### Patch Changes

- Updated dependencies [41b08db]
- Updated dependencies [6d496d0]
  - @voyant-travel/admin@0.111.0
  - @voyant-travel/finance-react@0.115.0
  - @voyant-travel/products-react@0.115.0
  - @voyant-travel/auth-react@0.112.0
  - @voyant-travel/distribution-react@0.109.0
  - @voyant-travel/pricing-react@0.115.0

## 0.5.0

### Minor Changes

- 9c909e2: Package-deliver the booking-flow admin surfaces (packaged-admin final sweep)

  - **bookings-react**: `createBookingsAdminExtension` now contributes the whole booking flow — three new route contributions alongside list/detail: `bookings-new` (`/bookings/new` owned-product picker that forwards into the unified journey; route-backed `booking.create` destination), `bookings-compose` (`/bookings/compose` legacy alias forwarding to the new `trip.create` destination), and `bookings-journey` (`/catalog/journey/$entityModule/$entityId`, the unified `BookingJourney` host with CRM-backed lead/traveler pickers, departure/units/voucher pickers, duplicate-departure warning, B2B default, and commit→`booking.detail` / cancel→`catalog.browse` navigation via semantic destinations). New exports: `bookingNewSearchSchema`, `bookingJourneySearchSchema` (+ param types) and the `BookingJourneyHost` admin module (`/admin/booking-journey-host`). Declares the `trip.create` destination key.
  - **admin**: `useAdminNavigate` accepts an optional `AdminNavigateOptions` (`{ replace?: boolean }`) third argument, forwarded to the host-injected navigate so packaged redirect pages keep route-redirect history semantics.
  - **admin-app**: the workspace shell's injected destination navigate maps `replace` onto the router's history-replace mode.

### Patch Changes

- Updated dependencies [9c909e2]
  - @voyant-travel/admin@0.110.0

## 0.4.0

### Patch Changes

- Updated dependencies [faec538]
  - @voyant-travel/admin@0.109.0

## 0.3.0

### Minor Changes

- 478aa7c: Packaged-admin RFC §4.8 endgame — the code-assembled extension route tree.
  Package-delivered admin pages exist as NO per-route files in the host: the
  operator deleted ~50 thin host route files across all 10 admin domains; the
  route tree for extension routes is assembled in code from the contributions
  and grafted under the file-based workspace layout, with typed links intact.

  - `@voyant-travel/admin`: `AdminUiRouteContribution` grows `page?: () =>
Promise<AdminRoutePageModule>` — a lazy page-module loader (pages stay
    code-split, hover/intent preloading fetches the chunk ahead of
    navigation). The resolved component receives `AdminRoutePageProps`
    (`params`/`search`/`updateSearch`/`title`), dissolving the old "zero-prop
    components only" restriction — param-taking detail pages need no host
    route file. `AdminRouteLoaderContext` gains `params`. New helpers:
    `requireImplementedAdminRoute` (loud failure at module evaluation when a
    bound contribution loses its implementation) and `adminRoutePageModule`
    (adapter for zero-prop / all-optional-prop hosts).
  - `@voyant-travel/admin-app`: new binder — `adminExtensionRouteOptions(extension,
routeId, runtime)` returns router-facing route options (lazy component,
    loader bound to `{ queryClient, runtime, params }`, per-route `ssr`,
    boundaries) ready to spread into a code-based `createRoute({...})`, and
    `attachAdminExtensionRoutes(routeTree, parentRoute, routes)` grafts the
    built routes under the workspace layout idempotently (replace-by-path,
    dev-server re-evaluation safe).
  - All 10 `*-react` admin extensions now carry full route implementations:
    lazy `page` loaders (dynamic imports of the specific host modules, never
    the admin barrel), loaders moved verbatim from the operator route files
    (SSR modes preserved exactly, `data-only` included), pending skeletons,
    and search contracts. Bookings adds host-composition options
    (`indexHeaderActions`, `detailPageComponent` + exported
    `BookingDetailPageComponentProps`) so app-owned composition rides through
    the factory instead of a route file. Finance's supplier-invoices pages
    stay metadata-only (app-owned upload/supplier-picker/cross-domain search
    wiring) and remain host route files.

  Hosts bind everything in one checked-in generated module
  (`src/admin.routes.generated.tsx`): per route a `createRoute` call with the
  path literal + typed search schema, spreading the binder options, plus
  `AdminExtensionRoutesBy*` typed-link maps that `router.tsx` merges with the
  generated `FileRouteTypes` via `_addFileTypes` — `Link`/`navigate` stay
  fully typed for file routes and extension routes alike.

### Patch Changes

- Updated dependencies [478aa7c]
  - @voyant-travel/admin@0.108.0

## 0.2.0

### Patch Changes

- Updated dependencies [eeb23df]
  - @voyant-travel/admin@0.107.0

## 0.1.0

### Minor Changes

- 4ade734: Semantic admin navigation destinations (packaged-admin RFC §4.7): packaged
  admin pages navigate to routes they don't own (booking journey, supplier
  detail, product editor) without importing a host route tree.

  - `@voyant-travel/admin`: new `AdminDestinations` interface (augmented by domain
    packages via `declare module "@voyant-travel/admin"`), `AdminNavigationProvider`,
    and `useAdminHref`/`useAdminNavigate`. Unresolvable keys warn once per key
    and degrade to `"#"`/no-op — never a throw in render paths.
  - `@voyant-travel/admin-app`: `AdminWorkspaceShell` accepts a `destinations`
    resolver map (`satisfies AdminDestinationResolvers` for exhaustiveness) and
    mounts the provider wired to the app router via `router.navigate({ href })`.
  - `@voyant-travel/catalog-ui`: declares the catalog destination keys
    (`bookingJourney.start`, `catalog.browse`, `catalog.detail`,
    `product.detail`, `supplier.detail`) covering every cross-route target the
    operator's catalog wrappers navigate to.

- db98e90: New package — Phase 1 of the packaged-admin RFC (#1643): the admin
  application composition ships as a versioned package; `@voyant-travel/admin` stays
  the primitives layer.

  - `createAdminRouter` / `createAdminQueryClient` — TanStack Router +
    QueryClient with the Voyant defaults (intent preloading with matched
    staleTime, scroll restoration, default not-found page, QueryClient SSR
    dehydrate/hydrate).
  - `adminRootHead` / `AdminRootShell` / `AdminRootErrorBoundary` — root route
    internals, including the pre-hydration theme/locale bootstrap script and a
    provider-independent error boundary.
  - `createAdminWorkspaceBeforeLoad` — the workspace auth guard (beforeLoad so
    the redirect short-circuits child loaders).
  - `AdminWorkspaceShell` — bootstrap gate → per-user message overrides →
    locale sync → workspace layout, with the Slot-compatible `AdminRouterLink`
    as the default nav link.

  The operator template consumes it: `router.tsx` (89→15 LOC), `__root.tsx`
  (118→29), and `_workspace/route.tsx` (209→95) shrink to wiring; app-owned
  parts (provider list, extension definitions, nav icons, auth client) stay in
  the template.

### Patch Changes

- Updated dependencies [4ade734]
- Updated dependencies [3bd66e9]
- Updated dependencies [ee5b530]
- Updated dependencies [344e7b6]
  - @voyant-travel/admin@0.106.0
  - @voyant-travel/ui@0.106.0
