# @voyant-travel/operator-standard

## 0.7.0

### Minor Changes

- 15d1f88: 新增线路上线助理:上传 Word/PDF 线路资料,解析成待复核草稿,确认后建出产品。

  新增的 `@voyant-travel/inventory/import-extension` 在 admin 面挂到 `products`
  之下,提供草稿的增删改查与确认接口,并在 `operator-standard` 发行版中默认启用。

  上传与确认刻意分成两步:价格、天数、费用包含解析错了是要赔钱的,中间必须
  有人过目。助手一律建成 `draft` + `private` 的产品且不写入任何价格规则——
  没有价格卖不出去,总好过带着 0 元价格被误发布。

### Patch Changes

- Updated dependencies [89fe90a]
- Updated dependencies [5652440]
- Updated dependencies [4ac7d46]
- Updated dependencies [f535cfd]
- Updated dependencies [f5e02bd]
- Updated dependencies [115b00b]
- Updated dependencies [89fe90a]
- Updated dependencies [192a635]
- Updated dependencies [15d1f88]
- Updated dependencies [08c5aa2]
- Updated dependencies [37fac2f]
- Updated dependencies [ffcf632]
- Updated dependencies [34aaebe]
- Updated dependencies [89fe90a]
  - @voyant-travel/inventory@0.13.0
  - @voyant-travel/inventory-react@0.45.0
  - @voyant-travel/quotes-react@0.161.0
  - @voyant-travel/operations@0.8.1
  - @voyant-travel/i18n@0.112.0
  - @voyant-travel/operator-settings@0.6.0
  - @voyant-travel/bookings-react@0.163.0
  - @voyant-travel/catalog-authoring@0.107.15
  - @voyant-travel/legal@0.163.0
  - @voyant-travel/storefront@0.165.0
  - @voyant-travel/trips@0.154.0
  - @voyant-travel/action-ledger-react@0.50.0
  - @voyant-travel/admin-app@0.55.0
  - @voyant-travel/catalog-react@0.161.0
  - @voyant-travel/commerce-react@0.45.0
  - @voyant-travel/distribution-react@0.153.0
  - @voyant-travel/finance-react@0.163.0
  - @voyant-travel/identity-react@0.163.0
  - @voyant-travel/legal-react@0.163.0
  - @voyant-travel/operations-react@0.44.0
  - @voyant-travel/admin@0.126.1
  - @voyant-travel/auth-react@0.132.2
  - @voyant-travel/cruises-react@0.162.0
  - @voyant-travel/event-catalog-react@0.4.1
  - @voyant-travel/finance@0.163.0
  - @voyant-travel/flights-react@0.163.0
  - @voyant-travel/mice-react@0.31.0
  - @voyant-travel/navigation-preferences-react@0.5.1
  - @voyant-travel/notifications-react@0.130.1
  - @voyant-travel/relationships-react@0.163.0
  - @voyant-travel/storefront-react@0.165.0
  - @voyant-travel/trips-react@0.154.0
  - @voyant-travel/quotes@0.130.1
  - @voyant-travel/notifications@0.130.1
  - @voyant-travel/admin-host@0.13.0
  - @voyant-travel/operator-settings-react@0.16.0
  - @voyant-travel/admin-react@0.126.1
  - @voyant-travel/auth@0.132.2
  - @voyant-travel/bookings@0.163.0
  - @voyant-travel/catalog@0.161.0
  - @voyant-travel/charters@0.161.0
  - @voyant-travel/cruises@0.162.0
  - @voyant-travel/distribution@0.153.0
  - @voyant-travel/flights@0.163.0
  - @voyant-travel/identity@0.163.0
  - @voyant-travel/navigation-preferences@0.5.1
  - @voyant-travel/workflow-runs@0.122.1
  - @voyant-travel/workflows@0.122.1
  - @voyant-travel/workflows-orchestrator@0.122.1
  - @voyant-travel/accommodations@0.123.0
  - @voyant-travel/commerce@0.37.1
  - @voyant-travel/mice@0.19.0
  - @voyant-travel/relationships@0.127.1

## 0.6.3

### Patch Changes

- Updated dependencies [8f0fa26]
  - @voyant-travel/accommodations@0.122.0
  - @voyant-travel/action-ledger@0.110.0
  - @voyant-travel/bookings@0.162.0
  - @voyant-travel/catalog@0.160.0
  - @voyant-travel/charters@0.160.0
  - @voyant-travel/commerce@0.37.0
  - @voyant-travel/cruises@0.161.0
  - @voyant-travel/distribution@0.152.0
  - @voyant-travel/finance@0.162.0
  - @voyant-travel/flights@0.162.0
  - @voyant-travel/identity@0.162.0
  - @voyant-travel/inventory@0.12.0
  - @voyant-travel/legal@0.162.0
  - @voyant-travel/mcp@0.4.0
  - @voyant-travel/mice@0.18.0
  - @voyant-travel/navigation-preferences@0.5.0
  - @voyant-travel/notifications@0.130.0
  - @voyant-travel/operations@0.8.0
  - @voyant-travel/operator-settings@0.5.0
  - @voyant-travel/public-document-delivery@0.4.0
  - @voyant-travel/quotes@0.130.0
  - @voyant-travel/realtime@0.6.0
  - @voyant-travel/relationships@0.127.0
  - @voyant-travel/setup@0.4.0
  - @voyant-travel/storage@0.111.0
  - @voyant-travel/storefront@0.164.0
  - @voyant-travel/trips@0.153.0
  - @voyant-travel/workflow-runs@0.122.0
  - @voyant-travel/bookings-react@0.162.0
  - @voyant-travel/storefront-react@0.164.0
  - @voyant-travel/action-ledger-react@0.49.0
  - @voyant-travel/trips-react@0.153.0
  - @voyant-travel/catalog-authoring@0.107.14
  - @voyant-travel/commerce-react@0.44.0
  - @voyant-travel/cruises-react@0.161.0
  - @voyant-travel/distribution-react@0.152.0
  - @voyant-travel/finance-react@0.162.0
  - @voyant-travel/flights-react@0.162.0
  - @voyant-travel/inventory-react@0.44.0
  - @voyant-travel/operator-settings-react@0.15.0
  - @voyant-travel/auth@0.132.1
  - @voyant-travel/event-catalog@0.2.2
  - @voyant-travel/identity-react@0.162.0
  - @voyant-travel/legal-react@0.162.0
  - @voyant-travel/mice-react@0.30.0
  - @voyant-travel/navigation-preferences-react@0.5.0
  - @voyant-travel/notifications-react@0.130.0
  - @voyant-travel/operations-react@0.43.0
  - @voyant-travel/quotes-react@0.160.0
  - @voyant-travel/relationships-react@0.162.0
  - @voyant-travel/setup-react@0.5.0
  - @voyant-travel/admin-app@0.54.0
  - @voyant-travel/catalog-react@0.160.0
  - @voyant-travel/admin-host@0.12.0
  - @voyant-travel/auth-react@0.132.1
  - @voyant-travel/workflows@0.122.0
  - @voyant-travel/workflows-orchestrator@0.122.0
  - @voyant-travel/db@0.114.8

