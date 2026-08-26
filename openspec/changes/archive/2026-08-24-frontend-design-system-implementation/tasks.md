## 1. Scope and setup controls

- [x] 1.1 Confirm implementation branch and whether shared packages are created immediately or deferred.
- [x] 1.2 Validate planning artifacts with `npm run openspec:validate` before implementation starts.
- [x] 1.3 Record any later backend-symbol GitNexus impact analysis in `docs/development/gitnexus-impact-tracker.md` before editing existing backend symbols.
- [x] 1.4 Keep design-system source documents and this OpenSpec change linked in implementation PRs.

## 2. Frontend application foundation

- [x] 2.1 Scaffold `apps/web` with TypeScript, routing, app shell entrypoints and frontend scripts.
- [x] 2.2 Add ShopCity brand assets under `apps/web/public/brand/` without changing documented public paths unless explicitly approved.
- [x] 2.3 Implement cashier, supervisor and admin route groups and navigation boundaries.
- [x] 2.4 Add authentication/session bootstrap shell that calls the backend current-user contract.
- [x] 2.5 Add production build/typecheck/lint/test commands for the frontend.

## 3. Token and styling pipeline

- [x] 3.1 Generate CSS custom properties from `docs/frontend/design-system/tokens.json`.
- [x] 3.2 Map semantic tokens into the frontend styling framework/theme.
- [x] 3.3 Add a token drift check that fails when generated token outputs are stale.
- [x] 3.4 Prohibit unexplained raw core colors/spacing in shared product components.
- [x] 3.5 Verify brand red is limited to brand surfaces, navigation and primary actions.

## 4. Accessible primitive components

- [x] 4.1 Build owned Button, Input, Textarea, Checkbox, RadioGroup, Select and Combobox primitives.
- [x] 4.2 Build Dialog, Sheet, Popover, DropdownMenu, Tooltip, Tabs and Accordion primitives with focus behavior.
- [x] 4.3 Build Badge, Progress, Skeleton, Separator, Alert, Toast, Table and Pagination primitives.
- [x] 4.4 Add component state coverage through the visual-regression gallery and accessibility tests; a separate Storybook runtime is intentionally not used.
- [x] 4.5 Add component interaction/a11y tests for behavior-rich primitives.

## 5. ShopCity product components

- [x] 5.1 Implement `Money` and `MoneyInput` with integer-kobo boundaries, tabular numerals and safe parsing.
- [x] 5.2 Implement transaction, approval, fraud, SMS, role, branch and device status badges with icon + text + semantic color.
- [x] 5.3 Implement `CustomerIdentity`, `CardIdentity`, `ReceiptIdentity`, `LoyaltyBalance` and `ExpiringCreditNotice`.
- [x] 5.4 Implement `FilterBar`, `DateRangeFilter`, `CursorPagination`, `DataTable`, `EmptyState` and `ErrorState`.
- [x] 5.5 Implement `OfflineIndicator`, `SyncQueueIndicator`, `ConnectionStatus`, `PageHeader`, `DetailHeader` and `AuditTimeline`.

## 6. API and server-state integration

- [x] 6.1 Wire frontend OpenAPI client generation into the frontend build/development flow.
- [x] 6.2 Implement a centralized API adapter for credentials, CSRF/session behavior, error mapping and typed calls.
- [x] 6.3 Add a domain error dictionary for validation, business-rule, conflict, session/access, connectivity and unexpected failures.
- [x] 6.4 Add domain query/cache keys, staleness and targeted invalidation policies through the shared session/config adapter.
- [x] 6.5 Preserve idempotency keys for one logical financial operation across uncertain network outcomes.

## 7. Offline, scanner and local browser state

- [x] 7.1 Add connection-state detection and persistent offline/sync indicators.
- [x] 7.2 Implement scanner routing that only captures scans in advertised scan contexts.
- [x] 7.3 Add IndexedDB storage for offline earn records with local ID, idempotency key, context, sync state and reconciliation fields.
- [x] 7.4 Implement offline queue states and per-record retry/rejection outcomes.
- [x] 7.5 Ensure redemption remains online-only unless backend policy changes.

## 8. Workflow screens and role shells

- [x] 8.1 Implement login/session bootstrap and protected shell routing.
- [x] 8.2 Implement cashier Home, Earn, Redeem, Customers and Sync surfaces.
- [x] 8.3 Implement supervisor Overview, Transactions, Customers, Cards, Approvals, Fraud and Reports surfaces.
- [x] 8.4 Implement admin Operations, Audit, Users & Devices and Settings shell entries where backend contracts support them.
- [x] 8.5 Implement report workspace with filters, freshness/materialization state, summary, table/chart, export and authorized refresh behavior.
- [x] 8.6 Implement pilot health panel from the backend operations summary contract.

## 9. Accessibility, content and visual quality gates

- [x] 9.1 Add `eslint-plugin-jsx-a11y` or equivalent linting for frontend code.
- [x] 9.2 Add automated axe checks for shared components and critical routes.
- [x] 9.3 Add keyboard-only coverage for login, lookup, earn, redeem and approval flows.
- [x] 9.4 Add content assertions so raw enum/HTTP language does not leak into user-facing states where mapped labels exist.
- [x] 9.5 Add print styles for transaction/receipt-safe views.

## 10. End-to-end and visual regression

- [x] 10.1 Add Playwright coverage for login/session, lookup, earn confirmed, earn awaiting approval and duplicate receipt.
- [x] 10.2 Add Playwright coverage for redeem confirmed, insufficient balance/cap and approval decision.
- [x] 10.3 Add Playwright coverage for offline earn sync outcomes, fraud review, report freshness/export and session/device revocation.
- [x] 10.4 Add visual-regression baselines for primitives, status badges, transaction confirmation, approval decision, offline queue, dialogs, table, report workspace and role shells.
- [x] 10.5 Document and approve the visual-regression tool/baseline strategy.

## 11. Release readiness

- [x] 11.1 Run OpenAPI export/lint/diff and frontend client generation without uncommitted drift.
- [x] 11.2 Run frontend typecheck, lint, tests, accessibility checks, Playwright critical flows and production build.
- [x] 11.3 Review telemetry/privacy configuration for frontend routes and domain-error reporting.
- [x] 11.4 Update release/runbook evidence to include frontend build artifacts once deployable.
- [x] 11.5 Close this change only after `npm run openspec:validate` passes and frontend release gates are documented.
