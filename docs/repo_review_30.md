# Repository Review — Latest Head

**Repository:** `micahjatau/shopcity_LP`
**Current head:** `92948cd45f50b61fc43497bb8acb16be242c9ac1`
**Latest commit:** `fix: regenerate client after reversal contract cleanup`

## Verdict

The latest changes close the reversal contract regression and implement two real database safeguards:

- Adjustment-credit ledger entries can now create credit lots.
- Restoration rows must belong to the debit being reversed.

However, the **halfway production gate remains blocked**. The primary concern is no longer the clean-database implementation; it is whether the same custom SQL triggers and constraints are actually active in the shared Supabase database.

The review-29 tracker still claims migration-safety work was completed without committed restore-based evidence that satisfies its own specification.

### Updated assessment

| Measure                        | Previous |           Current |
| ------------------------------ | -------: | ----------------: |
| Raw Sprint 3 completion        |    52.7% |          **~54%** |
| Quality-adjusted progress      |      64% |          **~66%** |
| Implemented first-half quality |   86/100 |   **87/100 — B+** |
| Production readiness           |     ~71% |          **~72%** |
| Halfway release gate           |  Blocked | **Still blocked** |

These are reviewer estimates rather than automated project metrics.

---

# Improvements confirmed

## 1. Reversal contract consistency is fixed

The generated client no longer contains a `202` success response. It exposes only the documented error outcomes, including `422`.

The OpenAPI test now explicitly verifies that neither `201` nor `202` exists and that `422 REVERSAL_REVIEW_REQUIRED` remains documented.

This agrees with the service, which intentionally returns no success result and always raises the review-required boundary.

**Status: closed.**

The endpoint is still not a reversal workflow—it does not create a review request or financial effect—but it is now honest about that limitation.

---

## 2. Adjustment-credit lots now work on a correctly migrated database

The new migration expands `validate_credit_lot_source()` to permit:

```text
EARN / CREDIT
ADJUSTMENT / CREDIT
```

while still requiring the credit lot’s customer, amount and earning timestamp to match its source ledger entry.

The integration test proves that an `ADJUSTMENT/CREDIT` ledger entry with a corresponding Adjustment and CreditLot can commit, while an unsupported debit source is rejected.

**Status: underlying credit-lot source support implemented.**

The field is still named `earnLedgerEntryId`, which is now misleading but not itself a correctness failure.

---

## 3. Foreign-allocation restoration is rejected

The new restoration validator compares:

```text
reversalLedger.reversesEntryId
```

with:

```text
allocation.redemptionLedgerEntryId
```

and rejects a restoration belonging to another debit.

A real integration test creates two separate debit scenarios and verifies that a reversal of one cannot restore an allocation consumed by the other.

The wider ledger validator already verifies that a reversal targets a debit for the same customer and that restoration totals equal the reversal amount.

**Status: previous restoration-ownership blocker closed on a correctly migrated database.**

---

## 4. Clean-database SQL-object verification is stronger

The financial integration suite now checks that named functions and triggers exist after `prisma migrate deploy`, and inspects function definitions for the unsupported-pair and original-debit guards.

This is valuable protection for fresh installations.

It is not, however, a substitute for validating the restored shared database.

---

# Critical blockers

## P0 — Shared Supabase financial triggers remain unproven

The tracker records that the shared database had previously been synchronized using:

```bash
prisma db push --skip-generate --accept-data-loss
```

and that earlier migrations were subsequently recorded through:

```bash
prisma migrate resolve --applied
```

That is important because the financial guarantees depend on custom SQL not represented by the Prisma schema alone.

For example, the credit-lot triggers were originally created by an earlier custom migration. The deferred allocation-restoration trigger was also created in an earlier migration.

The new migration only replaces the two function definitions. It does not recreate or reattach the triggers.

Therefore, the shared database could theoretically contain the new functions while having no active trigger that invokes them. The repository contains no committed object inventory proving otherwise.

### Required correction

Create a **forward repair migration** that idempotently:

1. Creates or replaces every required function.
2. Drops and recreates the required normal and constraint triggers.
3. Reasserts missing check constraints and indexes where necessary.
4. Preserves deferred trigger settings.
5. Fails before deployment if existing financial rows violate the repaired rules.