## 0.6.2

### Patch Changes

- Updated dependencies [c1e37f2]
- Updated dependencies [85bfe2c]
- Updated dependencies [85bfe2c]
  - @voyant-travel/admin@0.126.0
  - @voyant-travel/finance@0.161.0
  - @voyant-travel/action-ledger@0.109.1
  - @voyant-travel/action-ledger-react@0.48.0
  - @voyant-travel/admin-app@0.53.0
  - @voyant-travel/admin-host@0.11.0
  - @voyant-travel/auth-react@0.132.0
  - @voyant-travel/bookings-react@0.161.0
  - @voyant-travel/catalog-react@0.159.0
  - @voyant-travel/commerce-react@0.43.0
  - @voyant-travel/distribution-react@0.151.0
  - @voyant-travel/event-catalog-react@0.4.0
  - @voyant-travel/finance-react@0.161.0
  - @voyant-travel/flights-react@0.161.0
  - @voyant-travel/inventory-react@0.43.0
  - @voyant-travel/legal-react@0.161.0
  - @voyant-travel/mice-react@0.29.0
  - @voyant-travel/navigation-preferences-react@0.4.0
  - @voyant-travel/notifications-react@0.129.0
  - @voyant-travel/operations-react@0.42.0
  - @voyant-travel/operator-settings-react@0.14.0
  - @voyant-travel/quotes-react@0.159.0
  - @voyant-travel/relationships-react@0.161.0
  - @voyant-travel/setup-react@0.4.0
  - @voyant-travel/storefront-react@0.163.0
  - @voyant-travel/trips-react@0.152.0
  - @voyant-travel/identity-react@0.161.0
  - @voyant-travel/cruises-react@0.160.0
  - @voyant-travel/admin-react@0.126.0
  - @voyant-travel/auth@0.132.0
  - @voyant-travel/bookings@0.161.0
  - @voyant-travel/catalog@0.159.0
  - @voyant-travel/charters@0.159.0
  - @voyant-travel/cruises@0.160.0
  - @voyant-travel/distribution@0.151.0
  - @voyant-travel/flights@0.161.0
  - @voyant-travel/identity@0.161.0
  - @voyant-travel/legal@0.161.0
  - @voyant-travel/notifications@0.129.0
  - @voyant-travel/navigation-preferences@0.4.0
  - @voyant-travel/storefront@0.163.0
  - @voyant-travel/trips@0.152.0
  - @voyant-travel/accommodations@0.121.0
  - @voyant-travel/commerce@0.36.1
  - @voyant-travel/inventory@0.11.1
  - @voyant-travel/operator-settings@0.4.1
  - @voyant-travel/mice@0.17.0
  - @voyant-travel/relationships@0.126.1
  - @voyant-travel/operations@0.7.1
  - @voyant-travel/quotes@0.129.1

## 0.6.1

### Patch Changes

- 372f4f4: Add a separately selectable Operations-owned dashboard Tool that composes the real aggregate
  services from Bookings, Finance, Inventory, Distribution, and Operations without crossing domain
  persistence boundaries. Require every underlying read scope and return structural source
  projections, KPIs, and bounded alerts.

  Complete the Quotes proposal lifecycle Tool surface with snapshot, send, accept, and decline
  capabilities, structural JSON-safe outputs, compatibility aliases, staff-only grants,
  confirmation, and graph-ledger/approval policy.

