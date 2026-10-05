# Add Supervisor Operational Reports dashboard

## Why

The Supervisor Reports route currently emphasizes the detailed report builder, making it difficult to review branch activity quickly. Supervisors need a compact, period-based overview for loyalty purchase value, credit issuance and redemption, outstanding credit, daily trends, and operational summaries, while retaining the existing detailed report/export workflow.

## What Changes

- Add Last 7 days, Last 30 days, and validated custom reporting periods shared by the dashboard and detailed report builder.
- Show four financial KPIs, a daily activity chart, and category-filtered operational summaries for overall activity, cashier performance, redemptions, and SMS.
- Reuse existing reporting APIs and the existing report builder; keep branch scope enforced by backend authorization and report APIs.
- Clearly distinguish period flow totals from the latest available outstanding-credit snapshot.

## Non-goals

- No new reporting API, database schema, migration, materialization job, or backend authorization behavior.
- No client-selectable branch scope or cross-branch reporting.
- No changes to financial ledger semantics, report-generation/export formats, or Admin report defaults.

## Impact

The Supervisor Reports route and a new route-specific dashboard component are added, along with report-metric helpers, scoped styles, and tests. `ReportsWorkspace` is shared with Admin workflows and has **HIGH** GitNexus upstream impact (four direct dependants across three report-related flows); preserve its defaults and verify Admin regressions. Proposal-time findings are recorded in `docs/development/gitnexus-impact-tracker.md`.

## Acceptance

- The selected inclusive date range drives dashboard requests and the detailed report builder; invalid custom ranges are rejected.
- Loyalty purchase value, credit issued, and credit redeemed are sums across available daily rows in the period.
- Outstanding credit is taken from the latest available daily snapshot within the selected period, never summed as a flow.
- Supervisor report requests remain branch-scoped by existing backend authorization; the UI does not select or widen branch scope.
- Empty, loading, partial-failure, and unavailable data are represented without fabricating financial values.
- The dashboard, category summaries, and existing report builder remain readable and operable at desktop, tablet, and phone widths.
