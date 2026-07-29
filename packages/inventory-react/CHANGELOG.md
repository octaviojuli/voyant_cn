# @voyant-travel/inventory-react

## 0.45.0

### Minor Changes

- 192a635: 线路上线助理接入管理后台:产品之下新增「线路上线助理」两个页面。

  列表页上传 Word/PDF 并列出草稿;复核页展示线路概览图、基础信息、逐日行程
  (用餐/住宿/里程车程)、费用包含与不含,以及解析器没能识别的字段,确认后
  建出产品。

  概览图以 `<img src="data:image/svg+xml,…">` 渲染而非内联进 DOM——图上的
  城市名来自上传的文档,等同于外部输入,而 `<img>` 里的 SVG 按规范不执行脚本。

### Patch Changes

- 115b00b: 修复 multipart 上传:FormData 请求体不再被强设为 application/json。

  `fetchWithValidation` 原先只要请求体不为空就补上 `Content-Type:
application/json`。对 FormData 来说这是错的——显式设了 Content-Type,fetch
  就不会生成 multipart 的 boundary,服务端收到的是一个声称是 JSON 的 multipart
  body,`parseBody()` 解析不了。报价配图上传因此一直是坏的。

  `legal-react` 早已有同样的防护,这里按同一写法补齐。

- 37fac2f: 修复线路上线助理接口与页面均无法访问的两处缺陷。

  `packages/inventory/package.json` 缺少 `./import-extension` 导出,而
  `operator-standard` 的启用清单按这个子路径解析扩展——解析不到就被静默丢弃,
  接口从未挂载。

  挂载点由 `products` 改为 `route-imports`:核心产品接口有 `/products/{id}`,
  任何 `/products/<静态段>` 都会被它当成产品 ID 吃掉。前端页面路径同步移出
  `/products/` 之下。

- Updated dependencies [89fe90a]
- Updated dependencies [5652440]
- Updated dependencies [4ac7d46]
- Updated dependencies [f535cfd]
- Updated dependencies [f5e02bd]
- Updated dependencies [89fe90a]
- Updated dependencies [192a635]
- Updated dependencies [15d1f88]
- Updated dependencies [08c5aa2]
- Updated dependencies [37fac2f]
- Updated dependencies [ffcf632]
- Updated dependencies [34aaebe]
- Updated dependencies [89fe90a]
  - @voyant-travel/inventory@0.13.0
  - @voyant-travel/operations@0.8.1
  - @voyant-travel/i18n@0.112.0
  - @voyant-travel/catalog-react@0.161.0
  - @voyant-travel/finance-react@0.163.0
  - @voyant-travel/admin@0.126.1
  - @voyant-travel/finance@0.163.0
  - @voyant-travel/storefront-react@0.165.0

## 0.44.0

### Patch Changes

- Updated dependencies [8f0fa26]
  - @voyant-travel/finance@0.162.0
  - @voyant-travel/inventory@0.12.0
  - @voyant-travel/storefront-react@0.164.0
  - @voyant-travel/finance-react@0.162.0
  - @voyant-travel/catalog-react@0.160.0

## 0.43.0

### Patch Changes

- Updated dependencies [c1e37f2]
- Updated dependencies [85bfe2c]
  - @voyant-travel/admin@0.126.0
  - @voyant-travel/finance@0.161.0
  - @voyant-travel/catalog-react@0.159.0
  - @voyant-travel/finance-react@0.161.0
  - @voyant-travel/storefront-react@0.163.0
  - @voyant-travel/inventory@0.11.1

## 0.42.0

### Patch Changes

- Updated dependencies [701ccc4]
- Updated dependencies [372f4f4]
- Updated dependencies [a2fd806]
- Updated dependencies [7e4ab07]
- Updated dependencies [497dff2]
- Updated dependencies [db5adce]
- Updated dependencies [6604f9e]
  - @voyant-travel/finance@0.160.0
  - @voyant-travel/inventory@0.11.0
  - @voyant-travel/storefront-react@0.162.0
  - @voyant-travel/finance-react@0.160.0
  - @voyant-travel/catalog-react@0.158.0

