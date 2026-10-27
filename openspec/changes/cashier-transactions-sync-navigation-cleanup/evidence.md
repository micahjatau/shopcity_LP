# Cashier transactions/sync/navigation evidence

## Baseline inspection (2026-09-19)

- Working tree was already dirty before this change; unrelated changes are preserved.
- Transactions reference: `apps/web/public/prototype/transactions-dashboard.html`.
- Reference geometry: 244px desktop sidebar, 1120px content max width, 34px display heading, 4-column filter group, 820px minimum table width, 600px modal width, 920px/620px responsive breakpoints.
- Reference states: bounded cashier activity loading/error notice, refresh action, receipt/transaction search, status and operation filters, minimum amount filter, empty state, keyboard-addressable table rows, modal loading/detail states, backdrop/Escape/close behavior, and truthful omission of receipt image/customer/audit data.
- Current Cashier navigation exposes `Customer Records` at `/cashier/customers` and has no `/cashier/transactions` item.
- Current Cashier Overview “View all transactions” links to `/supervisor/transactions`.
- Current `TransactionDashboard` is shared by Supervisor and Admin pages, but currently loads the bounded Cashier Today report, displays nullable detail fields directly, and uses a native open dialog without explicit focus restoration/stale-response protection.
- Current Cashier Sync Queue preserves IndexedDB queue, device-bound session context, batch reconciliation, retry/requeue, approval, and confirmed cleanup. Its presentation has no controlled search/filter and exposes raw backend response details.
- Current Capture Purchase and Redeem flows are implemented through `CashierWorkflowRoute`, `EarnTransactionForm`, and `RedeemTransactionForm`; lookup is submit-driven and authoritative before the forms unlock.
- Supervisor/Admin transaction routes now mount the authorized `TransactionWorkspace` only; the Cashier Today `TransactionDashboard` is isolated to `/cashier/transactions`, avoiding reuse of the bounded cashier projection on management routes.
- Sync Queue presentation copy now describes offline transactions and confirmation rather than exposing reconciliation terminology as the primary user-facing language; technical payloads remain behind a disclosure.
- Playwright initially stalled because the pre-existing Next dev server was stuck during session bootstrap; restarting the local web server resolved the environment issue. The Cashier transaction modal test, route geometry test, and four sync/offline workflow tests then passed. Supervisor transaction geometry now targets the preserved `transactions-view` workspace rather than the removed Cashier Today dashboard.
- No backend or database change is required by this OpenSpec.

## GitNexus impact baseline

Commands used: `node scripts/gitnexus.cjs impact <target> -r shopcity_LP -d upstream --include-tests --summary-only`

- `shellNavigationByRole`: LOW, 0 upstream dependants reported (exact symbol match).
- `CashierOverviewLookup`: LOW, 1 direct dependant.
- `TransactionDashboard`: LOW, 3 direct dependants; 2 affected processes (`AdminTransactionsPage`, `SupervisorTransactionsPage`).
- `CashierSyncPage`: LOW, no upstream dependants reported (exact symbol match).
- `CashierWorkflowRoute`: HIGH, 4 direct dependants; 3 affected processes (`CashierEarnPage`, `CashierRedeemPage`, `CashierLookupPage`). This is a required warning: changes to this shared route can regress all three Cashier workflows.
- `app-shell` target was not found; shell call sites are in `apps/web/components/app-shell.tsx` and should be assessed by file/symbol before editing.

## Verification evidence

- `npm run web:typecheck`: passed (direct `tsc --noEmit` confirmation).
- `npm run web:lint`: passed.
- `npm run web:build`: passed.
- `semgrep --config p/owasp-top-ten --error apps/web/components/workflows/transaction-dashboard.tsx 'apps/web/app/(shell)/cashier/sync/page.tsx'`: passed, 0 findings.
- `openspec validate cashier-transactions-sync-navigation-cleanup`: valid.
- Deterministic Cashier, Supervisor, and Admin session fixtures are centralized in `apps/web/tests/workflow-routes.spec.ts`; shared route-status evidence helper now reports the failing route path. Targeted Cashier/Supervisor route and shell-destination Playwright checks passed.
- Sync Queue narrow viewport Playwright test initially exposed a 464px overflow; responsive grid overrides were added and the test now passes at 375px.
- Focused Jest suites for AppShell, shell navigation, transaction dashboard/workspace, forms, and offline queue: passed.
- Targeted Playwright modal, sync/offline, shell navigation, and route geometry tests: passed after restarting the stale local web server.
- Full affected `workflow-routes.spec.ts` suite: 14/14 passed; `browser-a11y.spec.ts`: 2/2 passed; focused Jest suites for shell, forms, transactions, workspace, and offline queue: passed.
- A concurrent build/dev-server run temporarily invalidated `.next`; the dev server was stopped, a clean `npm run web:build` passed, and the dev server was restarted before the final Playwright run.

## Visual review

- Reviewed `cashier-transactions-list-linux.png`: bounded activity heading, exact filters, result count, table hierarchy, and refresh action are visible; no complete-history pagination is presented.
- Reviewed `cashier-transactions-detail-linux.png`: backdrop, modal, close control, authoritative fields, and omission of customer/audit/receipt-image claims are visible.
- Reviewed `sync-queue-mobile-empty-linux.png`: 375px layout stacks actions and filters without horizontal overflow; empty state, summary badges, selected details, technical result panel, and queue controls remain reachable.
- Accepted deviations: management transaction workspace is intentionally not represented by the Cashier Today visual reference; Cashier activity remains bounded and technical sync payloads remain disclosure-only.

## Intentional unsupported capabilities

- Cashier remains limited to the bounded Cashier Today projection; no complete-history claim or decorative pagination is added.
- Cashier detail must not fabricate customer names, receipt images, audit actors/events, balances, or outcomes absent from authoritative responses.
- Cashier has no reversal action; Supervisor/Admin reversal behavior remains outside the Cashier route.
