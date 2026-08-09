# Repository Review — Latest Head

**Repository:** `micahjatau/shopcity_LP`
**Current head:** `db0f27f5ad2725f666f75692de61dd4fbe322da2`
**Latest commit:** `fix: make restore test type-safe`

## Verdict

The latest work makes three genuine improvements:

- The migration verification test now performs an actual `pg_dump`/`pg_restore`.
- Repository migration files are compared with `_prisma_migrations` checksums.
- Orphan Adjustment rows with a null ledger link are rejected.

However, the **halfway production gate remains blocked**. The most important problems are:

1. An existing committed migration was modified in place.
2. The restore test still restores a freshly generated Testcontainers database—not the actual shared Supabase backup.
3. Adjustment inserts can still attach themselves to an inappropriate existing ledger entry.
4. The destructive receipt-quarantine SQL remains unchanged despite all quarantine tasks being marked complete.

### Updated assessment

| Measure                        | Previous |           Current |
| ------------------------------ | -------: | ----------------: |
| Raw Sprint 3 completion        |     ~55% |          **~55%** |
| Quality-adjusted progress      |     ~68% |          **~69%** |
| Implemented first-half quality |   88/100 |   **88/100 — B+** |
| Production readiness           |     ~72% |          **~73%** |
| Halfway production gate        |  Blocked | **Still blocked** |

These percentages are reviewer estimates rather than repository-generated metrics.

---

# Improvements confirmed

## 1. The restore test now performs a real dump and restore

The test now:

1. Migrates and seeds a source Postgres container.
2. Produces a custom-format `pg_dump`.
3. Restores the dump into another Postgres container with `pg_restore`.
4. Confirms the financial fixture survived.
5. Compares migration names and SHA-256 checksums with the repository migration files.

This is materially better than independently seeding two fresh databases.

## 2. Repair dependencies are more self-contained

The financial repair migration now recreates:

- `validate_credit_lot_balance_evidence_for_lot`
- `prevent_credit_lot_source_mutation`

alongside the other financial validation functions and triggers.

That closes the previous dependency on those two older custom functions already being present.

## 3. Historical Adjustment preflight exists

Before installing the new Adjustment guards, the migration scans existing Adjustment-to-ledger relationships and fails when it finds:

- Null or missing ledger links.
- Customer mismatches.
- Direction/kind mismatches.
- Amount mismatches.
- Effective-date mismatches.

## 4. Null-ledger Adjustment creation is rejected

`prevent_adjustment_orphan_mutation()` now rejects Adjustment inserts or updates where `ledgerEntryId` is null. The integration test explicitly covers this failure.

---

# Critical blockers

## P0 — A committed migration was edited in place

`20260802_financial_guardrail_repair/migration.sql` already existed and was recorded as the review-30 migration. Review 31 then added approximately 97 lines to that same migration rather than creating another forward migration. The tracker now uses the same migration path for both review 30 and review 31.

This directly conflicts with review 31’s own stated rule that already-applied migrations must not be edited in place.

### Impact

Any persistent database that applied the earlier version now has a stored checksum for the old file. The current test calculates the checksum of the newly modified file and expects it to match `_prisma_migrations`.

Such a database could now report a modified migration or fail the new checksum verification.

### Required correction

- Restore `20260802_financial_guardrail_repair/migration.sql` to the exact content initially committed.
- Move all review-31 additions into a new forward migration, for example:

```text
20260802_adjustment_linkage_and_repair_followup
```

- Determine whether any shared, staging or developer database applied the old checksum.
- Test both:

  - Fresh migration deployment.
  - Upgrade from the original repair migration to the new follow-up migration.

This should be corrected before applying the current migration history anywhere persistent.

---

## P0 — Adjustment insertion still has a validation loophole

The new Adjustment trigger only verifies:

```sql
NEW."ledgerEntryId" IS NOT NULL
```

It does not verify that the referenced ledger entry is:

- Type `ADJUSTMENT`.
- Owned by the same customer.
- The same kind/direction.
- The same amount.
- The same effective date.