## 0.41.0

### Minor Changes

- 82ffd12: Add persisted organization-level first-run setup guidance composed from the
  selected admin graph. Standard Operator deployments now collect package-owned
  business profile, storefront, market, fiscal, navigation, team, and first-product
  steps while keeping domain mutations in their existing package surfaces.

### Patch Changes

- 766d24b: Associate admin form controls with visible labels and validation messages, and add accessible names to phone, channel, product translation, tag, action-menu, and channel-assignment helpers.
- Updated dependencies [766d24b]
- Updated dependencies [7e9f77a]
- Updated dependencies [49f55d0]
- Updated dependencies [82ffd12]
- Updated dependencies [9c85101]
- Updated dependencies [6147b93]
- Updated dependencies [b459761]
  - @voyant-travel/ui@0.109.2
  - @voyant-travel/admin@0.125.0
  - @voyant-travel/catalog-contracts@0.111.1
  - @voyant-travel/finance@0.159.0
  - @voyant-travel/inventory@0.10.4
  - @voyant-travel/finance-react@0.159.0
  - @voyant-travel/storefront-react@0.161.0
  - @voyant-travel/catalog-react@0.157.0

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
  - @voyant-travel/finance-react@0.158.0
  - @voyant-travel/catalog-react@0.156.0
  - @voyant-travel/finance@0.158.0
  - @voyant-travel/inventory@0.10.3
  - @voyant-travel/types@0.109.2
  - @voyant-travel/storefront-react@0.160.0

## 0.39.0

### Patch Changes

- Updated dependencies [0808b21]
  - @voyant-travel/catalog-contracts@0.111.0
  - @voyant-travel/catalog-react@0.155.0
  - @voyant-travel/storefront-react@0.159.0
  - @voyant-travel/finance-react@0.157.0
  - @voyant-travel/finance@0.157.0
  - @voyant-travel/inventory@0.10.2

## 0.38.1

### Patch Changes

- 8d62a7c: Republish every affected TypeScript package without broken declaration maps so the corrected artifact
  policy reaches npm instead of applying only to future incidental package releases.
- Updated dependencies [8d62a7c]
- Updated dependencies [8d62a7c]
  - @voyant-travel/types@0.109.1
  - @voyant-travel/utils@0.107.1
  - @voyant-travel/admin@0.123.3
  - @voyant-travel/catalog-contracts@0.110.1
  - @voyant-travel/catalog-react@0.154.1
  - @voyant-travel/finance@0.156.1
  - @voyant-travel/finance-react@0.156.1
  - @voyant-travel/i18n@0.111.1
  - @voyant-travel/inventory@0.10.1
  - @voyant-travel/react@0.104.2
  - @voyant-travel/storefront-react@0.158.1
  - @voyant-travel/ui@0.109.1

## 0.38.0

### Patch Changes

- Updated dependencies [bbe6396]
  - @voyant-travel/finance@0.156.0
  - @voyant-travel/finance-react@0.156.0
  - @voyant-travel/catalog-contracts@0.110.0
  - @voyant-travel/inventory@0.10.0
  - @voyant-travel/i18n@0.111.0
  - @voyant-travel/storefront-react@0.158.0
  - @voyant-travel/catalog-react@0.154.0
  - @voyant-travel/admin@0.123.2

## 0.37.0

### Patch Changes

- @voyant-travel/finance@0.155.0
- @voyant-travel/inventory@0.9.2
- @voyant-travel/storefront-react@0.157.0
- @voyant-travel/finance-react@0.155.0
- @voyant-travel/catalog-react@0.153.0

## 0.36.0

### Patch Changes

- Updated dependencies [4d0eeed]
- Updated dependencies [8bd906f]
  - @voyant-travel/types@0.109.0
  - @voyant-travel/utils@0.107.0
  - @voyant-travel/finance@0.154.0
  - @voyant-travel/ui@0.109.0
  - @voyant-travel/inventory@0.9.1
  - @voyant-travel/admin@0.123.0
  - @voyant-travel/finance-react@0.154.0
  - @voyant-travel/catalog-react@0.152.0
  - @voyant-travel/storefront-react@0.156.0

