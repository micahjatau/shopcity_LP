## Why

The Supervisor transactions route currently asks staff to know an internal transaction ID before seeing anything, while the Cashier transactions page is organized around receipt numbers and clickable rows. Supervisors need to see branch transactions as soon as the route opens, filter them by receipt number when needed, inspect authoritative details, and only then request a reversal.

The Cashier activity feed is deliberately restricted to the logged-in Cashier and its current-day bounded scope; the Supervisor cashier-activity endpoint contains aggregates, not transaction rows. Reusing either for Supervisor receipt lookup would be incorrect. A small read-only, authenticated branch-scoped search is required.

## What Changes

- Replace the Supervisor transaction-ID loader and status/contract pills with a cashier-style receipt-number search and results table.
- Add a bounded, read-only Supervisor transaction list with an optional normalized receipt-number filter; return stable ledger-entry IDs, not receipt IDs.
- Add branch-scoped status, cashier, and minimum receipt amount filters; apply them server-side before cursor pagination.
- Match supported reference table columns using authorized customer name, receipt amount, credit, status, and date data; omit the unsupported eligibility column.
- Make each result open a focused dialog that fetches authoritative transaction detail before enabling reversal controls.
- Move the existing reversal reason and explicit `REVERSE` confirmation into the dialog; use the existing CSRF-protected, idempotent reversal endpoint.
- Keep the Cashier transactions page, its cashier-only feed, Admin transaction workspace, and backend financial reversal rules unchanged.

## Capabilities

### New Capabilities

- `supervisor-transaction-receipt-search`: Defines Supervisor receipt-based transaction lookup, scoped result rows, and authoritative detail/reversal dialog behavior.

### Modified Capabilities

None. Existing reversal policy remains unchanged.

## Impact

- Supervisor transaction route and a route-specific transaction list/dialog component.
- A read-only Loyalty transaction search endpoint, its OpenAPI contract, and generated web client.
- Focused backend, frontend, and browser coverage.
- No schema/migration, financial mutation, Cashier authorization, or reversal policy changes.
