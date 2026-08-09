# Repository Review — Latest Head

**Repository:** `micahjatau/shopcity_LP`
**Current head:** `067ba3a68458af5587b1580ca8c0e788ee6470a4`
**Latest commit:** `fix: update lot allocation test to create adjustment`

## Verdict

The repository has improved again. The forward financial migration now enforces adjustment-to-ledger matching, freezes adjustment evidence, reattaches several financial triggers, and corrects the FIFO allocation test for the new immutability model.

However, the **Sprint 3 halfway production gate remains blocked**. The strongest new issue is that the repository calls its new integration test a restore verification, but it does not perform a database dump or restore. It creates two fresh databases, migrates both from zero, and seeds equivalent fixtures independently.

There is also a potentially destructive receipt-quarantine runbook that says only manually approved rows will be removed but actually deletes every duplicate ranked after the first.

### Updated assessment

| Measure                        | Previous |           Current |
| ------------------------------ | -------: | ----------------: |
| Raw Sprint 3 completion        |     ~54% |          **~55%** |
| Quality-adjusted progress      |     ~66% |          **~68%** |
| Implemented first-half quality |   87/100 |   **88/100 — B+** |
| Production readiness           |     ~72% |          **~72%** |
| Halfway release gate           |  Blocked | **Still blocked** |

The implementation quality increased, but production readiness did not materially move because migration evidence and historical data integrity remain uncertain.

---

# Improvements confirmed

## 1. Adjustment-to-ledger validation is now substantive

The repair migration validates adjustment credit and debit entries against the associated Adjustment record on:

- Tenant.
- Customer.
- Kind/direction.
- Amount.
- Effective date.
- Ledger relationship.

It also verifies credit adjustments own exactly one credit lot and debit adjustments have allocations equal to their debit amount.

The integration test now covers mismatched adjustment kind and amount, and proves those writes fail at transaction commit.

**Previous adjustment-mismatch issue: substantially improved.**

---

## 2. Adjustment evidence is immutable

The new `prevent_adjustment_evidence_mutation()` trigger blocks changes to:

- Tenant and customer.
- Kind and amount.
- Reason.
- Creator.
- Ledger link.
- Effective date.
- Creation timestamp.

The trigger is dropped and recreated explicitly by the new migration.

This is stronger than relying on application code alone.

---

## 3. Important financial triggers are explicitly reattached

The forward migration recreates or reattaches:

- Credit-lot source validation.
- Credit-lot source immutability.
- Restoration commit validation.
- Ledger commit validation.
- Adjustment evidence immutability.
- The allocation target XOR constraint.
- Several Adjustment and allocation indexes.

That is a meaningful response to the previous concern that functions may exist without active triggers.

---

## 4. The FIFO allocation fixture now respects immutability

The latest commit stops creating an Adjustment early and later mutating its ledger link. Instead, it creates the ledger and Adjustment together in the same financial transaction.

That is the correct pattern for immutable financial evidence.

---

## 5. Receipt-upgrade testing now targets the correct historical schema

The receipt migration harness stops copying migrations when it reaches `20260720_receipt_integrity_gate`, preventing later migrations from contaminating the upgrade test.

It now verifies:

- The harness contains only migrations preceding the target.
- Valid legacy receipt identities are trimmed and preserved.
- Missing or whitespace-only references fail.
- Duplicate normalized identities fail.

**Receipt migration test design: improved.**

---

# Critical blockers

## P0 — The “restore” test does not restore anything

The test named `financial repair restore verification`:

1. Starts a fresh source Postgres container.
2. Runs every migration from zero.
3. Seeds a fixture.
4. Starts another fresh Postgres container.
5. Runs every migration from zero again.
6. Seeds another equivalent fixture.

It does not run:

```bash
pg_dump
pg_restore
```

It does not restore a shared Supabase dump, and it does not reproduce the historically problematic `db push` plus `migrate resolve` state.

The “restored fixture” was not restored from the source database—it was independently recreated.

### Why this matters

A fresh database proves that the migration chain works from zero. It does not prove that:

- The actual shared database contains the required objects.
- Existing custom objects were not lost during `db push`.
- Previously resolved migrations had their SQL effects applied.
- Historical rows survive a real backup and restore.
- A damaged shared database can be repaired by the new migration.

The tracker nevertheless describes the test as a source/restore reconciliation and marks all related tasks complete.

**Review-30 tasks 1.2, 1.3, 3.2 and 3.3 should be reopened.**

---

## P0 — Migration checksums are not compared with repository files

The test reads migration names and checksums from `_prisma_migrations`, but then:

