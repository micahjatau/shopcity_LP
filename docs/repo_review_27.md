# Repository Review — Current Head

**Repository:** `micahjatau/shopcity_LP`
**Current head:** `a1e95e2c4e891eb2d788f8f6b4799f01aebdb2ee`
**Commit:** `fix: harden repo review 26`

## Updated verdict

This is a **meaningful and correct hardening commit**. The previous OpenAPI/client contradiction is now fixed, and CI has been strengthened to prevent generated-client drift.

However, it remains an **artifact, documentation and CI hardening change**. It does not resolve the outstanding runtime, financial-model or shared-database migration risks.

### Updated grade

| Measure                           | Previous |           Current |
| --------------------------------- | -------: | ----------------: |
| Raw Sprint 3 completion           |    52.7% |         **52.7%** |
| Quality-adjusted progress         |      58% |           **60%** |
| Quality of implemented first half |   83/100 |   **86/100 — B+** |
| Production readiness              |     ~66% |          **~70%** |
| Halfway release gate              |  Blocked | **Still blocked** |

The first half of Sprint 3 is now technically credible. The remaining blockers are increasingly concentrated around migration safety, database invariants, lifecycle processing and operational evidence.

---

# What this commit fixed

## 1. Generated client is aligned with OpenAPI

The stale reversal `201` success response has been removed from the generated TypeScript client.

The reversal client now exposes only documented error responses, and its result type is an error union rather than a fictional success-or-error union.

This now aligns all three layers:

| Layer            | Reversal behaviour                        |
| ---------------- | ----------------------------------------- |
| Runtime service  | Always returns `REVERSAL_REVIEW_REQUIRED` |
| OpenAPI          | No reversal success response              |
| Generated client | No reversal success type                  |

**Previous P0 contract defect: closed.**

## 2. CI now enforces client consistency

The static CI job now runs:

```bash
npm run client:generate
npm run client:typecheck
git diff --exit-code -- client/shopcity-client.ts
```

alongside OpenAPI generation and cleanliness checks.

That is the correct long-term fix. A future OpenAPI change can no longer silently leave the checked-in client behind.

## 3. Local verification is better documented

The migration tracker records local execution of:

* Lint and build.
* Targeted unit tests.
* Redemption approval integration tests.
* Immutable ledger integration tests.
* OpenAPI integration tests.
* Client generation and typechecking.

The tracker also correctly states that the halfway gate remains blocked until external CI/deployment and migration evidence are available.

---

# New findings

## P1 — One release-evidence command needed a reproducible file path

The tracker claims this command was run:

```bash
npx jest src/jobs/approval-expiry.worker.spec.ts ...
```

The current tree includes `src/jobs/approval-expiry.worker.ts` and `src/jobs/approval-expiry.worker.spec.ts`, so this command is now reproducible as recorded.

The evidence entry should continue to reference files present in the recorded tree only.

## P1 — Tracker truth is still fragmented

The new `repo-review-26` tracker marks all of its documentation, client and verification tasks complete.

But the earlier `repo-review-24` tracker remains entirely unchecked, including items that are demonstrably implemented:

* Runtime `201`/`202`.
* HTTP integration tests.
* Shared SMS builder.
* Worker-side SMS validation.
* Persisted SMS rendering.
* Redemption transaction-read improvements.
* Reversal contract parity.

This leaves multiple contradictory planning documents.

### Recommended treatment

Mark each completed `repo-review-24` item truthfully and leave only these open:

* Shared migration-history reconciliation.
* Backup/restore or forward-fix rehearsal.
* Complete release-gate verification.
* Bruno and any remaining full-suite evidence.

Alternatively, explicitly mark review 24 as **superseded by review 26**, with a link to the successor tracker.

---

# Unchanged critical blockers

## P0 — Shared Prisma migration history remains unsafe

The tracker still records that the shared Supabase database was synchronised using:

```bash
npx prisma db push --skip-generate --accept-data-loss
```

It also explicitly states that backup/restore evidence remains pending.

This remains the largest release blocker.

A schema that appears correct after `db push` does not prove that:

* `_prisma_migrations` matches the repository.
* Future `prisma migrate deploy` will succeed.
* Triggers and constraints match migration files.
* A restored database can be upgraded.
* Production data can survive a forward correction.

### Required evidence

Before passing the halfway gate:

1. Capture a shared-environment backup.
2. Record `prisma migrate status`.
3. Compare `_prisma_migrations` with all committed migration directories.
4. Restore the backup to a separate database.
5. Run `prisma migrate deploy` against the restored copy.
6. Verify expected triggers, constraints, indexes and enums.
7. Use a documented forward migration or `migrate resolve` where history differs.
8. Run a post-restore redemption and approval smoke test.

Until then, **production deployment remains no-go**.

## P0 — No current-head remote CI result is available

No workflow run or combined status was returned for `a1e95e2`.

The local commands are useful, and the CI definition is stronger, but a configured workflow is not the same as a successful workflow run.

The gate should require visible current-head evidence for:

* Static checks.
* E2E.
* Integration.
* Client generation.
* GitNexus or recorded exception.
* Migration verification where applicable.

---

# Runtime review

## 1. Redemption workflow — **23/25**

The redemption workflow remains strong:

* Immediate and approval-required paths.
* Correct `201`/`202` runtime status.
* FIFO allocation.
* Remaining-balance calculation.
* Typed SMS payload.
* Audit, outbox and SMS persistence.
* Serializable database transaction.
* Duplicate receipt and idempotency controls.

### Completed replay is checked too late

The service loads and validates the current device, branch, card and customer before it checks for an existing completed idempotency response.

This creates an incorrect retry scenario:

1. Redemption succeeds.
2. The card or POS device is later deactivated.
3. The client retries the exact request and key.
4. The service rejects current eligibility instead of replaying the completed result.

A completed matching idempotency response should be authoritative. Resolve it immediately after normalisation and hashing, before mutable eligibility checks.

### Redemption still lacks bounded serialization retries

The earn flow has a retry loop with jitter.

The redemption flow executes one serializable transaction. A financial conflict leads to replay lookup and then a `503`; there is no retry loop.

This contradicts the broad claim that shared bounded financial retry handling is complete.

### Conflict-time duplicate receipt lookup is too broad

The normal duplicate check correctly uses:

* Tenant.
* Branch.
* Receipt week.
* Normalised receipt number.

But after a serialization conflict, the fallback query uses only tenant and normalised receipt number.

That can report `RECEIPT_ALREADY_USED` for a legitimate receipt number from another branch or week.

---

## 2. Approval workflow — **16/20**

The approval execution path remains functional and concurrency-aware, but its lifecycle handling needs refinement.

### Approval expiry still happens through a GET

`listApprovals()` calls `expireOverdueApprovals()` before reading the approval list.

The helper:

* Selects every overdue approval without a batch limit.
* Mutates state during a read operation.
* Depends on someone opening the approval queue.
* Does not create an expiry audit event.
* Updates redemption state but not the corresponding receipt state.

This should be replaced with a scheduled expiry worker using bounded batches:

```sql
ORDER BY "expiresAt"
LIMIT 100
FOR UPDATE SKIP LOCKED
```

Each expiry should atomically update:

* Approval.
* Redemption.
* Receipt.
* Audit log.

### Approval aggregate is still read before locking

The service loads the approval and its included receipt/redemption state, checks it, then locks the rows. It continues using the object loaded before the lock.

A safer sequence is:

1. Lock approval and target rows.
2. Re-read the approval aggregate after acquiring locks.
3. Validate current state.
4. Execute conditional transitions.

The current conditional `updateMany` calls prevent most double execution, but the stale included object can still produce misleading eligibility decisions under concurrent changes.

---

# Financial-model review

## P1 — Unsupported ledger type/direction pairs still pass the trigger

The commit-time ledger validation handles only selected combinations:

* `EARN/CREDIT`
* `REDEEM/DEBIT`
* `ADJUSTMENT/CREDIT`
* `ADJUSTMENT/DEBIT`
* `REVERSAL/CREDIT`

There is no final `ELSE` that rejects every other combination.

Consequently, combinations such as:

* `EARN/DEBIT`
* `REDEEM/CREDIT`
* `REVERSAL/DEBIT`

can bypass the type-specific evidence validation.

This must be fixed before reversal work begins.

## P1 — Credit adjustment remains impossible under the current lot model

The new financial trigger expects an `ADJUSTMENT/CREDIT` ledger entry to own exactly one `CreditLot`.

But the existing credit-lot source trigger requires the referenced ledger entry to be strictly:

```text
EARN / CREDIT
```

Therefore, a credit adjustment cannot create a valid credit lot.

Before implementing adjustments, replace the earn-specific source relationship with a generic credit-source relationship, for example:

```text
sourceLedgerEntryId
```

and permit:

* `EARN/CREDIT`
* `ADJUSTMENT/CREDIT`

