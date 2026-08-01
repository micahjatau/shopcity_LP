## Context

Repo review 30 is a release-readiness hardening pass. The current repo still lacks proof that the shared Supabase database has the required trigger and constraint objects active, review and migration evidence can still be overstated, and adjustment rows can drift away from the ledger facts that should anchor them.

This change stays inside the existing backend-first modular monolith. Money remains integer kobo, confirmed ledger history stays append-only, and already-applied migrations are not edited in place.

## Goals / Non-Goals

**Goals:**
- Prove shared-database migration state against restored objects, not only against migration ledger metadata.
- Keep release and repo-review evidence open until visible proof exists.
- Enforce adjustment-to-ledger consistency and immutability for adjustment evidence fields.

**Non-Goals:**
- Do not introduce a new workflow for approving adjustments.
- Do not change the public reversal contract in this change.
- Do not rewrite already-applied migrations.

## Decisions

1. Treat migration safety as restore-based object verification.

   The verification path should restore the shared database into isolation and compare the migration ledger, checksums, committed migration folders, and the active SQL object inventory. That directly addresses trigger drift that a schema-only check cannot prove.

   Alternative considered: trust `prisma migrate status` plus a clean-database migration run. That would still miss missing or detached shared-database triggers.

2. Keep evidence gating explicit in tracker-state updates.

   Repo-review and migration claims should remain open unless backed by workflow runs, restore proof, or object inventories. This keeps tracker state aligned with verifiable artifacts instead of manual judgement.

   Alternative considered: continue allowing human closure notes without attached proof. That is the failure mode the review already identified.

3. Enforce adjustment integrity at the database boundary.

   Adjustment rows should be rejected if they do not match their source ledger entry, and the evidence-bearing fields should become immutable after creation. That keeps the ledger and the adjustment record aligned without relying on application-layer trust.

   Alternative considered: validate only in service code. That would leave the database open to drift through direct writes or future code paths.

## Risks / Trade-offs

- [Restore-based checks add release friction] -> Keep the verification steps explicit so the shared state is actually proven.
- [Immutable adjustment evidence may surface legacy inconsistencies] -> Fail closed and cover the failure modes with regression tests.
- [Tracker gating can slow closure] -> That delay is intentional until proof exists.

## Migration Plan

1. Update the migration verification path to inspect restored shared-database objects and historical effects.
2. Update the evidence tracker so claims stay open until proof-backed.
3. Add database-level adjustment consistency and immutability checks.
4. Add integration tests for the restore path and the adjustment mismatch cases.
5. Re-run the verification suite and keep the gate blocked until the required evidence exists.

Rollback is by reverting the tracker and service changes first while leaving any additive database changes in place. If restore verification fails, do not edit already-applied migrations; repair the gap with a forward change.

## Open Questions

- Which exact SQL objects must be present for the shared-database proof to count as complete?
- Should adjustment immutability cover all audit metadata fields or only the evidence-bearing subset listed here?