Do not modify any migration already recorded as applied.

---

## P0 — Review-29 migration-safety tasks are overstated

Every migration-safety and evidence task is marked complete, including:

- Restored shared-database comparison.
- Historical backfill verification.
- Migration ledger/checksum comparison.
- Current-head restore proof and SQL-object inventory.

But the committed test starts a fresh Testcontainers database and applies all migrations from zero. It does not:

- Restore the actual shared Supabase backup.
- Compare shared `_prisma_migrations` checksums with repository files.
- Inspect representative historical rows.
- Test the previously `db push`-managed shared state.
- Query the required `pg_constraint` inventory.

The tracker rules themselves say that shared reconciliation must verify `pg_constraint`, `pg_trigger` and `pg_proc`, and that evidence remains open until restore and object proof are attached.

The tracker’s latest entry still concerns the previous approval-expiry migration; it does not record deployment or restore verification for `20260801_financial_guardrail_updates`.

### Tasks that should be reopened

- Review-29 **3.1**
- Review-29 **3.2**
- Review-29 **4.2**
- Review-29 **4.3**
- Review-29 **3.3** should be marked partially complete: clean-database verification exists, restored-shared verification does not.

---

## P0 — Adjustment evidence can contradict its ledger

The review-29 specification requires an adjustment-credit source to match on tenant, customer, amount and effective date.

The current ledger validator only establishes that an Adjustment exists with the same tenant, customer and ledger ID. It does not verify that:

- `Adjustment.kind` matches the ledger direction.
- `Adjustment.amountKobo` matches the ledger amount.
- `Adjustment.effectiveAt` matches the ledger effective date.

The credit-lot validator compares the lot with the ledger, but does not compare either one with the Adjustment record.

Additionally, Adjustment evidence fields remain mutable in the Prisma model, and the new migration does not add an Adjustment immutability trigger.

This allows states such as:

```text
Adjustment.kind        = DEBIT
Ledger direction       = CREDIT

Adjustment.amountKobo  = 3,000
Ledger amountKobo      = 4,000

Adjustment.effectiveAt ≠ Ledger effectiveAt
```

The existing positive integration test uses matching values but does not test these mismatches.

### Required correction

Add a database validator that enforces:

```text
Adjustment.kind       ↔ Ledger.direction
Adjustment.amount     = Ledger.amount
Adjustment.effectiveAt = Ledger.effectiveAt
Adjustment.customer   = Ledger.customer
Adjustment.tenant     = Ledger.tenant
Ledger.type           = ADJUSTMENT
```

Then make the Adjustment’s tenant, customer, kind, amount, ledger link, effective date, creator and creation evidence immutable.

Until then, **manual adjustment execution remains a no-go**.

---

# Important remaining issues

## P1 — Deployment instructions can recreate migration drift

The README correctly uses `prisma migrate deploy` in local setup, but later tells operators that the remote workflow is:

```bash
npx supabase db push --linked
```

That instruction conflicts with the repository’s custom-SQL migration model. A schema push cannot serve as the authoritative deployment mechanism for the triggers, functions, backfills and deferred constraints under `prisma/migrations`.

The production runbook should define one route:

```text
Backup shared DB
→ Restore into isolated DB
→ Validate migration history and SQL objects
→ prisma migrate deploy
→ Re-run object and behavior probes
→ Smoke test
```

---

## P1 — Approval expiry still ignores related-row update counts

`expireApproval()` verifies that exactly one Approval was updated, but does not check the result counts for the related Receipt and Redemption updates.

It can therefore commit an expired Approval and audit event even if the expected related row was not transitioned.

It should require:

```ts
receiptUpdate.count === 1;
redemptionUpdate.count === 1; // when REDEEM
```

and include expected source-state predicates such as `reviewStatus: PENDING`.

---

## P1 — Automatic expiry is attributed to the triggering supervisor

When a supervisor attempts to decide an already expired approval, the expiry helper writes that supervisor into the decision and receipt-review fields.

The user discovered an elapsed deadline; they did not decide to expire the approval.

A cleaner model would:

- Leave `decisionBy` null or assign a SYSTEM actor.
- Store `detectedByActorId` in audit metadata.
- Use identical attribution for worker-triggered and request-triggered expiry.