## 0.35.0

### Minor Changes

- 490d132: Expose package-owned storefront browse, content resolution, slot selection, and
  product, accommodation, and cruise detail components.

### Patch Changes

- 490d132: Remove the final Operator admin factory compatibility registry by composing cross-domain behavior through package-owned selected graph slots and contributions.
- Updated dependencies [047c3f9]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [047c3f9]
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
- Updated dependencies [c65b05c]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [490d132]
- Updated dependencies [282892e]
- Updated dependencies [490d132]
  - @voyant-travel/finance@0.153.0
  - @voyant-travel/inventory@0.9.0
  - @voyant-travel/admin@0.122.0
  - @voyant-travel/finance-react@0.153.0
  - @voyant-travel/storefront-react@0.155.0
  - @voyant-travel/catalog-react@0.151.0
  - @voyant-travel/types@0.108.1

## 0.34.0

### Patch Changes

- Updated dependencies [60b1970]
- Updated dependencies [977c1bd]
- Updated dependencies [8f4c242]
- Updated dependencies [d771be3]
- Updated dependencies [d771be3]
  - @voyant-travel/finance@0.152.0
  - @voyant-travel/inventory@0.8.6
  - @voyant-travel/types@0.108.0
  - @voyant-travel/admin@0.121.0
  - @voyant-travel/finance-react@0.152.0
  - @voyant-travel/utils@0.106.1
  - @voyant-travel/catalog-react@0.150.0

## 0.33.0

### Patch Changes

- Updated dependencies [a370024]
- Updated dependencies [e3dc5a9]
- Updated dependencies [a370024]
- Updated dependencies [e3dc5a9]
- Updated dependencies [e3dc5a9]
- Updated dependencies [a370024]
- Updated dependencies [a370024]
- Updated dependencies [e3dc5a9]
- Updated dependencies [e3dc5a9]
  - @voyant-travel/inventory@0.8.0
  - @voyant-travel/finance@0.151.0
  - @voyant-travel/finance-react@0.151.0
  - @voyant-travel/types@0.107.2
  - @voyant-travel/catalog-react@0.149.0

## 0.32.0

### Patch Changes

- @voyant-travel/finance@0.150.0
- @voyant-travel/inventory@0.7.11
- @voyant-travel/finance-react@0.150.0
- @voyant-travel/catalog-react@0.148.0

## 0.31.0

### Patch Changes

- Updated dependencies [a97e845]
  - @voyant-travel/admin@0.120.0
  - @voyant-travel/catalog-react@0.147.0
  - @voyant-travel/finance-react@0.149.0
  - @voyant-travel/finance@0.149.0
  - @voyant-travel/inventory@0.7.9

## 0.30.0

### Patch Changes

- Updated dependencies [8a665f3]
  - @voyant-travel/admin@0.119.0
  - @voyant-travel/catalog-react@0.146.0
  - @voyant-travel/finance-react@0.148.0
  - @voyant-travel/finance@0.148.0
  - @voyant-travel/inventory@0.7.8

## 0.29.0

### Patch Changes

- @voyant-travel/admin@0.118.0
- @voyant-travel/catalog-react@0.145.0
- @voyant-travel/finance-react@0.147.0
- @voyant-travel/finance@0.147.0
- @voyant-travel/inventory@0.7.7

## 0.28.0

### Patch Changes

- Updated dependencies [ecdf0fc]
  - @voyant-travel/admin@0.117.0
  - @voyant-travel/catalog-react@0.144.0
  - @voyant-travel/finance-react@0.146.0
  - @voyant-travel/finance@0.146.0
  - @voyant-travel/inventory@0.7.6

## 0.27.0

### Patch Changes

- @voyant-travel/inventory@0.7.5
- @voyant-travel/catalog-react@0.143.0
- @voyant-travel/finance-react@0.145.0
- @voyant-travel/finance@0.145.0

## 0.26.0

### Patch Changes

