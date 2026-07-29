# @voyant-travel/commerce-react

## 0.45.0

### Patch Changes

- Updated dependencies [115b00b]
- Updated dependencies [192a635]
- Updated dependencies [37fac2f]
  - @voyant-travel/inventory-react@0.45.0
  - @voyant-travel/i18n@0.112.0
  - @voyant-travel/distribution-react@0.153.0
  - @voyant-travel/admin@0.126.1
  - @voyant-travel/commerce@0.37.1

## 0.44.0

### Patch Changes

- Updated dependencies [8f0fa26]
  - @voyant-travel/commerce@0.37.0
  - @voyant-travel/distribution-react@0.152.0
  - @voyant-travel/inventory-react@0.44.0

## 0.43.0

### Patch Changes

- Updated dependencies [c1e37f2]
  - @voyant-travel/admin@0.126.0
  - @voyant-travel/distribution-react@0.151.0
  - @voyant-travel/inventory-react@0.43.0
  - @voyant-travel/commerce@0.36.1

## 0.42.0

### Patch Changes

- Updated dependencies [7ac40a0]
  - @voyant-travel/commerce@0.36.0
  - @voyant-travel/inventory-react@0.42.0
  - @voyant-travel/distribution-react@0.150.0

## 0.41.0

### Minor Changes

- 82ffd12: Add persisted organization-level first-run setup guidance composed from the
  selected admin graph. Standard Operator deployments now collect package-owned
  business profile, storefront, market, fiscal, navigation, team, and first-product
  steps while keeping domain mutations in their existing package surfaces.

### Patch Changes

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
  - @voyant-travel/commerce@0.35.9

## 0.40.0

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
  - @voyant-travel/admin@0.124.0
  - @voyant-travel/distribution-react@0.148.0
  - @voyant-travel/commerce@0.35.8
  - @voyant-travel/inventory-react@0.40.0
  - @voyant-travel/types@0.109.2

## 0.39.0

### Patch Changes

- @voyant-travel/inventory-react@0.39.0
- @voyant-travel/distribution-react@0.147.0
- @voyant-travel/commerce@0.35.7

## 0.38.1

### Patch Changes

- 8d62a7c: Embed TypeScript sources in published JavaScript source maps so consumer dev servers can resolve
  them without the omitted `src` tree. Stop emitting declaration maps that cannot embed their sources,
  and reject publish tarballs whose maps reference sources that are neither packed nor embedded.
- Updated dependencies [8d62a7c]
- Updated dependencies [8d62a7c]
  - @voyant-travel/types@0.109.1
  - @voyant-travel/utils@0.107.1
  - @voyant-travel/admin@0.123.3
  - @voyant-travel/commerce@0.35.6
  - @voyant-travel/distribution-react@0.146.1
  - @voyant-travel/i18n@0.111.1
  - @voyant-travel/inventory-react@0.38.1
  - @voyant-travel/react@0.104.2
  - @voyant-travel/ui@0.109.1

## 0.38.0

### Patch Changes

- Updated dependencies [bbe6396]
  - @voyant-travel/i18n@0.111.0
  - @voyant-travel/commerce@0.35.5
  - @voyant-travel/inventory-react@0.38.0
  - @voyant-travel/distribution-react@0.146.0
  - @voyant-travel/admin@0.123.2

## 0.37.0

### Patch Changes

- @voyant-travel/commerce@0.35.2
- @voyant-travel/inventory-react@0.37.0
- @voyant-travel/distribution-react@0.145.0

## 0.36.0

### Patch Changes

- Updated dependencies [4d0eeed]
- Updated dependencies [8bd906f]
  - @voyant-travel/types@0.109.0
  - @voyant-travel/utils@0.107.0
  - @voyant-travel/ui@0.109.0
  - @voyant-travel/commerce@0.35.1
  - @voyant-travel/admin@0.123.0
  - @voyant-travel/distribution-react@0.144.0
  - @voyant-travel/inventory-react@0.36.0

