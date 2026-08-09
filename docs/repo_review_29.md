# Repository Review — Latest Head

**Repository:** `micahjatau/shopcity_LP`
**Current head:** `94ee385ac640ed8dc32c2a142c795927e31d27bc`
**Latest commit:** `fix: regenerate openapi client for reversal response`

## Verdict

Seven commits have landed since the previous review. They make meaningful improvements to replay handling, approval expiry, branch authorization, worker lifecycle ownership and CI resilience.

However, the newest two commits introduce a **fresh reversal contract regression**, and the shared database migration repair may have marked custom financial migrations as applied without proving their SQL objects exist.

### Updated grade

| Measure                           | Previous |           Current |
| --------------------------------- | -------: | ----------------: |
| Raw Sprint 3 feature completion   |    52.7% |         **52.7%** |
| Quality-adjusted progress         |      62% |           **64%** |
| Quality of implemented first half |   85/100 |   **86/100 — B+** |
| Production readiness              |     ~69% |          **~71%** |
| Halfway release gate              |  Blocked | **Still blocked** |

The code is stronger, but the release evidence is not yet strong enough to justify production deployment or starting reversal and adjustment execution.

---

# What has genuinely improved

## 1. Delayed idempotency replay is fixed

Earn now checks for a completed idempotency response before:

- Session-device eligibility.
- Amount policy checks.
- Timestamp-window checks.
- Device, branch, card and customer lookups.

The tests now cover replay after the timestamp window has closed.

Redemption also resolves the completed record before amount conversion, timestamp validation and mutable database eligibility checks.

**Previous delayed-replay blocker: closed.**

There is a redundant second `sessionDeviceId` check in redemption, but it is only a cleanup issue.

---

## 2. Approval expiry is now substantially consistent

The shared `expireApproval()` function resolves the receipt through either:

```ts
approval.receiptId;
```

or:

```ts
approval.redemptionReceiptId;
```

It then updates Approval, Receipt, Redemption and Audit inside the caller’s transaction.

The worker now joins Redemption to obtain the underlying receipt and uses the same helper as the decision path. It processes bounded batches with `FOR UPDATE OF a SKIP LOCKED`.

Both EARN and REDEEM decision-time expiry paths now delegate to the shared function.

The Prisma model also contains an index aligned with the expiry query:

```prisma
@@index([status, expiresAt, requestedAt, id])
```

A worker test verifies that a REDEEM approval with no direct `receiptId` updates the linked receipt.

**Previous REDEEM receipt-expiry inconsistency: mostly closed.**

---

## 3. Supervisor read authorization is now query-scoped

The service now builds actor-aware Prisma conditions for:

- Approval listing.
- Approval decisions.
- Customer ledger reads.

The approval and customer-ledger controllers pass the complete actor context into the service.

The resulting rules are:

- Admin: tenant-wide access.
- Supervisor: own branch only.
- Missing branch context for a non-admin: `BRANCH_SCOPE_REQUIRED`.

**Previous tenant-wide supervisor exposure: closed in implementation.**

The tests should assert the full nested branch predicate rather than only checking `tenantId`; the current approval-list test does not strongly prove that the relation filter was included.

---

## 4. Worker infrastructure ownership is better

Prisma connection ownership now sits in the bootstrap rather than in each runtime. The runtime `stop()` methods stop their own timers and queues, while bootstrap disconnects the shared database client.

There is also a Postgres-only mode:

```bash
node dist/src/worker.js --approval-expiry-only
```

This allows approval expiry to operate without Redis or an SMS provider.

**Previous double-connect/double-disconnect ownership issue: closed.**

---

## 5. CI contract enforcement remains strong

The workflow runs:

- Fast verification.
- Build and Prisma validation.
- Architecture checks.
- Unit tests.
- OpenAPI generation, lint and diff.
- Client regeneration and typechecking.
- Generated-artifact cleanliness.
- E2E and integration suites.

The integration job now primes its Postgres image before running Jest, with retryable and clearer Docker-pull diagnostics.

This is an improvement, although not a complete Docker-registry resilience solution.

---

# Critical blockers

## P0 — Reversal OpenAPI and runtime contradict each other again

The current OpenAPI and generated client advertise a successful `202` response:

```http
202 Reversal submitted for manual review
```

But the service still has:

```ts
Promise<never>;
```

and always throws `ReversalReviewRequiredException`, which is HTTP `422`.

The unit tests explicitly expect `422 Unprocessable Entity`, including for first execution and idempotent replay.

The HTTP exception filter does not translate the exception into `202`; it sends the original exception status.

There is an additional problem: the controller does not use `@HttpCode(202)`. Even if the service started returning data, a NestJS POST would ordinarily return `201`, not the documented `202`.

### Why the current test did not catch it

