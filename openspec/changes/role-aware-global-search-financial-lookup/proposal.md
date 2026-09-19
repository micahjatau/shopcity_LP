# Change: Role-Aware Global Search and Shared Financial Lookup

## Why

The repaired shell still contains a non-functional search field, while Cashier and Supervisor/Admin users need a single role-aware discovery surface. Capture Purchase and Redeem also duplicate the initial card lookup presentation, causing styling drift and leaving Redeem with a generic fallback state.

## What changes

- Replace the inactive topbar search and notification control with a reusable role-aware global search, account avatar, and mobile navigation control.
- Search Customers and Cards for Cashiers; search Customers, Cards, and authorized Cashiers for Supervisor/Admin users.
- Use the existing customer directory and exact card lookup contracts with controlled/debounced directory search, explicit card lookup, masked Cashier results, stale-request protection, keyboard navigation, Escape, loading/error/empty states, and selected-record deep links.
- Add a narrowly scoped authorized cashier directory contract for Supervisor/Admin that enforces tenant and branch scope rather than broadening the Admin-only Users endpoint.
- Extract shared `VerifiedCardLookupStep` presentation for Capture Purchase and Redeem Credit while preserving the existing lookup controller, generated clients, financial safeguards, and workflow transitions.
- Remove Redeem’s generic initial lookup fallback and replace structural first-of-type/route-specific override styling with explicit shared classes/tokens.
- Add role, authorization, lookup, accessibility, paired visual, responsive, and regression coverage.

## Scope

In scope: shared shell topbar/search, customer/card/cashier discovery contracts, Cashier-safe masking, financial lookup presentation, affected generated client artifacts, tests, and screenshots.

Out of scope: changing financial calculations, transaction APIs, RBAC semantics, session authority, or approval/reconciliation behavior.

## Acceptance criteria

- Search is functional, role-aware, keyboard accessible, debounced for directories, and explicit for exact card lookup.
- Cashier sees only Customers and Cards; Supervisor/Admin additionally see authorized Cashiers with branch scope enforced.
- Selected results navigate to supported customer/card/cashier destinations without fabricating data.
- Capture Purchase and Redeem share identical lookup geometry and state presentation across idle/loading/error/found/confirmation states.
- Existing generated API contracts, card authority, offline behavior, idempotency, RBAC, and financial safeguards remain intact.
- Affected lint, typecheck, unit, accessibility, Playwright, build, integration, Semgrep, and final-SHA CI checks pass.
