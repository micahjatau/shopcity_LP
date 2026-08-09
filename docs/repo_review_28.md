# Repository Review — Latest Head

**Repository:** `micahjatau/shopcity_LP`
**Current head:** `9f381f8096623ad675e80ef42bad4982138e6951`
**Commit:** `fix: implement repo review 27 hardening`

## Updated verdict

This is a **substantial hardening improvement**. The latest two commits close several genuine problems:

- OpenAPI and generated-client parity.
- Client drift enforcement in CI.
- Early idempotency replay.
- Bounded redemption retries.
- Branch-scoped individual transaction reads.
- Unsupported ledger type/direction rejection.
- Removal of approval expiry side effects from GET requests.
- Introduction of a bounded approval-expiry worker.

However, the hardening tracker claims completion of database invariants that are **not actually implemented**, and the new expiry worker leaves REDEEM receipts in an inconsistent state.

### Updated grading

| Measure                            | Previous |           Current |
| ---------------------------------- | -------: | ----------------: |
| Raw Sprint 3 checklist             |    52.7% |         **52.7%** |
| Quality-adjusted Sprint 3 progress |      58% |           **62%** |
| Quality of implemented first half  |   83/100 |   **85/100 — B+** |
| Production readiness               |     ~66% |          **~69%** |
| Halfway release gate               |  Blocked | **Still blocked** |

The implementation is moving in the right direction, but the repository is **not yet ready for production, reversals or adjustments**.

---

# What is now properly fixed

## 1. OpenAPI and generated client are aligned

The generated client no longer advertises a fictional `201` success response for the reversal endpoint. Its response is now an error-only union, consistent with the endpoint’s current manual-review boundary.

CI now runs:

```bash
npm run client:generate
npm run client:typecheck
git diff --exit-code -- client/shopcity-client.ts
```

alongside the OpenAPI cleanliness checks.

**Previous contract-consistency blocker: closed.**

---

## 2. Redemption idempotency is substantially improved

The redemption service now checks for a matching completed idempotency record before opening the financial transaction or validating the current device, card, branch and customer.

The serializable transaction is wrapped in a shared bounded-retry helper with:

- Three attempts.
- Jittered backoff.
- Replay checks after conflicts.
- Stable `REDEMPTION_TRANSACTION_CONFLICT` failure after exhaustion.

The retry helper correctly limits retries to Prisma `P2034` financial transaction conflicts rather than retrying arbitrary failures.

Duplicate receipt conflicts are now recognised using the complete composite constraint:

- Tenant.
- Branch.
- Receipt week.
- Normalised receipt number.

**Previous replay, retry and cross-branch duplicate-classification findings: substantially closed.**

---

## 3. Individual transaction lookup is branch-scoped

The controller now sends the complete `AuthContext` into the transaction-read service.

The service checks the receipt branch after loading the transaction and returns `TRANSACTION_NOT_FOUND` when it is outside the actor’s scope.

The implemented rule is:

- Admin: tenant-wide.
- Non-admin: exact actor branch match.

Tests cover both cashier cross-branch rejection and admin cross-branch access.

**Previous cashier transaction-read exposure: closed for this endpoint.**

---

## 4. Approval expiry no longer runs inside GET

`listApprovals()` now performs only a read. The old call that expired approvals whenever someone opened the approval list has been removed.

A separate worker now selects overdue approvals with:

```sql
LIMIT 50
FOR UPDATE SKIP LOCKED
```

and updates approval state inside a database transaction.

This is the correct architectural direction.

---

## 5. Unsupported ledger pairs are rejected

The latest migration adds a final rejection branch to the deferred ledger validator:

```sql
ELSE
  RAISE EXCEPTION 'unsupported ledger type/direction combination';
```

This prevents combinations such as:

- `EARN/DEBIT`
- `REDEEM/CREDIT`
- `REVERSAL/DEBIT`

An integration test now proves at least the `EARN/DEBIT` case is rejected.

**Previous unsupported-pair invariant: closed.**

---

# Critical remaining findings

## P0 — The review-27 tracker claims two database fixes that do not exist

The tracker marks all tasks complete, including:

- Generalising credit-lot sources for adjustment credits.
- Linking reversal restorations to the original debit.
- Adding tests for those invariants.