The OpenAPI test is named:

> keeps the public reversal boundary unavailable

but it only verifies that `201` is absent and `422` exists. It does not assert that `202` is absent.

Therefore, the contract test passes while OpenAPI simultaneously advertises `202` and the runtime returns `422`.

### More serious semantic issue

Nothing is actually submitted for manual review.

The reversal service only creates an `IdempotencyRecord`. It does not create:

- A reversal request.
- An approval record.
- A manual-review queue item.
- An audit event.
- A target transaction validation record.

It also does not prove that the supplied transaction exists or is eligible for reversal.

The phrase **“submitted for manual review” is therefore misleading**.

### Recommended fix

Keep the boundary honest for now:

1. Remove the `202` success decorator.
2. Regenerate OpenAPI and the client.
3. Add an assertion that reversal `202` and `201` are both absent.
4. Add an HTTP-level test proving the endpoint returns `422`.
5. Keep `REVERSAL_REVIEW_REQUIRED` until an actual persisted review workflow exists.

Do not implement a cosmetic `202` without creating a real review resource.

---

## P0 — Credit-adjustment and restoration tasks are still falsely marked complete

The review-28 tracker marks all of these complete:

- Adjustment-credit lots.
- Restoration-to-original-debit linkage.
- Integration tests for both.

They are still not implemented.

### Credit lots remain earn-specific

The model still contains:

```prisma
earnLedgerEntryId
earnLedgerEntry
```

There is no generic `sourceLedgerEntryId`, and no new migration generalising credit-lot ownership.

The custom financial validator expects `ADJUSTMENT/CREDIT` to own a credit lot through `earnLedgerEntryId`, while the older credit-lot source validator only accepts `EARN/CREDIT`.

Therefore, a valid adjustment credit still cannot create a valid credit lot.

### Restoration ownership is still absent

`AllocationRestoration` still records only:

```prisma
allocationId
reversalLedgerEntryId
```

No new migration enforces:

```text
allocation.redemptionLedgerEntryId
=
reversalLedgerEntry.reversesEntryId
```

The current financial invariant integration suite tests unsupported type/direction pairs but contains no adjustment-credit or foreign-restoration scenario.

**Review-28 tasks 3.1, 3.2, 3.3 and part of 5.1 must be reopened.**

---

## P0 — Shared migration reconciliation may have recorded missing SQL as applied

The migration tracker now records that the actual linked Supabase database was backed up and restored. That is a major improvement.

However, it also says the previous 23 migrations were backfilled using:

```bash
prisma migrate resolve --applied
```

before running `prisma migrate deploy` for migration 24.

Earlier evidence says the shared database had been synchronised using:

```bash
prisma db push --skip-generate --accept-data-loss
```

rather than executing the custom financial migration SQL.

This is dangerous because several migrations contain objects that do not come from the Prisma schema alone, including:

- Financial state-machine check constraints.
- Deferred ledger validation triggers.
- Allocation and restoration evidence triggers.
- Immutability triggers.
- The unsupported ledger-pair guard.
- Historical SMS data backfills.

Marking those migrations as applied does not, by itself, prove those functions, triggers, constraints or data changes are present.

`prisma migrate status` can report “up to date” because the migration ledger is populated even when custom SQL objects are absent.

### Required verification

Against a restored copy of the **actual shared database**:

1. Query `pg_constraint`, `pg_trigger` and `pg_proc` for every expected custom object.
2. Compare its schema-only dump with a clean database built by all 24 migrations.
3. Run the financial invariant integration tests against the restored shared database.
4. Verify SMS backfill effects on representative historical rows.
5. Verify that the latest `validate_ledger_entry_commit_state()` definition contains the unsupported-pair `ELSE`.
6. Create a forward repair migration for anything missing.

Do not edit or rerun old migration files after they have been marked applied.

---

# Important remaining issues

## P1 — Approval expiry does not verify related updates succeeded

`expireApproval()` verifies that exactly one Approval became expired, but it ignores the result counts from:

```ts
receipt.updateMany();
redemption.updateMany();
```

A malformed or concurrently changed aggregate could therefore commit:

- Expired Approval.
- No Receipt transition.
- No Redemption transition.
- Audit entry claiming successful expiry.

The transaction is atomic, but zero-row updates are not failures unless explicitly checked.

### Recommended correction

Require:

```ts
receiptUpdate.count === 1;
```

when a receipt is expected, and:

```ts
redemptionUpdate.count === 1;
```

for REDEEM approvals.

Also include expected source-state predicates in the receipt update, such as `reviewStatus: PENDING`.

---

## P1 — Decision-time expiry attributes automatic expiry to the user

When a supervisor tries to decide an already expired approval, the shared helper writes that supervisor into:

```text
decisionByTenantId
decisionBy
```

The supervisor did not decide to expire it; they merely triggered discovery of the elapsed deadline.

For cleaner audit semantics:

- Keep `decisionBy` null for policy-driven expiry.
- Record the triggering user separately in audit metadata, such as `detectedByActorId`.
- Use the same system-expiry representation for worker and decision paths.

---

## P1 — Approval execution still uses pre-lock state

The approval aggregate is loaded and validated before `lockApprovalExecutionRows()` is called. Execution then continues using the object loaded before the lock.

Conditional updates prevent most duplicate execution, but the stronger pattern remains:

1. Load only identifiers.
2. Lock Approval, Receipt and Redemption.
3. Re-read the complete aggregate.
4. Validate current state.
5. Execute the decision.

---

## P1 — Testcontainers priming does not fully satisfy its own specification

The priming script defaults to only:

```text
postgres:16-alpine
```

and falls back to direct `docker pull` retries.

This improves diagnostics but does not provide:

- A registry mirror.
- A persistent image cache.
- A guarantee that every Testcontainers support image is primed.
- Independence from Docker Hub on a cold runner.

The associated OpenSpec tasks remain unchecked, which is accurate. This should not yet be described as complete CI resilience.

---

## P2 — Read-model limitations remain

The transaction detail service still rejects receiptless ledger entries with `UNSUPPORTED_TRANSACTION_TYPE`.

Customer-ledger SMS resolution remains N+1 because each ledger item performs a separate SMS lookup.

The new supervisor ledger scope also depends on `receipt.branchId`. Future receiptless reversals and adjustments will need an explicit branch-ownership model or they will disappear from supervisor views.

---

## P2 — Expected client errors are all warning logs

The exception filter now uses warning-level logging for every handled 4xx response.

That is better than error-level logging, but frequent expected outcomes such as validation failures, not-found responses and policy rejections can still generate noisy operational logs. Consider:

- Debug/info for expected 400, 404 and 422 outcomes.
- Warning for suspicious 409 and 429 patterns.
- Error for 5xx and unexpected exceptions.

---

# Tracker accuracy

The latest tracker is still unreliable.

It marks every review-28 task complete, including the unimplemented credit-lot and restoration database changes.

Its migration evidence also identifies `9f381f8` as the verified head, while the repository is now seven commits ahead at `94ee385`.

The latest head also has no workflow run or combined status available through the GitHub connector, so I cannot independently confirm current-head CI success.

---

# Updated release decision

| Gate                                     | Decision                                   |
| ---------------------------------------- | ------------------------------------------ |
| Immediate redemption                     | **Pass**                                   |
| Pending high-value redemption            | **Pass**                                   |
| Redemption replay and bounded retry      | **Pass**                                   |
| Redemption SMS                           | **Pass**                                   |
| Approval expiry design                   | **Pass with count-verification follow-up** |
| Supervisor branch scoping                | **Pass**                                   |
| Worker lifecycle ownership               | **Pass**                                   |
| OpenAPI/client generation enforcement    | **Pass generally**                         |
| Reversal OpenAPI/runtime parity          | **Fail**                                   |
| Real reversal manual-review submission   | **Fail**                                   |
| Adjustment-credit lot support            | **Fail**                                   |
| Reversal restoration ownership           | **Fail**                                   |
| Shared custom-SQL migration verification | **Fail / unproven**                        |
| Current-head CI evidence                 | **Unavailable**                            |
| Halfway production release               | **No-go**                                  |
| Begin reversal execution                 | **No-go**                                  |
| Begin manual adjustments                 | **No-go**                                  |

# Recommended next sequence

1. Remove the fictional reversal `202` and regenerate OpenAPI/client.
2. Add a real HTTP reversal test asserting runtime `422`.
3. Reopen review-28 credit-lot and restoration tasks.
4. Implement a generic credit-lot source relationship.
5. Add the original-debit restoration constraint.
6. Run those invariants against both a clean migration database and the restored shared database.
7. Inventory all custom SQL objects in the actual Supabase project.
8. Add a forward repair migration for missing constraints, triggers or backfills.
9. Require related-row update counts in approval expiry.
10. Re-read approval aggregates after locking.
11. Record green CI evidence against the resulting current head.
12. Update the tracker with only evidence-backed completions.

## Final assessment

The first half of Sprint 3 is now **operationally stronger**, especially around redemption replay, expiry processing, authorization and worker lifecycle management.

The largest risk has shifted to **release truthfulness**:

- OpenAPI says a reversal review request succeeds when runtime says it fails.
- The tracker says adjustment and restoration invariants exist when they do not.
- The migration ledger says custom migrations are applied without object-level proof that their SQL effects exist.

Those three issues should be resolved before the halfway release gate is considered passed.