Those checks currently live in `validate_ledger_entry_commit_state()`, which is attached only to **new LoyaltyLedgerEntry inserts**.

### Problematic sequence

A direct writer could potentially:

1. Find an existing `EARN/CREDIT` ledger entry.
2. Insert an Adjustment pointing to that ledger.
3. Use matching customer, amount, direction and effective date.
4. Pass the orphan trigger because the link is non-null.

The existing ledger’s deferred insert trigger would not execute again.

The historical preflight also fails to check:

```sql
le."type" = 'ADJUSTMENT'
```

so an already linked Adjustment/EARN pair with otherwise matching values could pass the preflight.

### Required correction

Add a dedicated Adjustment validator:

```sql
validate_adjustment_ledger_source()
```

Run it on:

```sql
BEFORE INSERT OR UPDATE ON "Adjustment"
```

It should verify the linked ledger’s tenant, customer, type, direction, amount and effective date.

The historical preflight must additionally reject:

```sql
le."type" <> 'ADJUSTMENT'
```

Add tests for inserting an Adjustment against:

- An existing EARN ledger.
- An existing REDEEM ledger.
- An ADJUSTMENT ledger with the wrong customer.
- An ADJUSTMENT ledger with the wrong amount or effective date.

---

## P0 — The receipt quarantine implementation remains destructive

Review 31 states that duplicate receipt handling was rewritten to:

- Produce a read-only report first.
- Accept an explicit approved-ID list.
- Preserve unreviewed duplicates.
- Delete only approved IDs.

But the executable SQL still:

1. Selects every duplicate with `duplicate_rank > 1`.
2. Copies all such rows to a quarantine table.
3. Deletes all such rows automatically.

It contains no approved-ID staging list.

The newly added Markdown runbook describes the safer process, but the dangerous SQL file remains operationally available and contradicts that runbook.

Meanwhile, every receipt-quarantine task—including implementation and tests—is checked complete.

### Required correction

The existing SQL should be deleted, disabled or rewritten into three separate scripts:

1. `report-duplicate-legacy-receipts.sql` — read-only.
2. `stage-approved-receipt-quarantine.sql` — inserts explicitly reviewed IDs.
3. `execute-approved-receipt-quarantine.sql` — acts only on staged IDs.

The execution script should reject:

- An empty approval list.
- IDs outside the generated duplicate report.
- Receipts with dependent confirmed financial records unless an explicit reconciliation plan is attached.

Integration tests should prove unapproved duplicate rows remain untouched.

---

## P0 — The restore test still does not validate the shared database

The review-31 requirement explicitly says the **actual shared database backup** must be restored and inspected.

The implemented test instead:

```text
Fresh Testcontainers database
→ prisma migrate deploy
→ seed synthetic fixture
→ pg_dump
→ pg_restore into another container
```

That proves backup/restore mechanics and a clean migration chain. It still does not prove that the actual shared Supabase database has:

- Correct migration checksums.
- All repair functions and triggers.
- No unresolved historical Adjustment inconsistencies.
- No consequences from the earlier `db push` and `migrate resolve` workflow.
- Preserved historical receipt and SMS backfills.

Review-31 task 1.1 therefore remains only partially complete despite being checked.

---

# Important remaining issues

## P1 — The object inventory omits some newly required objects

The restore test checks several functions and triggers, but its inventory does not include:

- `prevent_adjustment_orphan_mutation`
- `prevent_adjustment_orphan_insert_update`
- `validate_credit_lot_balance_evidence_for_lot`

The orphan behavior is tested on another fresh database, but the restored database’s inventory does not explicitly prove those new objects are present and enabled.

Add them to the `pg_proc` and `pg_trigger` assertions.

## P1 — The Adjustment specification and implementation disagree

The specification says an explicit non-committed Adjustment state may exist without a ledger link.

The implementation has no Adjustment status field and rejects every null ledger link. Meanwhile, Prisma still describes `ledgerEntryId` as nullable.

Choose one model:

- **Committed-only:** make `ledgerEntryId` required in Prisma and remove draft language from the specification.
- **Lifecycle model:** add `DRAFT/PENDING/COMMITTED` and require the ledger only for `COMMITTED`.

The current state is internally inconsistent.

## P1 — Sprint 2 issue state contradicts the new release requirement

The new specification says Issue #1 must remain open while CI or migration evidence is incomplete.

Issue #1 is currently closed as completed, with a closure date of July 26, 2026.

Either reopen the issue until the stated evidence exists or revise the requirement and create a separate release-readiness issue. The repository currently says both that the issue must remain open and that it is completed.

## P1 — Remote deployment guidance is still unsafe

The README continues to present:

```bash
npx supabase db push --linked
```

as the remote workflow.

That command should not be the production deployment path for a database relying on custom Prisma migration SQL, triggers and backfills.

## P1 — Approval expiry consistency remains unchanged

The expiry helper still:

- Does not verify related Receipt and Redemption update counts.
- Attributes automatic expiration to the supervisor who happened to discover it.

Those issues were not touched by the latest commits.

## P1 — Current-head CI remains unverified

The GitHub connector exposed no pull-request workflow run or combined status for `db0f27f`. The tracker records local command execution but no workflow ID, static job, E2E job or integration job for the current head.

This is especially important because the final commit exists solely to make the restore test compile and type-check.

---

# Release decision

| Gate                                              | Decision                              |
| ------------------------------------------------- | ------------------------------------- |
| Earn workflow                                     | **Pass**                              |
| Immediate redemption                              | **Pass**                              |
| High-value redemption approval                    | **Pass**                              |
| FIFO allocation                                   | **Pass**                              |
| Real dump/restore mechanics                       | **Pass**                              |
| Repository migration checksum comparison          | **Pass on clean synthetic DB**        |
| Actual shared Supabase restore proof              | **Fail / not performed**              |
| Forward-only migration discipline                 | **Fail**                              |
| Adjustment orphan rejection                       | **Pass**                              |
| Adjustment source validation on Adjustment insert | **Fail**                              |
| Historical Adjustment preflight                   | **Partial — ledger type omitted**     |
| Receipt quarantine documentation                  | **Pass**                              |
| Receipt quarantine implementation                 | **Fail / destructive script remains** |
| Receipt quarantine tests                          | **Not implemented**                   |
| Current-head CI                                   | **Unverified**                        |
| Sprint 2 issue/evidence consistency               | **Fail**                              |
| Real reversal execution                           | **Not implemented**                   |
| Halfway production release                        | **No-go**                             |
| Manual-adjustment API implementation              | **No-go**                             |

# Recommended order

1. Restore the original repair migration and create a new forward migration for review-31 changes.
2. Inventory databases that may already contain the earlier repair-migration checksum.
3. Add an Adjustment insert/update validator that verifies the complete ledger relationship.
4. Add `le.type = 'ADJUSTMENT'` to historical preflight.
5. Align Prisma nullability and the Adjustment lifecycle specification.
6. Remove or rewrite the destructive receipt-quarantine SQL.
7. Add approved-ID quarantine tests.
8. Restore an actual shared Supabase backup and run checksum/object/history validation against it.
9. Expand restored-object inventory to include every new helper and trigger.
10. Replace the README’s linked `db push` workflow with the Prisma migration runbook.
11. Reopen Issue #1 or move the evidence requirement to an explicitly open release issue.
12. Fix approval-expiry counts and SYSTEM attribution.
13. Obtain and record green CI for the exact final commit.
14. Reopen the review-31 tasks that are currently only partially implemented.

## Final assessment

The latest patch is a meaningful step forward: the restore test now genuinely uses PostgreSQL backup and restore tooling, and checksum verification is useful.

But the repository has again closed its review tasks faster than the implementation supports. Editing a committed migration in place, leaving the destructive quarantine script untouched, and validating Adjustments only from the ledger-insert side are all release blockers for a financial system.

No repository changes were made during this review.