- Updated dependencies [5617f37]
- Updated dependencies [cabf662]
- Updated dependencies [701ccc4]
- Updated dependencies [848b581]
- Updated dependencies [5617f37]
- Updated dependencies [5f15e2e]
- Updated dependencies [0ad9ecb]
- Updated dependencies [7ac40a0]
- Updated dependencies [372f4f4]
- Updated dependencies [6c8d46a]
- Updated dependencies [a2fd806]
- Updated dependencies [0079873]
- Updated dependencies [b8cef4c]
- Updated dependencies [d9e8984]
- Updated dependencies [7e4ab07]
- Updated dependencies [497dff2]
- Updated dependencies [33cc782]
- Updated dependencies [db5adce]
- Updated dependencies [0979758]
- Updated dependencies [4f66e89]
- Updated dependencies [90e8d6d]
- Updated dependencies [54be000]
- Updated dependencies [f819273]
- Updated dependencies [bf19d5a]
- Updated dependencies [c9b6144]
- Updated dependencies [eae32f8]
- Updated dependencies [6604f9e]
- Updated dependencies [0297ef5]
- Updated dependencies [ff87f68]
  - @voyant-travel/accommodations@0.120.0
  - @voyant-travel/action-ledger@0.109.0
  - @voyant-travel/core@0.124.0
  - @voyant-travel/tools@0.3.0
  - @voyant-travel/mcp@0.3.0
  - @voyant-travel/bookings@0.160.0
  - @voyant-travel/finance@0.160.0
  - @voyant-travel/auth@0.131.0
  - @voyant-travel/availability@0.2.13
  - @voyant-travel/catalog-authoring@0.107.13
  - @voyant-travel/catalog@0.158.0
  - @voyant-travel/commerce@0.36.0
  - @voyant-travel/operations@0.7.0
  - @voyant-travel/quotes@0.129.0
  - @voyant-travel/inventory@0.11.0
  - @voyant-travel/distribution@0.150.0
  - @voyant-travel/flights@0.160.0
  - @voyant-travel/identity@0.160.0
  - @voyant-travel/trips@0.151.0
  - @voyant-travel/legal@0.160.0
  - @voyant-travel/mice@0.16.0
  - @voyant-travel/operator-settings@0.4.0
  - @voyant-travel/notifications@0.128.1
  - @voyant-travel/relationships@0.126.0
  - @voyant-travel/navigation-preferences@0.3.0
  - @voyant-travel/setup@0.3.0
  - @voyant-travel/storefront@0.162.0
  - @voyant-travel/charters@0.158.0
  - @voyant-travel/cruises@0.159.0
  - @voyant-travel/workflow-runs@0.121.0
  - @voyant-travel/bookings-react@0.160.0
  - @voyant-travel/storefront-react@0.162.0
  - @voyant-travel/action-ledger-react@0.47.0
  - @voyant-travel/db@0.114.7
  - @voyant-travel/event-catalog@0.2.1
  - @voyant-travel/event-catalog-react@0.3.0
  - @voyant-travel/public-document-delivery@0.3.7
  - @voyant-travel/realtime@0.5.2
  - @voyant-travel/storage@0.110.2
  - @voyant-travel/finance-react@0.160.0
  - @voyant-travel/flights-react@0.160.0
  - @voyant-travel/inventory-react@0.42.0
  - @voyant-travel/operator-settings-react@0.13.0
  - @voyant-travel/trips-react@0.151.0
  - @voyant-travel/auth-react@0.131.0
  - @voyant-travel/commerce-react@0.42.0
  - @voyant-travel/operations-react@0.41.0
  - @voyant-travel/quotes-react@0.158.0
  - @voyant-travel/distribution-react@0.150.0
  - @voyant-travel/identity-react@0.160.0
  - @voyant-travel/legal-react@0.160.0
  - @voyant-travel/mice-react@0.28.0
  - @voyant-travel/relationships-react@0.160.0
  - @voyant-travel/navigation-preferences-react@0.3.0
  - @voyant-travel/setup-react@0.3.0
  - @voyant-travel/cruises-react@0.159.0
  - @voyant-travel/admin-app@0.52.0
  - @voyant-travel/catalog-react@0.158.0
  - @voyant-travel/admin-host@0.10.0
  - @voyant-travel/notifications-react@0.128.1
  - @voyant-travel/workflows@0.121.0
  - @voyant-travel/workflows-orchestrator@0.121.0

## 0.6.0

### Minor Changes

- 7e9f77a: Add organization defaults and member overrides for stable admin navigation IDs. Apply visibility
  after selected navigation composition without exposing ineligible routes, inherit hidden parent
  state through navigation subtrees, and retain structural parents only when a child is explicitly
  re-enabled. Ship the persistence, admin API, provisioning seam, and settings UI in standard Operator
  deployments, with duplicate settings contributions normalized at the host and core boundaries.
- 82ffd12: Add persisted organization-level first-run setup guidance composed from the
  selected admin graph. Standard Operator deployments now collect package-owned
  business profile, storefront, market, fiscal, navigation, team, and first-product
  steps while keeping domain mutations in their existing package surfaces.
- 9c85101: Compile one canonical event catalog from selected package manifests and expose it through
  generated deployment artifacts, graph runtimes, a package-owned admin API, and an admin event
  reference page. Reject duplicate event type authorities while preserving legitimate emitters,
  and ratchet persistence mutation coverage in the phase-5 authority checker.

### Patch Changes

- Updated dependencies [766d24b]
- Updated dependencies [7e9f77a]
- Updated dependencies [7e9f77a]
- Updated dependencies [b459761]
- Updated dependencies [49f55d0]
- Updated dependencies [82ffd12]
- Updated dependencies [a98ec27]
- Updated dependencies [552acbf]
- Updated dependencies [9c85101]
- Updated dependencies [6147b93]
- Updated dependencies [b459761]
  - @voyant-travel/ui@0.109.2
  - @voyant-travel/distribution-react@0.149.0
  - @voyant-travel/inventory-react@0.41.0
  - @voyant-travel/vite-config@0.3.4
  - @voyant-travel/admin@0.125.0
  - @voyant-travel/admin-app@0.51.0
  - @voyant-travel/admin-host@0.9.0
  - @voyant-travel/core@0.123.0
  - @voyant-travel/navigation-preferences@0.2.0
  - @voyant-travel/navigation-preferences-react@0.2.0
  - @voyant-travel/flights@0.159.0
  - @voyant-travel/trips@0.150.0
  - @voyant-travel/availability@0.2.12
  - @voyant-travel/bookings@0.159.0
  - @voyant-travel/bookings-react@0.159.0
  - @voyant-travel/catalog@0.157.0
  - @voyant-travel/finance@0.159.0
  - @voyant-travel/inventory@0.10.4
  - @voyant-travel/operations@0.6.14
  - @voyant-travel/auth-react@0.130.0
  - @voyant-travel/commerce-react@0.41.0
  - @voyant-travel/finance-react@0.159.0
  - @voyant-travel/operator-settings-react@0.12.0
  - @voyant-travel/setup@0.2.0
  - @voyant-travel/setup-react@0.2.0
  - @voyant-travel/storefront@0.161.0
  - @voyant-travel/storefront-react@0.161.0
  - @voyant-travel/auth@0.130.0
  - @voyant-travel/tools@0.2.2
  - @voyant-travel/event-catalog@0.2.0
  - @voyant-travel/event-catalog-react@0.2.0
  - @voyant-travel/action-ledger-react@0.46.0
  - @voyant-travel/mice-react@0.27.0
  - @voyant-travel/notifications-react@0.128.0
  - @voyant-travel/operations-react@0.40.0
  - @voyant-travel/quotes-react@0.157.0
  - @voyant-travel/trips-react@0.150.0
  - @voyant-travel/catalog-react@0.157.0
  - @voyant-travel/identity-react@0.159.0
  - @voyant-travel/legal-react@0.159.0
  - @voyant-travel/flights-react@0.159.0
  - @voyant-travel/relationships-react@0.159.0
  - @voyant-travel/accommodations@0.119.0
  - @voyant-travel/action-ledger@0.108.6
  - @voyant-travel/catalog-authoring@0.107.12
  - @voyant-travel/charters@0.157.0
  - @voyant-travel/commerce@0.35.9
  - @voyant-travel/cruises@0.158.0
  - @voyant-travel/db@0.114.6
  - @voyant-travel/distribution@0.149.0
  - @voyant-travel/identity@0.159.0
  - @voyant-travel/legal@0.159.0
  - @voyant-travel/mcp@0.2.6
  - @voyant-travel/mice@0.15.0
  - @voyant-travel/notifications@0.128.0
  - @voyant-travel/operator-settings@0.3.14
  - @voyant-travel/public-document-delivery@0.3.6
  - @voyant-travel/quotes@0.128.8
  - @voyant-travel/realtime@0.5.1
  - @voyant-travel/relationships@0.125.4
  - @voyant-travel/storage@0.110.1
  - @voyant-travel/workflow-runs@0.120.4
  - @voyant-travel/cruises-react@0.158.0
  - @voyant-travel/admin-react@0.125.0
  - @voyant-travel/workflows@0.120.4
  - @voyant-travel/workflows-orchestrator@0.120.4