## 0.35.0

### Patch Changes

- 490d132: Move standard first-party admin factories, package copy, slots, contributions, and icons into selected deployment graph composition.
- Updated dependencies [047c3f9]
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
  - @voyant-travel/commerce@0.35.0
  - @voyant-travel/admin@0.122.0
  - @voyant-travel/distribution-react@0.143.0
  - @voyant-travel/inventory-react@0.35.0
  - @voyant-travel/types@0.108.1

## 0.34.0

### Patch Changes

- Updated dependencies [d771be3]
- Updated dependencies [18d8aa0]
- Updated dependencies [9b15ebe]
- Updated dependencies [d771be3]
- Updated dependencies [d771be3]
  - @voyant-travel/commerce@0.34.0
  - @voyant-travel/types@0.108.0
  - @voyant-travel/admin@0.121.0
  - @voyant-travel/distribution-react@0.142.0
  - @voyant-travel/inventory-react@0.34.0
  - @voyant-travel/utils@0.106.1

## 0.33.0

### Patch Changes

- Updated dependencies [a370024]
- Updated dependencies [e3dc5a9]
- Updated dependencies [e3dc5a9]
- Updated dependencies [a370024]
- Updated dependencies [e3dc5a9]
  - @voyant-travel/commerce@0.33.0
  - @voyant-travel/inventory-react@0.33.0
  - @voyant-travel/distribution-react@0.141.0
  - @voyant-travel/types@0.107.2

## 0.32.0

### Patch Changes

- @voyant-travel/commerce@0.32.0
- @voyant-travel/distribution-react@0.140.0
- @voyant-travel/inventory-react@0.32.0

## 0.31.0

### Patch Changes

- Updated dependencies [a97e845]
  - @voyant-travel/admin@0.120.0
  - @voyant-travel/distribution-react@0.139.0
  - @voyant-travel/inventory-react@0.31.0
  - @voyant-travel/commerce@0.31.0

## 0.30.0

### Patch Changes

- Updated dependencies [8a665f3]
  - @voyant-travel/admin@0.119.0
  - @voyant-travel/distribution-react@0.138.0
  - @voyant-travel/inventory-react@0.30.0
  - @voyant-travel/commerce@0.30.0

## 0.29.0

### Patch Changes

- @voyant-travel/admin@0.118.0
- @voyant-travel/distribution-react@0.137.0
- @voyant-travel/inventory-react@0.29.0
- @voyant-travel/commerce@0.29.0

## 0.28.0

### Patch Changes

- Updated dependencies [ecdf0fc]
  - @voyant-travel/admin@0.117.0
  - @voyant-travel/distribution-react@0.136.0
  - @voyant-travel/inventory-react@0.28.0
  - @voyant-travel/commerce@0.28.0

## 0.27.0

### Patch Changes

- @voyant-travel/commerce@0.27.0
- @voyant-travel/distribution-react@0.135.0
- @voyant-travel/inventory-react@0.27.0

## 0.26.0

### Patch Changes

- @voyant-travel/commerce@0.26.0
- @voyant-travel/distribution-react@0.134.0
- @voyant-travel/inventory-react@0.26.0

## 0.25.0

### Patch Changes

- Updated dependencies [425f92e]
  - @voyant-travel/utils@0.106.0
  - @voyant-travel/inventory-react@0.25.0
  - @voyant-travel/ui@0.108.11
  - @voyant-travel/commerce@0.25.0
  - @voyant-travel/types@0.107.1
  - @voyant-travel/distribution-react@0.133.0

## 0.24.0

### Patch Changes

- Updated dependencies [05c10f2]
  - @voyant-travel/commerce@0.24.0
  - @voyant-travel/distribution-react@0.132.0
  - @voyant-travel/inventory-react@0.24.0

## 0.23.0

### Patch Changes

- @voyant-travel/commerce@0.23.0
- @voyant-travel/inventory-react@0.23.0
- @voyant-travel/distribution-react@0.131.0

