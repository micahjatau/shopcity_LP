## Context

Repo review 29 is a hardening follow-up, not a feature expansion. The current system already has the relevant Nest/Fastify, Prisma, and release-evidence seams, but the public reversal contract is still dishonest, the credit-lot/restoration work is still incomplete, and shared migration state is still being trusted without enough object-level proof.

This change stays inside the existing backend-first modular monolith. Money remains integer kobo, confirmed ledger history stays append-only, and no already-applied shared migration is edited in place.

## Goals / Non-Goals

**Goals:**

- Keep the public reversal boundary honest until real reversal workflow exists.
- Allow adjustment-credit lots while preserving original-debit restoration evidence.
- Verify shared migration state against restored database objects, not just the migration ledger.
- Record release and tracker state only when it is backed by visible evidence.

**Non-Goals:**

- Do not implement a real reversal review queue or execution workflow.
- Do not broaden adjustment behavior beyond the invariants needed for credit-lot integrity.
- Do not replace Prisma, the current worker model, or the existing release-tracking format.
- Do not edit already-applied shared migrations.

## Decisions

1. Keep the reversal boundary explicitly review-required instead of advertising success.

   The controller, runtime response, and generated OpenAPI/client output should agree that reversal is unavailable as a successful path until a real workflow exists. That avoids another mismatch where the documentation promises a result the service cannot produce.

   Alternative considered: preserve the current `202` contract and implement a cosmetic success response. That would still misrepresent runtime behavior and hide the fact that no review resource exists.

2. Add adjustment-credit support by generalizing source ownership, not by special-casing one-off writes.

   Credit lots should accept approved adjustment-credit sources in the same ownership model that already protects earned credits. Restorations should still prove they belong to the original debit that consumed them. This keeps the schema change small while preserving auditability.

   Alternative considered: leave credit lots earn-only and add a separate adjustment exception. That would keep the current inconsistency and likely create a second source of lifecycle drift.

3. Treat migration safety as object-level verification of the restored shared database.

   A migration ledger alone is not enough when custom SQL objects, triggers, and backfills exist outside the Prisma schema. The verification path should restore the shared database into isolation, compare `_prisma_migrations`, checksums, and committed migration folders, and confirm the expected SQL objects and historical effects are still present.

   Alternative considered: trust `prisma migrate status` plus schema shape. That does not prove the custom SQL actually exists on the shared database.

4. Record release evidence only when it is backed by proof.

   Tracker entries should stay open or flagged until there is visible workflow, restore, or database-object evidence. This keeps the repo-review record aligned with what was actually verified rather than what was assumed.

   Alternative considered: continue allowing tracker completion from human judgement alone. That is the failure mode the review already identified.

## Risks / Trade-offs

- [Public reversal consumers lose a success-shaped response] -> Prefer a truthful unavailable boundary over a false contract.
- [Generalizing credit sources may expose historical data issues] -> Fail closed on unsupported source patterns and cover them with regression tests.
- [Restore-based migration checks add release friction] -> Keep the verification steps explicit so the shared database state is provable.
- [Evidence gating can slow review closure] -> That delay is intentional until the state is backed by artifacts.

## Migration Plan

1. Update the public reversal contract and generated OpenAPI/client checks to keep the boundary review-required.
2. Expand the credit-lot lifecycle contract to allow adjustment-credit ownership and require original-debit restoration evidence.
3. Tighten migration verification to compare the restored shared database against committed migrations and expected SQL objects.
4. Update the release-evidence and tracker docs so only proof-backed state is marked complete.
5. Re-run the contract and verification suites and keep the release gate blocked until the evidence is recorded.

Rollback is by reverting service and documentation changes first while leaving any additive schema changes in place. If migration verification fails, do not edit already-applied migrations; repair the gap with a forward migration or explicit resolution step.

## Open Questions

- Should the reversal boundary remain visible in Swagger as review-required, or be hidden entirely until execution exists?
- Which custom SQL objects are mandatory for the shared-database verification step versus optional historical artifacts?
- Should tracker evidence be captured as one combined repo-review entry or as separate backup, restore, and SQL-object checks?
