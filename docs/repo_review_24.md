# Deep Repository Review

**Repository:** `micahjatau/shopcity_LP`
**Current head:** `983a420ce74f00c594348a90f375dc2d0972574f` — `docs: record repo review 23 impact`

## Executive verdict

The last three commits are a **substantial improvement**. They correctly address many findings from the earlier reviews:

- Invalid high-value redemptions are validated before database writes.
- Pending receipts no longer record the cashier as approver.
- Prisma uniqueness races are translated into domain errors.
- Financial state-machine constraints have been added.
- FIFO allocation and transaction timeouts are stronger.
- Redemption reads and SMS templates have been expanded.
- OpenAPI, Bruno and generated-client tooling have been introduced.

However, the repository is **not ready to declare its implemented Sprint 3 features complete**. The corrective OpenSpec checklist is fully checked, but the runtime still has several contradictions that the tests do not catch.

The most important conclusion is:

> **Continue the hardening freeze. Do not begin reversal or adjustment implementation yet.**

There are currently three immediate release blockers:

1. Pending redemptions are documented as `202` but have no runtime code that sets `202`.
2. Both confirmed-redemption paths generate SMS payloads that the real provider rejects as invalid.
3. The remote schema was synchronized with `prisma db push --accept-data-loss`, rather than through migration deployment and verified migration history.

### Current maturity estimate

| Area                              | Current maturity |
| --------------------------------- | ---------------: |
| Redemption financial write path   |              85% |
| High-value redemption approval    |              78% |
| FIFO allocation                   |              88% |
| Database integrity                |              80% |
| SMS/outbox reliability            |              60% |
| Transaction reads                 |              58% |
| API contract accuracy             |              55% |
| Test and release evidence         |              50% |
| Reversal boundary                 |              20% |
| Manual adjustment                 |               0% |
| **Implemented-feature hardening** |    **About 70%** |
| **Overall Sprint 3 delivery**     | **About 55–60%** |

The main Sprint 3 tracker remains more accurate than the corrective tracker: reversals, adjustments, complete reads, observability and release gates are still marked incomplete.

---

# What has genuinely improved

## 1. Redemption validation order is now correct

The service now calculates active balance and policy, then calls `assertRedemptionPolicyAllowsRequest()` before creating the receipt, redemption or approval.

Pending receipts now correctly use:

- `captureStatus = PENDING_APPROVAL`
- `reviewStatus = PENDING`
- No reviewer
- No approver
- No approval timestamp

The new unit tests also confirm that invalid high-value requests do not create receipts, approvals, redemptions, SMS rows or outbox events.

## 2. Redemption race classification is materially better

The service now distinguishes:

- Idempotency uniqueness.
- Physical receipt uniqueness.
- Redemption-to-receipt linkage.
- Ledger linkage.
- Approval target conflicts.

The classifier supports Prisma `P2002` metadata and maps recognised collisions into stable domain errors rather than leaking Prisma errors directly.

## 3. Offline redemption control now exists

Redemptions more than 12 hours old or more than five minutes in the future are rejected with `OFFLINE_REDEMPTION_NOT_ALLOWED`.

The service also adds bounded string validation for card numbers, receipt numbers and idempotency keys.

## 4. Database state integrity is stronger

The new migration introduces:

- Redemption lifecycle checks.
- Approval lifecycle checks.
- Commit-time ledger evidence checks.
- Immutable redemption evidence fields.

This is a meaningful move from service-only correctness toward database-enforced financial truth.

## 5. FIFO primitives are stronger

The allocation service now includes:

- Serializable transaction settings.
- A five-second transaction wait limit.
- A fifteen-second transaction timeout.
- Target XOR validation.
- `FOR UPDATE` lot locking.
- Deterministic expiry/earning/ID ordering.

## 6. Read models have improved

Confirmed redemption reads now expose:

- Ledger type and direction.
- Redeemed amount.
- Redemption ID.
- Allocations.
- Restoration evidence.
- Transaction-specific SMS lookup.

Customer ledger items now include redemption and adjustment references, SMS status, allocation details and restoration summaries.

---

# Release blockers

## P0 — Pending redemption responses do not set HTTP 202

The controller documents both `201` and `202`, but the runtime method simply returns the service response. It no longer receives `FastifyReply` or calls `reply.code()`.

