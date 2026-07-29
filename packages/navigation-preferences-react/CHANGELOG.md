# @voyant-travel/navigation-preferences-react

## 0.5.1

### Patch Changes

- Updated dependencies [192a635]
  - @voyant-travel/i18n@0.112.0
  - @voyant-travel/admin@0.126.1
  - @voyant-travel/auth-react@0.132.2
  - @voyant-travel/navigation-preferences@0.5.1

## 0.5.0

### Patch Changes

- Updated dependencies [8f0fa26]
  - @voyant-travel/navigation-preferences@0.5.0
  - @voyant-travel/auth-react@0.132.1

## 0.4.0

### Patch Changes

- Updated dependencies [c1e37f2]
  - @voyant-travel/admin@0.126.0
  - @voyant-travel/auth-react@0.132.0
  - @voyant-travel/navigation-preferences@0.4.0

## 0.3.0

### Patch Changes

- Updated dependencies [c9b6144]
  - @voyant-travel/navigation-preferences@0.3.0
  - @voyant-travel/auth-react@0.131.0

## 0.2.0

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

### Patch Changes

- Updated dependencies [766d24b]
- Updated dependencies [7e9f77a]
- Updated dependencies [82ffd12]
- Updated dependencies [6147b93]
- Updated dependencies [b459761]
  - @voyant-travel/ui@0.109.2
  - @voyant-travel/admin@0.125.0
  - @voyant-travel/navigation-preferences@0.2.0
  - @voyant-travel/auth-react@0.130.0
