## Context

The Supervisor overview already reads a branch-scoped executive snapshot and has a refresh button. The button only increments a local reload counter, so it re-fetches the last materialized row without initiating materialization. The backend already exposes a Supervisor-only `POST /api/v1/reports/dashboard/supervisor/refresh` that atomically records an audit entry, idempotency record, and outbox event, but its current outbox-only behavior does not provide immediate feedback when a persistent worker is unavailable.

## Goals / Non-Goals

**Goals:**

- Make a user click refresh authoritative source-derived report rows for the session Supervisor's branch before reloading the snapshot.
- Keep the refresh action authenticated, branch-scoped, CSRF-protected, throttled, audited, and idempotent.
- Clearly communicate an error if the immediate materialization or subsequent reload fails.

**Non-Goals:**

- Expose the cron bearer secret to the browser or add a new public endpoint.
- Materialize other branches or the tenant-wide report scope from the Supervisor action.
- Change report calculations, financial source data, existing scheduled jobs, or report-read authorization.

## Decisions

1. The frontend calls the existing Supervisor-only refresh endpoint with CSRF and a fresh `Idempotency-Key`; it does not call the cron endpoint or possess `CRON_SECRET`.
2. Preserve the existing atomic audit/idempotency/outbox transaction. The refresh service returns whether this request created a new refresh intent. After a new intent is committed, the controller invokes `ReportMaterializerService.materializeBranch` for the branch from the authenticated session. A replay that already has a completed idempotency response does not repeat materialization.
3. Return from the existing request only after the branch materialization succeeds; retain its current HTTP response contract. If materialization fails, the request fails and the durable outbox intent remains available for normal recovery; a later click can submit a new idempotency key.
4. After a successful refresh response, the page re-fetches the snapshot and approvals. While the request is in progress, disable the button and show its refreshing state. On error, show a non-success message and do not claim that values were refreshed.
5. Keep the existing five-minute external cron and daily Vercel Cron fallback as independent safety nets.

## Risks / Trade-offs

- Synchronous branch materialization adds bounded database work to the request. Existing branch materialization and serverless duration limits must remain within the API's request budget; the scheduled sweep remains a recovery/backstop.
- The outbox event may later be processed by the persistent worker and repeat the same idempotent read-model rebuild. This is safe; financial source records are not modified.
- A materialization failure after committing the intent returns an error while leaving the durable outbox event. The UI must surface the error, and a new click can retry with a new key.

## Rollout / Verification

1. Add tests for idempotent refresh intent creation/replay, session-branch-only synchronous materialization, and materialization failure propagation.
2. Add frontend tests asserting the click sends the refresh request before reloading and reports failures.
3. Run focused backend/frontend tests, typecheck, lint, build, and strict OpenSpec validation.
4. Deploy the API and web changes, click Refresh as a Supervisor, and verify the branch materialization timestamp advances immediately and the displayed snapshot is fetched after completion.