The response interceptor only wraps the body; it does not change the HTTP status.

The earning controller shows the correct implementation pattern: it explicitly chooses `202` or `201` based on the response state.

### Impact

A high-value redemption can return:

```http
201 Created
```

with:

```json
{
  "state": "PENDING_APPROVAL"
}
```

This contradicts OpenAPI, frontend expectations and the intended asynchronous approval contract.

### Required change

Restore dynamic status assignment:

```ts
async redeem(
  @Req() request: AuthenticatedRequest,
  @Headers('idempotency-key') idempotencyKey: string | undefined,
  @Body() dto: RedeemTransactionDto,
  @Res({ passthrough: true }) reply: FastifyReply,
) {
  const response = await this.redemptionsService.redeem(
    request.authContext!.user.tenantId,
    request.authContext!,
    idempotencyKey,
    dto,
  );

  reply.code(response.state === 'PENDING_APPROVAL' ? 202 : 201);
  return response;
}
```

Add an actual HTTP integration test. Testing only that OpenAPI contains a `202` response is insufficient.

---

## P0 — Confirmed redemption SMS fails with the real provider

The immediate redemption service creates this payload:

```text
redeemedAmountKobo
```

and omits:

```text
remainingBalanceKobo
```

The approval execution path creates the same incomplete payload.

But the SMS renderer requires all of:

```text
redeemedKobo
remainingBalanceKobo
redemptionId
transactionId
```

The real provider translates missing required fields into a terminal SMS failure.

### Why the tests miss it

The redemption SMS provider test manually constructs a **correct** payload containing `redeemedKobo` and `remainingBalanceKobo`. It does not test the payload created by either transaction service.

The deterministic and sandbox providers return success without rendering or validating the message at all.

Therefore:

- Local deterministic tests pass.
- Sandbox tests pass.
- The real provider rejects the actual transaction-generated payload.
- The message is terminally failed or dead-lettered.

### Required change

Create one typed builder used by both immediate redemption and approval execution:

```ts
type RedemptionConfirmedSmsPayload = {
  version: 1;
  receiptId: string;
  transactionId: string;
  redemptionId: string;
  customerId: string;
  phoneE164: string;
  template: 'redemption-confirmed';
  redeemedKobo: string;
  remainingBalanceKobo: string;
};
```

Calculate the remaining balance before creating the outbox event and use the same builder in both flows.

Template and payload validation should run in the worker **before provider selection**, so deterministic, sandbox and real modes enforce identical payload rules.

Add one integration test that:

1. Executes an actual redemption.
2. Reads the committed outbox payload.
3. Sends that exact payload through `renderSmsMessage()`.
4. Verifies the amount and remaining balance.

---

## P0 — Remote migration history is unsafe

The migration tracker states that the remote Supabase schema was synchronized using:

```bash
npx prisma db push --skip-generate --accept-data-loss
```

rather than `prisma migrate deploy`. Backup/restore evidence is still pending.

`db push` synchronizes schema shape, but it is not equivalent to deploying and recording the migration through the migration workflow. This creates a serious risk that the database schema and `_prisma_migrations` history disagree.

### Possible consequences

- A future `prisma migrate deploy` may attempt to recreate already-existing constraints or triggers.
- Migration status may show migrations as unapplied even though their schema objects exist.
- A new environment may behave differently from the remote environment.
- Drift becomes harder to distinguish from intentional deployment.
- `--accept-data-loss` is unsuitable as routine shared-environment migration evidence.

### Required recovery sequence

1. Freeze further remote schema changes.
2. Take a verified database backup.
3. Run `prisma migrate status` against the remote database.
4. Compare the remote schema with every statement in migrations 21 and 22.
5. Confirm all functions, triggers, constraints, indexes and backfills exist exactly as expected.
6. Only after exact verification, reconcile migration history using an appropriate forward repair or `migrate resolve`.
7. Test `prisma migrate deploy` against a production-like restored copy.
8. Record backup and restore evidence.

Do not begin another schema-heavy workstream until this is resolved.

---

# Database integrity findings

## P1 — Invalid ledger type/direction pairs can still commit

The new commit trigger handles only these combinations:

- `EARN/CREDIT`
- `REDEEM/DEBIT`
- `ADJUSTMENT/CREDIT`
- `ADJUSTMENT/DEBIT`
- `REVERSAL/CREDIT`