## 0.5.0

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
  - @voyant-travel/framework-migrations@0.9.0
  - @voyant-travel/admin@0.124.0
  - @voyant-travel/auth@0.129.0
  - @voyant-travel/auth-react@0.129.0
  - @voyant-travel/bookings@0.158.0
  - @voyant-travel/distribution-react@0.148.0
  - @voyant-travel/finance-react@0.158.0
  - @voyant-travel/realtime@0.5.0
  - @voyant-travel/quotes-react@0.156.0
  - @voyant-travel/storage@0.110.0
  - @voyant-travel/accommodations@0.118.0
  - @voyant-travel/action-ledger@0.108.5
  - @voyant-travel/availability@0.2.11
  - @voyant-travel/bookings-react@0.158.0
  - @voyant-travel/catalog@0.156.0
  - @voyant-travel/catalog-authoring@0.107.11
  - @voyant-travel/catalog-react@0.156.0
  - @voyant-travel/charters@0.156.0
  - @voyant-travel/commerce@0.35.8
  - @voyant-travel/commerce-react@0.40.0
  - @voyant-travel/core@0.122.2
  - @voyant-travel/cruises@0.157.0
  - @voyant-travel/db@0.114.5
  - @voyant-travel/distribution@0.148.0
  - @voyant-travel/finance@0.158.0
  - @voyant-travel/flights@0.158.0
  - @voyant-travel/flights-react@0.158.0
  - @voyant-travel/identity@0.158.0
  - @voyant-travel/identity-react@0.158.0
  - @voyant-travel/inventory@0.10.3
  - @voyant-travel/inventory-react@0.40.0
  - @voyant-travel/legal@0.158.0
  - @voyant-travel/legal-react@0.158.0
  - @voyant-travel/mcp@0.2.5
  - @voyant-travel/mice@0.14.0
  - @voyant-travel/notifications@0.127.0
  - @voyant-travel/notifications-react@0.127.0
  - @voyant-travel/operations@0.6.13
  - @voyant-travel/operations-react@0.39.0
  - @voyant-travel/operator-settings@0.3.13
  - @voyant-travel/public-document-delivery@0.3.5
  - @voyant-travel/quotes@0.128.7
  - @voyant-travel/quotes-contracts@0.108.3
  - @voyant-travel/relationships@0.125.3
  - @voyant-travel/relationships-react@0.158.0
  - @voyant-travel/storefront@0.160.0
  - @voyant-travel/trips@0.149.0
  - @voyant-travel/trips-react@0.149.0
  - @voyant-travel/types@0.109.2
  - @voyant-travel/workflow-runs@0.120.3
  - @voyant-travel/workflows@0.120.3
  - @voyant-travel/workflows-orchestrator@0.120.3
  - @voyant-travel/action-ledger-react@0.45.0
  - @voyant-travel/admin-app@0.50.0
  - @voyant-travel/admin-host@0.8.0
  - @voyant-travel/mice-react@0.26.0
  - @voyant-travel/operator-settings-react@0.11.0
  - @voyant-travel/storefront-react@0.160.0
  - @voyant-travel/cruises-react@0.157.0
  - @voyant-travel/admin-react@0.124.0

## 0.4.6

### Patch Changes

- Updated dependencies [f9a2d77]
  - @voyant-travel/catalog@0.155.1
  - @voyant-travel/catalog-react@0.155.1

## 0.4.5

### Patch Changes

- Updated dependencies [0808b21]
  - @voyant-travel/catalog@0.155.0
  - @voyant-travel/catalog-react@0.155.0
  - @voyant-travel/storefront-react@0.159.0
  - @voyant-travel/bookings-react@0.157.0
  - @voyant-travel/cruises-react@0.156.0
  - @voyant-travel/flights@0.157.0
  - @voyant-travel/inventory-react@0.39.0
  - @voyant-travel/trips@0.148.0
  - @voyant-travel/action-ledger-react@0.44.0
  - @voyant-travel/distribution-react@0.147.0
  - @voyant-travel/finance-react@0.157.0
  - @voyant-travel/identity-react@0.157.0
  - @voyant-travel/legal-react@0.157.0
  - @voyant-travel/operations-react@0.38.0
  - @voyant-travel/trips-react@0.148.0
  - @voyant-travel/admin-app@0.49.0
  - @voyant-travel/commerce-react@0.39.0
  - @voyant-travel/flights-react@0.157.0
  - @voyant-travel/operator-settings-react@0.10.0
  - @voyant-travel/relationships-react@0.157.0
  - @voyant-travel/admin-host@0.7.0
  - @voyant-travel/mice-react@0.25.0
  - @voyant-travel/quotes-react@0.155.0
  - @voyant-travel/bookings@0.157.0
  - @voyant-travel/charters@0.155.0
  - @voyant-travel/cruises@0.156.0
  - @voyant-travel/distribution@0.147.0
  - @voyant-travel/finance@0.157.0
  - @voyant-travel/identity@0.157.0
  - @voyant-travel/legal@0.157.0
  - @voyant-travel/storefront@0.159.0
  - @voyant-travel/accommodations@0.117.0
  - @voyant-travel/commerce@0.35.7
  - @voyant-travel/inventory@0.10.2
  - @voyant-travel/operations@0.6.12
  - @voyant-travel/quotes@0.128.6
  - @voyant-travel/mice@0.13.0
  - @voyant-travel/notifications@0.126.5
  - @voyant-travel/relationships@0.125.2
  - @voyant-travel/operator-settings@0.3.12
  - @voyant-travel/notifications-react@0.126.5

