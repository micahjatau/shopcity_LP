## 1. Scope and setup controls

- [ ] 1.1 Confirm implementation branch and whether shared packages are created immediately or deferred.
- [ ] 1.2 Validate planning artifacts with `npm run openspec:validate` before implementation starts.
- [ ] 1.3 Record any later backend-symbol GitNexus impact analysis in `docs/development/gitnexus-impact-tracker.md` before editing existing backend symbols.
- [ ] 1.4 Keep design-system source documents and this OpenSpec change linked in implementation PRs.

## 2. Frontend application foundation

- [ ] 2.1 Scaffold `apps/web` with TypeScript, routing, app shell entrypoints and frontend scripts.
- [ ] 2.2 Add ShopCity brand assets under `apps/web/public/brand/` without changing documented public paths unless explicitly approved.
- [ ] 2.3 Implement cashier, supervisor and admin route groups and navigation boundaries.
- [ ] 2.4 Add authentication/session bootstrap shell that calls the backend current-user contract.
- [ ] 2.5 Add production build/typecheck/lint/test commands for the frontend.

## 3. Token and styling pipeline

- [ ] 3.1 Generate CSS custom properties from `docs/frontend/design-system/tokens.json`.
- [ ] 3.2 Map semantic tokens into the frontend styling framework/theme.
- [ ] 3.3 Add a token drift check that fails when generated token outputs are stale.
- [ ] 3.4 Prohibit unexplained raw core colors/spacing in shared product components.
- [ ] 3.5 Verify brand red is limited to brand surfaces, navigation and primary actions.

## 4. Accessible primitive components

- [ ] 4.1 Build owned Button, Input, Textarea, Checkbox, RadioGroup, Select and Combobox primitives.
- [ ] 4.2 Build Dialog, Sheet, Popover, DropdownMenu, Tooltip, Tabs and Accordion primitives with focus behavior.
- [ ] 4.3 Build Badge, Progress, Skeleton, Separator, Alert, Toast, Table and Pagination primitives.
- [ ] 4.4 Add Storybook stories for default, focus, disabled, loading, error, long-content and narrow-viewport states.
- [ ] 4.5 Add component interaction/a11y tests for behavior-rich primitives.

## 5. ShopCity product components

- [ ] 5.1 Implement `Money` and `MoneyInput` with integer-kobo boundaries, tabular numerals and safe parsing.
- [ ] 5.2 Implement transaction, approval, fraud, SMS, role, branch and device status badges with icon + text + semantic color.
- [ ] 5.3 Implement `CustomerIdentity`, `CardIdentity`, `ReceiptIdentity`, `LoyaltyBalance` and `ExpiringCreditNotice`.
- [ ] 5.4 Implement `FilterBar`, `DateRangeFilter`, `CursorPagination`, `DataTable`, `EmptyState` and `ErrorState`.
- [ ] 5.5 Implement `OfflineIndicator`, `SyncQueueIndicator`, `ConnectionStatus`, `PageHeader`, `DetailHeader` and `AuditTimeline`.

## 6. API and server-state integration

- [ ] 6.1 Wire frontend OpenAPI client generation into the frontend build/development flow.
- [ ] 6.2 Implement a centralized API adapter for credentials, CSRF/session behavior, error mapping and typed calls.
- [ ] 6.3 Add a domain error dictionary for validation, business-rule, conflict, session/access, connectivity and unexpected failures.
- [ ] 6.4 Add TanStack Query keys, staleness and targeted invalidation policies by domain.
- [ ] 6.5 Preserve idempotency keys for one logical financial operation across uncertain network outcomes.

## 7. Offline, scanner and local browser state

- [ ] 7.1 Add connection-state detection and persistent offline/sync indicators.
- [ ] 7.2 Implement scanner routing that only captures scans in advertised scan contexts.
- [ ] 7.3 Add IndexedDB storage for offline earn records with local ID, idempotency key, context, sync state and reconciliation fields.
- [ ] 7.4 Implement offline queue states and per-record retry/rejection outcomes.
- [ ] 7.5 Ensure redemption remains online-only unless backend policy changes.

## 8. Workflow screens and role shells

- [ ] 8.1 Implement login/session bootstrap and protected shell routing.
- [ ] 8.2 Implement cashier Home, Earn, Redeem, Customers and Sync surfaces.
- [ ] 8.3 Implement supervisor Overview, Transactions, Customers, Cards, Approvals, Fraud and Reports surfaces.
- [ ] 8.4 Implement admin Operations, Audit, Users & Devices and Settings shell entries where backend contracts support them.
- [ ] 8.5 Implement report workspace with filters, freshness/materialization state, summary, table/chart, export and authorized refresh behavior.
- [ ] 8.6 Implement pilot health panel from the backend operations summary contract.

## 9. Accessibility, content and visual quality gates

- [x] 9.1 Add `eslint-plugin-jsx-a11y` or equivalent linting for frontend code.
- [x] 9.2 Add automated axe checks for shared components and critical routes.
- [x] 9.3 Add keyboard-only coverage for login, lookup, earn, redeem and approval flows.
- [x] 9.4 Add content assertions so raw enum/HTTP language does not leak into user-facing states where mapped labels exist.
- [ ] 9.5 Add print styles for transaction/receipt-safe views.

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