It has no final rejection branch. Consequently, unsupported combinations such as `EARN/DEBIT`, `REDEEM/CREDIT` and `REVERSAL/DEBIT` fall through and return successfully without evidence validation.

This is particularly significant because safe earn reversal is intended to create a debit reversal. That debit reversal would currently bypass the reversal evidence logic altogether.

### Required change

Add an explicit ledger-direction constraint or a final exception branch.

The correct rule should be approximately:

```text
EARN       → CREDIT
REDEEM     → DEBIT
ADJUSTMENT → CREDIT or DEBIT, matching Adjustment.kind
REVERSAL   → opposite direction of reversesEntry
```

For reversal, validate:

```text
reversal.direction != original.direction
reversal.amount = original amount or authorised safe amount
reversal.customer = original.customer
```

Add integration tests for every valid and invalid pair.

---

## P1 — Credit adjustment cannot satisfy existing credit-lot constraints

The new financial trigger expects an `ADJUSTMENT/CREDIT` ledger entry to have exactly one credit lot.

However, the existing `validate_credit_lot_source()` trigger requires every credit lot’s source ledger to have:

```text
type = EARN
direction = CREDIT
```

A credit adjustment cannot simultaneously be:

```text
ADJUSTMENT/CREDIT
```

and:

```text
EARN/CREDIT
```

Therefore the planned credit-adjustment implementation cannot commit under the current database model.

### Required design correction

Generalise `CreditLot.earnLedgerEntryId` into a source concept such as:

```text
sourceLedgerEntryId
```

Then allow the source ledger to be:

- `EARN/CREDIT`
- `ADJUSTMENT/CREDIT`

Use an expand-and-contract migration:

1. Add `sourceLedgerEntryId`.
2. Backfill it from `earnLedgerEntryId`.
3. Update application writes and reads.
4. Replace the old source trigger.
5. Deploy and verify.
6. Remove the legacy field only after compatibility is proven.

This must be completed before adjustment work starts.

---

## P1 — Reversal restorations are not tied to the original debit

The reversal trigger validates that:

- `reversesEntryId` exists.
- The source is a debit.
- Customer identities match.
- Restoration totals equal the reversal amount.

It does **not** prove that each restoration belongs to an allocation from the debit referenced by `reversesEntryId`.

A reversal could theoretically:

- Claim to reverse debit A.
- Restore allocation rows belonging to debit B.
- Pass if customer and total amount happen to match.

### Required constraint

For every `AllocationRestoration`, enforce:

```text
restoration.reversalLedgerEntry.reversesEntryId
=
restoration.allocation.redemptionLedgerEntryId
```

Also verify that all restorations attached to one reversal originate from the same original debit.

---

## P1 — Earn-reversal allocation evidence has no valid target shape

`RedemptionAllocation` currently requires exactly one of:

- `redemptionId`
- `adjustmentId`

There is no reversal target.

But Sprint 3 task 6.2 expects earn reversal to consume the remaining original credit lot through allocation-backed debit evidence.

A `REVERSAL/DEBIT` allocation cannot currently be represented honestly without pretending it belongs to a redemption or adjustment.

### Recommended model

Rename:

```text
redemptionLedgerEntryId
```

to:

```text
debitLedgerEntryId
```

Then enforce target rules based on the debit ledger type:

| Debit ledger type | Required aggregate                                      |
| ----------------- | ------------------------------------------------------- |
| `REDEEM`          | `redemptionId`                                          |
| `ADJUSTMENT`      | `adjustmentId`                                          |
| `REVERSAL`        | Neither; `reversesEntryId` identifies the original earn |

A dedicated `Reversal` aggregate is another option, but it may be unnecessary because the ADR already treats the ledger entry as confirmed transaction identity.

---

## P2 — State-machine constraints remain incomplete

The new state constraints are useful but still permit semantically inconsistent timestamps.

Examples:

- `CONFIRMED` does not explicitly require `reversedAt IS NULL`.
- `REJECTED` does not explicitly require `confirmedAt IS NULL`.
- `EXPIRED` does not have an `expiredAt` field.
- `REVERSED` does not explicitly require `rejectedAt IS NULL`.
- Approval `EXPIRED` does not enforce that decision actor fields are both null or both populated.