## 0.4.4

### Patch Changes

- 8d62a7c: Republish every affected TypeScript package without broken declaration maps so the corrected artifact
  policy reaches npm instead of applying only to future incidental package releases.
- Updated dependencies [8d62a7c]
- Updated dependencies [7916020]
- Updated dependencies [8d62a7c]
  - @voyant-travel/auth@0.128.3
  - @voyant-travel/commerce-react@0.38.1
  - @voyant-travel/core@0.122.1
  - @voyant-travel/db@0.114.4
  - @voyant-travel/runtime-core@0.6.3
  - @voyant-travel/types@0.109.1
  - @voyant-travel/utils@0.107.1
  - @voyant-travel/catalog@0.154.1
  - @voyant-travel/accommodations@0.116.1
  - @voyant-travel/action-ledger@0.108.4
  - @voyant-travel/action-ledger-react@0.43.1
  - @voyant-travel/admin@0.123.3
  - @voyant-travel/admin-app@0.48.1
  - @voyant-travel/admin-host@0.6.1
  - @voyant-travel/admin-react@0.123.3
  - @voyant-travel/auth-react@0.128.3
  - @voyant-travel/availability@0.2.10
  - @voyant-travel/bookings@0.156.1
  - @voyant-travel/bookings-react@0.156.1
  - @voyant-travel/catalog-authoring@0.107.10
  - @voyant-travel/catalog-react@0.154.1
  - @voyant-travel/charters@0.154.1
  - @voyant-travel/commerce@0.35.6
  - @voyant-travel/cruises@0.155.1
  - @voyant-travel/cruises-react@0.155.1
  - @voyant-travel/distribution@0.146.1
  - @voyant-travel/distribution-react@0.146.1
  - @voyant-travel/finance@0.156.1
  - @voyant-travel/finance-react@0.156.1
  - @voyant-travel/flights@0.156.1
  - @voyant-travel/flights-react@0.156.1
  - @voyant-travel/framework-migrations@0.8.1
  - @voyant-travel/identity@0.156.1
  - @voyant-travel/identity-react@0.156.1
  - @voyant-travel/inventory@0.10.1
  - @voyant-travel/inventory-react@0.38.1
  - @voyant-travel/legal@0.156.1
  - @voyant-travel/legal-react@0.156.1
  - @voyant-travel/mcp@0.2.4
  - @voyant-travel/mice@0.12.1
  - @voyant-travel/mice-react@0.24.1
  - @voyant-travel/notifications@0.126.4
  - @voyant-travel/notifications-react@0.126.4
  - @voyant-travel/operations@0.6.11
  - @voyant-travel/operations-react@0.37.1
  - @voyant-travel/operator-settings@0.3.11
  - @voyant-travel/operator-settings-react@0.9.1
  - @voyant-travel/public-document-delivery@0.3.4
  - @voyant-travel/quotes@0.128.5
  - @voyant-travel/quotes-react@0.154.1
  - @voyant-travel/realtime@0.4.5
  - @voyant-travel/realtime-react@0.2.2
  - @voyant-travel/relationships@0.125.1
  - @voyant-travel/relationships-react@0.156.1
  - @voyant-travel/storage@0.109.4
  - @voyant-travel/storefront@0.158.1
  - @voyant-travel/storefront-react@0.158.1
  - @voyant-travel/tools@0.2.1
  - @voyant-travel/trips@0.147.1
  - @voyant-travel/trips-react@0.147.1
  - @voyant-travel/ui@0.109.1
  - @voyant-travel/vite-config@0.3.3
  - @voyant-travel/workflow-runs@0.120.2
  - @voyant-travel/workflows@0.120.2
  - @voyant-travel/workflows-orchestrator@0.120.2

## 0.4.3

### Patch Changes

