# Sprint 3 Halfway Review

**Repository:** `micahjatau/shopcity_LP`
**Current head:** `4b425a88c44e6455adb5c6959688a8205580989a` — `fix: complete repo review 24 hardening`
The two preceding commits restore OpenAPI compatibility and stabilise CI artifacts.

## Verdict

The repository has **genuinely reached the functional halfway point of Sprint 3**, but it has **not yet passed the halfway release gate**.

### Grades

| Measurement                                  |             Grade |
| -------------------------------------------- | ----------------: |
| Raw Sprint 3 checklist                       | **29/55 — 52.7%** |
| Quality-adjusted overall Sprint 3 progress   |           **57%** |
| Quality of the completed first half          |    **82/100 — B** |
| Production readiness of the first-half scope |     **About 65%** |

The main tracker marks planning, schema, financial primitives, redemption and approval execution as complete, plus the reversal route boundary. Reversal execution, adjustments, complete reads, observability and final release gates remain unfinished.

The distinction is important:

- **Implementation scope:** roughly halfway.
- **Reliability and release evidence:** behind the implementation.
- **Production deployment:** still no-go.

---

# Progress since the previous review

## 1. Runtime `201`/`202` behaviour is fixed

The redemption controller now receives `FastifyReply` and explicitly returns:

- `202` for `PENDING_APPROVAL`
- `201` for `CONFIRMED`

There is now a real HTTP integration test using PostgreSQL, Redis, authentication and an attested cashier device. It proves that a high-value request returns `202` and a normal redemption returns `201`.

**Previous blocker: closed.**

## 2. Redemption SMS payloads are now coherent

A typed `RedemptionConfirmedSmsPayload` has been added with:

- `redeemedKobo`
- `remainingBalanceKobo`
- Transaction and redemption IDs
- Receipt, customer and telephone references

Both immediate redemption and approval execution now use the shared builder after recalculating the committed remaining balance.

The worker validates the payload before calling any provider, so deterministic, sandbox and real modes now share the same validation boundary.

The PostgreSQL approval integration test reads the committed SMS row and renders the actual persisted payload, confirming both the redeemed amount and remaining balance.

**Previous production SMS blocker: substantially closed.**

## 3. Redemption transaction reads now find their approval

The transaction query now loads `redemption.approval`, and approval selection prioritises the redemption-linked approval before receipt-linked earning approvals.

The approval integration test confirms that the resulting transaction exposes the redemption, debit amount and FIFO allocation.

**Previous missing-approval defect: closed.**

## 4. The hardening plan is clearer

The new review specification correctly states that this phase is a hardening gate—not reversal or adjustment feature expansion—and explicitly blocks broader work until runtime, SMS, migration and release evidence are trustworthy.

This is the correct development direction.

---

# Halfway milestone grading

## 1. Planning and architecture — **9/10**

The first-half architecture is well defined:

- Generic financial ledger.
- Redemption aggregate.
- Immutable FIFO allocations.
- Generic approval targets.
- Outbox and SMS ownership.
- Explicit hardening gate.

The OpenSpec design also correctly prioritises runtime truth over superficial feature expansion.

The deduction is because the new hardening task tracker remains entirely unchecked even though several tasks are already implemented.

That makes the planning evidence less trustworthy than the code.

## 2. Schema and migration foundation — **15/20**

The schema foundation is strong enough for the redemption and approval half of the sprint:

- Redemption intent and lifecycle.
- Allocation and restoration evidence.
- Generic approval targets.
- SMS transaction references.
- Deferred PostgreSQL financial constraints.
- Fresh migration deployment coverage.

However, the migration tracker still records that the remote Supabase schema was synchronised with:

```bash
prisma db push --skip-generate --accept-data-loss
```

and that backup/restore evidence remains pending.

This means task 2.8 in the primary Sprint 3 tracker is marked complete despite shared-environment migration history still being unresolved. The repository itself acknowledges that deployable migration history and disaster-recovery evidence are outstanding.