Add `expiredAt` and make every state enumerate all permitted and forbidden lifecycle fields.

---

# Approval workflow findings

## P1 — Approval expiry is performed as a side effect of GET

`listApprovals()` calls `expireOverdueApprovals()` before reading the list.

That helper:

- Selects every overdue approval.
- Locks them.
- Mutates their status.
- Mutates redemption state.
- Does not create an audit event.
- Does not consistently update receipt review state.
- Has no batch limit.

This means a read request performs potentially large financial workflow writes.

### Operational problems

- A supervisor opening the approval list becomes the accidental expiry worker.
- A large overdue backlog can make the GET endpoint slow.
- Expiry does not happen if nobody opens the list.
- Expiry events are not audited.
- Earn receipts may remain pending after their approval expires.
- Redemption receipts may also remain `PENDING` after the redemption becomes `EXPIRED`.

### Required change

Move expiry into a dedicated worker:

```text
ApprovalExpiryWorker
  SELECT ... FOR UPDATE SKIP LOCKED
  LIMIT 100
```

For each expiry:

- Mark approval expired.
- Mark the target redemption or receipt consistently.
- Set `expiredAt`.
- Record a system audit event.
- Emit metrics.
- Commit atomically.

Add an index on:

```text
Approval(tenantId, status, expiresAt)
```

The current approval index uses `requestedAt`, not `expiresAt`.

A lazy defensive expiry check can remain, but the GET endpoint should not be the primary scheduler.

---

## P1 — Approval locking uses a stale pre-lock object

The service first reads the approval and its associated state, then locks the approval, redemption and receipt rows.

After acquiring the locks, it continues using the object fetched **before** the lock rather than re-reading the locked rows. The conditional updates provide some protection, but the eligibility checks can still be based on stale card, customer, device or branch data.

### Required change

Inside one transaction:

1. Lock approval by ID.
2. Lock the target redemption and receipt.
3. Lock or re-read customer, card, device and branch.
4. Fetch the complete aggregate after locks are held.
5. Revalidate status and eligibility.
6. Execute.

Continue using conditional `updateMany()` transitions as an additional guard.

---

## P1 — Approval execution bypasses dependency injection

Approval execution creates a new policy service directly:

```ts
new RedemptionPolicyService(this.configService);
```

Although it uses the shared implementation, this bypasses the Nest dependency graph and makes testing, clock injection and future policy dependencies harder.

Inject `RedemptionPolicyService` into `LoyaltyService` or move redemption approval execution into a dedicated service.

---

## P1 — Approval response omits post-transaction state

`ApprovalDecisionResponse` now exposes redeemed amount but no longer includes:

- Remaining balance.
- SMS status.
- Allocation summary.

The service also creates the SMS intent before computing any post-redemption balance.

Restore:

```text
remainingBalanceKobo
smsStatus
allocationCount or allocations
```

This lets the frontend display a completed approval without immediately issuing more reads.

---

## P2 — Expiry uses two conflicting semantics

Decision-time expiry sets the redemption to `EXPIRED` but writes `rejectedAt`.

Lazy expiry sets the redemption to `EXPIRED` while explicitly leaving `rejectedAt` null.

Add `expiredAt` and use one expiry implementation for both paths.

---

# Idempotency and reliability findings

## P1 — Idempotency replay happens after mutable eligibility checks

The service validates the current device, branch, card and customer before checking for a completed idempotency record.

This means:

1. A redemption commits successfully.
2. The card is later blocked or device disabled.
3. The client retries the same key and payload.
4. Instead of receiving the original committed response, the retry may receive `CARD_NOT_FOUND` or `DEVICE_NOT_ACTIVE`.

That violates the expected meaning of a completed idempotent request.

### Required change

After normalising and hashing the request:

1. Query the idempotency record first.
2. Return a matching completed response immediately.
3. Reject a different hash.
4. Only then validate current eligibility for a new request.

The replay record should remain authoritative for already-completed operations.

---

## P1 — Redemption no longer performs bounded serialisation retries

The immediate redemption path runs one serializable transaction. On a `P2034` conflict it checks for replay and otherwise returns `REDEMPTION_TRANSACTION_CONFLICT`; it does not retry the transaction.

The earn workflow still retries recognised serialisation conflicts up to a bounded number of attempts.