- Updated dependencies [bbe6396]
  - @voyant-travel/finance@0.156.0
  - @voyant-travel/finance-react@0.156.0
  - @voyant-travel/bookings-react@0.156.0
  - @voyant-travel/bookings@0.156.0
  - @voyant-travel/inventory@0.10.0
  - @voyant-travel/trips-react@0.147.0
  - @voyant-travel/relationships@0.125.0
  - @voyant-travel/storefront@0.158.0
  - @voyant-travel/storefront-react@0.158.0
  - @voyant-travel/distribution@0.146.0
  - @voyant-travel/accommodations@0.116.0
  - @voyant-travel/catalog@0.154.0
  - @voyant-travel/commerce@0.35.5
  - @voyant-travel/cruises@0.155.0
  - @voyant-travel/flights@0.156.0
  - @voyant-travel/flights-react@0.156.0
  - @voyant-travel/inventory-react@0.38.0
  - @voyant-travel/legal@0.156.0
  - @voyant-travel/notifications@0.126.3
  - @voyant-travel/operator-settings@0.3.10
  - @voyant-travel/operator-settings-react@0.9.0
  - @voyant-travel/trips@0.147.0
  - @voyant-travel/admin-app@0.48.0
  - @voyant-travel/action-ledger-react@0.43.0
  - @voyant-travel/distribution-react@0.146.0
  - @voyant-travel/identity-react@0.156.0
  - @voyant-travel/legal-react@0.156.0
  - @voyant-travel/operations-react@0.37.0
  - @voyant-travel/charters@0.154.0
  - @voyant-travel/mice@0.12.0
  - @voyant-travel/catalog-react@0.154.0
  - @voyant-travel/cruises-react@0.155.0
  - @voyant-travel/catalog-authoring@0.107.9
  - @voyant-travel/admin@0.123.2
  - @voyant-travel/auth-react@0.128.2
  - @voyant-travel/commerce-react@0.38.0
  - @voyant-travel/mice-react@0.24.0
  - @voyant-travel/notifications-react@0.126.3
  - @voyant-travel/quotes-react@0.154.0
  - @voyant-travel/relationships-react@0.156.0
  - @voyant-travel/quotes@0.128.4
  - @voyant-travel/db@0.114.3
  - @voyant-travel/admin-host@0.6.0
  - @voyant-travel/admin-react@0.123.2
  - @voyant-travel/auth@0.128.2
  - @voyant-travel/identity@0.156.0
  - @voyant-travel/workflow-runs@0.120.1
  - @voyant-travel/workflows@0.120.1
  - @voyant-travel/workflows-orchestrator@0.120.1
  - @voyant-travel/operations@0.6.10

## 0.4.2

### Patch Changes

- d83d237: Repair packaged consumer development and production startup, keep shared UI
  contexts single-instanced under Vite, make unconfigured realtime quiet, and
  restore narrow client-safe validation and Finance voucher setup exports. Resolve
  legacy frontend imports through product-owned browser facades and allow clean CI
  installs to fetch metadata for external dependencies.
- Updated dependencies [d83d237]
  - @voyant-travel/admin@0.123.1
  - @voyant-travel/admin-host@0.5.1
  - @voyant-travel/bookings@0.155.2
  - @voyant-travel/finance@0.155.2
  - @voyant-travel/realtime@0.4.4
  - @voyant-travel/realtime-react@0.2.1
  - @voyant-travel/storefront@0.157.2
  - @voyant-travel/storefront-react@0.157.2
  - @voyant-travel/vite-config@0.3.2
  - @voyant-travel/admin-react@0.123.1
  - @voyant-travel/bookings-react@0.155.2
  - @voyant-travel/finance-react@0.155.2

## 0.4.1

### Patch Changes

- Updated dependencies [df3e4ec]
  - @voyant-travel/catalog@0.153.2
  - @voyant-travel/cruises@0.154.2
  - @voyant-travel/commerce@0.35.4
  - @voyant-travel/catalog-react@0.153.2
  - @voyant-travel/cruises-react@0.154.2

## 0.4.0

### Minor Changes

