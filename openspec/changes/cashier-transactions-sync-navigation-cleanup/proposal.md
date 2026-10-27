## Why

The Cashier workspace has accumulated presentation and workflow inconsistencies around transactions, sync, navigation, and search. The current production UI must be brought back to the approved Transactions and transaction-detail references while preserving generated API contracts, tenant/branch scoping, IndexedDB queue behavior, RBAC, CSRF, idempotency, offline Earn handling, and truthful financial messaging.

The existing shared `TransactionDashboard` also mixes a Cashier Today data source with Supervisor/Admin surfaces. Cashier navigation still exposes customer records instead of the approved Transactions destination, and several search controls either overpromise capabilities or are inert.

## What Changes

- Inspect the approved Transactions list and transaction-detail popup references, prototype HTML/CSS, current transaction/customer/sync components, and Capture Purchase/Redeem forms before implementation.
- Add `/cashier/transactions`; replace the Cashier primary Customer Records entry with Transactions while preserving customer deep links and Supervisor/Admin customer/card management.
- Refine the Transactions list and implement an accessible, genuinely modal transaction-detail view using authoritative generated-client data and truthful bounded-feed copy.
- Correct Cashier versus Supervisor/Admin transaction data-source boundaries and retain reversal controls only where authorized.
- Make global, customer, transaction, and sync searches truthful, controlled, keyboard-accessible, combined with filters, and free of per-keystroke request storms.
- Redesign Sync Queue around summary states, search/filter, queue table, selected-record detail, batch actions, retry semantics, and precise offline/approval/credit copy without changing IndexedDB or reconciliation behavior.
- Unify Cashier navigation, topbar, buttons, guided forms, responsive behavior, focus handling, and reduced-motion treatment with the approved prototype language.
- Add route, modal, search/filter, RBAC, queue, offline, reconciliation, accessibility, visual, build, lint, typecheck, and security regression coverage.
- Capture and review desktop/mobile Transactions, opened detail modal, and Sync Queue states against the approved references; record unsupported backend capabilities and intentional deviations.

## Non-goals

- No backend refactor, new financial authority, or weakening of RBAC, CSRF, idempotency, tenant/branch isolation, or integer-kobo rules.
- No unbounded transaction-history claim or decorative pagination over an unavailable API capability.
- No cashier reversal action, offline Redeem support, synthetic audit events, fabricated receipt images, customer names, balances, or outcomes.
- No removal of contextual customer-detail deep links or Supervisor/Admin customer/card management.
- No blind visual-baseline updates without reviewing the rendered diff against the approved reference.

## Acceptance Criteria

- Cashier navigation is ordered Overview, Find Customer, Capture Purchase, Redeem Credit, Transactions, Sync Queue; Overview links to `/cashier/transactions`.
- Transactions list and opened detail modal match the approved hierarchy and interaction model, including loading, empty, error, focus, Escape, backdrop, restoration, and stale-request protection.
- Transaction and Sync Queue filtering is truthful, composable, accessible, and covered by tests; bounded activity wording remains accurate.
- Cashier, Supervisor, and Admin data sources and actions remain correctly scoped.
- Existing Earn, Redeem, offline queue, retry, approval, cleanup, and reconciliation flows remain green.
- Desktop/mobile screenshots and accessibility checks are reviewed, with final SHA and residual deviations documented.

## Impact

Primary surfaces:

- `apps/web/components/app-sidebar.tsx`
- `apps/web/components/app-topbar.tsx`
- `apps/web/components/shell-navigation.ts`
- `apps/web/components/workflows/transaction-dashboard.tsx`
- `apps/web/components/workflows/customer-workspace.tsx`
- `apps/web/app/(shell)/cashier/sync/page.tsx`
- `apps/web/app/(shell)/cashier/**`
- `apps/web/components/workflows/cashier-transaction-route.tsx`
- `apps/web/components/workflows/earn-transaction-form.tsx`
- `apps/web/components/workflows/redeem-transaction-form.tsx`
- related generated-client boundaries, tests, screenshots, and frontend documentation

The change is frontend-focused but has a high regression surface because shared navigation, transaction presentation, queue persistence, and role-specific routes are involved. Implementation must begin with GitNexus impact analysis and preserve unrelated working-tree changes.