## 0.22.0

### Patch Changes

- Updated dependencies [62e87ee]
  - @voyant-travel/admin@0.116.0
  - @voyant-travel/i18n@0.110.0
  - @voyant-travel/distribution-react@0.130.0
  - @voyant-travel/inventory-react@0.22.0
  - @voyant-travel/commerce@0.22.0

## 0.21.1

### Patch Changes

- 2c7341a: Settings pricing category and price catalog queries now target the mounted admin pricing routes.

## 0.21.0

### Patch Changes

- 7d4a405: Add safer promotions admin management with product/category scope pickers, archive/activate/delete row actions, and field-specific validation guidance.
- Updated dependencies [c9a356f]
- Updated dependencies [0c75844]
- Updated dependencies [2613dfb]
- Updated dependencies [a45a0d3]
- Updated dependencies [f3b8bef]
- Updated dependencies [fcad28b]
  - @voyant-travel/types@0.107.0
  - @voyant-travel/commerce@0.21.0
  - @voyant-travel/distribution-react@0.129.0
  - @voyant-travel/admin@0.115.4
  - @voyant-travel/inventory-react@0.21.0
  - @voyant-travel/utils@0.105.6

## 0.20.0

### Patch Changes

- @voyant-travel/commerce@0.20.0
- @voyant-travel/distribution-react@0.128.0
- @voyant-travel/inventory-react@0.20.0

## 0.19.1

### Patch Changes

- 0b57296: Fix the Settings → Price Catalogs create form silently dropping a typed currency. The currency control is a combobox whose committed value only changed when a row was picked from the list, so typing a code like `EUR` and submitting persisted a blank currency. The shared `CurrencyCombobox` now commits a fully-typed ISO code (case-insensitive) even when the matching row is never selected, and the price catalog form reuses that canonical picker instead of a local one that did not bind typed text to the form value. The currency input also forwards an `id`, and the price catalog dialog fields now associate their `<Label htmlFor>` with the inputs.
- Updated dependencies [0b57296]
  - @voyant-travel/ui@0.108.9

## 0.19.0

### Patch Changes

- Updated dependencies [7c5ee80]
  - @voyant-travel/commerce@0.19.0
  - @voyant-travel/distribution-react@0.127.0
  - @voyant-travel/inventory-react@0.19.0

## 0.18.2

### Patch Changes

- 12a1eb2: Expose client-safe subpaths for validation schemas, linkable metadata, template authoring metadata, finance payment-policy primitives, and Hono reporter utilities. Move browser-facing React/operator imports off mixed runtime barrels so client bundles do not pull Hono request context or other server-only runtime code.
- Updated dependencies [12a1eb2]
  - @voyant-travel/commerce@0.18.1
  - @voyant-travel/distribution-react@0.126.2
  - @voyant-travel/inventory-react@0.18.2

## 0.18.1

### Patch Changes

- Updated dependencies [7cb6fa7]
  - @voyant-travel/i18n@0.109.0
  - @voyant-travel/admin@0.115.2
  - @voyant-travel/distribution-react@0.126.1
  - @voyant-travel/inventory-react@0.18.1
  - @voyant-travel/ui@0.108.2

## 0.18.0

### Patch Changes

- @voyant-travel/distribution-react@0.126.0
- @voyant-travel/inventory-react@0.18.0
- @voyant-travel/commerce@0.18.0

## 0.17.0

### Patch Changes

- @voyant-travel/distribution-react@0.125.0
- @voyant-travel/inventory-react@0.17.0
- @voyant-travel/commerce@0.17.0

## 0.16.0

### Minor Changes

