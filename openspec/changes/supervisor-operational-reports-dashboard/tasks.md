## 1. Dashboard and period state

- [x] 1.1 Add the route-specific Supervisor operational reports dashboard and mount it on `/supervisor/reports`.
- [x] 1.2 Add Last 7 days, Last 30 days, and validated custom-date selection with one applied period shared by all dashboard requests and the report builder.
- [x] 1.3 Add safe report-metric helpers that sum period flows and select latest dated stock snapshots.

## 2. Operational reporting surfaces

- [x] 2.1 Add the four branch-authorized financial KPIs and their loading, empty, partial-failure, and snapshot-date states.
- [x] 2.2 Add the daily activity chart and overall, cashier, redemption, and SMS category summaries.
- [x] 2.3 Preserve the existing report-generation/export workspace and make its date range follow the dashboard period without changing Admin defaults.
- [x] 2.4 Add Supervisor-report-scoped responsive styling and accessible labels/empty states.

## 3. Verification and acceptance

- [x] 3.1 Add unit coverage for period math, flow sums, latest-snapshot selection, and invalid/unavailable values.
- [x] 3.2 Add dashboard, shared report-workspace, and route regressions for filtering, branch-scoped API usage, and period propagation.
- [x] 3.3 Run focused web tests, typecheck, lint, formatting, diff checks, and strict OpenSpec validation.
- [ ] 3.4 Visually review desktop, tablet, and mobile using an authorized Supervisor session and populated real branch-scoped report data; document any access blockers or defects.