- Compares one freshly migrated database with another freshly migrated database.
- Compares only the database migration **names** with the local folder names.
- Never computes the checksum of each committed `migration.sql`.
- Never compares local file checksums with database-recorded checksums.

Because both databases were built from the same working tree, matching database checksums are expected and do not prove shared-database integrity.

A proper check should calculate the same checksum Prisma records for every committed migration and compare it with the restored shared database’s `_prisma_migrations` entries.

---

## P0 — The repair migration is not self-contained

The new migration invokes:

```sql
validate_credit_lot_balance_evidence_for_lot(...)
```

and recreates a trigger that executes:

```sql
prevent_credit_lot_source_mutation()
```

but it does not create or replace either of those prerequisite functions.

That means the repair succeeds only when enough of the older custom SQL already exists.

This is exactly the state that remains uncertain in the shared database. A truly self-contained forward repair should either:

- Recreate every required dependency, or
- Fail immediately with an explicit inventory error listing missing functions and triggers.

The current fresh-database test cannot detect this because all preceding migrations already created the dependencies.

---

## P0 — Historical Adjustment inconsistencies are not preflighted

The new validators protect new ledger inserts and Adjustment updates. They do not scan existing Adjustment, ledger and credit-lot rows before the migration completes.

Therefore, existing rows could remain in states such as:

```text
Adjustment.kind       = DEBIT
Ledger.direction      = CREDIT

Adjustment.amount     ≠ Ledger.amount
Adjustment.effectiveAt ≠ Ledger.effectiveAt
```

The migration installs future guards but contains no preflight query that rejects already-invalid historical rows.

A forward migration should first scan every linked Adjustment and fail closed if mismatches exist, before marking the migration applied.

---

## P0 — Orphan Adjustment records remain valid

The specification says every Adjustment must match its source ledger entry.

But `Adjustment.ledgerEntryId` remains nullable in the Prisma schema.

More importantly, the new test explicitly creates an Adjustment with:

```ts
ledgerEntryId: null;
```

and that creation succeeds. The test only proves that its amount cannot later be changed.

So the current invariant is one-directional:

```text
Ledger ADJUSTMENT → must have matching Adjustment
```

but not:

```text
Adjustment → must have matching Ledger
```

### Required design decision

Either:

1. Make `Adjustment.ledgerEntryId` mandatory and enforce it with a deferred database constraint, or
2. Introduce an explicit Adjustment lifecycle such as `DRAFT/PENDING/COMMITTED`, where only non-committed records may lack a ledger.

Until then, direct database writes can create orphan financial evidence.

---

## P0 — Receipt “quarantine” automatically deletes all duplicates

The runbook says duplicate groups must be manually reviewed and the block should run only for approved rows.

But the SQL does not accept an approved-ID list. It automatically:

1. Ranks every duplicate identity.
2. Inserts every row with `duplicate_rank > 1` into a quarantine table.
3. Deletes every row with `duplicate_rank > 1` from `Receipt`.
4. Keeps the earliest record according to `capturedAt`, `updatedAt` and ID.

That is not manual quarantine. It is an automatic deduplication policy.

### Risks

- The earliest row is not necessarily the valid row.
- A duplicate may represent a legitimate transaction that requires reconciliation rather than deletion.
- Related financial rows may cause the transaction to fail because of restrictive foreign keys.
- The JSON copy does not preserve or reconstruct every dependent record.
- An operator could run the script believing it only acts on pre-approved rows.

The script should be split into:

1. **Read-only report generation.**
2. An explicit reviewed-ID staging table.
3. A quarantine action restricted to those IDs.
4. A separate delete step requiring an additional confirmation or transaction review.

The current script should not be used against shared data.

---

## P0 — A known historical receipt incident remains unresolved

The migration tracker states that duplicate legacy receipt identities were found, but no pre-migration backup or restore is available in the workspace. It also says the original legacy references are unrecoverable after the old column was dropped.

Before production release, the repository needs an explicit disposition:

- Confirm that the affected database contained development-only disposable data, or
- Quantify affected rows and reconcile them from an external source, or
- Restore from a provider-managed backup taken before the migration.

A note in the tracker is not sufficient closure for possible financial-record loss.

---

# Important remaining issues

## P1 — CI stability tasks are falsely marked complete

The `ci-stability-fixes` tracker says that:

- Unsafe worker test casts were removed.
- Worker and integration tests were rerun.
- The complete static, GitNexus, E2E and integration matrix passed.

But the corresponding commit changed only:

- `AGENTS.md`.
- `CLAUDE.md`.
- OpenSpec documentation and task files.