This is the largest remaining halfway blocker.

## 3. Shared financial primitives — **12/15**

The FIFO foundation is mature:

- Serializable transactions.
- Row locking.
- Conditional balance decrements.
- Deterministic allocation ordering.
- Restoration planning.
- Active-balance recalculation.

However, the redemption service still executes one serializable transaction and, after a financial conflict, returns a replay or `REDEMPTION_TRANSACTION_CONFLICT`. There is no visible bounded retry loop around the redemption transaction.

This makes the checked task for bounded serialization/deadlock retry support only partially true for the actual redemption path.

## 4. Immediate and pending redemption — **23/25**

This is now the strongest Sprint 3 area.

Completed well:

- Authentication and device context.
- Explicit rate limiting.
- Timestamp enforcement.
- Minimum amount, basket cap and active-balance validation.
- Correct validation-before-write ordering.
- Correct pending receipt state.
- Immediate debit ledger creation.
- FIFO allocation and lot decrement.
- Audit, outbox, SMS and idempotency.
- True `201`/`202` HTTP outcomes.
- Real PostgreSQL HTTP coverage.

The service validates policy before creating financial evidence, and pending requests create approval evidence without a ledger, allocation or SMS effect.

### Remaining deductions

Completed idempotency replay is still checked only after querying and validating the current device, branch, card and customer.

Therefore, a previously completed request may fail to replay if the card or device becomes inactive before the client retries. A completed idempotency response should normally be resolved before mutable eligibility checks.

Also, the post-conflict duplicate receipt lookup still uses only tenant and normalised receipt number, omitting branch and receipt week.

## 5. Approval execution — **17/20**

The approval workflow now has credible depth:

- Typed earn/redemption targets.
- Self-approval prevention.
- Approval expiry checks.
- Current policy reapplication.
- FIFO allocation on execution.
- Conditional transitions.
- Rejection with no financial effect.
- PostgreSQL concurrency tests.
- Transaction reads tied to the correct approval.

The real integration flow proves creation, listing, execution, allocation, balance reduction, SMS persistence and transaction lookup.

### Remaining issues

Approval listing still expires overdue approvals as a side effect of the GET workflow.

The expiry helper:

- Has no batch limit.
- Mutates financial workflow state during a read.
- Does not create an expiry audit event.
- Does not consistently update the receipt.
- Depends on someone opening the approval list.

It should become a scheduled, bounded worker with `FOR UPDATE SKIP LOCKED`, audit events and consistent target/receipt transitions.

Approval execution also constructs `RedemptionPolicyService` directly rather than injecting it, and the successful approval response still omits the recalculated remaining balance and SMS status.

## 6. Verification and release evidence — **6/10**

Good additions:

- Real HTTP `201`/`202` coverage.
- Real persisted SMS rendering.
- PostgreSQL approval workflow tests.
- Generated client configuration.
- Stronger OpenAPI assertions.

But the current repository contains a serious contract contradiction.

The OpenAPI test states that the reversal endpoint must have **no `201` response**.

The committed OpenAPI artifact still contains:

```json
"201": {
  "description": "Transaction reversal processed"
}
```

The generated client also gained a reversal `201` response type in the current commit, while the actual service returns `Promise<never>` and always throws `REVERSAL_REVIEW_REQUIRED`.

This is precisely the cross-layer mismatch the hardening change was supposed to eliminate.

CI runs the unit tests, OpenAPI generation, lint/diff and a generated-artifact cleanliness check.

Because the test and committed artifact disagree, the current head would **likely fail at least one OpenAPI verification step**. No current-head workflow run was returned, so there is no remote green evidence to resolve the contradiction.

---

# Current blockers by severity

## P0 — OpenAPI reversal contract is internally contradictory

The controller removed the explicit success decorator, but Nest Swagger still supplies the default `201` response for a POST endpoint. The committed specification therefore continues to advertise a successful reversal that the service cannot produce.

### Correction