- @voyant-travel/finance@0.144.0
- @voyant-travel/finance-react@0.144.0
- @voyant-travel/catalog-react@0.142.0
- @voyant-travel/inventory@0.7.4

## 0.25.0

### Patch Changes

- Updated dependencies [425f92e]
  - @voyant-travel/utils@0.106.0
  - @voyant-travel/inventory@0.7.3
  - @voyant-travel/finance@0.143.0
  - @voyant-travel/ui@0.108.11
  - @voyant-travel/types@0.107.1
  - @voyant-travel/catalog-react@0.141.0
  - @voyant-travel/finance-react@0.143.0

## 0.24.0

### Patch Changes

- @voyant-travel/inventory@0.7.2
- @voyant-travel/catalog-react@0.140.0
- @voyant-travel/finance-react@0.142.0
- @voyant-travel/finance@0.142.0

## 0.23.1

### Patch Changes

- e6cad60: Route reusable upload and payment-link actions through the Voyant React provider API base and fetcher so split-origin deployments do not fall back to relative `/api` URLs.
- Updated dependencies [e6cad60]
  - @voyant-travel/finance-react@0.141.1
  - @voyant-travel/finance@0.141.1

## 0.23.0

### Patch Changes

- Updated dependencies [6711f4c]
  - @voyant-travel/catalog-react@0.139.0
  - @voyant-travel/inventory@0.7.1
  - @voyant-travel/finance-react@0.141.0
  - @voyant-travel/finance@0.141.0

## 0.22.0

### Patch Changes

- Updated dependencies [62e87ee]
- Updated dependencies [8405bee]
  - @voyant-travel/admin@0.116.0
  - @voyant-travel/i18n@0.110.0
  - @voyant-travel/inventory@0.7.0
  - @voyant-travel/catalog-react@0.138.0
  - @voyant-travel/finance-react@0.140.0
  - @voyant-travel/finance@0.140.0

## 0.21.0

### Patch Changes

- Updated dependencies [c9a356f]
- Updated dependencies [fc71db1]
- Updated dependencies [fc71db1]
- Updated dependencies [77f139b]
  - @voyant-travel/types@0.107.0
  - @voyant-travel/finance@0.139.0
  - @voyant-travel/inventory@0.6.0
  - @voyant-travel/admin@0.115.4
  - @voyant-travel/finance-react@0.139.0
  - @voyant-travel/utils@0.105.6
  - @voyant-travel/catalog-react@0.137.0

## 0.20.0

### Patch Changes

- @voyant-travel/catalog-react@0.136.0
- @voyant-travel/finance-react@0.138.0
- @voyant-travel/finance@0.138.0
- @voyant-travel/inventory@0.5.13

## 0.19.5

### Patch Changes

- ea21ebc: Start product detail summaries on the product default/base language instead of
  auto-selecting the first or operator-locale translation.
- Updated dependencies [5c1294f]
  - @voyant-travel/inventory@0.5.11

## 0.19.4

### Patch Changes

- ad02eae: Reject non-image product media as cover media and surface brochure generation failures in the product detail UI.
- Updated dependencies [a10b9ba]
- Updated dependencies [e005c4d]
- Updated dependencies [ad02eae]
  - @voyant-travel/inventory@0.5.10
  - @voyant-travel/i18n@0.109.5

## 0.19.3

### Patch Changes

- 16ec0cb: Render saved additional rate-plan room/category prices in the admin product detail grid and label the price controls for assistive technology.
- Updated dependencies [66ac9f3]
- Updated dependencies [16ec0cb]
- Updated dependencies [c1d45bc]
- Updated dependencies [7bdd9cc]
  - @voyant-travel/ui@0.108.8
  - @voyant-travel/i18n@0.109.4
  - @voyant-travel/catalog-react@0.135.7
  - @voyant-travel/finance@0.137.8
  - @voyant-travel/finance-react@0.137.8

## 0.19.2

### Patch Changes

- cbd5046: Republish the product-detail entrypoint with the canonical query-option exports in the published package.

## 0.19.1

### Patch Changes

