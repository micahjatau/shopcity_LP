## 1. Baseline and shared visual foundation

- [x] 1.1 Freeze `410ecd75` as the reference SHA, inventory committed `figmaExport` assets, and add the route/viewport/reference manifest; verify the manifest names every migrated route and uses deterministic fixture metadata.
- [x] 1.2 Add canonical prototype-compatible tokens and shared shell primitives; verify `npm --prefix apps/web run typecheck` and token-drift checks pass.
- [x] 1.3 Refactor the operational shell to the prototype DOM and desktop geometry while retaining session, RBAC, logout, connection, responsive, and accessibility behavior; verify shell unit/a11y tests and focused snapshots.
- [x] 1.4 Remove unapproved desktop shell geometry and record behavior-only/accessibility-only replacements; verify no duplicate topbar context, collapse control, or sync/status cards remain in the desktop DOM.

## 2. Cashier overview and customer lookup

- [x] 2.1 Build the prototype-exact `/cashier` page head, notice, metrics, recent-transactions table, footer, and `data-od-id` attributes; verify route tests assert the required hierarchy and geometry hooks.
- [x] 2.2 Preserve `reportsControllerListCashierTodayV1` and existing derived metrics while adding local receipt-number filtering; verify bounded-feed tests cover empty, loading, error, search, and result-count states.
- [x] 2.3 Extract `useCashierLookupController` and build the dedicated `/cashier/lookup` view with search, scan, hint, notice, recent customers, and exact empty state; verify lookup unit and accessibility tests.
- [x] 2.4 Wire `ScannerContextScope` to the prototype input and require authoritative `cardsControllerLookupCardV1` before financial context becomes verified; verify directory results cannot submit Earn or Redeem without card verification.

## 3. Capture Purchase

- [x] 3.1 Extract existing Earn behavior into `useEarnTransactionController` with the specified step, lookup, receipt, review, submission, reset, and notice view-model; verify controller unit tests cover transitions and invalid transitions.
- [x] 3.2 Preserve Earn card lookup, generated client, CSRF, idempotency, integer-kobo, device/actor/branch, timezone, receipt-week, duplicate, policy, approval, and offline logic; verify existing financial and offline tests remain green.
- [x] 3.3 Build the persistent prototype `data-od-id="capture-flow"` view with find/confirm/receipt/review/success nodes and accessible state transitions; verify route tests cover every state and focus behavior.
- [x] 3.4 Render confirmed, pending-approval, rejected, retry, and offline-saved outcomes through the prototype notice/success geometry; verify typed outcome and copy assertions.
- [x] 3.5 Remove Policy Context, Customer Detail, Recent Ledger, and Need to Sync cards from Capture Purchase; record the approved omission of the prototype-only Till/cashier-reference input and verify no value is collected or discarded.

## 4. Redeem Credit

- [ ] 4.1 Extract existing redemption behavior into `useRedeemTransactionController`; verify draft persistence, transitions, and reset behavior with unit tests.
- [ ] 4.2 Preserve authoritative card lookup, balance, basket, minimum/ceiling policy, approval, CSRF, idempotency, offline policy, typed errors, and 201/202 outcomes; verify redemption contract and offline tests.
- [ ] 4.3 Build the persistent prototype Redeem view with find, basket, amount, confirm, and success states and the exact two-column amount summary; verify route, geometry, and accessibility tests.
- [x] 4.4 Remove context, draft, ceiling, offline-disabled, policy-table, draft-summary, and alert cards; verify their authoritative information appears only in approved status, summary, confirmation, or success slots.

## 5. Registration and Transactions

- [ ] 5.1 Extract `useCustomerRegistrationController` and build the Supervisor/Admin registration view with Customer information, Initial card, and Review steps; verify role-boundary and form contract tests.
- [ ] 5.2 Preserve atomic customer plus initial-card creation, CSRF, idempotency, and persisted fields while excluding birthday, marketing, loyalty-consent, and consent-version inputs; verify generated-client request assertions.
- [ ] 5.3 Build the prototype Transactions toolbar, bounded table, filters, refresh action, notice, detail modal, and `transaction-filters` identity; verify local filtering and honest bounded-scope copy.
- [ ] 5.4 Preserve authoritative transaction detail and reversal behavior without synthesizing audit history or implying complete history pagination; verify transaction route and modal tests.

## 6. Login and view-model boundaries

- [ ] 6.1 Separate login rendering from session behavior and implement the prototype auth DOM at the canonical `1440x923` reference viewport; verify login screenshot and accessibility tests.
- [x] 6.2 Keep role selection informational only and preserve backend session issuance, role routing, recovery, logout, and expiry behavior; verify role-boundary and session tests.
- [ ] 6.3 Audit all migrated view-models to ensure they expose no CSRF tokens, session cookies, database IDs, raw API errors, device IDs, branch IDs, DTO construction, or receipt-week internals; verify with focused type/test assertions.

## 7. Quantitative acceptance and release evidence

- [ ] 7.1 Add screenshot comparison coverage for every manifest route with deterministic fixtures and approved dynamic masks; verify static/chrome mismatch is below 1%.
- [ ] 7.2 Add `data-od-id` DOM geometry comparisons for position, size, padding, gap, radius, typography, colors, and borders; verify the specified tolerances.
- [x] 7.3 Add and review the approved visual-deviation registry, including registration contract differences and omitted Till/cashier reference; verify every deviation has a reason and replacement.
- [ ] 7.4 Run focused CashierWorkflowRoute regression coverage across Earn, Lookup, and Redeem, then run frontend lint, typecheck, unit/a11y, affected Playwright, build, and Semgrep checks; verify all required gates pass.
- [ ] 7.5 Run GitNexus `detect_changes()` and inspect the final diff/status for expected symbols and flows only; verify no unrelated dirty files were modified.