Restore bounded retries around the full redemption transaction. Keep `P2002` normalisation outside the retry loop because uniqueness conflicts should be classified, not blindly retried.

---

## P1 — Database dependency failures become generic 500s

Unrecognised Prisma errors are rethrown by the redemption service.

The global filter turns non-HTTP exceptions into a `500 SYSTEM_ERROR`, not the documented `503 DEPENDENCY_UNAVAILABLE`.

Classify database connection and timeout errors into stable dependency failures.

---

## P2 — Conflict receipt lookup is too broad

After a serialisation conflict, the fallback receipt lookup uses only:

```text
tenantId
normalizedPosReceiptNumber
```

It omits:

- Branch ID.
- Receipt week start.

A receipt with the same number in another branch or week can be incorrectly reported as the conflicting receipt.

Use the complete physical receipt identity.

---

## P2 — P2002 classification depends heavily on metadata shape

The classifier requires `error.meta.target` to contain expected field names.

Add coverage for:

- Array metadata.
- Constraint-name string metadata.
- Prisma versions returning model/constraint-specific names.
- Missing metadata.

When a `P2002` cannot be confidently classified, return a stable financial conflict rather than a raw 500.

---

# Transaction read and authorization findings

## P1 — Cashiers can read any tenant transaction

The transaction endpoint permits cashiers, supervisors and admins, but passes only `tenantId` and transaction ID to the service.

The service filters only by:

```text
tenantId
transactionId
```

It does not apply cashier branch scope.

A cashier who obtains another branch’s transaction UUID can read it.

### Required change

Pass `AuthContext` to the read service.

Suggested policy:

- Cashier: own branch only.
- Supervisor: assigned branch or permitted branch set.
- Admin: tenant-wide.

Add cross-branch authorization tests.

---

## P1 — Redemption approval is still missing from transaction lookup

The read query includes:

```text
receipt.approvals
redemption
```

but not:

```text
redemption.approval
```

It then chooses only `receipt.approvals[0]`.

Because REDEEM approvals are linked to `redemptionId`, a transaction created through approval execution will likely return:

```text
approvalId = null
approvalStatus = null
```

even though an executed approval exists.

Include:

```ts
redemption: {
  include: {
    approval: true;
  }
}
```

Then resolve approval by transaction type.

---

## P1 — The transaction response is not truly discriminated

The OpenAPI schema claims support for:

- `EARN`
- `REDEEM`
- `ADJUSTMENT`
- `REVERSAL`

but still requires receipt-specific and earn-oriented fields such as card serial number, purchase amount, capture status, review status and `creditKobo`.

The service still rejects transactions without a receipt as `UNSUPPORTED_TRANSACTION_TYPE`.

Create an actual OpenAPI `oneOf` union:

```text
EarnTransactionResponse
RedeemTransactionResponse
AdjustmentTransactionResponse
ReversalTransactionResponse
```

Each shape should contain common ledger fields plus type-specific evidence.

---

## P1 — OpenAPI requires a field the runtime omits

The nested ledger OpenAPI schema requires `smsStatus`.

The nested ledger returned by `getTransaction()` does not include `smsStatus`; it appears only at the top level.

Either:

- Add nested `smsStatus`, or
- Remove it from the nested schema.

The generated client is currently based on a response contract that runtime does not fully satisfy.

---

## P2 — Customer ledger has an N+1 SMS lookup

For every ledger entry, the service separately calls `findTransactionSmsMessage()`.

That helper may perform up to three sequential queries:

1. Ledger entry.
2. Redemption.
3. Receipt.

A page of 50 ledger entries could result in more than 100 additional queries.

Batch-load SMS messages using all page ledger, redemption and receipt IDs, then resolve ownership in memory.

---

# Reversal boundary findings

## P1 — The reversal route is publicly active but can never succeed

`ReversalsModule` remains registered in the application and registers its controller.

The controller advertises a `201 Transaction reversal processed` response.

The service:

- Returns `Promise<never>`.
- Does not look up the transaction.
- Does not validate transaction type or status.
- Does not create a ledger effect.
- Does not audit the request.
- Stores an idempotency result.
- Always throws `REVERSAL_REVIEW_REQUIRED`.

It accepts even a nonexistent transaction ID and records it as a completed review-required operation.

The committed OpenAPI artifact inspected moves from the redemption endpoint to public configuration and does not expose the active reversal route, creating further runtime/contract drift.