Choose one of these:

1. Remove the controller from the module until reversals are implemented.
2. Hide the endpoint from Swagger with `@ApiExcludeEndpoint()`.
3. Replace it with an explicitly unavailable endpoint whose runtime and OpenAPI contract both use a non-success response.

Simply removing `@apiSuccessEnvelopeResponse()` is not enough.

## P0 — Shared migration history is not reconciled

The database shape may be correct, but `_prisma_migrations`, deployability and recovery evidence remain unresolved.

The halfway gate should not pass until:

- A remote backup exists.
- Migration status is documented.
- A restored production-like copy accepts `prisma migrate deploy`.
- Existing triggers and constraints are compared against migration history.
- Any drift is resolved through a controlled forward fix or `migrate resolve`.

## P1 — Main tracker overstates completion

The primary Sprint 3 tracker claims all first-half migration, retry, expiry and evidence tasks are complete.

The new hardening tracker correctly lists the remaining work—but all entries remain unchecked, including tasks already completed in code.

The two trackers should be reconciled so there is one authoritative state.

## P1 — Completed idempotency responses are not replayed early enough

Mutable device/card/customer validation occurs before the service checks the existing completed idempotency record.

Move completed replay resolution immediately after request normalisation and hashing.

## P1 — Approval expiry remains request-driven

Expiry is still triggered by reading the approval list rather than by a dedicated worker.

This is operationally fragile but does not invalidate the core approval execution flow.

## P1 — Transaction reads remain only partially discriminated

The read model now correctly finds redemption approvals and allocations, but it still requires a receipt and rejects receiptless reversal or adjustment transactions as unsupported.

This is acceptable at the halfway point, provided section 8 remains unchecked—which it does.

## P1 — Cashier transaction reads are tenant-wide

Cashiers are authorised for the transaction endpoint, but the controller passes only tenant ID and transaction ID. No actor or branch scope reaches the service.

Before frontend rollout, cashier reads should be restricted to their branch or to transactions they created.

---

# Halfway exit-gate decision

| Halfway capability                   | Decision                             |
| ------------------------------------ | ------------------------------------ |
| Planning and schema design           | **Pass**                             |
| Immediate redemption logic           | **Pass with minor reliability work** |
| High-value pending redemption        | **Pass**                             |
| Approval execution and rejection     | **Conditional pass**                 |
| FIFO and balance integrity           | **Pass for redemption scope**        |
| Redemption SMS payload               | **Pass**                             |
| Runtime `201`/`202` contract         | **Pass**                             |
| Transaction redemption lookup        | **Pass for current scope**           |
| OpenAPI/client consistency           | **Fail**                             |
| Shared migration deployment evidence | **Fail**                             |
| Current-head CI evidence             | **Fail / unavailable**               |
| Production halfway release           | **No-go**                            |
| Begin reversal implementation        | **No-go**                            |
| Begin manual adjustments             | **No-go**                            |

# Recommended next sequence

1. Fix the reversal OpenAPI contract and regenerate the client.
2. Run the OpenAPI test and prove the committed artifact is clean.
3. Reconcile migration history and complete backup/restore evidence.
4. Resolve completed idempotency records before mutable entity validation.
5. Add bounded retry handling around redemption serialization conflicts.
6. Move approval expiry into a bounded worker with audit events.
7. Add branch-scoped transaction-read authorization.
8. Run and record green current-head CI.
9. Update both OpenSpec task trackers honestly.
10. Only then begin safe redemption reversal work.

## Final assessment

**Sprint 3 is truly at the halfway implementation point.** The first-half business workflow is no longer superficial: redemption and approval execution are functioning, concurrency-aware and backed by real PostgreSQL tests.

The project is not behind on functionality. It is behind on **release truth**:

- Migration history.
- OpenAPI/client consistency.
- CI evidence.
- A few lifecycle and idempotency edge cases.

That is why the first-half implementation earns **82/100**, while production readiness remains closer to **65%**.
