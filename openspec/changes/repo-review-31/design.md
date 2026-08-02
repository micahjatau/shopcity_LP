## Context

Repo review 31 is a release-readiness hardening pass. The current repo still lacks proof that the shared database can be restored and reconciled against committed migration files, one repair migration depends on preexisting SQL objects, adjustment records can still exist without a committed ledger link, and duplicate receipt remediation can delete rows without a reviewed approval list.

This change stays inside the existing backend-first modular monolith. Money remains integer kobo, confirmed ledger history stays append-only, and already-applied migrations are not edited in place.

## Goals / Non-Goals

**Goals:**
- Prove shared-database migration state against a restored database, not only against a clean migration run.
- Make repair migrations fail closed unless every prerequisite SQL object is present or recreated.
- Enforce adjustment-to-ledger consistency for committed records and reject historical mismatches before integrity migrations land.
- Replace automatic receipt duplicate deletion with a reviewed-ID quarantine workflow.
- Keep release and repo-review evidence open until proof is linked.

**Non-Goals:**
- Redesigning the full adjustment workflow UI.
- Changing the meaning of confirmed ledger history.
- Editing already-applied migrations in place.

## Decisions

- Treat migration safety as restore-based object verification.

  The verification path should restore the shared database into isolation and compare the migration ledger, checksums, committed migration folders, and active SQL object inventory. That directly addresses drift that a clean-database run cannot prove.

  Alternative considered: trust `prisma migrate status` plus a clean migration run. That would still miss missing or detached shared-database objects.

- Make repair migrations self-contained.

  If a forward repair migration calls helper functions or reattaches triggers, it should either recreate those dependencies itself or fail immediately with an explicit inventory of missing prerequisites. That keeps repair behavior deterministic across partially repaired environments.

  Alternative considered: assume preceding custom SQL objects already exist. That leaves the exact shared-database failure mode unresolved.

- Require committed adjustments to carry a ledger link.

  A committed adjustment should not be allowed to remain orphaned. If the product needs a draft or pending state, that state can exist without a ledger link, but it must not be finalized until the ledger relationship exists.

  Alternative considered: allow unconditional nullable links on committed records. That preserves direct-write drift and weakens financial evidence.

- Treat receipt duplicate cleanup as a two-step review process.

  The first step is read-only reporting. The second step uses an explicit approved-ID staging list for quarantine or delete actions. That avoids hidden automatic deletion when the operator expects a manual review gate.

  Alternative considered: keep deleting every ranked duplicate after the first. That is fast, but unsafe for shared data and incompatible with the review note.

- Keep evidence gating explicit in tracker-state updates.

  Repo-review and migration claims should remain open unless backed by workflow runs, restore proof, or object inventories. This keeps tracker state aligned with verifiable artifacts instead of manual judgment.

  Alternative considered: continue allowing human closure notes without attached proof. That is the failure mode the review identified.

## Risks / Trade-offs

- [Restore-based checks add release friction] -> Keep the verification steps explicit so the shared state is actually proven.
- [Immutable or linked adjustment rules may surface legacy inconsistencies] -> Fail closed and cover the failure modes with regression tests.
- [Tracker gating can slow closure] -> That delay is intentional until proof exists.
- [Approved-ID remediation adds operator work] -> Keep the report and staging list simple so the review path is clear.

## Migration Plan

1. Update the migration verification path to restore shared-database state and compare checksums and SQL objects.
2. Update the repair migration path so missing prerequisites fail closed instead of silently relying on prior state.
3. Add committed-adjustment linkage rules and migration preflight for historical mismatches.
4. Replace receipt duplicate deletion with a read-only report plus reviewed-ID staging flow.
5. Update evidence tracking and release-closeout notes to require linked proof.
6. Re-run the verification suite and keep the gate blocked until the required evidence exists.

Rollback is by reverting the tracker and service changes first while leaving any additive database changes in place. If restore verification fails, do not edit already-applied migrations; repair the gap with a forward change.

## Open Questions

- Which exact SQL objects must be present for the shared-database proof to count as complete?
- Should pending adjustments be modeled with a new lifecycle field or with an existing status enum that is currently underused?
- Should the approved-ID receipt remediation list live in a new table or be provided as an operator-supplied file per run?