## P1 — Reversal restoration evidence is not tied to the original debit

The reversal trigger checks:

* Original entry exists.
* Original entry is a debit.
* Customer matches.
* Restoration sum equals reversal amount.

It does not prove that every restored allocation belongs to the debit identified by `reversesEntryId`.

A reversal could theoretically restore allocations consumed by another debit while still satisfying the total.

Required invariant:

```text
restoration.allocation.debitLedgerEntryId
=
restoration.reversalLedgerEntry.reversesEntryId
```

---

# Read-model and authorization review

## P1 — Cashier transaction lookup remains tenant-wide

Cashiers may call `GET /transactions/:id`, but the controller passes only tenant ID and transaction ID to the service.

The service query filters only:

```ts
{ tenantId, id: transactionId }
```

It does not enforce the cashier’s branch.

A cashier who obtains a transaction UUID from another branch may be able to read it. Pass `AuthContext` into the read service and enforce:

* Cashier: own branch.
* Supervisor: assigned branch scope.
* Admin: tenant-wide.

## P2 — Transaction response is still not truly discriminated

The OpenAPI schema advertises `EARN`, `REDEEM`, `ADJUSTMENT` and `REVERSAL`, but the service requires a receipt and rejects receiptless transaction types.

The current response remains an earn-shaped object with nullable redemption additions.

This is acceptable for the halfway milestone because reversal and adjustment execution are not implemented, but it must not be considered the final transaction-read model.

## P2 — Customer ledger SMS lookup is N+1

Each ledger row separately calls `findTransactionSmsMessage()`.

That helper can issue up to three queries:

1. Ledger entry.
2. Redemption.
3. Receipt.

For a 50-row page, that can become roughly 150 SMS queries. Batch-load all relevant SMS rows before mapping the response.

---

# CI and verification grade

## Improvements

The current workflow now protects:

* Formatting and lint.
* Typecheck and build.
* Unit tests.
* OpenAPI lint and diff.
* OpenAPI artifact cleanliness.
* Generated client regeneration.
* Client typechecking.
* Client artifact cleanliness.
* E2E.
* Integration tests.

## Remaining gaps

Scripts exist for Bruno and coverage, but CI still does not run them.

For full Sprint 3 closure, add:

```bash
npm run test:cov
npm run bruno:test
```

A live API must be started for the Bruno collection, or the collection should run in a dedicated smoke-test job.

---

# Updated release decision

| Area                            | Decision                                 |
| ------------------------------- | ---------------------------------------- |
| Runtime redemption              | **Pass**                                 |
| High-value pending redemption   | **Pass**                                 |
| Redemption approval execution   | **Conditional pass**                     |
| Redemption SMS contract         | **Pass**                                 |
| OpenAPI/client parity           | **Pass**                                 |
| Client drift prevention         | **Pass**                                 |
| Local targeted verification     | **Pass with evidence correction needed** |
| Shared migration safety         | **Fail**                                 |
| Current-head remote CI evidence | **Unverified**                           |
| Reversal data model             | **Not ready**                            |
| Adjustment data model           | **Not ready**                            |
| Halfway production release      | **No-go**                                |
| Begin reversal implementation   | **No-go**                                |
| Begin adjustment implementation | **No-go**                                |

# Recommended next commit

The next change should avoid adding new financial features and close these items in order:

1. Reconcile the shared Prisma migration ledger and prove backup/restore.
2. Correct the release-evidence command that references the unresolved approval-expiry test path.
3. Consolidate or supersede the review 24 and review 26 trackers.
4. Move redemption replay checks before mutable eligibility validation.
5. Add bounded redemption serialization retries.
6. Correct the fallback receipt identity query.
7. Move approval expiry to a scheduled bounded worker.
8. Reject unsupported ledger type/direction combinations.
9. Generalise the credit-lot source model for adjustments.
10. Enforce restoration-to-original-debit linkage.

## Final assessment

The repository is improving in the right order. The newest commit fully closes the OpenAPI/generated-client inconsistency and adds durable CI protection.

The first-half redemption and approval implementation now deserves **86/100**. What prevents a higher grade is no longer basic feature incompleteness; it is the integrity and operational layer:

* Ambiguous shared migration history.
* Missing restore evidence.
* Financial constraints that are not ready for reversal or adjustment.
* Request-driven approval expiry.
* Incomplete read authorization.
* Release evidence that is not yet fully reproducible.

The codebase is ready for another **hardening iteration**, not yet for Sprint 3’s reversal and manual-adjustment half.
