## 1. Scope and setup controls

- [x] 1.1 Confirm whether the initial implementation stays inside `apps/web` or begins extracting shared packages immediately.
- [x] 1.2 Validate the planning artifacts with `npm run openspec:validate` before implementation starts.
- [x] 1.3 Record any later backend-symbol GitNexus impact analysis in `docs/development/gitnexus-impact-tracker.md` before editing backend-owned symbols.
- [x] 1.4 Keep the design-system source documents, review notes and this OpenSpec change linked in implementation PRs.

## 2. Frontend application foundation

- [x] 2.1 Ensure `apps/web` has the required app shell entrypoints, route groups and frontend scripts for development and build.
- [x] 2.2 Preserve ShopCity brand assets under `apps/web/public/brand/` and keep brand usage aligned with the approved design.
- [x] 2.3 Implement cashier, supervisor and admin route boundaries so role navigation is explicit.
- [x] 2.4 Add authenticated session bootstrap and protected shell routing before operational screens render.
- [x] 2.5 Keep frontend build, lint, typecheck and test commands documented and runnable.

## 3. Token and styling pipeline

- [x] 3.1 Generate CSS custom properties from `docs/frontend/design-system/tokens.json`.
- [x] 3.2 Map semantic tokens into the frontend styling system.
- [x] 3.3 Add token drift checks so generated outputs cannot silently go stale.
- [x] 3.4 Prevent unexplained raw color/spacing usage in shared product components.
- [x] 3.5 Keep brand red limited to the approved brand and action surfaces.

## 4. Shared primitive components

- [x] 4.1 Build owned Button, Input, Textarea, Checkbox, RadioGroup, Select and Combobox primitives.
- [x] 4.2 Build Dialog, Sheet, Popover, DropdownMenu, Tooltip, Tabs and Accordion primitives with proper focus behavior.
- [x] 4.3 Build Badge, Progress, Skeleton, Separator, Alert, Toast, Table and Pagination primitives.
- [x] 4.4 Add Storybook coverage for default, focus, disabled, loading, error, long-content and narrow-viewport states.
- [x] 4.5 Add component interaction and accessibility tests for behavior-rich primitives.

## 5. ShopCity product components

- [x] 5.1 Implement `Money` and `MoneyInput` with integer-kobo boundaries, safe parsing and tabular numerals.
- [x] 5.2 Implement transaction, approval, fraud, SMS, role, branch and device status badges with icon + text + semantic color.
- [x] 5.3 Implement `CustomerIdentity`, `CardIdentity`, `ReceiptIdentity`, `LoyaltyBalance` and `ExpiringCreditNotice`.
- [x] 5.4 Implement `FilterBar`, `DateRangeFilter`, `CursorPagination`, `DataTable`, `EmptyState` and `ErrorState`.
- [x] 5.5 Implement `OfflineIndicator`, `SyncQueueIndicator`, `ConnectionStatus`, `PageHeader`, `DetailHeader` and `AuditTimeline`.

## 6. API and server-state integration

- [x] 6.1 Wire frontend OpenAPI client generation into the frontend build and development flow.
- [x] 6.2 Implement a centralized API adapter for credentials, CSRF/session behavior, error mapping and typed calls.
- [x] 6.3 Add a domain error dictionary for validation, business-rule, conflict, session/access, connectivity and unexpected failures.
- [x] 6.4 Add query keys, staleness and invalidation policies by domain.
- [x] 6.5 Preserve idempotency keys across uncertain network outcomes for one logical financial operation.

## 7. Offline, scanner and local browser state

- [x] 7.1 Add connection-state detection and persistent offline/sync indicators.
- [x] 7.2 Implement scanner routing that only captures scans in advertised scan contexts.
- [x] 7.3 Add IndexedDB storage for offline earn records with local ID, idempotency key, context, sync state and reconciliation fields.
- [x] 7.4 Make offline persistence helpers return explicit success/failure instead of swallowing write errors.
- [x] 7.5 Ensure redemption remains online-only unless backend policy changes.

## 8. Workflow screens and role shells

- [x] 8.1 Implement login/session bootstrap and protected shell routing.
- [x] 8.2 Implement cashier Home, Earn, Redeem, Customers and Sync surfaces.
- [x] 8.3 Implement supervisor Overview, Transactions, Customers, Cards, Approvals, Fraud and Reports surfaces.
- [x] 8.4 Implement admin Operations, Audit, Users & Devices and Settings shell entries where backend contracts support them.
- [x] 8.5 Implement report workspace with filters, freshness/materialization state, summary, table/chart, export and authorized refresh behavior.
- [x] 8.6 Implement pilot health panel from the backend operations summary contract.

## 9. Workflow coverage expansion

- [x] 9.1 Replace fixture-only coverage with real or contract-faithful E2E for Earn.
- [x] 9.2 Add real or contract-faithful E2E for Redeem.
- [x] 9.3 Add backend-backed or contract-faithful coverage for approvals, fraud review, reports and operations summary flows.
- [x] 9.4 Keep `/testing/critical-flows` as a deterministic fixture harness without calling it business-flow E2E.
- [x] 9.5 Ensure role-specific navigation and placeholder pages do not masquerade as complete workflows.

## 10. Accessibility, content and visual quality gates

- [x] 10.1 Add `eslint-plugin-jsx-a11y` or equivalent linting for frontend code.
- [x] 10.2 Add automated axe checks for shared components and critical routes.
- [x] 10.3 Add keyboard-only coverage for login, lookup, earn, redeem and approval flows.
- [x] 10.4 Add content assertions so raw enum/HTTP language does not leak into user-facing states where mapped labels exist.
- [x] 10.5 Add print styles for transaction and receipt-safe views.
- [x] 10.6 Cover contrast and combobox semantics at the browser level, not just through disabled JSDOM checks.

## 11. End-to-end and visual regression

- [x] 11.1 Add Playwright coverage for login/session, lookup, earn confirmed, earn awaiting approval and duplicate receipt.
- [x] 11.2 Add Playwright coverage for redeem confirmed, insufficient balance/cap and approval decision.
- [x] 11.3 Add Playwright coverage for offline earn sync outcomes, fraud review, report freshness/export and session/device revocation.
- [x] 11.4 Add visual-regression baselines for primitives, status badges, transaction confirmation, approval decision, offline queue, dialogs, table, report workspace and role shells.
- [x] 11.5 Document and approve the visual-regression tool/baseline strategy.

## 12. Release readiness

- [x] 12.1 Run OpenAPI export/lint/diff and frontend client generation without uncommitted drift.
- [x] 12.2 Run frontend typecheck, lint, tests, accessibility checks, Playwright critical flows and production build.
- [x] 12.3 Review telemetry/privacy configuration for frontend routes and domain-error reporting.
- [x] 12.4 Update release/runbook evidence to include frontend build artifacts once deployable.
- [x] 12.5 Close this change only after `npm run openspec:validate` passes and frontend release gates are documented.
