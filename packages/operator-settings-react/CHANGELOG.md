# @voyant-travel/operator-settings-react

## 0.16.0

### Patch Changes

- @voyant-travel/admin-app@0.55.0
- @voyant-travel/finance-react@0.163.0
- @voyant-travel/admin@0.126.1
- @voyant-travel/finance@0.163.0

## 0.15.0

### Patch Changes

- Updated dependencies [8f0fa26]
  - @voyant-travel/finance@0.162.0
  - @voyant-travel/finance-react@0.162.0
  - @voyant-travel/admin-app@0.54.0

## 0.14.0

### Patch Changes

- Updated dependencies [c1e37f2]
- Updated dependencies [85bfe2c]
  - @voyant-travel/admin@0.126.0
  - @voyant-travel/finance@0.161.0
  - @voyant-travel/admin-app@0.53.0
  - @voyant-travel/finance-react@0.161.0

## 0.13.0

### Patch Changes

- Updated dependencies [701ccc4]
- Updated dependencies [372f4f4]
- Updated dependencies [a2fd806]
- Updated dependencies [db5adce]
- Updated dependencies [6604f9e]
  - @voyant-travel/finance@0.160.0
  - @voyant-travel/finance-react@0.160.0
  - @voyant-travel/admin-app@0.52.0

## 0.12.0

### Minor Changes

- 82ffd12: Add persisted organization-level first-run setup guidance composed from the
  selected admin graph. Standard Operator deployments now collect package-owned
  business profile, storefront, market, fiscal, navigation, team, and first-product
  steps while keeping domain mutations in their existing package surfaces.

### Patch Changes

- Updated dependencies [766d24b]
- Updated dependencies [7e9f77a]
- Updated dependencies [49f55d0]
- Updated dependencies [82ffd12]
- Updated dependencies [9c85101]
- Updated dependencies [6147b93]
- Updated dependencies [b459761]
  - @voyant-travel/ui@0.109.2
  - @voyant-travel/admin@0.125.0
  - @voyant-travel/admin-app@0.51.0
  - @voyant-travel/finance@0.159.0
  - @voyant-travel/finance-react@0.159.0

## 0.11.0

### Patch Changes

- Updated dependencies [73ab096]
  - @voyant-travel/admin@0.124.0
  - @voyant-travel/finance-react@0.158.0
  - @voyant-travel/finance@0.158.0
  - @voyant-travel/admin-app@0.50.0

## 0.10.0

### Patch Changes

- @voyant-travel/finance-react@0.157.0
- @voyant-travel/admin-app@0.49.0
- @voyant-travel/finance@0.157.0

## 0.9.1

### Patch Changes

- 8d62a7c: Republish every affected TypeScript package without broken declaration maps so the corrected artifact
  policy reaches npm instead of applying only to future incidental package releases.
- Updated dependencies [8d62a7c]
  - @voyant-travel/admin@0.123.3
  - @voyant-travel/admin-app@0.48.1
  - @voyant-travel/finance@0.156.1
  - @voyant-travel/finance-react@0.156.1
  - @voyant-travel/react@0.104.2
  - @voyant-travel/ui@0.109.1

## 0.9.0

### Patch Changes

- Updated dependencies [bbe6396]
  - @voyant-travel/finance@0.156.0
  - @voyant-travel/finance-react@0.156.0
  - @voyant-travel/admin-app@0.48.0
  - @voyant-travel/admin@0.123.2

## 0.8.0

### Patch Changes

- @voyant-travel/finance@0.155.0
- @voyant-travel/admin-app@0.47.0
- @voyant-travel/finance-react@0.155.0

## 0.7.0

### Patch Changes

- Updated dependencies [4d0eeed]
- Updated dependencies [8bd906f]
  - @voyant-travel/finance@0.154.0
  - @voyant-travel/ui@0.109.0
  - @voyant-travel/admin@0.123.0
  - @voyant-travel/admin-app@0.46.0
  - @voyant-travel/finance-react@0.154.0

## 0.6.0

### Patch Changes

- 490d132: Move Operator Settings and Relationships admin presentation authority into selected package graph factories.
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
- Updated dependencies [490d132]
  - @voyant-travel/finance@0.153.0
  - @voyant-travel/admin@0.122.0
  - @voyant-travel/finance-react@0.153.0
  - @voyant-travel/admin-app@0.45.0

## 0.5.0

### Patch Changes

- Updated dependencies [60b1970]
- Updated dependencies [977c1bd]
- Updated dependencies [d771be3]
- Updated dependencies [d771be3]
  - @voyant-travel/finance@0.152.0
  - @voyant-travel/admin@0.121.0
  - @voyant-travel/admin-app@0.44.0
  - @voyant-travel/finance-react@0.152.0

## 0.4.0

### Patch Changes

- Updated dependencies [e3dc5a9]
- Updated dependencies [e3dc5a9]
- Updated dependencies [a370024]
- Updated dependencies [a370024]
- Updated dependencies [e3dc5a9]
  - @voyant-travel/finance@0.151.0
  - @voyant-travel/finance-react@0.151.0
  - @voyant-travel/admin-app@0.43.0

## 0.3.0

### Patch Changes

- @voyant-travel/finance@0.150.0
- @voyant-travel/finance-react@0.150.0
- @voyant-travel/admin-app@0.42.0

## 0.2.0

### Minor Changes

- b13f028: Add `@voyant-travel/operator-settings-react` — the source-free React UI for the
  **Operator Profile** settings page, the packaged companion to the API-only
  `@voyant-travel/operator-settings` (voyant#3061, under #2983).

  The page edits the operator's contract identity (trading name, legal name, VAT
  id, trade-register number, contact, license, signatory, payment
  instructions/collection defaults, checkout links) that populates `operator.*`
  in contract templates, reading and writing the `/v1/admin/settings/operator-*`
  routes already mounted on the managed runtime. It resolves its API surface from
  the admin runtime context and its copy from the shared operator admin messages,
  so a package-only, source-free admin can mount it with no starter source.

  `@voyant-travel/operator-settings-react/settings` exports
  `createOperatorProfileSettingsExtraPage()`, an `AdminCoreSettingsExtraPage`
  descriptor to spread into
  `createAdminCoreExtension({ settings: { extraPages: [...] } })`; the root exports
  the `OperatorProfileSettingsPage` component. The managed-operator host mounts it
  (closing the last GENERAL settings gap for managed profiles), and the operator
  starter adopts it in place of its former app-custom page.

### Patch Changes

- Updated dependencies [a97e845]
  - @voyant-travel/admin@0.120.0
  - @voyant-travel/admin-app@0.41.0
  - @voyant-travel/finance-react@0.149.0
  - @voyant-travel/finance@0.149.0
