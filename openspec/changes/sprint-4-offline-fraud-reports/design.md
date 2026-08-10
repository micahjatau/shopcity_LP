## Context

Review 41 shows Sprint 4 has meaningful implementation in place, but the current behavior still misses several acceptance properties: replay conflicts can mutate offline-sync evidence, duplicate receipt fraud cannot be derived from committed rows, fraud evaluation is still coupled to SMS recovery, reporting can read non-authoritative inputs, and manual report refresh is not durable.

## Goals / Non-Goals

**Goals:**

- Preserve offline-sync idempotency evidence when a replay payload changes.
- Record duplicate-attempt evidence without weakening receipt uniqueness.
- Run fraud evaluation through a durable outbox primitive instead of SMS-only recovery.
- Make reporting derive from authoritative financial state and active-lot eligibility.
- Expose the missing report views and keep refresh/export flows durable.

**Non-Goals:**

- Introduce new financial write paths.
- Weaken the receipt uniqueness constraint.
- Add offline support for redemption, approval, or manual adjustment flows.
- Move reporting to a warehouse or change the immutable ledger model.

## Decisions

1. Keep the canonical offline sync attempt immutable on request-hash mismatch.

- Rationale: the success row is the idempotency record. A conflicting replay should not overwrite the successful response, transaction ID, or approval ID.
- Alternative considered: mutating the existing row and treating the conflict as the latest truth. Rejected because it destroys audit fidelity.

2. Persist fraud evidence separately from financial records.

- Rationale: duplicate receipt attempts are blocked by the database and therefore must be represented by non-financial evidence, not by counting committed duplicates.
- Alternative considered: relaxing uniqueness to make duplicates countable. Rejected because it weakens financial protection.

3. Dispatch fraud evaluation through a durable outbox event.

- Rationale: fraud rules should not depend on SMS recovery or message availability. A dedicated `fraud.evaluate` event keeps the concern explicit and retryable.
- Alternative considered: keeping fraud evaluation opportunistic inside SMS handling. Rejected because it couples independent domains and can suppress fraud work when SMS is absent.

4. Derive reporting from authoritative financial state.

- Rationale: confirmed purchases and active liability must come from the same financial facts that drive balances, not from loosely scoped receipt rows.
- Alternative considered: correcting the report with post-processing filters only. Rejected because it still allows non-financial rows to leak into totals.

5. Make refresh durable.

- Rationale: a detached promise can be lost on process restart. Refresh requests should be durable or synchronous so the API response reflects a real commitment.

## Risks / Trade-offs

- [Risk] New evidence rows or outbox events may expand schema and worker coverage. [Mitigation] Keep the data model append-only and reuse the existing transactional outbox.
- [Risk] Report totals will change after input corrections. [Mitigation] Treat the changes as correctness fixes and cover them with regression tests.
- [Risk] Refresh concurrency control may add operational latency. [Mitigation] Scope locking to same-tenant materialization work only.

## Migration Plan

1. Add immutable replay handling and separate conflict evidence for offline sync.
2. Add duplicate-attempt evidence and route FR-DUP-001 / cashier duplicate counts through it.
3. Add durable `fraud.evaluate` dispatch and update the worker path.
4. Correct reporting inputs, report exposure, and refresh semantics.
5. Add regression tests for replay, fraud evidence, report correctness, and concurrent refresh.

Rollback is to restore the prior replay mutation behavior, remove the new evidence/outbox handlers, and revert report queries to the previous surface in the same change set; no destructive ledger rollback is expected.