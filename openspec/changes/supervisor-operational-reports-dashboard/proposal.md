# Share Operational Reports across Supervisor and Admin

## Why

The Reports routes emphasize the detailed report builder, making it difficult to review activity quickly. Supervisors need a branch-scoped overview, while Admins need the same operational view with tenant or selected-branch scope and the additional report controls allowed by their role. Both roles need a period-based overview for loyalty purchase value, credit issuance and redemption, outstanding credit, daily trends, and operational summaries alongside detailed report generation and export.

## What Changes

- Add Last 7 days, Last 30 days, and validated custom reporting periods shared by the dashboard and detailed report builder.
- Show four financial KPIs, a daily activity chart, and category-filtered operational summaries for overall activity, cashier performance, redemptions, and SMS.
- Reuse existing reporting APIs and the existing report builder on both `/supervisor/reports` and `/admin/reports`; keep scope and authorization enforced by existing backend APIs.
- Show Admin-only audit and pilot-operations reports and the tenant/selected-branch materialization refresh controls to Admins; keep those reports hidden from Supervisors.
- Add a Supervisor dashboard refresh action that queues materialization for the Supervisor's authenticated branch only, with server-enforced scope, audit, idempotency, and throttling.
- Clearly distinguish period flow totals from the latest available outstanding-credit snapshot.
- Restyle the page content and detailed workspace using the Approvals design language, with accessible loading, empty, error, freshness, and rate-limit states.
- Format money and business timestamps for display using integer/decimal-safe and Africa/Lagos-aware formatting; expose metric definitions and report provenance without changing report calculations or API contracts.

## Non-goals

- No database schema, migration, or materialization job changes; add one narrowly scoped Supervisor refresh API action using the existing outbox/materializer pipeline.
- Supervisors cannot select or widen branch scope; Admins may use existing authorized branch filters.
- No changes to financial ledger semantics or report-generation/export formats. The new refresh API action is the only API/auth change; it must derive branch scope from the Supervisor session and cannot accept tenant-wide or client-selected scope.
- Preserve existing Admin branch, timezone, date-range, export, and refresh capabilities within the shared presentation.
- Supervisors cannot access Admin-only reports or the Admin refresh endpoint. Their dashboard refresh is limited to a server-derived branch refresh and cannot be used to select or widen scope.

## Impact

The Supervisor and Admin Reports routes share the operational dashboard component, report-metric helpers, responsive styles, and role-aware report workspace. `ReportsWorkspace` is shared with Admin Operations and has **HIGH** GitNexus upstream impact (four direct dependants across three report-related flows); preserve Supervisor restrictions and verify Admin Operations defaults. Proposal-time findings are recorded in `docs/development/gitnexus-impact-tracker.md`.

## Acceptance

- The selected inclusive date range drives dashboard requests and the detailed report builder; invalid custom ranges are rejected.
- Loyalty purchase value, credit issued, and credit redeemed are sums across available daily rows in the period.
- Outstanding credit is taken from the latest available daily snapshot within the selected period, never summed as a flow.
- Supervisor report requests remain branch-scoped by existing backend authorization; the UI does not select or widen branch scope.
- Admin can use the same dashboard at `/admin/reports`, with tenant scope by default and existing authorized branch filters applied consistently to branch-capable dashboard and detailed-report requests; Audit and Pilot Operations remain tenant-wide as defined by their APIs.
- The Admin report picker exposes audit and pilot-operations reports and its existing materialization refresh; Supervisor options remain role-filtered. The Supervisor dashboard refresh queues only the authenticated branch's materialization and reloads after completion.
- Empty, loading, partial-failure, and unavailable data are represented without fabricating financial values.
- The dashboard, category summaries, and existing report builder remain readable and operable at desktop, tablet, and phone widths.
