## Context

Repo review 18 concluded that Sprint 2 is functionally complete but not formally closed. The earn engine now has atomic receipt, ledger, credit-lot, outbox, SMS, audit, and idempotency behavior, but several invariants still rely on application code rather than database enforcement. That is not sufficient before Sprint 3 redemption work, because redemption will reduce credit lots and run under more frequent concurrent transactions.

The highest-risk gaps are mutable receipt purchase evidence, credit lots that are not tightly validated against their earn ledger entries, and serialization conflicts that are reported as duplicate receipts. The review also identifies API governance debt: the TRD and generated OpenAPI disagree on response envelopes and public workflows, while duplicate receipt-specific write/decision endpoints remain exposed beside the canonical transaction and approval endpoints.

## Goals / Non-Goals

**Goals:**

- Seal Sprint 2 financial invariants at the PostgreSQL layer before starting redemption implementation.
- Make receipt purchase evidence immutable while allowing workflow review/approval metadata to change.
- Ensure credit lots cannot drift from their source earn ledger entry.
- Distinguish actual duplicate receipt violations from retryable serialization conflicts.
- Document the response-envelope and public-workflow decision in an ADR and align generated API artifacts with that decision.
- Capture visible release evidence for the Sprint 2 acceptance suite and migration chain.

**Non-Goals:**

- Implement Sprint 3 redemption endpoints, FIFO allocation, reversals, expiry, or adjustments.
- Redesign the current success/error envelope implementation unless the ADR explicitly rejects it.
- Remove duplicate public endpoints without a deprecation path if existing tests or clients still exercise them.
- Introduce GraphQL, microservices, or frontend-trusted financial calculations.

## Decisions

1. Use PostgreSQL triggers and constraints for financial invariants.

   Receipt evidence immutability and credit-lot source integrity should be enforced below application code. Prisma middleware or service checks are not enough because direct database changes before approval could alter future financial effects.

   Alternative considered: add only service-layer guards. This was rejected because the review explicitly identifies direct database mutation risk and the TRD requires durable auditability.

2. Keep workflow metadata mutable on receipts.

   The receipt immutability trigger should block changes to purchase evidence fields such as amount, POS receipt number, occurrence time, customer, card, branch, device, and capture actor. It should allow review and approval metadata fields to change because approval execution and rejection workflows need to update them.

   Alternative considered: make all receipt fields immutable. This was rejected because it would conflict with the existing approval/review workflow.

3. Validate credit-lot source consistency through database logic.

   A credit lot created from an earn ledger entry must match tenant, customer, amount, and earned timestamp, and the source ledger must be an `EARN`/`CREDIT` entry. Source fields must be immutable after insertion; `remainingAmountKobo` remains mutable for future redemption workflows but still constrained between zero and original amount.

   Alternative considered: wait until Sprint 3 to add lot constraints. This was rejected because Sprint 3 depends on trustworthy starting lots.

4. Add bounded serialization retry around earn capture.

   Known PostgreSQL serialization failures should be retried two or three times with slight jitter. If retries are exhausted, the API should return a temporary concurrency error rather than reporting a duplicate receipt. Receipt uniqueness violations should map to `RECEIPT_ALREADY_USED` only when the receipt unique index is the failure source.

   Alternative considered: continue relying on the current catch block. This was rejected because it masks concurrency failures and becomes more dangerous under redemption load.

5. Record API governance as an ADR before broader frontend integration.

   The recommended path is to keep the current `{ success, data, meta }` and `{ success, error, meta }` envelope because it is internally consistent and generated into OpenAPI, then amend the TRD/ADR to make that decision explicit. The ADR must also identify canonical financial workflows: `POST /transactions/earn`, `GET /approvals`, and `POST /approvals/:id/decision`.

   Alternative considered: rewrite the implementation to the TRD's `{ data, meta }` and RFC 7807 shapes now. This was rejected as high churn with limited product value unless stakeholders explicitly choose it.

6. Deprecate duplicate public workflows before removal.

   Receipt-specific write and approve/reject endpoints should be marked deprecated and excluded from new frontend integration unless a compatibility review proves they can be removed immediately.

   Alternative considered: delete them in the closure change. This may be acceptable if there are no external consumers, but deprecation is the safer default until usage is confirmed.

## Risks / Trade-offs

- Existing data may violate new invariants -> Add pre-migration checks or backfills where safe, and fail migration clearly when manual cleanup is required.
- Triggers can accidentally block legitimate workflow updates -> Test approval, rejection, and expiry paths after adding receipt immutability.
- Credit-lot validation may require careful trigger timing -> Use insert/update triggers that query the referenced ledger row after it exists and keep current transaction ordering unchanged.
- Serialization retry can duplicate side effects if idempotency handling is wrong -> Retry the whole serializable transaction only through the existing idempotent earn boundary and test exact-response replay.
- Deprecating endpoints changes generated clients -> Mark OpenAPI `deprecated: true`, document canonical replacements, and regenerate artifacts in the same change.
- Release evidence can become stale quickly -> Record commit SHA, workflow/run reference, and verification command/date in the migration tracker and issue update.

## Migration Plan

- Add a new Prisma migration for receipt evidence immutability, positive receipt amount constraint, credit-lot source validation, and immutable credit-lot source fields.
- Include migration preflight checks for existing invalid receipt amounts and credit-lot/ledger mismatches.
- Run `prisma migrate deploy` against fresh Testcontainers databases and any upgrade-path fixtures used by existing migration tests.
- Update `docs/database/migration-tracker.md` only with evidence actually produced by the current head.
- Add or update ADR/API docs, regenerate OpenAPI, and run OpenAPI lint/diff.
- If the migration fails in a shared environment, stop deployment, preserve the existing schema, and resolve data inconsistencies before retrying; do not edit an already-applied migration.

## Open Questions

- Should receipt-specific write and approve/reject endpoints be removed immediately, or marked deprecated for one release cycle?
- What exact status/code should represent exhausted serialization retries: a 409 concurrency conflict or a 503 temporary unavailability error?
- Where should Sprint 2 issue closure evidence be recorded if GitHub issue access is unavailable from the implementation environment?
