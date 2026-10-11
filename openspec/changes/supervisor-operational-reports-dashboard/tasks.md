## 1. Dashboard and period state

- [x] 1.1 Add the route-specific Supervisor operational reports dashboard and mount it on `/supervisor/reports`.
- [x] 1.2 Add Last 7 days, Last 30 days, and validated custom-date selection with one applied period shared by all dashboard requests and the report builder.
- [x] 1.3 Add safe report-metric helpers that sum period flows and select latest dated stock snapshots.

## 2. Operational reporting surfaces

- [x] 2.1 Add the four branch-authorized financial KPIs and their loading, empty, partial-failure, and snapshot-date states.
- [x] 2.2 Add the daily activity chart and overall, cashier, redemption, and SMS category summaries.
- [x] 2.3 Preserve the Supervisor report-generation/export workspace and shared period; keep Admin Operations defaults unchanged.
- [x] 2.4 Add operational-reports-content-scoped responsive styling and accessible labels/empty states.

## 3. Verification and acceptance

- [x] 3.1 Add unit coverage for period math, flow sums, latest-snapshot selection, and invalid/unavailable values.
- [x] 3.2 Add dashboard, shared report-workspace, and route regressions for filtering, branch-scoped API usage, and period propagation.
- [x] 3.3 Run focused web tests, typecheck, lint, formatting, diff checks, and strict OpenSpec validation.
- [ ] 3.4 Visually review desktop, tablet, and mobile using an authorized Supervisor session and populated real branch-scoped report data; document any access blockers or defects.
  - Blocked: no authorized Supervisor session or populated live branch data was available. Deterministic Supervisor fixtures were visually reviewed at 1440, 1024, 768, and 390 px; screenshots are in `/tmp/shopcity-supervisor-reports-{desktop-top,desktop-bottom,mobile-top}.png`.

## 4. Report presentation and states

- [x] 4.1 Restyle the Supervisor report page content with the Approvals palette, card system, pill controls, responsive layout, and freshness/scope indicators.
- [x] 4.2 Add metric definitions, data-provenance notes, Africa/Lagos display formatting, and integer-safe NGN formatting without changing report calculations.
- [x] 4.3 Add a role-configurable report workspace with scope chips, report descriptions, result tables, row details, and client-side pagination; retain the Admin Operations default.
- [x] 4.4 Add loading, empty, 403, 429, export, and copy-reference states; hide Admin-only actions for Supervisors and preserve existing API calls and authorization.
- [x] 4.5 Add focused regression coverage and review responsive layouts with deterministic report fixtures.

## 5. Admin Reports mapping and role controls

- [x] 5.1 Generalize the operational dashboard for Supervisor and Admin routes with role-specific labels and server-confirmed scope.
- [x] 5.2 Map `/admin/reports` to the shared dashboard and preserve Admin branch/timezone filters and the shared reporting period.
- [x] 5.3 Expose audit, pilot-operations, and materialization refresh only in the Admin presentation; preserve Supervisor restrictions and server RBAC.
- [x] 5.4 Add Admin route, role-option, scope-propagation, refresh, and Admin Operations regression coverage.
