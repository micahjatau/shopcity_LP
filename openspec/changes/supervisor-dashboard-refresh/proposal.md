## Why

The Supervisor overview's Refresh button currently reloads the saved report snapshot but does not request a new materialization. Since report rows are derived, the button can appear ineffective until the next scheduled sweep.

## What Changes

- Connect the button to the existing authenticated, idempotent Supervisor dashboard refresh request.
- After durably recording the refresh intent, synchronously rebuild only the authenticated Supervisor's branch report before returning.
- Reload the snapshot and approvals after the refresh succeeds, and show an error if it fails.
- Preserve audit/idempotency/outbox behavior, branch authorization, and the existing scheduled sweep as a backstop.

## Capabilities

### New Capabilities

- `supervisor-overview-refresh`: make the overview Refresh action rebuild and display the current branch's report read model.

### Modified Capabilities

- `report-refresh-idempotency`: retain durable intent and replay semantics while reporting whether an intent is new so immediate materialization is not repeated on an idempotent replay.

## Impact

- `apps/web/app/(shell)/supervisor/page.tsx` and its focused tests.
- `src/modules/reports/reports.controller.ts` / `report-export.service.ts` and unit tests.
- `ReportMaterializerService.materializeBranch`; no schema, financial source data, or cron secret changes.
