## Context

Preview PostgreSQL 17.6 has 61 successful Prisma migration records, including `20260813_sprint_5_credit_expiry_foundation` with a checksum matching the repository migration. The runtime objects nevertheless differ from a fresh database after all 61 Prisma migrations. The exact Preview `validate_ledger_entry_commit_state()` rejects `EXPIRY/DEBIT`; its `validate_credit_lot_balance_evidence_for_lot()` does not subtract expiry evidence; and Preview lacks the expiry commit/immutability triggers and the deferred lot-balance trigger. This explains the reproduced F1 exception. It does not prove why the live function drifted after the recorded migration.

The full ten-table comparison found 17 canonical triggers absent, 13 canonical functions absent, two stale function definitions, and 19 missing CHECK constraints. The missing controls span expiry and other financial workflows. Existing Preview data passed all 19 missing-check probes and the additional lot-balance, source-link, allocation, restoration, expiry-evidence, audit-actor, and ledger-type/direction consistency probes. No financial row was changed.

Preview also has stronger/renamed tenant-composite foreign keys, three additional indexes, RLS enabled on all ten compared tables with no policies, and one `Receipt.updatedAt` default difference. These are preserved. The Preview Supabase migration history lists four entries; its `base_schema`/runtime-reporting SQL overlaps Prisma-created objects and cannot be treated as a second full clean-database chain. The canonical comparison therefore uses the complete Prisma chain, with Supabase RLS/ownership differences classified separately.

## Goals / Non-Goals

**Goals:**

- Restore the complete missing financial integrity guard set in a single forward-only Prisma migration.
- Make expiry debit, immutable `CreditExpiry` evidence, and the lot balance equation agree at deferred transaction commit.
- Fail closed if existing rows violate any CHECK or migration preflight invariant.
- Keep the correction idempotent and transactional; a clean Prisma-migrated database must be unchanged by reapplication.
- Keep current Preview composite tenant foreign keys, extra indexes, RLS, and no-policy posture intact.

**Non-Goals:**

- Editing confirmed ledger entries, credit lots, allocations, restorations, receipts, approvals, or audit rows.
- Changing `CreditExpiryService`, its retry behavior, API contracts, job IDs/cadences, Supabase Cron, Vercel configuration, SMS, or Production.
- Applying the migration remotely, retrying/activating F1, reconciling Supabase migration history, or claiming external scheduler ownership.

## Decisions

1. **Use a Prisma forward migration, not a remote Supabase push.** Prisma is the repository's full business-schema migration chain and the Preview database already records its 61 migrations. The separate Supabase migration history is inventoried and documented, but its SQL overlaps the Prisma objects. Do not replay or combine the Supabase files during this correction.

2. **Reconcile missing canonical safeguards without replacing Preview's stronger objects.** Add missing CHECK constraints and triggers, and create/replace only missing or stale trigger functions. Do not drop foreign keys, indexes, RLS, policies, or columns. In particular, retain the live tenant-composite Receipt/AuditLog/reversal foreign keys rather than adding their differently named Prisma equivalents. Add the missing audit actor-pair and same-tenant checks.

3. **Make F1 a single balanced transaction.** `EXPIRY` is a confirmed debit with no receipt, exactly one matching `CreditExpiry` row, matching customer/amount/effective timestamp, and one expiry per lot. The deferred lot check is `original - allocations + restorations - expiries = remaining`. Expiry evidence is immutable. A failure rolls back the lot update, ledger debit, expiry record, and audit evidence together.

4. **Keep DDL forward-only and retry-safe.** Use a transaction, bounded lock/statement timeouts, `CREATE OR REPLACE FUNCTION`, guarded creation of missing triggers/checks, `NOT VALID` CHECK addition followed by validation, and collision checks that fail if an existing object with the same name has a different definition. No data backfill or destructive DDL is needed.

5. **Preflight the existing financial state.** Re-run the read-only invariant inventory immediately before any Preview apply. The migration also validates all CHECK constraints and must stop rather than repair/delete/rewrite incompatible rows. Triggers enforce new writes; the preflight verifies existing balances, ledger/evidence links, and tenant relationships.

6. **Test a drifted clone as well as a fresh chain.** On disposable PostgreSQL 17.6, run all repository Prisma migrations, overlay the captured Preview drift, verify the failure/rollback, apply the candidate migration, then verify successful F1 expiry, exact integer-kobo ledger/liability reconciliation, immutable history, constraint rejection, and idempotent retry. Separately verify clean migration deploy and migration reapplication are no-ops.

## Risks / Trade-offs

- **[Risk] The broad missing-control inventory is larger than F1.** Restore and test the complete reviewed set; keep F1 inactive until the whole required Preview safeguard set is reconciled.
- **[Risk] Existing data or locks may prevent validation.** Fail closed with bounded lock/statement timeouts; do not bypass validation or mutate financial rows. Re-run the read-only preflight and request a new review if data changes.
- **[Risk] Two migration registries obscure schema provenance.** Apply only the new Prisma migration after inspecting both migration tables and obtaining separate Preview authorization. Resolve long-term schema ownership as separate architecture work.
- **[Risk] Trigger changes affect multiple financial workflows.** Preserve unchanged live triggers, verify function/trigger definitions against the fresh Prisma chain, and run focused financial integration tests before CI.
- **[Risk] F1 is still blocked by operational gates.** A passing migration/test does not authorize Preview apply, F1 execution, Cron activation, or Production deployment.

## Migration Plan

1. Add the forward-only Prisma migration and focused PostgreSQL regression test; update the migration tracker as prepared/not applied.
2. Verify on clean and Preview-drifted disposable PostgreSQL 17.6 databases, then run focused credit-expiry and financial invariant integration tests plus lint/typecheck/build/Semgrep/CI and GitNexus change-scope checks.
3. Obtain independent schema review and a fresh Preview read-only preflight/backup plan, then request explicit authorization before applying the migration to Preview. No Supabase CLI push is part of this step.
4. After an authorized Preview apply, verify all reconciled objects, unchanged pre-F1 financial totals, and the 28 pending unsent SMS events. Keep F1 inactive until all Preview ownership/operations gates pass.
5. Only after separate authorization, deploy the reviewed release to Preview, capture a fresh baseline, issue one authenticated F1 invocation, verify ledger/lot/expiry/audit/reconciliation and duplicate prevention, and then decide whether to reactivate F1 at its already-approved cadence. Do not proceed to Production authorization.
