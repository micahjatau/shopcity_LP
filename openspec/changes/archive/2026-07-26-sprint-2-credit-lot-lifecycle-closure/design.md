## Context

Sprint 2 introduced the immutable earn ledger, credit lots, receipt evidence protection, and bounded earn retry handling. Repo review 19 found the remaining closure risk is not broad architecture but a narrow set of integrity gaps: `CreditLot.expiresAt` is neither derived nor immutable, credit lots can be deleted, `remainingAmountKobo` can be directly mutated before redemption allocation workflows exist, and the earn retry classifier is broader than the PostgreSQL failure modes proven by tests.

The existing database trigger `validate_credit_lot_source()` verifies tenant, customer, amount, `earnedAt`, ledger type, and direction. The companion mutation trigger protects source fields but does not protect `expiresAt` or `remainingAmountKobo`. The application calculates lot expiry with the same twelve-month UTC month-clamp behavior used by `addMonths(occurredAt, 12)`, so the database migration must enforce that same rule to prevent direct SQL or Prisma writes from drifting.

## Goals / Non-Goals

**Goals:**

- Enforce the approved twelve-month credit expiry rule at the database boundary.
- Make earned credit lots append-only lifecycle records: no deletion, no expiry mutation, and no temporary direct remaining-balance mutation.
- Keep Sprint 3 free to introduce controlled redemption allocation, expiry debit, reversal, audit, and outbox workflows that deliberately reduce lot balances.
- Restrict earn retries to demonstrated retriable PostgreSQL/Prisma conflicts.
- Make the canonical earn endpoint's stable error contract visible in generated OpenAPI.
- Record current-head release evidence before Sprint 2 closure is claimed.

**Non-Goals:**

- Implement redemption allocation, credit expiry jobs, reversal workflows, or compensating-entry workflows.
- Replace the API envelope decision from ADR 008.
- Remove deprecated receipt-specific financial routes in this change.
- Introduce GraphQL, microservices, floating-point money, or frontend-trusted balance/approval logic.

## Decisions

1. Enforce credit-lot lifecycle invariants in PostgreSQL triggers.

   The migration will validate existing data first, then install trigger logic for `CreditLot`. This follows the current Sprint 2 pattern and protects writes from Prisma, raw SQL, tests, and operational scripts. Application-only validation was rejected because it would not protect direct database writes or future services using the same database.

2. Derive expiry with a database function that mirrors the application month-clamp calculation.

   `expiresAt` must equal `earnedAt + 12 months` with end-of-month clamping and preserved UTC time components, matching examples such as February 29, 2024 becoming February 28, 2025. A reusable SQL helper or in-trigger expression is acceptable if tests prove parity. A simple fixed-day interval was rejected because it would violate the TRD's twelve-month expiry rule around leap years and month ends.

3. Temporarily freeze `remainingAmountKobo` in the database.

   Until Sprint 3 adds controlled allocation workflows, a direct balance update cannot prove a matching debit ledger entry, redemption allocation, audit entry, or outbox event. The trigger should reject direct updates to `remainingAmountKobo`; Sprint 3 can intentionally replace or refine that guard in the same transaction that creates the controlling records.

4. Prevent `CreditLot` deletion with a `BEFORE DELETE` trigger.

   The existing foreign-key restriction prevents deleting a referenced ledger entry but does not prevent deleting the lot itself. A delete trigger makes earned lot records durable for reconciliation. Corrections must be modeled as future debit/reversal/administrative entries, not removal of historical lots.

5. Narrow retry classification to Prisma `P2034` only.

   `P2034` is the documented Prisma write-conflict/deadlock retry case relevant to PostgreSQL. `P2028`, `P2031`, and message matching are too broad and can hide deterministic transaction bugs or irrelevant provider errors. Additional retry codes require a PostgreSQL-specific failure case and regression test.

6. Add endpoint-specific OpenAPI error examples without changing the response envelope.

   The global `apiErrorEnvelopeResponses()` documents the envelope shape, but `POST /transactions/earn` needs operation-specific examples so generated clients can discover stable domain codes. The implementation can add a targeted decorator/helper for earn responses while preserving the shared `{ success, error, meta }` envelope.

## Risks / Trade-offs

- Existing bad credit-lot data blocks migration -> Mitigate by adding preflight checks with explicit error messages for bad expiry or remaining balances before installing triggers.
- Database expiry logic diverges from application logic -> Mitigate with regression tests covering leap day, month-end, and normal dates, and compare expected timestamps exactly.
- Freezing `remainingAmountKobo` blocks manual corrections -> Mitigate by documenting that corrections require future compensating ledger workflows or a deliberate, reviewed migration.
- Narrow retries may expose errors that were previously retried -> Mitigate by preserving duplicate receipt mapping and adding unit coverage that non-`P2034` errors are not retried.
- OpenAPI examples drift from runtime error mapping -> Mitigate with OpenAPI integration assertions for the documented status/code examples.

## Migration Plan

1. Add a new Prisma migration that preflights existing `CreditLot` rows for derived expiry parity and remaining-balance validity.
2. Install or replace credit-lot lifecycle trigger functions for expiry validation, expiry immutability, remaining-balance immutability, and delete prevention.
3. Regenerate Prisma client if schema changes require it; avoid hand-editing generated artifacts.
4. Update integration tests to prove expiry insert/update rejection, delete rejection, and remaining-balance freeze.
5. Update earn retry classifier and unit tests for `P2034` only.
6. Add operation-specific OpenAPI examples for `POST /transactions/earn`, regenerate `docs/api/openapi.json`, and run lint/diff checks.
7. Record migration and current-head CI evidence in the migration tracker and Sprint 2 issue checklist.

Rollback is migration-specific: dropping the new triggers would re-open the integrity gaps, so rollback should be reserved for failed deployment and paired with a backup/restore plan recorded in `docs/database/migration-tracker.md`.

## Open Questions

- Which GitHub issue number is the Sprint 2 closure issue to reconcile if issue `#1` has changed state by implementation time?
- Will Sprint 3 replace the temporary `remainingAmountKobo` freeze with allocation-table enforcement in the same migration or through an expand-and-contract sequence?