- 9a1197b: Move the operator media upload and serve routes off the bare `/v1/*` surface and onto `/v1/admin/*`.

  Uploads now post to `/v1/admin/uploads` and video tickets to `/v1/admin/uploads/video`; stored media is served from `/v1/admin/media/*`. The Hono app no longer mounts the bare `/v1/*` catch-all actor guard, and worker-runtime hosts can use `rewriteAppPath` to preserve compatibility for persisted legacy media URLs.

- Updated dependencies [9a1197b]
  - @voyant-travel/finance-react@0.137.1
  - @voyant-travel/finance@0.137.1
  - @voyant-travel/inventory@0.5.6
  - @voyant-travel/catalog-react@0.135.1

## 0.19.0

### Patch Changes

- @voyant-travel/finance@0.137.0
- @voyant-travel/inventory@0.5.5
- @voyant-travel/catalog-react@0.135.0
- @voyant-travel/finance-react@0.137.0

## 0.18.2

### Patch Changes

- 12a1eb2: Expose client-safe subpaths for validation schemas, linkable metadata, template authoring metadata, finance payment-policy primitives, and Hono reporter utilities. Move browser-facing React/operator imports off mixed runtime barrels so client bundles do not pull Hono request context or other server-only runtime code.
- Updated dependencies [12a1eb2]
  - @voyant-travel/finance@0.136.2
  - @voyant-travel/finance-react@0.136.2
  - @voyant-travel/inventory@0.5.4

## 0.18.1

### Patch Changes

- Updated dependencies [7cb6fa7]
  - @voyant-travel/i18n@0.109.0
  - @voyant-travel/admin@0.115.2
  - @voyant-travel/catalog-react@0.134.1
  - @voyant-travel/finance-react@0.136.1
  - @voyant-travel/ui@0.108.2
  - @voyant-travel/finance@0.136.1

## 0.18.0

### Patch Changes

- @voyant-travel/inventory@0.5.3
- @voyant-travel/finance-react@0.136.0
- @voyant-travel/catalog-react@0.134.0
- @voyant-travel/finance@0.136.0

## 0.17.0

### Patch Changes

- @voyant-travel/inventory@0.5.2
- @voyant-travel/finance-react@0.135.0
- @voyant-travel/catalog-react@0.133.0
- @voyant-travel/finance@0.135.0

## 0.16.1

### Patch Changes

- ba91645: Fix the product translation language picker so the "Add language" search box
  filters as you type. `LanguageCombobox` now feeds its options to the underlying
  combobox via `items` + `ComboboxCollection` with a `filter` that matches on both
  the language name and code, instead of rendering the full unfiltered list.

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
- Updated dependencies [0a0a014]
  - @voyant-travel/types@0.106.0
  - @voyant-travel/finance@0.134.0
  - @voyant-travel/inventory@0.5.0
  - @voyant-travel/finance-react@0.134.0
  - @voyant-travel/admin@0.115.1
  - @voyant-travel/utils@0.105.4
  - @voyant-travel/catalog-react@0.132.0

## 0.15.0

### Patch Changes

- Updated dependencies [4abf9a2]
  - @voyant-travel/admin@0.115.0
  - @voyant-travel/i18n@0.108.0
  - @voyant-travel/utils@0.105.3
  - @voyant-travel/finance@0.133.0
  - @voyant-travel/inventory@0.4.7
  - @voyant-travel/catalog-react@0.131.0
  - @voyant-travel/finance-react@0.133.0
  - @voyant-travel/ui@0.108.1

## 0.14.0

### Patch Changes

- @voyant-travel/catalog-react@0.130.0
- @voyant-travel/inventory@0.4.6
- @voyant-travel/finance-react@0.132.0
- @voyant-travel/finance@0.132.0

## 0.13.2

### Patch Changes

- ba89f0b: Let admin departure edits choose and persist a product option so existing departures with a missing option can be repaired from the UI. Explicit slot option links are now validated against the slot product while product-level generated slots can still omit an option.
- Updated dependencies [ba89f0b]
  - @voyant-travel/i18n@0.107.4

## 0.13.1

### Patch Changes

