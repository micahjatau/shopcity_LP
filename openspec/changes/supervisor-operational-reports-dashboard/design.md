# Design: Supervisor Operational Reports dashboard

## Context

The Supervisor Reports route already renders `ReportsWorkspace` and calls existing report endpoints. The dashboard is a presentation and aggregation layer over those contracts; it does not introduce new server behavior. The report data contract is branch-authorized on the backend, and the frontend must not supply a broader branch scope.

## Decisions

- Add a route-specific `SupervisorOperationalReports` component and mount it on `/supervisor/reports`; do not place the dashboard on Admin routes.
- Store the applied `from`/`to` range once in the route component. Pass that period to dashboard endpoint requests and to `ReportsWorkspace` so both areas remain aligned.
- Use the existing executive-summary, cashier-activity, redemption-summary, and SMS-operations reporting APIs. Keep authorization and branch filtering in the backend.
- Derive purchase value, issuance, and redemption as period flow sums. Derive outstanding credit and active-customer stock values from the latest report date, never by summing snapshots.
- Track independent report-source failures so a failed category cannot be mistaken for an empty or zero-valued result. Show explicit empty/loading/unavailable states and do not fabricate financial values.
- Extend `ReportsWorkspace` with optional, backward-compatible period/presentation props. Existing Admin consumers retain their previous defaults; the Supervisor route hides duplicate scope controls and uses the shared date range.
- Keep dashboard styling in a Supervisor-report-specific stylesheet and verify responsive widths and shared-workspace regressions.

## Risks and mitigations

- `ReportsWorkspace` has **HIGH** upstream impact across Supervisor and Admin report flows. Keep new behavior opt-in and run its focused unit and route tests, including Admin consumers.
- Daily snapshots are stock values, unlike period flows. Keep the metric helpers separate (`sum` versus latest dated row) and test them with multiple report dates.
- Independent APIs can return partial results. Use source-specific error and empty states; never present a failed response as a genuine zero.
- Local visual acceptance requires an authorized Supervisor identity and populated branch-scoped reporting data; mocked tests alone do not satisfy that review.

## Verification

Run focused metric, dashboard, report-workspace, and route tests; frontend typecheck/lint/format checks; strict OpenSpec validation; and browser layout checks at desktop, tablet, and mobile sizes when authorized real branch-scoped data is available.