- 2cc954a: Make outbound webhook enqueue authority an explicit deployment provider. Standard Operator and managed-cloud deployments select `outboundWebhooks: "postgres"`; projects may instead select `"host"` with an injected `host.deliverEvent`, or `"none"` to omit graph outbound composition. `@voyant-travel/webhook-delivery` now owns provider resolution and the Postgres enqueuer adapter, while generic Runtime no longer calls the concrete Postgres enqueue function. Regenerate graphs so the provider role is present. See [Migrating to Framework 0.42](../docs/migrations/migrating-to-0.42.md#outbound-webhook-enqueue-provider).
- 07a6ee3: Make `deployment.providers.workflows` authoritative for Node workflow execution and Workflow Runs admin ownership. Self-hosted Operators now use the durable Postgres driver and receive package-owned orchestrator migrations; local mode uses the in-memory adapter, `none` omits workflow composition, and Voyant Cloud fails closed when credentials are missing.

  Scheduled one-shot dispatch disables resident scheduler and time-wheel loops and always shuts down its driver. Managed Cloud snapshots must select `voyant-cloud` before this release is deployed.

  See the [Framework 0.42 migration guide](../docs/migrations/migrating-to-0.42.md) for provider, migration, and rollout steps.

### Patch Changes

- Updated dependencies [818ea84]
- Updated dependencies [2669577]
- Updated dependencies [cc85042]
- Updated dependencies [07a6ee3]
  - @voyant-travel/workflows@0.120.0
  - @voyant-travel/vite-config@0.3.1
  - @voyant-travel/core@0.122.0
  - @voyant-travel/bookings@0.155.1
  - @voyant-travel/db@0.114.2
  - @voyant-travel/finance@0.155.1
  - @voyant-travel/inventory@0.9.3
  - @voyant-travel/legal@0.155.1
  - @voyant-travel/runtime-core@0.6.2
  - @voyant-travel/storage@0.109.3
  - @voyant-travel/workflows-orchestrator@0.120.0
  - @voyant-travel/workflow-runs@0.120.0
  - @voyant-travel/distribution@0.145.1
  - @voyant-travel/accommodations@0.115.1
  - @voyant-travel/action-ledger@0.108.3
  - @voyant-travel/auth@0.128.1
  - @voyant-travel/availability@0.2.9
  - @voyant-travel/catalog@0.153.1
  - @voyant-travel/catalog-authoring@0.107.8
  - @voyant-travel/charters@0.153.1
  - @voyant-travel/commerce@0.35.3
  - @voyant-travel/cruises@0.154.1
  - @voyant-travel/flights@0.155.1
  - @voyant-travel/identity@0.155.1
  - @voyant-travel/mcp@0.2.3
  - @voyant-travel/mice@0.11.1
  - @voyant-travel/notifications@0.126.2
  - @voyant-travel/operations@0.6.9
  - @voyant-travel/operator-settings@0.3.9
  - @voyant-travel/public-document-delivery@0.3.3
  - @voyant-travel/quotes@0.128.3
  - @voyant-travel/realtime@0.4.3
  - @voyant-travel/relationships@0.124.4
  - @voyant-travel/storefront@0.157.1
  - @voyant-travel/trips@0.146.1
  - @voyant-travel/auth-react@0.128.1
  - @voyant-travel/bookings-react@0.155.1
  - @voyant-travel/catalog-react@0.153.1
  - @voyant-travel/cruises-react@0.154.1
  - @voyant-travel/distribution-react@0.145.1
  - @voyant-travel/finance-react@0.155.1
  - @voyant-travel/flights-react@0.155.1
  - @voyant-travel/legal-react@0.155.1
  - @voyant-travel/notifications-react@0.126.2
  - @voyant-travel/storefront-react@0.157.1
  - @voyant-travel/trips-react@0.146.1

## 0.3.0

### Minor Changes

- 3f6694b: Select the customer Storefront presentation through the deployment graph. Project resolution now emits a selected presentation factory artifact, and the standard Operator emits Storefront routes only when that presentation is selected.

### Patch Changes

- Updated dependencies [4bc540f]
- Updated dependencies [bb6e890]
- Updated dependencies [3f6694b]
- Updated dependencies [37031e9]
  - @voyant-travel/auth@0.128.0
  - @voyant-travel/legal@0.155.0
  - @voyant-travel/core@0.121.0
  - @voyant-travel/storefront@0.157.0
  - @voyant-travel/workflow-runs@0.119.0
  - @voyant-travel/auth-react@0.128.0
  - @voyant-travel/legal-react@0.155.0
  - @voyant-travel/notifications@0.126.1
  - @voyant-travel/accommodations@0.115.0
  - @voyant-travel/action-ledger@0.108.2
  - @voyant-travel/availability@0.2.8
  - @voyant-travel/bookings@0.155.0
  - @voyant-travel/catalog@0.153.0
  - @voyant-travel/catalog-authoring@0.107.7
  - @voyant-travel/charters@0.153.0
  - @voyant-travel/commerce@0.35.2
  - @voyant-travel/cruises@0.154.0
  - @voyant-travel/db@0.114.1
  - @voyant-travel/distribution@0.145.0
  - @voyant-travel/finance@0.155.0
  - @voyant-travel/flights@0.155.0
  - @voyant-travel/identity@0.155.0
  - @voyant-travel/inventory@0.9.2
  - @voyant-travel/mcp@0.2.2
  - @voyant-travel/mice@0.11.0
  - @voyant-travel/operations@0.6.8
  - @voyant-travel/operator-settings@0.3.8
  - @voyant-travel/public-document-delivery@0.3.2
  - @voyant-travel/quotes@0.128.2
  - @voyant-travel/realtime@0.4.2
  - @voyant-travel/relationships@0.124.3
  - @voyant-travel/storage@0.109.2
  - @voyant-travel/trips@0.146.0
  - @voyant-travel/storefront-react@0.157.0
  - @voyant-travel/admin-app@0.47.0
  - @voyant-travel/quotes-react@0.153.0
  - @voyant-travel/bookings-react@0.155.0
  - @voyant-travel/cruises-react@0.154.0
  - @voyant-travel/inventory-react@0.37.0
  - @voyant-travel/admin-host@0.5.0
  - @voyant-travel/operator-settings-react@0.8.0
  - @voyant-travel/action-ledger-react@0.42.0
  - @voyant-travel/distribution-react@0.145.0
  - @voyant-travel/finance-react@0.155.0
  - @voyant-travel/operations-react@0.36.0
  - @voyant-travel/trips-react@0.146.0
  - @voyant-travel/catalog-react@0.153.0
  - @voyant-travel/commerce-react@0.37.0
  - @voyant-travel/flights-react@0.155.0
  - @voyant-travel/relationships-react@0.155.0
  - @voyant-travel/mice-react@0.23.0
  - @voyant-travel/notifications-react@0.126.1
  - @voyant-travel/workflows@0.119.0
  - @voyant-travel/workflows-orchestrator@0.119.0

## 0.2.3

### Patch Changes

- Updated dependencies [4d0eeed]
- Updated dependencies [bef5b7c]
- Updated dependencies [8bd906f]
- Updated dependencies [d4fa159]
  - @voyant-travel/types@0.109.0
  - @voyant-travel/utils@0.107.0
  - @voyant-travel/db@0.114.0
  - @voyant-travel/finance@0.154.0
  - @voyant-travel/legal@0.154.0
  - @voyant-travel/core@0.120.0
  - @voyant-travel/ui@0.109.0
  - @voyant-travel/notifications-react@0.126.0
  - @voyant-travel/legal-react@0.154.0
  - @voyant-travel/auth@0.127.0
  - @voyant-travel/accommodations@0.114.0
  - @voyant-travel/action-ledger@0.108.1
  - @voyant-travel/bookings@0.154.0
  - @voyant-travel/catalog@0.152.0
  - @voyant-travel/catalog-authoring@0.107.6
  - @voyant-travel/charters@0.152.0
  - @voyant-travel/commerce@0.35.1
  - @voyant-travel/cruises@0.153.0
  - @voyant-travel/distribution@0.144.0
  - @voyant-travel/flights@0.154.0
  - @voyant-travel/identity@0.154.0
  - @voyant-travel/inventory@0.9.1
  - @voyant-travel/mcp@0.2.1
  - @voyant-travel/mice@0.10.0
  - @voyant-travel/notifications@0.126.0
  - @voyant-travel/operations@0.6.7
  - @voyant-travel/operator-settings@0.3.7
  - @voyant-travel/quotes@0.128.1
  - @voyant-travel/realtime@0.4.1
  - @voyant-travel/relationships@0.124.2
  - @voyant-travel/storefront@0.156.0
  - @voyant-travel/trips@0.145.0
  - @voyant-travel/workflow-runs@0.118.0
  - @voyant-travel/admin@0.123.0
  - @voyant-travel/admin-app@0.46.0
  - @voyant-travel/admin-host@0.4.0
  - @voyant-travel/auth-react@0.127.0
  - @voyant-travel/bookings-react@0.154.0
  - @voyant-travel/commerce-react@0.36.0
  - @voyant-travel/cruises-react@0.153.0
  - @voyant-travel/distribution-react@0.144.0
  - @voyant-travel/finance-react@0.154.0
  - @voyant-travel/inventory-react@0.36.0
  - @voyant-travel/mice-react@0.22.0
  - @voyant-travel/operations-react@0.35.0
  - @voyant-travel/quotes-react@0.152.0
  - @voyant-travel/relationships-react@0.154.0
  - @voyant-travel/runtime-core@0.6.1
  - @voyant-travel/availability@0.2.7
  - @voyant-travel/public-document-delivery@0.3.1
  - @voyant-travel/storage@0.109.1
  - @voyant-travel/action-ledger-react@0.41.0
  - @voyant-travel/catalog-react@0.152.0
  - @voyant-travel/flights-react@0.154.0
  - @voyant-travel/operator-settings-react@0.7.0
  - @voyant-travel/storefront-react@0.156.0
  - @voyant-travel/trips-react@0.145.0
  - @voyant-travel/admin-react@0.123.0
  - @voyant-travel/workflows@0.118.0
  - @voyant-travel/workflows-orchestrator@0.118.0

## 0.2.2

### Patch Changes

- Updated dependencies [b29e7e8]
  - @voyant-travel/catalog@0.151.2
  - @voyant-travel/catalog-react@0.151.2

## 0.2.1

### Patch Changes

- Updated dependencies [0defbd6]
  - @voyant-travel/catalog@0.151.1
  - @voyant-travel/catalog-react@0.151.1

## 0.2.0

### Minor Changes

- c65b05c: Add the explicit standard Operator product distribution package, move standard
  selection and exact-pinned dependency ownership into it, and resolve selected
  package manifests relative to the distribution under strict pnpm installs.
- 1f6effe: Add the versioned `@voyant-travel/runtime/tooling` project build and development server API for external CLI consumers, and keep generated standard frontend routes resolvable through the selected product distribution.
- c65b05c: Generate standard Operator route registrations under `.voyant`, move public
  Finance and Quotes route behavior into package-owned contributions, and move
  standard route composition into the product distribution so application source
  contains only deployment adapters and local customization.
- c65b05c: Move the standard Operator frontend runtime, route adapters, API documentation,
  provider stack, and stylesheet bootstrap from the generic admin host into the
  standard product distribution.
- 282892e: Make `@voyant-travel/runtime` the single public Node project host, move low-level
  host primitives to `@voyant-travel/runtime-core`, and remove the package-owned
  runtime CLI. Rename remaining first-party operator-specific subpaths to generic
  runtime or runtime-support surfaces.

### Patch Changes

- c65b05c: Emit Node-compatible `.js` specifiers in the standard generated route source.
- Updated dependencies [490d132]
- Updated dependencies [047c3f9]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [c65b05c]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [c65b05c]
- Updated dependencies [490d132]
- Updated dependencies [c65b05c]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [047c3f9]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [c65b05c]
- Updated dependencies [c65b05c]
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
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [047c3f9]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [282892e]
- Updated dependencies [490d132]
  - @voyant-travel/auth@0.126.0
  - @voyant-travel/bookings@0.153.0
  - @voyant-travel/commerce@0.35.0
  - @voyant-travel/finance@0.153.0
  - @voyant-travel/legal@0.153.0
  - @voyant-travel/storefront@0.155.0
  - @voyant-travel/action-ledger@0.108.0
  - @voyant-travel/cruises@0.152.0
  - @voyant-travel/distribution@0.143.0
  - @voyant-travel/flights@0.153.0
  - @voyant-travel/mice@0.9.0
  - @voyant-travel/notifications@0.125.0
  - @voyant-travel/realtime@0.4.0
  - @voyant-travel/relationships@0.124.1
  - @voyant-travel/storage@0.109.0
  - @voyant-travel/trips@0.144.0
  - @voyant-travel/workflow-runs@0.117.0
  - @voyant-travel/bookings-react@0.153.0
  - @voyant-travel/admin-host@0.3.0
  - @voyant-travel/auth-react@0.126.0
  - @voyant-travel/quotes@0.128.0
  - @voyant-travel/db@0.113.0
  - @voyant-travel/realtime-react@0.2.0
  - @voyant-travel/accommodations@0.113.0
  - @voyant-travel/core@0.119.0
  - @voyant-travel/inventory@0.9.0
  - @voyant-travel/catalog@0.151.0
  - @voyant-travel/mcp@0.2.0
  - @voyant-travel/admin@0.122.0
  - @voyant-travel/commerce-react@0.35.0
  - @voyant-travel/distribution-react@0.143.0
  - @voyant-travel/finance-react@0.153.0
  - @voyant-travel/flights-react@0.153.0
  - @voyant-travel/legal-react@0.153.0
  - @voyant-travel/notifications-react@0.125.0
  - @voyant-travel/operations@0.6.6
  - @voyant-travel/operations-react@0.34.0
  - @voyant-travel/relationships-react@0.153.0
  - @voyant-travel/trips-react@0.144.0
  - @voyant-travel/vite-config@0.3.0
  - @voyant-travel/quotes-react@0.151.0
  - @voyant-travel/storefront-react@0.155.0
  - @voyant-travel/catalog-react@0.151.0
  - @voyant-travel/cruises-react@0.152.0
  - @voyant-travel/inventory-react@0.35.0
  - @voyant-travel/operator-settings@0.3.6
  - @voyant-travel/admin-app@0.45.0
  - @voyant-travel/tools@0.2.0
  - @voyant-travel/operator-settings-react@0.6.0
  - @voyant-travel/public-document-delivery@0.3.0
  - @voyant-travel/charters@0.151.0
  - @voyant-travel/admin-react@0.122.0
  - @voyant-travel/framework-migrations@0.8.0
  - @voyant-travel/availability@0.2.6
  - @voyant-travel/catalog-authoring@0.107.5
  - @voyant-travel/types@0.108.1
  - @voyant-travel/runtime-core@0.6.0
  - @voyant-travel/action-ledger-react@0.40.0
  - @voyant-travel/mice-react@0.21.0
  - @voyant-travel/identity@0.153.0
  - @voyant-travel/workflows@0.117.0
  - @voyant-travel/workflows-orchestrator@0.117.0