- fcd2e0b: Add itinerary and day-service translation authoring surfaces, and localize owned itinerary content projection for translated days and service labels.
- Updated dependencies [fcd2e0b]
  - @voyant-travel/inventory@0.4.4

## 0.13.0

### Patch Changes

- Updated dependencies [310565b]
  - @voyant-travel/i18n@0.107.3
  - @voyant-travel/finance-react@0.131.0
  - @voyant-travel/catalog-react@0.129.0
  - @voyant-travel/finance@0.131.0
  - @voyant-travel/inventory@0.4.3

## 0.12.0

### Patch Changes

- Updated dependencies [dbea53e]
  - @voyant-travel/i18n@0.107.2
  - @voyant-travel/finance-react@0.130.0
  - @voyant-travel/catalog-react@0.128.0
  - @voyant-travel/finance@0.130.0
  - @voyant-travel/inventory@0.4.2

## 0.11.0

### Patch Changes

- @voyant-travel/inventory@0.4.1
- @voyant-travel/catalog-react@0.127.0
- @voyant-travel/finance-react@0.129.0
- @voyant-travel/finance@0.129.0

## 0.10.0

### Patch Changes

- Updated dependencies [9c47b00]
  - @voyant-travel/inventory@0.4.0
  - @voyant-travel/catalog-react@0.126.0
  - @voyant-travel/finance-react@0.128.0
  - @voyant-travel/finance@0.128.0

## 0.9.0

### Patch Changes

- @voyant-travel/inventory@0.3.9
- @voyant-travel/finance@0.127.0
- @voyant-travel/finance-react@0.127.0
- @voyant-travel/catalog-react@0.125.0

## 0.8.0

### Patch Changes

- @voyant-travel/inventory@0.3.6
- @voyant-travel/catalog-react@0.124.0
- @voyant-travel/finance-react@0.126.0
- @voyant-travel/finance@0.126.0

## 0.7.0

### Patch Changes

- Updated dependencies [a74471e]
- Updated dependencies [a74471e]
  - @voyant-travel/i18n@0.107.0
  - @voyant-travel/ui@0.108.0
  - @voyant-travel/admin@0.114.0
  - @voyant-travel/catalog-react@0.123.0
  - @voyant-travel/finance-react@0.125.0
  - @voyant-travel/inventory@0.3.5
  - @voyant-travel/finance@0.125.0

## 0.6.0

### Patch Changes

- 4f92198: Voyant 1.0 visual refactor of the framework UI.

  - **Tokens** (`@voyant-travel/ui` `globals.css`): warm off-white paper, near-black ink, and a single hot-orange brand accent (`--brand`, new token) reserved for charts/focus/active state. Inter Tight type. Fixed brand chart palette (`--chart-1..5`). A coherent radius system: controls + their dropdowns at `rounded-sm` (4px), cards/table surfaces at `rounded-md` (6px), dialogs/sheets at `rounded-xl`.
  - **`@voyant-travel/ui` components**: new `SegmentedControl`; `Button` gains a `brand` variant; sharper, consistent radii across Button/Input/Select/Combobox/Textarea/Toggle/Tabs/Menus/Command/Card/DataTable/Badge; bordered active sidebar items (primary + sub) and inset-panel border; assorted fixes (Command search-input radius, toggle-group corners, sidebar sub-menu spacing).
  - **`@voyant-travel/admin`**: Voyant 1.0 brand logo lockup (composed mark + wordmark, collapse-to-badge); operator shell defaults to the inset sidebar layout; dashboard KPI cards, brand chart colors, and Figma-matched sidebar (bordered active item, near-black nav text, bordered user card with open-state).
  - **Domain `*-react` packages**: card surfaces normalized to the new `rounded-md` radius; flights search bar (trip-type toggle, route cards, airport dropdown) and the resources tabs aligned to the system.

- Updated dependencies [4f92198]
- Updated dependencies [4f92198]
  - @voyant-travel/finance-react@0.124.0
  - @voyant-travel/ui@0.107.0
  - @voyant-travel/admin@0.113.0
  - @voyant-travel/catalog-react@0.122.0
  - @voyant-travel/finance@0.124.0
  - @voyant-travel/inventory@0.3.4

