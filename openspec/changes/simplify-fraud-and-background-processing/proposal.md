# Simplify fraud evaluation and add PostgreSQL outbox processing

## Status

Proposed implementation slice; additive rollout only. This change does not retire the existing worker or alter any deployed schedule.

## Why

Fraud rules currently overlap across `FraudService`, `FraudRulesService`, `FraudBehaviorRuntime`, and `OutboxWorkerRuntime`. BullMQ is also the only consumer for asynchronous fraud-evaluation outbox events. The initial migration needs one authoritative fraud evaluator and a bounded, retryable PostgreSQL processing path that can run from an authenticated scheduled API invocation.

## Scope

- Consolidate asynchronous `fraud.evaluate` event handling behind `FraudService`, using branch-specific `PolicyConfiguration` thresholds and existing idempotent `FraudFlag` deduplication.
- Keep duplicate-receipt prevention, balance checks, and purchase/redemption approval decisions unchanged and synchronous where they already are.
- Reduce newly evaluated fraud findings to duplicate receipt attempts, configured high-value purchase/approval, configured high-value redemption approval, and unusually frequent reversals. Consolidate overlapping high-value purchase findings into one logical fraud case.
- Add a protected `GET /api/v1/cron/process-outbox` endpoint that processes a small bounded batch of supported fraud-evaluation events directly from PostgreSQL.
- Claim rows atomically with `FOR UPDATE SKIP LOCKED`; use persisted status/attempt data, existing stale-claim recovery, bounded retries, terminal completion, and dead-letter state. A logical event and its fraud evidence must commit together so overlapping worker/scheduler runs cannot double-count it.
- Leave `sms.send`, `report.refresh`, expiry, approval, and maintenance work to their existing owners in this first slice. SMS events remain durably queued; do not invoke an SMS provider.
- Keep Redis/BullMQ, `src/worker.ts`, all existing schedules, report materialization, and deployment configuration intact until a later, separately approved cutover after reconciliation.

## Out of scope

- No database migration or edits/deletes of historical financial, audit, outbox, or fraud records.
- No changes to confirmed balances, receipt uniqueness, redemption balance validation, approval authorization/decision semantics, login rate limits, SMS delivery/provider activation, expiry jobs, report materialization, or operational-history maintenance.
- No Vercel/cron-job.org configuration changes, staging/production execution, deployment, worker shutdown, Redis/BullMQ dependency removal, or package cleanup.

## Acceptance

1. Existing synchronous duplicate protection, wallet/balance checks, and purchase/redemption approvals remain unchanged.
2. A purchase over the flag threshold creates one finding; above the approval threshold it creates one higher-severity finding rather than overlapping cases. Branch policy values are authoritative; existing bootstrap fallback behavior remains intact.
3. Fraud evaluation and persistence for supported outbox events are centralized and idempotent; duplicate event delivery does not increment a finding twice after the event is complete.
4. The cron endpoint fails closed if `CRON_SECRET` is unset or invalid, compares bearer secrets safely, and processes no more than its configured bounded batch.
5. Concurrent invocations use PostgreSQL row locks and stale-claim recovery; failures receive bounded retry scheduling and eventual dead-letter state without losing durable events.
6. Only `fraud.evaluate` is consumed by this endpoint. No SMS provider is called, and SMS outbox records are unchanged by the processor.
7. Existing BullMQ/Redis workers, production configuration, report cron, database schema, and historical records remain untouched.
