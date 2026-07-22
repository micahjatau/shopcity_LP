## Context

The current earn and approval flows already persist outbox intent, but publication still happens too close to the financial transaction and the worker path does not actually deliver SMS or recover aged work. This change closes the gap between committed finance and operational messaging while preserving the existing PostgreSQL-first architecture.

## Goals / Non-Goals

**Goals:**
- Publish queue work only after the financial transaction commits.
- Add a dedicated worker runtime for outbox publication, retry, and SMS delivery.
- Persist delivery state separately from financial state.
- Recover aged pending or failed outbox rows from PostgreSQL.
- Keep shutdown behavior safe for both the API and worker process.

**Non-Goals:**
- Redesigning the earn or approval business rules.
- Introducing a new queue backend or replacing BullMQ.
- Building a full SMS campaign or templating platform.

## Decisions

1. Use a dedicated worker process instead of reusing the API runtime.
   - Rationale: the worker has different failure modes, resource lifecycles, and recovery loops than the HTTP API. A separate process keeps startup, shutdown, and retries isolated.
   - Alternatives considered: embedding the worker in the API process or using a cron-only publisher. Both were rejected because they blur operational boundaries and make failure recovery harder to reason about.

2. Split publish-state and delivery-state responsibilities.
   - Rationale: the outbox row answers "has committed work been claimed and queued?" while a delivery record answers "what happened to the SMS?" This matches the review gap and keeps financial state distinct from messaging state.
   - Alternatives considered: overloading `OutboxEvent` with all SMS states, or creating only a queue-job log. Those options would either mix concerns or lose durable delivery auditability.

3. Use a PostgreSQL claim loop with `SKIP LOCKED` for outbox recovery and publication.
   - Rationale: PostgreSQL is the source of truth, and claim-based polling allows safe recovery after Redis outages or worker restarts without duplicate processing.
   - Alternatives considered: queue-first publication from the transaction and Redis-only retry. Both violate the required after-commit behavior and cannot reconstruct work after queue loss.

4. Keep BullMQ as the transport between publication and SMS execution.
   - Rationale: this preserves the existing queue choice while moving publication out of the financial transaction. It also keeps the worker semantics aligned with the current stack.
   - Alternatives considered: direct synchronous SMS calls from the publisher or switching to a different queue. Synchronous calls would couple finance to provider latency; switching queue tech is unnecessary for this change.

5. Add a dedicated SMS delivery record table, modeled as `SmsMessage`.
   - Rationale: the review calls out the absence of a delivery-audit entity. A separate table provides auditable queued/sent/delivered/failed/suppressed transitions without mutating financial records.
   - Alternatives considered: storing only ephemeral job metadata or adding SMS fields to receipts. Those approaches do not provide a durable operational ledger.

## Risks / Trade-offs

- [Risk] Duplicate publishing during retries or crashes -> Mitigate with claim timestamps, unique job IDs derived from outbox IDs, and idempotent worker updates.
- [Risk] Recovery loops can create noisy churn on stuck rows -> Mitigate with backoff, age thresholds, and clear failed-state transitions.
- [Risk] The worker can lag behind traffic spikes -> Mitigate with bounded batch sizes and repeatable polling rather than unbounded scans.
- [Risk] Delivery state can drift from provider truth -> Mitigate with a narrow state model and provider response mapping that is explicit about unknown outcomes.

## Migration Plan

1. Add the new delivery record schema and any required outbox status/index updates.
2. Introduce the standalone worker bootstrap and start scripts.
3. Route committed outbox rows through the new publisher loop while leaving the API transaction path responsible only for persistence.
4. Enable SMS delivery handling and recovery jobs behind the worker process.
5. Verify rollback by disabling the worker: financial writes should continue to succeed, and outbox rows should remain recoverable.

Rollback is non-destructive: stop the worker, keep the schema in place, and resume the previous publish path only if required for emergency mitigation.

## Open Questions

- What exact SMS provider adapter should be used first for local and CI runs?
- Should suppressed messages be created from policy checks or only from provider/business rejects?
- Do we need a migration for any already-persisted outbox rows, or is forward recovery sufficient?
