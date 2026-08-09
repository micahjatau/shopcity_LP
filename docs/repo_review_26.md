# Latest Repository Review

**Repository:** `micahjatau/shopcity_LP`
**Current head:** `71e43afa40bce412d9671e5cfff25bd0d5e1a58d` — `docs: regenerate openapi spec`

## Verdict

The latest commit fixes the immediate OpenAPI reversal-response defect, but it changes **only** `docs/api/openapi.json`. No runtime, database, test, tracker, migration or CI workflow code changed.

The repository remains at the functional halfway point of Sprint 3, but the halfway hardening gate is **still not passed**.

### Updated grade

| Measurement                        | Previous |        Current |
| ---------------------------------- | -------: | -------------: |
| Raw Sprint 3 checklist             |    52.7% |      **52.7%** |
| Quality-adjusted Sprint 3 progress |      57% |        **58%** |
| Quality of implemented first half  |   82/100 | **83/100 — B** |
| Production readiness               |     ~65% |       **~66%** |

The increase is small because the OpenAPI artifact is now more truthful, but the generated client, migration evidence and operational lifecycle issues remain unresolved.

---

# What the latest commit fixed

## Reversal OpenAPI no longer promises `201`

The previous OpenAPI document advertised:

```http
201 Transaction reversal processed
```

even though the reversal service can never return success.

The latest commit removed that entire `201` response definition.

The current OpenAPI reversal operation now begins with error responses rather than a success response.

This now agrees with the OpenAPI integration test, which explicitly expects the reversal operation not to contain `201`.

**Status: OpenAPI document corrected.**

---

# New immediate finding

## P0 — Generated client is now stale

Although `openapi.json` was corrected, `client/shopcity-client.ts` was not regenerated.

The client still defines:

```ts
reversalsControllerReverseV1Response201;
```

and classifies it as the endpoint’s success response.

It also still defines the corresponding `ReversalsControllerReverseV1201` success envelope.

Therefore the repository currently contains three different truths:

| Layer                       | Reversal success                |
| --------------------------- | ------------------------------- |
| Runtime service             | Impossible; always throws `422` |
| OpenAPI document            | No `201`                        |
| Generated TypeScript client | Still expects `201`             |

The reversal service still returns `Promise<never>`, stores an idempotency result and always throws `REVERSAL_REVIEW_REQUIRED`.

### Required correction

Run:

```bash
npm run client:generate
npm run client:typecheck
git diff --exit-code -- client/shopcity-client.ts
```

Then commit the regenerated client.

More importantly, add this sequence to CI. The scripts exist, but the workflow does not execute them.

---

# Current first-half grading

## 1. Redemption workflow — **23/25**

This remains the strongest area.

Implemented and demonstrated:

- Immediate confirmed redemption.
- High-value pending redemption.
- Real runtime `201` and `202`.
- FIFO allocation.
- Balance recomputation.
- Idempotency and duplicate receipt handling.
- Audit, outbox and SMS intent.
- Typed redemption SMS payload.
- Real persisted-payload rendering test.

The controller explicitly selects `201` or `202` based on the service state.

Both immediate and approved redemption paths use the same SMS payload builder with `redeemedKobo` and `remainingBalanceKobo`.

### Remaining weakness: replay ordering

The service validates the current device, branch, card and customer before resolving an existing completed idempotency record.

Consequently:

1. A transaction completes.
2. The card or device is subsequently disabled.
3. The client retries the same key and payload.
4. The service may reject the request instead of returning the stored response.

A completed idempotency response should be checked immediately after request normalisation and hashing.

### Remaining weakness: incomplete retry behaviour

Financial transaction conflicts are mapped to `REDEMPTION_TRANSACTION_CONFLICT`, but there is no visible bounded retry loop around the redemption transaction.

The tracker claims bounded serialization/deadlock retries are complete, so either the redemption path needs those retries or the tracker needs qualification.

---

## 2. Approval workflow — **16/20**

The core approval path is credible:

- Typed redemption approvals.
- Approval and redemption locking.
- Policy re-evaluation.
- Self-approval protection.
- FIFO allocation on approval.
- Conditional state transitions.
- Rejection and expiry handling.
- Audit and SMS creation.
- Concurrency coverage.