---

## P1 — Approval execution still reuses pre-lock data

The complete approval aggregate is fetched and validated before `lockApprovalExecutionRows()` is called. The service then continues using the object fetched before the lock.

The safer sequence is:

1. Resolve an authorized approval ID.
2. Lock Approval, Receipt and Redemption.
3. Re-read the complete aggregate.
4. Validate the locked state.
5. Execute the transition.

Conditional updates currently reduce the risk, but they do not replace post-lock validation.

---

## P1 — Receiptless transaction branch ownership is unresolved

Adjustment and reversal ledger entries may have no receipt, and neither `LoyaltyLedgerEntry` nor `Adjustment` stores a branch ID.

Supervisor customer-ledger scope is currently implemented through `receipt.branchId`.

As a result, future receiptless adjustments and reversals will either:

- Be invisible to supervisors.
- Require tenant-wide access.
- Need a separate, explicit branch-ownership rule.

The transaction-detail endpoint also still rejects receiptless ledger entries as unsupported.

This should be designed before the real reversal and manual-adjustment APIs are implemented.

---

## P2 — Customer-ledger SMS lookup remains N+1

The ledger query loads the page of entries and then performs a separate SMS lookup for every item.

For larger histories, replace this with:

- A relation include where possible, or
- One batched SMS query using all page ledger/redemption/receipt IDs.

---

## P2 — Coverage thresholds are not enforced by CI

Coverage thresholds exist in `package.json`, but CI runs ordinary `npm test -- --runInBand`, not the coverage command.

Therefore, the thresholds do not currently act as a merge gate.

---

# Release decision

| Gate                                         | Decision                       |
| -------------------------------------------- | ------------------------------ |
| Earn workflow                                | **Pass**                       |
| Immediate redemption                         | **Pass**                       |
| High-value redemption approval               | **Pass**                       |
| Replay and bounded retries                   | **Pass**                       |
| SMS/outbox foundation                        | **Pass**                       |
| Reversal API contract truthfulness           | **Pass**                       |
| Real reversal execution                      | **Fail — not implemented**     |
| Adjustment-credit lot on clean DB            | **Pass**                       |
| Original-debit restoration guard on clean DB | **Pass**                       |
| Adjustment evidence integrity                | **Fail**                       |
| Shared financial trigger installation        | **Unproven**                   |
| Shared restore/object verification           | **Fail**                       |
| Approval expiry consistency                  | **Conditional pass**           |
| Receiptless branch/read model                | **Fail / undefined**           |
| Current-head CI                              | **Not independently verified** |
| Halfway production release                   | **No-go**                      |
| Begin manual-adjustment API                  | **No-go**                      |
| Begin real reversal execution                | **No-go**                      |

The GitHub connector returned no workflow runs or combined statuses for `92948cd`, and the available environment does not contain the GitHub CLI, so current-head Actions results were not independently inspected.

# Recommended sequence

1. Reopen the overstated review-29 migration-evidence tasks.
2. Add a forward migration that repairs and reattaches every required financial trigger and constraint.
3. Add a repeatable shared-backup restore verification script.
4. Compare migration names and checksums against all committed migration folders.
5. Inventory `pg_constraint`, `pg_trigger` and `pg_proc`, including trigger enabled and deferred states.
6. Run financial behavior tests against the restored shared database—not only a fresh container.
7. Add strict Adjustment-to-ledger matching and Adjustment evidence immutability.
8. Add a positive test proving a valid restoration succeeds and preserves original-debit ownership.
9. Fix approval-expiry update counts and system attribution.
10. Re-read approval data after locks.
11. Define branch ownership and read behavior for receiptless financial entries.
12. Replace the README’s remote `supabase db push` instruction with the authoritative Prisma migration runbook.
13. Record migration deployment, restored-object proof and green CI against the same final commit.

## Final assessment

The code now has materially better financial invariants, and the reversal contract issue is properly resolved.

The remaining release risk is **environmental truth**: the clean migration path is becoming strong, but the repository has not yet demonstrated that the actual shared database possesses and actively executes the same triggers, constraints and backfill effects. Until that proof and the Adjustment evidence checks exist, the halfway production gate should remain closed.
