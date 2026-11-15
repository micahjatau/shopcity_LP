## Why

`GET /api/v1/reports/pilot-operations-summary` returns a point-in-time operational snapshot. It cannot support a truthful trend chart, and several underlying status records are mutable rather than a complete history of past state.

## What Changes

- Persist hourly, tenant-scoped snapshots of the existing pilot-operations metrics for 30 days, with RLS enabled and no browser/Data API read policy.
- Reuse the existing server-side metric calculations and thresholds so the live summary and history cannot drift.
- Add a separate Admin-only, tenant-scoped history endpoint with bounded 24-hour, 7-day, and 30-day windows.
- Add a selectable health trend chart to the Admin Operations Overview only. Represent missing hourly samples as gaps; do not backfill or synthesize zeros.
- Retain no sensitive payloads, customer data, or financial values in the snapshots.

## Non-goals

- Do not change the existing pilot-operations summary response or its use in Reports workspaces.
- Do not add history charts to `/admin/reports` or Supervisor reports in this change.
- Do not backfill history from mutable current-state rows or fabricate values before collection begins.
- Do not change user roles, tenant authorization, financial calculations, or ledger records.

## Capabilities

### New Capabilities

- `pilot-operations-health-history`: hourly historical operational-health snapshots and an Admin Operations trend presentation.

## Impact

- Backend: Prisma schema/migration, ReportsService/ReportsController, and the existing API worker process.
- Contract: additive OpenAPI endpoint and regenerated client; existing endpoint remains unchanged.
- Frontend: Operations Overview only, plus focused tests.
- Database: additive telemetry table with a unique tenant/hour key and 30-day retention; no shared/remote migration is applied by this change.
