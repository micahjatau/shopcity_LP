# Design: Supabase Cron workerless processing

## Architecture

Supabase `pg_cron` owns the schedules. Each schedule invokes a narrowly scoped, internal Nest `POST /api/v1/internal/scheduled-jobs` endpoint through `pg_net`, using a secret stored in Supabase Vault and a separate secret per environment. Nest validates method, flow, bearer token, configured environment, and request size before any side effect. Scheduler secrets are not the existing report `CRON_SECRET`; they must be rotated per environment and compared with constant-time logic. No public client or browser can invoke this surface.

An invocation record is created before work starts and finished with status, safe error category, batch counts, duration, environment, and timestamps. `pg_net` request IDs/responses prove only transport outcome; the Nest job-run record is the source of completion evidence. Duplicate invocations use a deterministic schedule-window/idempotency key. A failed run is terminal for that key so transport retries preserve failure evidence; a later schedule window uses a new key to retry eligible domain work. Outbox claims use `FOR UPDATE SKIP LOCKED` and status transitions; the persisted report/history cursors use expiring database leases. Failures are surfaced; the handler does not return success merely because a request was accepted.

The scheduled controller delegates to existing domain services rather than moving financial logic into SQL. Nest's existing transactional outbox remains the durable intent boundary. Scheduled outbox handlers reuse the existing `QUEUED`/`PUBLISHED` statuses and recovery behavior; they must not mutate confirmed ledger entries or bypass SMS CAS, consent/suppression, payload validation, provider idempotency, or terminal status handling.

## Flow handlers and safeguards

- F0 approval expiry calls the existing approval-expiry transaction, preserving `SKIP LOCKED` and audit records.
- F1 credit expiry calls `CreditExpiryService.expireDueCredit` with the existing serializable retry policy and fixed, capped batch size.
- F2 reminder enqueue calls `ExpiryReminderService.enqueueDueReminders`; it creates one reminder record and one `sms.send` outbox intent under existing uniqueness and revalidation rules. It never sends to the provider directly.
- F3/F4/F5/F10 process only eligible outbox event types with row-locked claims, bounded attempts, and idempotent domain handlers. SMS remains an outbound intent guarded by existing `SmsMessage` reservation/CAS logic; fraud and report events use their existing services.
- F6 polls only eligible provider-confirmed SENT messages using existing due-time CAS and provider-report validation. Polling never sends a message.
- F7 report materialization stores a durable cursor/watermark and advances only after a successful bounded tenant batch. A lock prevents concurrent rebuilds. Cursor wraparound occurs only after reaching the end; failure leaves the cursor unchanged. The end-to-end request budget is configurable by `SCHEDULED_F7_EXECUTION_BUDGET_MS` (default 240,000 ms; accepted range 1,000–240,000 ms). The deadline starts at scheduler-handler entry. F7 starts a tenant rebuild only when enough budget remains for the existing 30-second transaction plus cleanup/response reserve. It never abandons an in-flight transaction with `Promise.race`; at safe boundaries it stops, releases only its token-fenced lease, and leaves the cursor on the unfinished tenant. If rebuild work committed but the deadline expires before cursor advancement, the idempotent rebuild may be repeated by a later invocation. The 420-second lease and 600-second stale-run recovery remain unchanged. The platform/runtime and pg_net request timeout must not undercut the configured budget.
- F8/F9 snapshot capture and retention pruning use the existing sampling cadence/retention policy; failures are counted and observable. Pruning is limited to rows older than the configured retention boundary and never touches audit/financial data.

## Rollout and compatibility

1. Deploy additive schema and protected handlers to Preview with all Supabase schedules disabled and `SMS_PROVIDER_MODE=disabled`; this mode records a terminal no-send result and does not call a provider. Verify authorization, caps, idempotency, query plans, migration reversibility, and failure cases locally/Preview.
2. Create Preview-only schedules and test using synthetic data. Keep old worker disabled for each canaried flow to avoid dual ownership; do not run both schedulers on the same production work queue.
3. Observe at least one full operational cycle plus retry/recovery and report-freshness evidence. Confirm SMS provider calls are impossible in the disabled test profile and no historical message can become eligible.
4. Prepare a separate reviewed cutover plan with schedule inventory, lock/drain procedure, rollback trigger, role approvals, and secret rotation. This task stops before Production.

The old worker and Vercel Cron configuration remain untouched in this implementation. Keeping old code is a rollback affordance, not permission for simultaneous execution. Any deployment must explicitly choose the owner per flow and verify no duplicate schedule.

## Migration safety

Schema changes are additive only and create scheduler evidence/cursor tables; no existing rows are backfilled or rewritten. Never rewrite an applied migration. The rollback plan drops only newly introduced tables after proving they are unused; no financial or historical rows are deleted. Supabase Cron/Vault setup scripts are not part of this local-only increment because Preview project access is unavailable; a separately reviewed, explicit Preview-only setup is a prerequisite for Preview validation.

## Operations and observability

Expose health-safe run evidence (last success, consecutive failures, age, counts, schedule identity) to internal logs/monitoring; never include bearer secrets, message bodies, or phone numbers. Alert on stale completion, exhausted retries/dead letters, report cursor stagnation, provider poll backlog, and outbox age. Document pg_net asynchronous dispatch semantics and require checking the application run record, not only the Cron or HTTP response.

## Risks and unresolved decisions

- Supabase CLI discovery is blocked by an invalid access token. Local link metadata points to Preview ref `nmuedccamqacgszvosvm`, but remote project identity, schema/migration history, and Cron inventory are not independently verified; no remote schedule inventory or Preview run can be claimed.
- `pg_net` requests can be delayed, retried, or time out after the Nest job has committed; idempotency/run evidence is mandatory.
- The linked Vercel team is on the Hobby plan. Its personal/non-commercial restriction may make this business-oriented backend ineligible; owner confirmation or plan upgrade is required before deployment. Function duration depends on Fluid Compute (60 seconds without / 300 seconds with), which is not verified for this project. Supabase Cron cadence is separate from Vercel Cron.
- F7's application deadline is 240 seconds by default, below the previously observed 300-second Vercel maximum; it is not a Vercel `maxDuration` setting. A deployment must verify the actual function runtime and keep its platform limit above the configured budget. The existing per-tenant transaction remains capped at 30 seconds; do not raise it without measured evidence.
- Existing SMS provider adapters may not provide provider-side idempotency. At-most-once behavior across network timeout after provider acceptance cannot be proven without provider idempotency/reconciliation support; this is a Production blocker for SMS cutover.
- Supabase Vault/pg_cron/pg_net permissions, retention of `net._http_response`, and secret rotation ownership must be verified against the actual Preview project.
- Exact retry ceilings, schedule frequencies, alert thresholds, per-flow owners, and environment name source must be agreed before enabling schedules.