The real integration test proves approval creation, listing, execution, allocation, balance deduction, persisted SMS rendering and transaction lookup.

### Approval expiry is still operationally weak

Listing approvals still calls `expireOverdueApprovals()` before performing the read.

The expiry helper:

- Scans all overdue approvals without a batch limit.
- Mutates state during a GET operation.
- Relies on someone opening the approval page.
- Does not record an expiry audit event.
- Updates redemption state but does not consistently settle receipt state.

This should become a scheduled, bounded worker using:

```sql
FOR UPDATE SKIP LOCKED
LIMIT 100
```

The worker should atomically update approval, redemption and receipt state and create a system audit event.

### Approval response remains incomplete

The approved redemption response returns the redeemed amount but omits the recalculated remaining balance and SMS status.

Those fields are already computed before SMS creation and should be returned.

---

## 3. Database integrity — **14/20**

The first-half redemption schema has meaningful protection:

- Redemption lifecycle constraints.
- Approval lifecycle constraints.
- Allocation totals.
- Lot decrement evidence.
- Append-only ledger protections.
- Immutable redemption evidence.

However, important financial-model gaps remain unchanged because the latest commit touched only OpenAPI.

### Invalid ledger combinations can bypass evidence validation

The financial trigger recognises particular combinations but lacks a final rejection for unsupported type/direction pairs. This leaves combinations such as:

- `EARN/DEBIT`
- `REDEEM/CREDIT`
- `REVERSAL/DEBIT`

insufficiently constrained.

This matters particularly for the next reversal phase.

### Credit adjustment model remains contradictory

The planned financial invariant expects an `ADJUSTMENT/CREDIT` ledger entry to create a credit lot.

But the existing credit-lot source trigger requires the source ledger to be `EARN/CREDIT`.

A credit adjustment therefore cannot create a valid credit lot under the current model.

Before manual adjustments begin, generalise:

```text
earnLedgerEntryId
```

into a source-ledger concept that supports both:

```text
EARN/CREDIT
ADJUSTMENT/CREDIT
```

### Restoration ownership is not strong enough

A reversal’s restoration total can be validated without proving that every restored allocation originated from the debit referenced by `reversesEntryId`.

Before reversal implementation, enforce:

```text
restoration.reversalLedgerEntry.reversesEntryId
=
restoration.allocation.debitLedgerEntryId
```

---

## 4. SMS and outbox — **18/20**

Redemption SMS behaviour is now one of the better-integrated parts of the repository.

The payload builder produces a complete, typed payload.

The worker validates the payload before selecting or invoking a provider.

The remaining deductions relate primarily to future templates:

- `transaction-reversed` remains placeholder-level.
- `balance-adjusted` remains placeholder-level.
- Those should not be considered completed until their actual workflows exist.

---

## 5. Transaction reads — **13/20**

The redemption read path now correctly includes:

- Redemption identity.
- Redemption approval.
- Debit amount.
- FIFO allocations.
- Restoration evidence.
- SMS status.

The service now includes `redemption.approval` and prioritises it over receipt approvals.

However, the response remains an earn-shaped structure with additional nullable redemption fields rather than a true discriminated union. It still rejects transactions without receipt evidence.

A proper final design should use:

```text
EarnTransactionResponse
RedeemTransactionResponse
ReversalTransactionResponse
AdjustmentTransactionResponse
```

### Cashier branch authorization remains missing

Cashiers may call the transaction lookup endpoint, but the controller sends only `tenantId` and transaction ID to the service.

There is no branch or actor scope in the query.

A cashier who obtains another branch’s transaction UUID may read it. Pass `AuthContext` into the read service and enforce branch scope.

### Ledger SMS lookup remains N+1

Customer ledger entries still resolve SMS status separately for each transaction.

The helper can perform sequential ledger, redemption and receipt lookups.

Batch-load SMS records for the page instead.

---

## 6. Contracts and generated artifacts — **12/20**

The OpenAPI document now truthfully omits reversal success.

