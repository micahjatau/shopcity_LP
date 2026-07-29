## Context

Sprint 3 redemption implementation now has the core schema, FIFO allocation service, immediate redemption API, and high-value approval lifecycle, but `docs/repo_review_22.md` identifies correctness gaps that block release sign-off. The most urgent gaps are a mismatch between REDEEM approval writes and the database `Approval_target_xor_check`, and unhandled Prisma `P2002` races in concurrent redemption requests.

This change is intentionally a hardening and release-readiness change. It should correct the already-intended Sprint 3 architecture before reversals and manual adjustments add more debit/restore paths on top of it.

## Goals / Non-Goals

**Goals:**

- Make high-value redemption approval persistence consistent with the database model and OpenAPI response shape.
- Return stable, documented responses for concurrent redemption idempotency and duplicate receipt races.
- Reject invalid high-value redemption requests before reserving receipt identity or creating approval work.
- Enforce core allocation/restoration/ledger invariants at the database boundary with deferred checks.
- Generalize SMS persistence so each outbox event is the replay-safe delivery intent, independent of whether the event has a receipt.
- Add real PostgreSQL integration evidence for approval creation/execution, duplicate request races, and allocation invariants.

**Non-Goals:**

- Implement reversal endpoints or manual adjustment endpoints.
- Replace Prisma, Supabase/Postgres, REST/OpenAPI, or the modular monolith shape.
- Change financial units away from integer kobo.
- Add frontend UI implementation beyond public contract/OpenAPI alignment.

## Decisions

1. REDEEM approvals use `redemptionId` as their only target pointer.

   Approval records for earn flows already use receipt identity. Redemption approval is a controlled action over a persisted redemption intent, so the approval target should be the redemption. Receipt evidence remains accessible through `redemption.receipt`. This matches the existing migration constraint and avoids weakening target XOR rules.

   Alternative considered: loosen the database constraint to allow both `receiptId` and `redemptionId` for REDEEM approvals. This was rejected because it duplicates target identity, makes approval ownership ambiguous, and contradicts the review's recommended design.

2. Redemption idempotency races are normalized after `P2002`, not retried blindly.

   Prisma uniqueness errors represent a committed competing write or a deterministic duplicate, not a serializable conflict that should simply be retried. The service should classify the conflicting constraint or model field and then replay the completed idempotent response, reject conflicting payloads with `IDEMPOTENCY_CONFLICT`, reject duplicate physical receipts with `RECEIPT_ALREADY_USED`, or surface a stable transaction conflict where replay is impossible.

   Alternative considered: add `P2002` to the shared financial retry helper. This was rejected because it could re-run non-idempotent side effects and would not distinguish same-key replay from duplicate-receipt rejection.

3. Validation order precedes approval branching.

   Redemption eligibility, active balance, minimum redemption amount, basket cap, and maximum allowed amount must be evaluated before the service decides between confirmed execution and pending approval. Pending approval should represent an otherwise valid request that exceeds the approval threshold, not a queue for invalid requests.

   Alternative considered: keep accepting invalid pending approvals and reject at execution time. This was rejected because it reserves receipt identity, pollutes supervisor queues, and prevents cashier correction with the same physical receipt.

4. Database invariants use deferred constraint triggers around debit allocation state.

   Application service ordering is necessary but insufficient for financial history. Deferred triggers should validate at commit that debit ledger entries, allocation sums, lot ownership, redemption linkage, and restoration totals agree with each other. This keeps multi-row transactions possible while preventing incomplete direct writes or future service defects from committing inconsistent state.

   Alternative considered: rely only on service tests. This was rejected because Sprint 3 adds future reversal and adjustment paths where defects could bypass a single service sequence.

5. SMS messages are owned by outbox delivery intent, with optional financial references.

   `outboxEventId` remains the unique replay key. `receiptId` should become optional, and SMS rows should support references to the relevant ledger/transaction context so reversal and adjustment notifications can exist without inventing receipts or blocking multiple messages related to one receipt.

   Alternative considered: create synthetic receipts for adjustments and reversals. This was rejected because receipt evidence should remain a real POS receipt concept, not a notification workaround.

## Risks / Trade-offs

- Schema migration complexity -> Use expand-and-contract migration steps, update `docs/database/migration-tracker.md`, and verify on fresh and Sprint 2/Sprint 3 seeded databases before remote/shared deployment.
- Constraint trigger false positives -> Add integration tests for legitimate immediate redemption, pending approval execution, and future-compatible restoration cases before enforcing all checks.
- Constraint-name variance across Prisma/Postgres errors -> Classify `P2002` using Prisma metadata when available and add fallback model/field checks covered by tests.
- SMS ownership change can affect existing earn/redemption messages -> Preserve existing receipt-backed reads while changing uniqueness to outbox-event identity; backfill or leave nullable references without rewriting historical delivery facts.
- Approval response mapping may need deeper includes -> Keep API shape stable by loading receipt via `redemption.receipt` rather than duplicating receipt IDs on approvals.

## Migration Plan

1. Add a migration that removes the one-message-per-receipt assumption, makes SMS receipt ownership optional where needed, and adds any new nullable transaction/ledger references.
2. Add deferred constraint triggers for allocation, restoration, ledger linkage, ownership, and lot balance checks without editing already-applied migrations.
3. Update Prisma client generation and migration tracker entries with fresh, upgraded, and remote/shared evidence status.
4. Deploy application code that writes REDEEM approvals with `redemptionId` only and reads receipt evidence through redemption includes.
5. Add integration tests that run against PostgreSQL/Testcontainers before claiming release readiness.
6. Rollback strategy: because financial history is append-only, rollback must not delete confirmed ledger data. If a migration fails pre-release, revert application rollout and apply a forward corrective migration rather than editing applied migrations.

## Open Questions

- Which stable error code should represent a non-replayable redemption one-to-one conflict: a redemption-specific transaction conflict code or an existing shared financial conflict code?
- Should pending receipt evidence use an existing review status or require a new state to distinguish evidence capture from financial approval?
- Which exact nullable SMS references are required for reversal and adjustment reads: ledger entry, redemption, adjustment, or a generic transaction ID?