The current implementation does not satisfy those tasks.

### 1. Credit adjustments still cannot create credit lots

The Prisma model still uses:

```prisma
earnLedgerEntryId
earnLedgerEntry
```

as the credit-lot source relationship.

More importantly, the existing database trigger still requires the source entry to be exactly:

```text
EARN / CREDIT
```

and rejects any other ledger type.

The new migration’s `ADJUSTMENT/CREDIT` branch merely searches for a lot using `earnLedgerEntryId`; it does not replace or generalise the old source trigger.

Therefore:

1. An `ADJUSTMENT/CREDIT` entry is created.
2. The new commit validator requires it to own one credit lot.
3. Creating that lot invokes the old source trigger.
4. The old trigger rejects it because the source is not `EARN/CREDIT`.
5. The transaction cannot commit.

The OpenSpec explicitly requires adjustment-credit lot sources, but the database does not implement that contract.

**Manual adjustments remain a hard no-go.**

### Required correction

Introduce a generic source relationship, such as:

```prisma
sourceLedgerEntryId String
sourceLedgerEntry   LoyaltyLedgerEntry
```

Then permit only:

```text
EARN/CREDIT
ADJUSTMENT/CREDIT
```

with matching tenant, customer, amount and effective date.

Add integration tests proving:

- A valid earn credit creates a lot.
- A valid adjustment credit creates a lot.
- A debit or unsupported source fails.
- Source mutation remains impossible.

---

### 2. Reversal restorations are not tied to the original debit

The current restoration model records:

- `allocationId`
- `reversalLedgerEntryId`

The existing restoration trigger checks that the new ledger is `REVERSAL/CREDIT` and validates the affected lot’s remaining balance. It does **not** compare the allocation’s debit ledger with the reversal’s `reversesEntryId`.

The new pair guard verifies:

- The original entry exists.
- It is a debit.
- The customer matches.
- Total restorations equal the reversal amount.

It still does not prove that each restored allocation belongs to that original debit.

This means a malformed reversal could theoretically reference debit A while restoring allocations consumed by debit B, provided the customer and totals match.

The OpenSpec requires the missing invariant explicitly.

**Automatic reversals remain a hard no-go.**

### Required invariant

```text
AllocationRestoration.allocation.redemptionLedgerEntryId
=
AllocationRestoration.reversalLedgerEntry.reversesEntryId
```

Add an integration test where a reversal tries to restore an allocation belonging to another debit and verify that commit fails.

---

## P0 — REDEEM approval expiry leaves its receipt pending

High-value redemption approvals are created with:

```text
redemptionId = populated
receiptId = null
```

The receipt is reached through `redemption.receipt`.

The new expiry worker only updates a receipt when `approval.receiptId` is populated. For a REDEEM approval, that field is null. The worker therefore:

- Marks Approval as `EXPIRED`.
- Marks Redemption as `EXPIRED`.
- Writes an audit record.
- Leaves the underlying Receipt as `PENDING_APPROVAL/PENDING`.

The unit test uses a REDEEM approval with `receiptId: null`, but only checks the redemption and audit updates. It does not expect any receipt update, so it currently codifies the incomplete behaviour.

That creates a contradictory aggregate:

| Record     | Result                           |
| ---------- | -------------------------------- |
| Approval   | `EXPIRED`                        |
| Redemption | `EXPIRED`                        |
| Receipt    | Still `PENDING_APPROVAL/PENDING` |

### Direct decision expiry is also inconsistent

When an EARN approval is found expired during a decision request, the service updates only the Approval and returns an expiry outcome; it does not update the Receipt or write the same system expiry audit.

For REDEEM, the direct path updates Approval and Redemption but still does not update Receipt or use the worker’s audit flow.

### Required correction

Create one shared transaction function:

```ts
expireApproval(tx, approval, now);
```

It should resolve:

```ts
const receiptId = approval.receiptId ?? approval.redemption?.receiptId;
```

Then atomically and conditionally update:

1. Approval.
2. Redemption, where applicable.
3. Receipt.
4. System audit log.

Both the worker and the decision endpoint should use the same function.

A real Postgres integration test should cover a REDEEM approval, not only a mocked unit transaction.

---

## P0 — Shared migration history is still not reconciled

The migration tracker still says the shared Supabase schema was synchronised using:

```bash
prisma db push --skip-generate --accept-data-loss
```

and that backup/restore evidence remained pending.

The new evidence says:

1. A fresh disposable database received all 23 migrations.
2. That clean database was dumped.
3. It was restored into another database.
4. `prisma migrate status` reported it was current.

That is useful disaster-recovery evidence for a **clean migration-built database**, but it does not reconcile the actual shared database that was previously changed with `db push`.

It does not prove that the real shared environment has:

- Correct `_prisma_migrations` rows.
- Matching migration checksums.
- All 23 migrations recorded.
- The expected triggers and constraints.
- A deployable path for the newly added migration.
- Restorable production-like data.

Despite this, review-27 task 1.2 is marked complete.

### Required shared-environment proof

1. Back up the actual shared database.
2. Record `prisma migrate status` against it.
3. Inspect `_prisma_migrations`.
4. Compare its rows and checksums with all committed migration folders.
5. Restore that actual backup into an isolated database.
6. Run `prisma migrate deploy`.
7. Apply `migrate resolve` or a forward repair where history differs.
8. Verify triggers, constraints, indexes and enums.
9. Run earn, redemption and approval smoke tests against the restored copy.

Until that is done, the production database release remains unsafe.

---

# Important remaining findings

## P1 — Delayed idempotency replay can still fail timestamp validation

Redemption replay is now ahead of mutable database checks, but it is still after:

```ts
assertRedemptionTimestampAllowed(occurredAt);
```

Redemption records retain their idempotency response for seven days, while the endpoint rejects `occurredAt` values older than twelve hours.

Therefore:

1. A redemption succeeds.
2. The client retries the same key and payload more than twelve hours later.
3. Timestamp validation runs first.
4. The service returns `OFFLINE_REDEMPTION_NOT_ALLOWED`.
5. The stored completed response is never replayed.

The unit test for early replay fixes the current time to the original request time, so it does not exercise this delayed retry.

The sequence should be:

1. Structural parsing and normalisation.
2. Request hash.
3. Completed replay lookup.
4. Time, device, card, customer and policy checks for new execution.

The earn path has a similar ordering issue because amount and timestamp-override rules run before completed replay resolution.

---

## P1 — Approval and customer-ledger authorization remains tenant-wide

The individual transaction endpoint is now scoped correctly, but neighbouring supervisor surfaces are not.

### Customer ledger

The controller allows supervisors and admins, but passes only:

```ts
tenantId;
customerId;
```

to the service.

The service filters only by tenant and customer and receives no actor or branch context.

A branch-scoped supervisor can therefore read another branch’s customer ledger if the customer ID is known.

### Approval list and decisions

The approval controller receives `AuthContext`, but list delegation drops it and sends only the tenant ID.

`ApprovalsService` then delegates tenant-only approval listing to `LoyaltyService`.

`LoyaltyService.listApprovals()` queries every approval in the tenant without branch filtering.

Approval decisions are also loaded by tenant and approval ID before execution, without checking the actor’s authorised branch.

This contradicts the review-27 requirement that supervisors respect assigned branch scope.

### Required correction

Make these methods actor-aware:

```ts
listApprovals(tenantId, actor, page)
decideApproval(tenantId, actor, ...)
listCustomerLedger(tenantId, actor, customerId, page)
```

Put branch restrictions in the database query rather than filtering after retrieval.

---

## P1 — Shared worker owns one Prisma client twice

The bootstrap creates a single `PrismaService` and passes it to both:

- `OutboxWorkerRuntime`
- `ApprovalExpiryWorkerRuntime`

Both runtimes independently call `$connect()` and `$disconnect()` on that same object.

During shutdown, both `stop()` methods run concurrently through `Promise.allSettled()`. This gives two components ownership over the same database-client lifecycle.

The approval-expiry process also cannot start unless the Redis/SMS outbox configuration and SMS provider start successfully, even though approval expiry needs only Postgres.

### Better structure

- Bootstrap owns Prisma connection and disconnection.
- Worker runtimes receive an already-connected client.
- Runtime `stop()` methods stop their timers/queues but do not disconnect shared infrastructure.
- Prefer separate deployable worker entry points for SMS outbox and approval expiry.

---

## P1 — Approval expiry needs an index

