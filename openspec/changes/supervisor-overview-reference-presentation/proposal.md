## Why

The Supervisor overview now has the intended native HTML presentation, but its hard-coded example figures and approvals do not help supervisors understand current branch activity. Wire that presentation to authorized, branch-scoped reporting while keeping the supplied SVGs as design references only.

## What Changes

- Keep the greeting, approvals action, Today's Activity cards, semantic approvals table, responsive layout, shared shell, and scanner context.
- Populate today's transaction, credit-issued, and credit-redeemed metrics from the executive snapshot for the branch's current business date; show its materialization timestamp and never present missing data as zero.
- Populate the pending-approvals metric and five-row cursor pages from the existing branch-scoped approvals API, including an exact server-side pending count and the customer/requester details needed by the table.
- Add accessible previous/next controls using the API's existing cursor metadata and server-side search across all pending approvals in the caller's scope. Keep search active while paging, reset to the first page when the query changes, and distinguish matching results from the global pending count.
- Add independent loading, error, empty, and refresh states. Keep the full approval workflow on its dedicated route.
- Keep the SVGs as visual guidance only; remove all static sample values and rows from the rendered overview.

## Capabilities

### Modified Capabilities

- `supervisor-overview`: The reference presentation is backed by live, authorized branch data with explicit freshness and unavailable-data states.

## Impact

- Supervisor overview component, styles, and focused frontend/accessibility/route tests.
- Additive approval-list search and exact-count fields, plus regenerated OpenAPI and client artifacts. Search is applied within the existing authorization scope before cursor pagination.
- No database schema, ledger, RBAC-policy, or remote/production configuration changes. Existing API authorization remains authoritative.
