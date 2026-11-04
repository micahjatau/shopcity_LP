## Context

The existing `PilotOperationsSummary` is built from current database counts and includes `generatedAt`, but stores no historical observations. Outbox, SMS, offline-sync, fraud, and report-materialization status records can change; current rows cannot reconstruct a consistent past health state. Reconciliation is computed from current ledger/credit-lot state. The report endpoint is Admin-only and obtains tenant scope from `AuthContext`.

## Decisions

1. **Keep one canonical metric calculation.** Extract the existing count calculation from `ReportsService.getPilotOperationsSummary` into a shared service method. The existing summary and the snapshot collector call that method; do not copy thresholds or calculations into the worker.
2. **Persist one aggregate row per tenant and UTC hour.** Add `PilotOperationsSnapshot` with `tenantId`, `bucketStart`, `capturedAt`, and the existing count/health fields: outbox backlog/stale counts, SMS failures, offline-sync failures, open fraud flags, stale report materializations, and reconciliation health/mismatch count. Add a unique constraint on `(tenantId, bucketStart)` and an index for retention cleanup. Store no event payloads, IDs, or customer data.
3. **Collect hourly through the existing worker entry point.** Add a bounded, sequential tenant sweep with an immediate initial sample and hourly runs. Upsert on the unique tenant/hour key so restarts or duplicate runs do not create multiple points in one bucket. Do not create synthetic points for missed hours. The existing worker is expected to run as one worker service; the unique key still makes writes idempotent if a run repeats.
4. **Retain 30 days.** Prune snapshots older than 30 days during the hourly sweep. This is operational telemetry, not financial or audit history. No existing ledger, audit, or source rows are deleted or changed.
5. **Add a separate endpoint, not fields on the current summary.** `GET /api/v1/reports/pilot-operations-history?window=24h|7d|30d` defaults to `7d`, is Admin-only, and scopes by `context.user.tenantId`; clients cannot submit a tenant ID. Return ordered hourly points with UTC `bucketStart`, actual `capturedAt`, and nested metrics. A request returns at most 720 points.
6. **Chart only on Operations Overview.** Add a metric selector (one series at a time to avoid mixing count scales) and a time-window selector. The initial Overview mount makes one additional history request; changing the window reloads the same endpoint. Reports workspaces and the internal Critical Flows presentation remain unchanged.
7. **Render only observed history.** Map absent hourly buckets to `null`, split line paths at gaps, and display a collecting/empty state when no snapshots exist. The current live summary must never be used as a historical point or as backfill. Provide accessible control labels, a chart description, and a data table for the selected series/window.
8. **Keep API access inside the backend.** The endpoint enforces `ADMIN` and tenant scope. Enable RLS on the exposed public-schema table and define no anon/authenticated read policy or direct Data API grant. The trusted Nest/Prisma backend remains the only history read path; the frontend uses the generated backend client.

## Risks and mitigations

- The sampler repeats the existing seven count/aggregate reads per tenant every hour. Process tenants sequentially in bounded batches and keep the existing indexes/query behavior; monitor runtime and database load.
- History begins at rollout and outages create visible gaps. Show the first available sample time and preserve gaps rather than backfilling.
- The same hourly row may be refreshed by a repeated run. Store `capturedAt` separately from the UTC bucket and expose both.
- The `30d` window can return up to 720 rows. Bound the query and chart one selected metric at a time.
- Preserve the current Admin-only endpoint and role gate. Add controller and service tests for cross-tenant isolation and non-Admin rejection.

## Verification

Validate the generated Prisma schema/migration, run focused service/worker/controller tests and local migration verification where available, export/lint OpenAPI, regenerate and typecheck the client, test web chart gaps/empty/error/window states, and validate this OpenSpec change. Do not apply the migration to a shared or remote database.