The worker executes every minute and filters by:

```text
status = PENDING
expiresAt <= now
ORDER BY expiresAt, requestedAt, id
```

The Approval model has an index on:

```prisma
@@index([tenantId, status, requestedAt])
```

but no index supporting the global expiry sweep by `status` and `expiresAt`.

Add an index aligned with the actual worker query, for example:

```prisma
@@index([status, expiresAt, requestedAt, id])
```

or a Postgres partial index for pending approvals.

---

## P2 — Approval execution still validates a pre-lock aggregate

`decideApproval()` loads the complete approval aggregate, validates some of it, then acquires row locks. It continues execution using the aggregate loaded before those locks.

Conditional `updateMany` operations protect against straightforward double execution, but the cleaner pattern is:

1. Load the identifiers needed for locking.
2. Lock approval, redemption and receipt rows.
3. Re-read the aggregate after locking.
4. Perform all state and eligibility checks.
5. Execute the decision.

---

## P2 — Transaction and ledger read models remain unfinished

The transaction service still rejects transactions without receipt evidence as unsupported.

This means the advertised future transaction types are not yet represented by a genuine discriminated response model.

Customer-ledger SMS retrieval also remains N+1: each ledger row separately calls the SMS lookup helper, which can perform several queries.

These are not halfway blockers, but they should be resolved before the ledger becomes a heavily used operational screen.

---

# Tracker and evidence quality

There are now three contradictory planning states:

1. `repo-review-24` remains entirely unchecked, including several features already implemented.
2. `repo-review-27` is entirely checked, including database tasks that are not implemented.
3. `docs/repo_review_27.md`, committed in the current head, still describes the previous head `a1e95e2`, not `9f381f`.

The GitHub connector also exposed no workflow run or combined status for `9f381f`, so current-head remote CI remains unverified.

The CI definition itself is much better and covers static checks, client generation, E2E and integration tests.

---

# Revised release decision

| Gate                                    | Decision                                     |
| --------------------------------------- | -------------------------------------------- |
| Immediate redemption                    | **Pass**                                     |
| Pending high-value redemption           | **Pass**                                     |
| Redemption idempotency/retries          | **Pass, with delayed-replay edge remaining** |
| Redemption SMS                          | **Pass**                                     |
| Individual transaction branch scope     | **Pass**                                     |
| OpenAPI/client consistency              | **Pass**                                     |
| Unsupported ledger-pair rejection       | **Pass**                                     |
| Approval expiry architecture            | **Conditional fail**                         |
| REDEEM receipt expiry consistency       | **Fail**                                     |
| Credit-adjustment lot sourcing          | **Fail**                                     |
| Reversal restoration ownership          | **Fail**                                     |
| Shared migration-history reconciliation | **Fail**                                     |
| Supervisor-wide read authorization      | **Fail**                                     |
| Current-head CI evidence                | **Unavailable**                              |
| Halfway production release              | **No-go**                                    |
| Start reversal implementation           | **No-go**                                    |
| Start manual adjustments                | **No-go**                                    |

---

# Recommended next sequence

1. Reopen review-27 tasks **1.2, 3.1, 3.2, 4.2 and 6.1**.
2. Fix REDEEM expiry so Approval, Redemption and Receipt settle atomically.
3. Centralise expiry behaviour across worker and decision paths.
4. Generalise the credit-lot source model for adjustment credits.
5. Enforce restoration-to-original-debit ownership.
6. Add real integration tests for both database invariants.
7. Reconcile the actual shared Supabase migration ledger.
8. Move completed replay ahead of time-sensitive eligibility checks.
9. Branch-scope approval listing, decisions and customer-ledger reads.
10. Add the expiry-worker index and separate shared infrastructure lifecycle.
11. Obtain a green CI result for the resulting current head.
12. Reconcile or supersede the old review trackers.

## Final assessment

The latest commits make the first half of Sprint 3 **materially more reliable**. Redemption is now close to production-grade, and the API/client contract is well protected.

The main concern is no longer basic redemption execution. It is now **truthfulness of the hardening evidence**: the tracker says the future adjustment and reversal invariants are complete when the database still cannot safely support those workflows.

The correct decision is to finish the expiry, migration and financial-invariant corrections before implementing any reversal or manual-adjustment execution.