But the generated client remains stale and the CI workflow does not enforce client regeneration.

There are also incorrect example paths in generated errors. For example, the reversal operation’s validation-error example still reports:

```text
/api/v1/transactions/earn
```

rather than the reversal endpoint.

This is not functionally dangerous, but it indicates the shared OpenAPI helper still emits misleading endpoint metadata.

---

## 7. Migration and release evidence — **7/20**

This remains the weakest major area.

The migration tracker still records that the shared Supabase schema was synchronised using:

```bash
prisma db push --skip-generate --accept-data-loss
```

and that backup/restore evidence is pending.

That is not equivalent to verified:

```bash
prisma migrate deploy
```

against aligned migration history.

### Required evidence

The halfway gate should require:

1. Remote backup.
2. `prisma migrate status`.
3. Schema and `_prisma_migrations` reconciliation.
4. Restore into a production-like database.
5. Successful `prisma migrate deploy`.
6. Forward-fix or `migrate resolve` documentation where necessary.
7. Restoration verification.

### CI remains incomplete

The scripts exist for:

- Client generation.
- Client typechecking.
- Bruno.
- Coverage.

The CI workflow still does not run them.

The GitHub connector also returned no workflow run or combined status for the current head, so I cannot treat the latest commit as remotely verified.

---

# Tracker accuracy

The hardening tracker remains completely unchecked, including tasks already implemented in code:

- Runtime `201`/`202`.
- HTTP integration test.
- Shared SMS builder.
- Worker-side SMS validation.
- Persisted payload rendering.
- Redemption approval read correction.
- OpenAPI reversal correction.

At the same time, the main Sprint 3 tracker marks all first-half tasks complete, including migration evidence and retry work that are not fully closed.

This should be corrected immediately. The tracker must represent evidence, not intent.

---

# Revised blocker list

## P0

1. **Regenerate the TypeScript client.**
2. **Add client-generation cleanliness to CI.**
3. **Reconcile remote Prisma migration history.**
4. **Complete backup/restore or forward-fix rehearsal evidence.**
5. **Obtain green current-head CI evidence.**

## P1

1. Move completed idempotency replay before mutable card/device checks.
2. Add bounded financial retries to the redemption path.
3. Move approval expiry out of GET requests.
4. Add expiry audit and receipt-state updates.
5. Enforce cashier branch scope on transaction reads.
6. Reject unsupported ledger type/direction combinations.
7. Correct the credit-adjustment-to-credit-lot model.
8. Tie reversal restorations to their original debit.
9. Reconcile the hardening and Sprint 3 trackers.

## P2

1. Batch ledger SMS reads.
2. Inject `RedemptionPolicyService` instead of constructing it directly.
3. Return remaining balance and SMS status from approval execution.
4. Correct endpoint paths in OpenAPI error examples.
5. Replace the mixed earn/redemption read shape with discriminated responses.

---

# Updated release decision

| Decision                            | Status                 |
| ----------------------------------- | ---------------------- |
| Immediate redemption implementation | **Pass**               |
| Pending high-value redemption       | **Pass**               |
| Redemption approval execution       | **Conditional pass**   |
| Redemption SMS contract             | **Pass**               |
| OpenAPI reversal document           | **Pass**               |
| Generated client consistency        | **Fail**               |
| Shared migration safety             | **Fail**               |
| Current-head CI evidence            | **Fail / unavailable** |
| Begin automatic reversals           | **No-go**              |
| Begin manual adjustments            | **No-go**              |
| Halfway production release          | **No-go**              |

## Final assessment

The latest commit fixes the exact OpenAPI document defect identified in the previous review. That is good progress, but it is an **artifact-only correction**, not a broader hardening pass.

The repository remains:

- **Functionally halfway through Sprint 3.**
- **Strong in redemption and approval execution.**
- **Weak in migration evidence and release automation.**
- **Not yet internally consistent across OpenAPI and generated client artifacts.**
- **Not ready to move into reversal or manual-adjustment implementation.**

The next commit should regenerate the client, add client/Bruno/coverage gates to CI, update the trackers honestly and close the shared migration-history evidence before any new financial functionality is started.
