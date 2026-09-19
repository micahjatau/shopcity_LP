## 1. Reference and impact baseline

- [ ] 1.1 Inspect the Transactions list and transaction-detail reference exports, prototype HTML/CSS, current transaction/customer/sync components, and Capture Purchase/Redeem forms; record measurements, states, and intentional unsupported capabilities in the change evidence.
- [ ] 1.2 Run GitNexus impact analysis for the navigation registry, Cashier route, TransactionDashboard, sync page, modal/detail symbols, and affected controllers; record direct callers, flows, and risk before edits.
- [ ] 1.3 Freeze deterministic Cashier, Supervisor, and Admin fixtures and add route-level evidence helpers; verify the existing affected Playwright suites remain runnable before implementation.

## 2. Navigation and route boundaries

- [ ] 2.1 Update the canonical Cashier navigation to Overview, Find Customer, Capture Purchase, Redeem Credit, Transactions, and Sync Queue; verify ordering, icons, active states, and role-specific destinations in navigation tests.
- [ ] 2.2 Add `/cashier/transactions` and route Overview “View all transactions” there; verify Cashier never follows the normal transaction path to `/supervisor/transactions` while customer-detail deep links still resolve.
- [ ] 2.3 Preserve Supervisor/Admin customer, card, reports, and reversal routes while correcting TransactionDashboard mounting/data-source boundaries; verify role and endpoint tests.
- [ ] 2.4 Align desktop/mobile sidebar and topbar presentation, footer destinations, connection-state copy, button icon-label rhythm, and Help/Logout behavior with the approved prototype; verify shell accessibility and responsive tests.

## 3. Transactions list and detail modal

- [ ] 3.1 Build the Cashier Transactions list around the bounded Cashier Today projection with truthful heading, scope copy, refresh, loading, empty, error, result-count, search, and status/credit filters; verify bounded-feed and filter unit tests.
- [ ] 3.2 Normalize transaction statuses and matching fields for receipt number and transaction ID without substring ambiguity; verify combined-filter and status-mapping tests.
- [ ] 3.3 Implement the authoritative transaction-detail request through the generated client and map nullable/unsupported fields to truthful view-model copy; verify no raw DTO, fabricated audit event, customer name, receipt image, or outcome is rendered.
- [ ] 3.4 Implement the transaction detail as an accessible modal with backdrop, initial focus, focus containment, Escape, close control, scroll handling, focus restoration, loading/error/empty states, and stale-response protection; verify keyboard, race, and modal lifecycle Playwright tests.
- [ ] 3.5 Preserve Supervisor/Admin reversal behavior and exclude reversal controls from Cashier detail; verify role-boundary and authorization tests.

## 4. Search and Sync Queue

- [ ] 4.1 Make global topbar search either route-aware and functional or explicitly noninteractive; verify keyboard behavior, supported scope, and no per-keystroke request test.
- [ ] 4.2 Expand Find Customer search only through supported discovery/card-lookup contracts, preserving authoritative verification before Earn/Redeem; verify phone/name/card discovery and verification-boundary tests.
- [ ] 4.3 Add Sync Queue controlled search for receipt number, card serial, and local record ID plus a composable status filter; verify full-queue summary counts versus filtered-result counts.
- [ ] 4.4 Redesign Sync Queue around title, description, compact state summary, queue table, selected-record detail, batch actions, and technical-details disclosure; verify empty, populated, syncing, approval, failed, and mobile states.
- [ ] 4.5 Preserve IndexedDB persistence, session-bound device context, idempotency, retry/requeue, reconciliation, approval, and confirmed cleanup while applying precise action labels and offline Earn/Redeem semantics; verify queue and reconciliation regression tests.

## 5. Forms, copy, and visual parity

- [ ] 5.1 Review Capture Purchase and Redeem Credit stages, widths, field grouping, action placement, success/error states, keyboard focus, and reduced-motion behavior against the approved references; verify existing workflow contract tests and responsive snapshots.
- [ ] 5.2 Replace engineering-oriented copy with approved operational terms across Transactions, Sync Queue, lookup, and workflows; verify user-facing copy assertions do not claim unsupported history, credit, audit, or backend details.
- [ ] 5.3 Capture reviewed desktop/mobile Transactions list, opened detail modal, and Sync Queue state screenshots; compare them against the approved references and record accepted deviations rather than blindly updating baselines.
- [ ] 5.4 Add or update deterministic route screenshots and geometry assertions for navigation, list, modal, queue, and responsive states; verify the visual suite and reference-manifest checks.

## 6. Final verification and release evidence

- [ ] 6.1 Run focused unit, contract, queue, accessibility, and affected Playwright tests for navigation, Transactions, modal, Search, Sync Queue, Earn, Redeem, offline, and reconciliation flows.
- [ ] 6.2 Run frontend lint, typecheck, build, Semgrep, OpenSpec validation, and applicable integration/security checks; record exact commands and outcomes.
- [ ] 6.3 Run GitNexus detect_changes and inspect the staged diff, affected flows, residual risks, and unrelated dirty files; verify only expected symbols and artifacts are included.
- [ ] 6.4 Produce the deliverables: changed-file rationale, before/after route/sidebar map, search matrix, list/modal parity comparison, Sync Queue state/copy matrix, final desktop/mobile screenshots, exact final SHA test results, and intentional deviations/unsupported capabilities.