It did not modify worker tests, `package.json`, or the CI workflow.

The later `067ba3a` commit then had to repair the lot-allocation integration fixture.

At minimum, the earlier claim that the full integration matrix passed was premature.

The GitHub connector currently exposes no workflow runs or combined statuses for the latest head, so current-head CI remains independently unverified.

---

## P1 — Remote deployment instructions still encourage schema drift

The README still describes the linked remote workflow as:

```bash
npx supabase db push --linked
```

That is unsafe as the authoritative deployment route for a repository whose financial guarantees live in custom Prisma migration SQL.

The documented remote flow should use:

```text
Backup
→ restore rehearsal
→ object inventory
→ prisma migrate deploy
→ post-deploy invariant tests
→ smoke tests
```

`supabase db push` should not replace the Prisma migration ledger.

---

## P1 — Approval expiry still ignores related update counts

The expiry helper verifies that one Approval was expired, but it does not verify whether the related Receipt and Redemption updates affected one row.

It can therefore commit:

- An expired Approval.
- Zero related Receipt updates.
- Zero related Redemption updates.
- An audit entry claiming expiry completed.

It should verify the result count for every expected aggregate row.

---

## P1 — Automatic expiry is still attributed to the triggering user

The same helper writes the triggering supervisor into `decisionBy`, `reviewedBy` and audit actor fields when they merely discover an elapsed deadline.

Policy-driven expiry should be attributed to SYSTEM, with the detecting user captured separately in audit metadata.

---

## P2 — The tracker is still not evidence-driven

Review-30 marks every task complete, including real restored-database proof and historical-row verification.

Receipt migration preflight also marks the repair workflow fully verified even though the SQL’s behavior contradicts its manual-review wording.

The repository has repeatedly improved the implementation faster than it improves the accuracy of its completion records.

---

# Release decision

| Gate                                         | Decision                                 |
| -------------------------------------------- | ---------------------------------------- |
| Earn workflow                                | **Pass**                                 |
| Immediate redemption                         | **Pass**                                 |
| High-value redemption approval               | **Pass**                                 |
| FIFO lot allocation                          | **Pass after latest fixture correction** |
| Adjustment-to-ledger matching for new writes | **Pass**                                 |
| Adjustment evidence immutability             | **Pass**                                 |
| Adjustment records always linked to ledger   | **Fail**                                 |
| Historical Adjustment validation             | **Fail**                                 |
| Restoration ownership                        | **Pass on correctly migrated DB**        |
| Forward repair self-containment              | **Fail**                                 |
| Real shared-database restore verification    | **Fail**                                 |
| Migration checksum verification              | **Fail**                                 |
| Receipt migration upgrade harness            | **Pass**                                 |
| Receipt quarantine runbook                   | **Unsafe / fail**                        |
| Historical receipt incident closure          | **Fail**                                 |
| Current-head CI                              | **Unverified**                           |
| Real reversal execution                      | **Not implemented**                      |
| Halfway production release                   | **No-go**                                |
| Manual-adjustment API implementation         | **No-go**                                |

# Recommended next sequence

1. Replace the fake restore test with a real `pg_dump`/`pg_restore` test.
2. Run that process against an actual shared-database backup or an accurate simulated `db push`/`migrate resolve` database.
3. Compute and compare committed migration SQL checksums with `_prisma_migrations`.
4. Make the financial repair migration self-contained or explicitly inventory and reject missing prerequisites.
5. Add migration-time preflight checks for every historical Adjustment mismatch.
6. Prohibit orphan Adjustments or introduce an explicit pending Adjustment lifecycle.
7. Rewrite the receipt quarantine workflow to require an approved-ID staging list.
8. Do not automatically delete duplicate Receipt rows.
9. Resolve and document the known legacy receipt incident with row counts and business impact.
10. Replace remote `supabase db push` guidance with the Prisma deployment runbook.
11. Reopen unproven Review-30 and CI-stability tasks.
12. Fix approval-expiry related-row counts and SYSTEM attribution.
13. Obtain a green current-head CI run after all fixes.
14. Record release evidence against that exact final commit.

## Final assessment

The financial model is increasingly well designed, and the new Adjustment guards are a real improvement. The repository is now much closer to having strong clean-database invariants.

The remaining problem is that its **evidence layer is still weaker than its implementation layer**. A test named “restore” does not restore, a repair migration assumes some of the objects it is meant to repair already exist, and a runbook described as manual automatically deletes records.

Those issues should be resolved before the project is treated as safe for a production financial ledger.