- 51f7dea: Share one list-response contract instead of per-module copies (voyant#2109).

  `@voyant-travel/types` now owns the canonical offset-paginated list envelope: the `ListResponse<T>` type + `listResponse(data, { total, limit, offset })` builder, plus the zod `paginationSchema` (coerced `limit` 1–200 default 50, `offset` ≥0 default 0) and the `listResponseSchema(item)` factory. Both server services and `*-react` clients import from this single source.

  Server side: every module's local `paginate()` / inline `{ data, total, limit, offset }` construction now routes through the shared `listResponse` builder, and the count read is standardized on `count` internally — fixing the drift where finance, notifications and the legal contracts/policies services read `countResult[0]?.total` while every other module read `countResult[0]?.count` (their `count(*)` selects were aliased `total`; they are now aliased `count`). The returned shape is byte-for-byte identical.

  Client side: the ~23 copied `paginatedEnvelope` zod schemas across the `*-react` packages are replaced by re-exporting the shared `listResponseSchema` factory under the same `paginatedEnvelope` name, so consumers are unchanged.

  Input alignment: `finance-contracts` and `legal-contracts` pagination `limit` caps were raised from `.max(100)` to `.max(200)` to match the framework-wide max.

  Additive and non-breaking.

### Patch Changes

- Updated dependencies [51f7dea]
  - @voyant-travel/types@0.106.0
  - @voyant-travel/commerce@0.16.0
  - @voyant-travel/distribution-react@0.124.0
  - @voyant-travel/inventory-react@0.16.0
  - @voyant-travel/admin@0.115.1
  - @voyant-travel/utils@0.105.4

## 0.15.0

### Patch Changes

- Updated dependencies [4abf9a2]
  - @voyant-travel/admin@0.115.0
  - @voyant-travel/i18n@0.108.0
  - @voyant-travel/utils@0.105.3
  - @voyant-travel/commerce@0.15.0
  - @voyant-travel/distribution-react@0.123.0
  - @voyant-travel/inventory-react@0.15.0
  - @voyant-travel/ui@0.108.1

## 0.14.0

### Patch Changes

- @voyant-travel/commerce@0.14.0
- @voyant-travel/distribution-react@0.122.0
- @voyant-travel/inventory-react@0.14.0

## 0.13.0

### Patch Changes

- Updated dependencies [310565b]
  - @voyant-travel/i18n@0.107.3
  - @voyant-travel/distribution-react@0.121.0
  - @voyant-travel/inventory-react@0.13.0
  - @voyant-travel/commerce@0.13.0

## 0.12.0

### Patch Changes

- Updated dependencies [dbea53e]
  - @voyant-travel/i18n@0.107.2
  - @voyant-travel/distribution-react@0.120.0
  - @voyant-travel/inventory-react@0.12.0
  - @voyant-travel/commerce@0.12.0

## 0.11.0

### Patch Changes

- @voyant-travel/commerce@0.11.0
- @voyant-travel/distribution-react@0.119.0
- @voyant-travel/inventory-react@0.11.0

## 0.10.0

### Patch Changes

- @voyant-travel/inventory-react@0.10.0
- @voyant-travel/distribution-react@0.118.0
- @voyant-travel/commerce@0.10.0

## 0.9.0

### Patch Changes

- @voyant-travel/commerce@0.9.0
- @voyant-travel/distribution-react@0.117.0
- @voyant-travel/inventory-react@0.9.0

## 0.8.0

### Patch Changes

- @voyant-travel/commerce@0.8.0
- @voyant-travel/distribution-react@0.116.0
- @voyant-travel/inventory-react@0.8.0

## 0.7.0

### Patch Changes

- Updated dependencies [a74471e]
- Updated dependencies [a74471e]
  - @voyant-travel/i18n@0.107.0
  - @voyant-travel/ui@0.108.0
  - @voyant-travel/commerce@0.7.0
  - @voyant-travel/admin@0.114.0
  - @voyant-travel/distribution-react@0.115.0
  - @voyant-travel/inventory-react@0.7.0

## 0.6.0

### Patch Changes

- 4f92198: Voyant 1.0 visual refactor of the framework UI.

  - **Tokens** (`@voyant-travel/ui` `globals.css`): warm off-white paper, near-black ink, and a single hot-orange brand accent (`--brand`, new token) reserved for charts/focus/active state. Inter Tight type. Fixed brand chart palette (`--chart-1..5`). A coherent radius system: controls + their dropdowns at `rounded-sm` (4px), cards/table surfaces at `rounded-md` (6px), dialogs/sheets at `rounded-xl`.
  - **`@voyant-travel/ui` components**: new `SegmentedControl`; `Button` gains a `brand` variant; sharper, consistent radii across Button/Input/Select/Combobox/Textarea/Toggle/Tabs/Menus/Command/Card/DataTable/Badge; bordered active sidebar items (primary + sub) and inset-panel border; assorted fixes (Command search-input radius, toggle-group corners, sidebar sub-menu spacing).
  - **`@voyant-travel/admin`**: Voyant 1.0 brand logo lockup (composed mark + wordmark, collapse-to-badge); operator shell defaults to the inset sidebar layout; dashboard KPI cards, brand chart colors, and Figma-matched sidebar (bordered active item, near-black nav text, bordered user card with open-state).
  - **Domain `*-react` packages**: card surfaces normalized to the new `rounded-md` radius; flights search bar (trip-type toggle, route cards, airport dropdown) and the resources tabs aligned to the system.

- Updated dependencies [4f92198]
  - @voyant-travel/ui@0.107.0
  - @voyant-travel/admin@0.113.0
  - @voyant-travel/distribution-react@0.114.0
  - @voyant-travel/inventory-react@0.6.0
  - @voyant-travel/commerce@0.6.0

## 0.5.0

### Patch Changes

- Updated dependencies [94890c3]
- Updated dependencies [cb9b04b]
  - @voyant-travel/admin@0.112.0
  - @voyant-travel/distribution-react@0.113.0
  - @voyant-travel/inventory-react@0.5.0
  - @voyant-travel/commerce@0.5.0

## 0.4.0

### Patch Changes

- @voyant-travel/commerce@0.4.0
- @voyant-travel/inventory-react@0.4.0
- @voyant-travel/distribution-react@0.112.0

## 0.3.0

### Patch Changes

- Updated dependencies [13fe70b]
  - @voyant-travel/commerce@0.3.0
  - @voyant-travel/inventory-react@0.3.0
  - @voyant-travel/distribution-react@0.111.0

## 0.2.1

### Patch Changes

- eef1a00: Republish notification and UI consumer packages so stale beta artifacts no longer reference legacy notification package specifiers.
- Updated dependencies [eef1a00]
  - @voyant-travel/admin@0.111.2
  - @voyant-travel/distribution-react@0.110.4
  - @voyant-travel/inventory-react@0.2.1

## 0.2.0

### Minor Changes

- 97d520c: Add the Commerce React owner package and retarget first-party UI wiring to the
  Commerce owner path.
- 85f9ce1: Move commercial React/admin source under the Commerce React owner path and
  remove the old Markets, Pricing, Promotions, and Sellability React package
  names from the v1 workspace surface.

### Patch Changes

- 47fef18: Retarget first-party imports from the removed beta package names to their owner
  packages. Operated product UI now imports Inventory React, commercial UI imports
  Commerce React, supplier UI imports Distribution React, checkout UI imports
  Finance React, and operated place/availability schema references import
  Operations owner paths.
- Updated dependencies [dd71543]
- Updated dependencies [e388bc9]
- Updated dependencies [6bff46f]
- Updated dependencies [a4e0909]
- Updated dependencies [eb17d3d]
- Updated dependencies [3cc83b6]
- Updated dependencies [3408b2a]
- Updated dependencies [3e160d3]
- Updated dependencies [65b3782]
- Updated dependencies [a101971]
- Updated dependencies [47fef18]
- Updated dependencies [063f2b5]
  - @voyant-travel/admin@0.111.1
  - @voyant-travel/commerce@0.2.0
  - @voyant-travel/inventory-react@0.2.0
  - @voyant-travel/distribution-react@0.110.0