### Required change

Until financial reversal exists, remove `ReversalsController` from module registration or gate it behind:

```text
REVERSALS_ENABLED=false
```

Keep the internal planning service and DTOs if useful, but do not expose an endpoint that promises an impossible success response.

---

# SMS and outbox findings

## P1 — Template validation depends on provider mode

The worker reads a free-form template string from the database and casts it to `SmsTemplate`.

When reconstructing an SMS message, it validates only that the template is non-empty, not that it is supported or that its payload matches the template schema.

Consequences:

- Deterministic provider accepts malformed payloads.
- Sandbox accepts malformed payloads.
- Real provider rejects malformed payloads.
- Environment changes alter correctness rather than only delivery behaviour.

Create:

```ts
validateSmsIntent(template, payload);
```

and call it before every provider.

## P2 — Future templates are placeholders, not completed templates

`transaction-reversed` and `balance-adjusted` currently produce messages based largely on receipt ID. For receiptless transactions they produce text such as “transaction unknown.”

These are scaffolds and should remain marked incomplete in Sprint 3 task 9.2.

## P2 — Historical SMS backfill can fail on malformed payload IDs

The backfill copies JSON values directly into foreign-key-constrained columns.

If a historical payload contains a stale or malformed ID, the entire migration can fail.

Use joins or `EXISTS` checks so only valid tenant-scoped references are copied. Record the count of skipped invalid references.

---

# Testing and CI findings

## Strong additions

The repository now has tests for:

- Invalid high-value request ordering.
- Zero balance and basket cap.
- Offline timestamp rejection.
- P2002 classifications.
- Financial lifecycle constraints.
- Redemption SMS rendering.
- SMS provider idempotency.

## Important gaps

### No HTTP test catches the 201/202 regression

The OpenAPI integration suite primarily inspects generated document schemas. It does not execute the redemption endpoint and inspect the actual status code.

Add end-to-end tests asserting:

```text
Immediate redemption → 201
Pending approval     → 202
Idempotency replay   → original status
```

### Financial invariant coverage is too narrow

The new invariant suite tests only:

- One invalid redemption lifecycle.
- One invalid approval lifecycle.
- One orphan redeem ledger.
- One redemption evidence mutation.

It does not cover:

- Every invalid ledger type/direction pair.
- Credit adjustment lot creation.
- Reversal-to-original-allocation linkage.
- Every redemption lifecycle state.
- Every approval lifecycle state.
- Invalid restoration ownership.
- One reversal per original transaction.

### CI does not run newly introduced release gates

Scripts now exist for:

- Client generation.
- Client typechecking.
- Bruno.
- Coverage.

But CI still runs only static checks, normal unit tests, OpenAPI, E2E and integration. It does not run client generation/typechecking, Bruno or coverage.

Current-head workflow evidence was also not returned by the connector.

### Coverage targets remain below the TRD target

Current branch thresholds are:

- Redemption: 55%.
- Approvals: 15%.
- Allocation: 80%.
- Outbox: 40%.

These should be incremental temporary thresholds, not completion gates for financial workflows.

---

# Architecture and maintainability

## LoyaltyService is carrying too many responsibilities

`LoyaltyService` currently owns:

- Earning transactions.
- Transaction lookup.
- Customer ledger.
- Approval listing.
- Approval expiry.
- Earn approval execution.
- Redemption approval execution.
- SMS intent creation.
- Policy helper logic.
- Pagination and read mapping.

Split it before adding reversal and adjustments:

```text
EarnTransactionService
TransactionReadService
ApprovalQueryService
EarnApprovalExecutor
RedemptionApprovalExecutor
ApprovalExpiryWorker
FinancialNotificationFactory
```

This reduces the chance that adjustment or reversal work regresses earning.

## Clock abstraction is not actually integrated

`Clock`, `SystemClock` and `FixedClock` have been added.

But financial services still use `new Date()` and `Date.now()` directly, while tests continue spying on global time.

Either integrate the clock through dependency injection or remove the unused abstraction. For approval expiry, lot eligibility, receipt timestamps and idempotency TTLs, an injected clock is worthwhile.

---

# Recommended remediation sequence

## Phase 0 — Immediate release blockers

Complete before any additional feature work:

1. Restore runtime `202` for pending redemptions.
2. Create one typed redemption SMS payload builder.
3. Include remaining balance in both redemption SMS paths.
4. Validate SMS templates before provider invocation.
5. Add real HTTP `201/202` tests.
6. Freeze remote schema changes and reconcile Prisma migration history.
7. Disable the public reversal route.

## Phase 1 — Database closure

1. Reject invalid ledger type/direction combinations.
2. Generalise credit-lot source from earn-only to credit-source ledger.
3. Define allocation representation for `REVERSAL/DEBIT`.
4. Link restorations to the debit referenced by `reversesEntryId`.
5. Complete redemption and approval state constraints.
6. Add `expiredAt`.
7. Harden SMS-reference backfill.
8. Add exhaustive PostgreSQL tests.

## Phase 2 — Approval lifecycle

1. Move expiry out of `GET /approvals`.
2. Add batched expiry worker and expiry index.
3. Record system audit events for expiry.
4. Update receipt state consistently.
5. Lock and re-read approval aggregate after locks.
6. Inject the policy service.
7. Use shared transaction timeout/retry policy.
8. Restore remaining balance and SMS status in decision responses.

## Phase 3 — Idempotency, reads and authorization

1. Resolve completed idempotency records before mutable eligibility checks.
2. Restore bounded serialisation retries.
3. Use the full branch/week receipt identity after conflicts.
4. Map Prisma connectivity failures to `DEPENDENCY_UNAVAILABLE`.
5. Pass actor context into transaction reads.
6. Enforce cashier branch scope.
7. Load redemption approvals through `redemption.approval`.
8. Create true discriminated transaction response types.
9. Fix nested OpenAPI/runtime mismatches.
10. Batch SMS reads for ledger pages.

## Phase 4 — Release evidence

Add these CI gates:

```text
npm run test:cov
npm run client:generate
git diff --exit-code -- client/shopcity-client.ts
npm run client:typecheck
npm run bruno:test
npm run test:e2e
npm run test:integration
```

Then obtain:

- Green current-head GitHub Actions evidence.
- Clean `prisma migrate status`.
- Shared staging `migrate deploy`.
- Backup and restore evidence.
- Real-provider redemption SMS smoke test.
- Pending approval `202` smoke test.
- OpenAPI/runtime route parity.

---

# Exit gate before continuing Sprint 3

Do not begin reversal or manual adjustment work until all of these are true:

- Pending redemption returns actual HTTP `202`.
- Immediate redemption returns actual HTTP `201`.
- Actual transaction-generated SMS payload passes the real renderer.
- Remaining balance is present in redemption SMS.
- Remote Prisma migration history is reconciled.
- Invalid ledger direction/type pairs fail at commit.
- Credit adjustments can legally create credit lots.
- Earn reversals have a valid allocation evidence model.
- Restoration rows are tied to the original debit.
- Expiry runs independently of GET requests.
- Expiry is audited and has a proper `expiredAt`.
- Completed idempotency replay bypasses later card/device state changes.
- Redemption serialisation conflicts receive bounded retries.
- Cashier transaction reads are branch-scoped.
- Redemption reads expose their approval.
- Runtime responses match generated OpenAPI.
- Reversal route is disabled until it can succeed.
- Client, Bruno, coverage and migration gates run in CI.
- Backup/restore evidence is recorded.

## Release decision

| Capability                                  | Decision                                           |
| ------------------------------------------- | -------------------------------------------------- |
| Continue focused hardening                  | **Go**                                             |
| Add more Sprint 3 features                  | **No-go**                                          |
| Immediate redemption pilot                  | **No-go until SMS and migration issues are fixed** |
| High-value redemption approval pilot        | **No-go until HTTP 202, SMS and expiry are fixed** |
| Frontend integration with pending approvals | **No-go due runtime status mismatch**              |
| Reversal endpoint                           | **Disable**                                        |
| Manual adjustments                          | **Do not start**                                   |
| Sprint 3 closure                            | **No-go**                                          |

The financial core is becoming credible, but the repository currently demonstrates an important pattern: **individual layers look complete in isolation while cross-layer integration remains inconsistent**. The next hardening pass should concentrate specifically on end-to-end assertions—service output → database evidence → outbox payload → provider rendering → HTTP status → generated client—before any new financial workflow is added.