## 0.5.0

### Patch Changes

- Updated dependencies [94890c3]
- Updated dependencies [e9d9dbb]
- Updated dependencies [cb9b04b]
  - @voyant-travel/admin@0.112.0
  - @voyant-travel/finance@0.123.0
  - @voyant-travel/catalog-react@0.121.0
  - @voyant-travel/finance-react@0.123.0
  - @voyant-travel/inventory@0.3.3

## 0.4.0

### Patch Changes

- Updated dependencies [c9de9c4]
- Updated dependencies [14f4234]
- Updated dependencies [89d4ca9]
- Updated dependencies [51dd276]
  - @voyant-travel/finance@0.122.0
  - @voyant-travel/finance-react@0.122.0
  - @voyant-travel/inventory@0.3.1
  - @voyant-travel/catalog-react@0.120.0

## 0.3.0

### Patch Changes

- Updated dependencies [13fe70b]
- Updated dependencies [13fe70b]
  - @voyant-travel/finance@0.121.0
  - @voyant-travel/inventory@0.3.0
  - @voyant-travel/finance-react@0.121.0
  - @voyant-travel/catalog-react@0.119.0

## 0.2.2

### Patch Changes

- ecec979: Improve operator bundle boundaries by adding route-local admin message provider support, exposing admin extension route helpers, keeping pending skeletons structural, and tightening Vite route ignores and vendor chunk splitting so heavy admin route dependencies stay out of the initial entry.
- Updated dependencies [ecec979]
  - @voyant-travel/admin@0.111.3
  - @voyant-travel/finance-react@0.120.2
  - @voyant-travel/finance@0.120.2

## 0.2.1

### Patch Changes

- eef1a00: Republish notification and UI consumer packages so stale beta artifacts no longer reference legacy notification package specifiers.
- Updated dependencies [eef1a00]
  - @voyant-travel/admin@0.111.2
  - @voyant-travel/catalog-react@0.118.1
  - @voyant-travel/finance-react@0.120.1
  - @voyant-travel/finance@0.120.1

## 0.2.0

### Minor Changes

- 3cc83b6: Move extras runtime and React source behind Inventory and Bookings owner
  subpaths. The old runtime and React extras package names are removed from v1;
  first-party imports use the Inventory and Bookings owner paths.
- 65b3782: Add optional Inventory package entrypoints for operated product authoring and
  Inventory React authoring UI surfaces.
- a101971: Move the main operated Product route/service/schema/runtime and React
  authoring source under Inventory owner paths. The old Products runtime package
  names are removed from the v1 workspace surface, while the operator keeps
  stable `/products` API URLs backed by Inventory.

### Patch Changes

- 3408b2a: Move availability, allocation UI, resources, ground logistics, and places source
  under Operations owner paths. The old operated-execution package names are
  removed from the v1 workspace surface while first-party runtime, React, and
  operator imports use `@voyant-travel/operations` and `@voyant-travel/operations-react`
  surfaces.
- 47fef18: Retarget first-party imports from the removed beta package names to their owner
  packages. Operated product UI now imports Inventory React, commercial UI imports
  Commerce React, supplier UI imports Distribution React, checkout UI imports
  Finance React, and operated place/availability schema references import
  Operations owner paths.
- Updated dependencies [dd71543]
- Updated dependencies [3cc83b6]
- Updated dependencies [0fa993c]
- Updated dependencies [9e970a5]
- Updated dependencies [b711b04]
- Updated dependencies [3408b2a]
- Updated dependencies [7ea516a]
- Updated dependencies [65b3782]
- Updated dependencies [a101971]
- Updated dependencies [47fef18]
- Updated dependencies [6196b3b]
  - @voyant-travel/admin@0.111.1
  - @voyant-travel/inventory@0.2.0
  - @voyant-travel/finance@0.120.0
  - @voyant-travel/finance-react@0.120.0
  - @voyant-travel/catalog-react@0.118.0
