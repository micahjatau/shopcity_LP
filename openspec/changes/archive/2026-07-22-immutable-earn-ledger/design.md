## Context

The repository now has trustworthy receipt capture, idempotency, and approval-threshold behavior, but the financial core is still missing. The TRD and `repo_review_9.md` both point to the same next boundary: a transaction-oriented earning engine with immutable ledger history, expiry-aware credit lots, explicit approvals, and outbox-backed SMS delivery.

## Goals / Non-Goals

**Goals:**

- Add a transaction-first earn flow that can confirm or defer a purchase without losing auditability.
- Preserve append-only financial history in PostgreSQL.
- Make approval and execution separate concerns with one-time financial side effects.
- Commit notification intent with the transaction and deliver SMS asynchronously.

**Non-Goals:**

- Replacing PostgreSQL or Prisma.
- Introducing event sourcing or microservices.
- Redesigning the receipt integrity work already in place.

## Decisions

- Introduce a dedicated `Transactions`/`Loyalty` orchestration boundary instead of extending the receipt controller.
  - Rationale: the TRD earn flow is transaction-centric, and keeping it separate avoids conflating evidence capture with financial execution.
  - Alternative considered: keep the receipt API as the public earn API. Rejected because it preserves the wrong domain boundary.

- Model the earning engine with explicit `LoyaltyLedgerEntry`, `CreditLot`, `Approval`, and `OutboxEvent` tables.
  - Rationale: the TRD requires immutable entries, exact expiry, one-time approval execution, and durable notification intent.
  - Alternative considered: derive balances from receipts alone. Rejected because expiry, reversal, and redemption need dedicated records.

- Use one serializable PostgreSQL transaction for confirmed earn execution and for approval execution.
  - Rationale: the financial record, lot, audit trail, and outbox row must commit or fail together.
  - Alternative considered: split writes across request handling and background jobs. Rejected because it creates partial financial state.

- Use a transactional outbox plus a BullMQ-backed worker for SMS and recovery.
  - Rationale: the TRD explicitly requires async processing without risking financial consistency.
  - Alternative considered: send SMS inline after commit. Rejected because delivery failures would leak into the request path.

- Keep receipt evidence immutable and treat approvals as a finite-state workflow.
  - Rationale: approved actions must be revalidated and executed exactly once, with no hidden edits to the original evidence.

## Risks / Trade-offs

- [Schema complexity] -> Stage the new tables and endpoints before wiring worker behavior.
- [Concurrent earn/approval races] -> Use database constraints plus transactional revalidation and exactly-once state transitions.
- [SMS failure or queue backlog] -> Keep the financial transaction independent from delivery success and add recovery jobs.
- [API migration friction] -> Maintain the existing receipt endpoints for internal evidence until consumers move to the earn API.

## Migration Plan

1. Add the new ledger, approval, lot, and outbox schema.
2. Introduce the earn transaction API and contract.
3. Centralize approval execution on the new approval workflow.
4. Add BullMQ worker wiring for outbox/SMS handling.
5. Add concurrency and exit-gate tests for duplicate earns and one-time approval execution.

Rollback strategy:

- If schema rollout fails, stop before switching consumers to the new API.
- If worker deployment fails, keep the outbox rows durable and retry after fixing the worker image.
- If a financial write path is unstable, revert the new API routing while preserving the append-only database state.

## Open Questions

- Should the new public orchestration module be named `transactions` or `loyalty`?
- Should approval decision endpoints live under `/api/v1/approvals` only, or be mirrored under the transaction resource for discoverability?
- Do we expose internal receipt evidence in the new earn response, or only the transaction/approval result?
