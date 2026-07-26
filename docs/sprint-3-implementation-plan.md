# ShopCity Loyalty Platform — Sprint 3 Implementation Plan

**Sprint:** 3 — Redemption and Approvals  
**Status:** Proposed implementation baseline  
**Prepared for:** ShopCity / Radar Solutions  
**Repository baseline:** `01b1a5a40ceebc75ba5bef478bbf7d63a3d0caff`  
**Primary exit gate:** Concurrent redemption cannot produce a negative or overstated balance, FIFO allocation is reproducible from immutable records, and approval/reversal journeys pass end-to-end.

---

## 1. Executive summary

Sprint 3 converts the Sprint 2 earn-only ledger into a two-sided store-credit system.

Sprint 2 delivered the authoritative earn path, immutable receipt evidence, append-only credit ledger entries, expiry-aware credit lots, approval execution for controlled earns, idempotency, transactional SMS intent and a recoverable outbox worker. Sprint 3 must preserve those guarantees while adding controlled debit operations.

The sprint delivers:

1. Online redemption against the authoritative active balance.
2. Earliest-expiry-first credit-lot allocation.
3. Concurrency controls that prevent double-spend and negative balances.
4. Supervisor approval for high-value redemption.
5. Compensating reversals without editing confirmed ledger history.
6. Admin manual credit/debit adjustments with mandatory reasons.
7. Transaction and ledger responses that expose allocation and reversal history.
8. SMS, audit and idempotency behaviour for every financial operation.
9. Database, HTTP, contract and concurrency tests proving the financial invariants.

This sprint does **not** implement offline redemption, fraud dashboards, scheduled expiry jobs or full reporting. Those remain later-phase concerns, although the Sprint 3 schema and contracts must not block them.

---

## 2. Current baseline and constraints

### 2.1 Sprint 2 capabilities to preserve

The following current behaviour is a non-regression baseline:

- `POST /api/v1/transactions/earn` is the canonical earn command.
- All monetary values are integer kobo.
- Receipt identity is unique per tenant, branch, receipt week and normalised receipt number.
- Confirmed ledger entries cannot be updated or deleted.
- Credit-lot source fields, expiry and deletion are database-protected.
- Earn creation, credit lot, audit, idempotency, outbox and SMS intent commit atomically.
- Approval execution uses a serializable transaction and creates the financial effect once.
- Active balance includes only positive, unexpired credit lots.
- SMS delivery failure cannot invalidate a financial transaction.
- API and worker production entrypoints are separately verified.

### 2.2 Current schema limitations Sprint 3 must resolve

At the current baseline:

- `LedgerEntryType` supports only `EARN`.
- `LedgerEntryDirection` supports only `CREDIT`.
- `LoyaltyLedgerEntry.receiptId` is required and globally unique.
- `Approval` is bound to a receipt and cannot yet target a redemption.
- `CreditLot.remainingAmountKobo` is temporarily immutable.
- There is no redemption aggregate or allocation table.
- There is no generic debit-allocation engine.
- Reversal linkage exists, but reversal execution does not.
- There is no manual-adjustment aggregate or API.

Sprint 3 must evolve these structures through additive, deploy-safe migrations. Existing Sprint 2 ledger and credit-lot records must remain valid without rewriting financial history.

---

## 3. Sprint objective and success criteria

### 3.1 Objective

Implement a server-authoritative redemption, reversal and adjustment workflow that consumes or restores expiry-aware credit lots under transaction-level locking while keeping every financial effect append-only, idempotent and auditable.

### 3.2 Business outcomes

At sprint completion:

- A cashier can redeem an eligible amount during an online checkout.
- The backend derives the usable balance and maximum allowed redemption.
- Credit is consumed from the earliest-expiring lots first.
- A high-value redemption creates a pending approval with no financial effect.
- A different supervisor/admin can approve or reject the redemption.
- An approved redemption executes once under current policy and balance.
- A supervisor/admin can reverse a safe confirmed transaction through compensating entries.
- Unsafe reversals return `REVERSAL_REVIEW_REQUIRED` rather than guessing.
- An admin can create documented manual credit or debit adjustments.
- Customer balance and transaction history remain reconstructable from ledger entries, lots and allocations.

### 3.3 Exit gate

Sprint 3 closes only when all of the following are true:

- Two concurrent redemptions cannot consume more than the active balance.
- FIFO allocation is deterministic and database-backed.
- Expired, depleted and same-purchase-ineligible lots are not consumed.
- Pending approval creates no ledger entry, allocation, balance mutation, outbox or SMS effect.
- Approval execution revalidates the current balance, lot eligibility and policy.
- Repeated requests with the same idempotency key return the original response.
- Reversal and adjustment effects use compensating entries; confirmed history is never edited.
- Allocation and lot-balance invariants are protected by integration tests and database constraints/triggers.
- Unit, integration, HTTP, migration, OpenAPI, architecture, lint, typecheck and build gates pass in visible CI.

---

## 4. Policy decisions and initial defaults

The implementation should make policy configurable and use the TRD-recommended defaults until ShopCity confirms alternatives.

| Policy | Initial default | Enforcement point |
|---|---:|---|
| Minimum redemption | NGN 500 | Redemption policy service inside the financial transaction |
| Maximum redemption | 30% of basket amount | Redemption policy service inside the financial transaction |
| High-value redemption approval | Above NGN 5,000 | Redemption command before financial execution |
| Same-purchase redemption | Prohibited | Receipt/lot eligibility query |
| Offline redemption | Prohibited | API and application policy |
| Redemption amount | Smaller of requested amount, active balance and basket cap | Server calculation |
| FIFO order | Earliest `expiresAt`, then `earnedAt`, then lot ID | Locked database query |
| Reversal role | Supervisor/Admin | RBAC and application policy |
| Manual adjustment role | Admin only | RBAC and application policy |
| Manual credit adjustment expiry | 12 months from adjustment by default | Adjustment policy |
| Decision reason | Required | DTO validation and database non-null fields |

Required environment/configuration keys:

- `MIN_REDEMPTION_KOBO`
- `MAX_REDEMPTION_BASKET_PERCENT`
- `REDEMPTION_APPROVAL_THRESHOLD_KOBO`
- `ADJUSTMENT_CREDIT_EXPIRY_MONTHS` with default `12`

The public configuration endpoint must expose only frontend-safe values.

---

## 5. Scope

### 5.1 In scope

- Redemption schema and domain model.
- FIFO lot selection and allocation persistence.
- Credit-lot controlled balance mutation.
- Redemption receipt evidence and weekly duplicate protection.
- Immediate and approval-dependent redemption.
- Generic approval target support for earn and redemption.
- Redemption transaction lookup.
- Safe reversal of earn and redemption transactions.
- Manual credit and debit adjustment.
- Idempotency for redeem, reverse and adjustment commands.
- SMS intent and templates for redemption, reversal and adjustment.
- Audit events and stable domain error codes.
- OpenAPI, Bruno and generated-client contract updates.
- Unit, database integration, HTTP and concurrency tests.
- Migration and upgrade-path verification.

### 5.2 Explicitly out of scope

- Offline redemption.
- Scheduled credit expiry and expiry reminders.
- Fraud evaluation queues and fraud-review UI.
- Executive reporting and materialized report views.
- Item-level redemption exclusions.
- Direct POS integration.
- Customer self-service redemption.
- Automatic reversal when the original credit has already been partially consumed and restoration cannot be proven safe.

---

## 6. Architecture decisions

### 6.1 Keep the modular monolith

Sprint 3 remains inside the NestJS modular monolith. Do not create a redemption microservice.

Recommended module boundaries:

```text
src/modules/redemptions/
  redemptions.module.ts
  redemptions.controller.ts
  redemptions.service.ts
  redemption-policy.service.ts
  redemption-allocation.service.ts
  redemptions.dto.ts
  redemptions.types.ts

src/modules/adjustments/
  adjustments.module.ts
  adjustments.controller.ts
  adjustments.service.ts
  adjustments.dto.ts

src/modules/reversals/
  reversals.module.ts
  reversals.controller.ts
  reversals.service.ts
  reversals.dto.ts

src/common/balance/
  active-balance.service.ts
  lot-allocation.service.ts
```

`LoyaltyService` remains responsible for earn and shared transaction reads. New modules must depend on shared financial primitives, not import each other cyclically.

### 6.2 Ledger entries remain the canonical confirmed transaction identity

For confirmed financial actions, `transactionId` continues to map to the ledger entry ID.

Pending approvals use the approval ID and action aggregate ID until execution creates the confirmed ledger entry.

Do not introduce a second synthetic transaction table merely to rename ledger entries. A redemption aggregate is still required because pending redemption must preserve intent before a ledger entry exists.

### 6.3 Redemption requires an intent aggregate

Add a `Redemption` record that captures the requested checkout action before financial execution.

It must preserve:

- Tenant, branch, customer, card and device.
- Physical receipt evidence.
- Requesting actor.
- Basket amount.
- Requested amount.
- Authoritative allowed amount.
- Confirmed redeemed amount when executed.
- Policy version.
- Status and timestamps.
- Link to the resulting debit ledger entry.

A pending redemption must be replayable and auditable without creating balance effects.

### 6.4 Use immutable allocation records

A redemption debit must be explained by immutable allocation rows that identify exactly which credit lots funded it.

Do not store only a final balance or a JSON list on the ledger entry.

### 6.5 Use database locking for allocation

Redemption allocation must select eligible credit lots with row locks in deterministic FIFO order.

Recommended PostgreSQL pattern:

```sql
SELECT ...
FROM "CreditLot"
WHERE "tenantId" = $tenant
  AND "customerId" = $customer
  AND "remainingAmountKobo" > 0
  AND "expiresAt" > $now
ORDER BY "expiresAt" ASC, "earnedAt" ASC, "id" ASC
FOR UPDATE;
```

The command must run within a serializable transaction. Conditional updates must ensure a lot cannot be reduced below zero even if application assumptions fail.

### 6.6 Balance mutation must be explainable at commit

Replace the Sprint 2 temporary remaining-balance immutability trigger with controlled transition rules.

At minimum, the database must enforce:

- `0 <= remainingAmountKobo <= originalAmountKobo`.
- Source fields and expiry remain immutable.
- Every redemption allocation amount is positive.
- Allocation tenant/customer matches the debit ledger and credit lot.
- Total allocations for a redemption equal the debit ledger amount.
- Total un-restored allocations against a lot never exceed the lot original amount.
- An allocation cannot be updated or deleted.

Preferred implementation: a deferred database constraint trigger validates the affected ledger entry and lots at transaction commit. This permits allocation rows and lot updates to occur in either safe order while preventing partial or unexplained states from committing.

### 6.7 Reversal means compensation, not mutation

Reversal never edits or deletes the original ledger entry or allocation.

A reversal creates:

- A new compensating ledger entry.
- A `reversesEntryId` link to the original entry.
- Restoration records where lot balances must be restored.
- Audit and SMS intent.

A reversal must be rejected or moved to manual review when it cannot restore a coherent lot state.

### 6.8 Approval must support more than earn

Generalise the existing approval model without removing current earn approval history.

Recommended additive approach:

- Add `ApprovalTargetType` with `EARN` and `REDEEM` initially.
- Make `receiptId` optional.
- Add optional unique `redemptionId`.
- Add a database XOR constraint requiring exactly one supported target reference.
- Preserve existing receipt-bound earn approvals through a migration backfill.
- Reuse the existing state machine: `PENDING -> APPROVED -> EXECUTED`, `REJECTED` or `EXPIRED`.

Avoid a free-form target ID with no foreign key.

---

## 7. Proposed data-model changes

Names may be refined during OpenSpec review, but the invariants are mandatory.

### 7.1 Enum changes

```prisma
enum LedgerEntryType {
  EARN
  REDEEM
  REVERSAL
  ADJUSTMENT
}

enum LedgerEntryDirection {
  CREDIT
  DEBIT
}

enum RedemptionStatus {
  PENDING_APPROVAL
  CONFIRMED
  REJECTED
  EXPIRED
  REVERSED
}

enum AdjustmentKind {
  CREDIT
  DEBIT
}

enum ApprovalTargetType {
  EARN
  REDEEM
}
```

Do not add `EXPIRY` execution in this sprint. Reserve its design in ADR/spec documentation and add the enum when the scheduled expiry workflow is implemented unless adding it now is required for a clean non-breaking migration.

### 7.2 `Redemption`

Proposed fields:

```prisma
model Redemption {
  id                       String           @id @default(uuid())
  tenantId                 String
  branchId                 String
  customerId               String
  cardId                   String
  deviceId                 String
  receiptId                String           @unique
  requestedByTenantId      String
  requestedBy              String
  requestedAmountKobo      BigInt
  basketAmountKobo         BigInt
  maximumAllowedKobo       BigInt
  confirmedAmountKobo      BigInt?
  status                   RedemptionStatus
  policyVersion            String
  ledgerEntryId            String?          @unique
  requestedAt              DateTime         @default(now())
  confirmedAt              DateTime?
  rejectedAt               DateTime?
  reversedAt               DateTime?
  createdAt                DateTime         @default(now())
  updatedAt                DateTime         @updatedAt

  @@unique([tenantId, id])
  @@index([tenantId, customerId, requestedAt])
  @@index([tenantId, status, requestedAt])
}
```

Required relationships must use tenant-safe composite foreign keys.

### 7.3 `RedemptionAllocation`

```prisma
model RedemptionAllocation {
  id                       String   @id @default(uuid())
  tenantId                 String
  redemptionId             String
  redemptionLedgerEntryId  String
  creditLotId              String
  amountKobo               BigInt
  allocationOrder          Int
  createdAt                DateTime @default(now())

  @@unique([tenantId, redemptionId, creditLotId])
  @@unique([tenantId, redemptionId, allocationOrder])
  @@index([tenantId, creditLotId])
  @@index([tenantId, redemptionLedgerEntryId])
}
```

Database rules:

- `amountKobo > 0`.
- One allocation per lot per redemption.
- Allocation rows are immutable and undeletable.
- Allocation customer and tenant must match both source lot and redemption ledger entry.

### 7.4 `AllocationRestoration`

Use immutable restoration rows for reversal rather than mutating/deleting allocations.

```prisma
model AllocationRestoration {
  id                       String   @id @default(uuid())
  tenantId                 String
  allocationId             String
  reversalLedgerEntryId    String
  amountKobo               BigInt
  createdAt                DateTime @default(now())

  @@unique([tenantId, allocationId, reversalLedgerEntryId])
  @@index([tenantId, reversalLedgerEntryId])
}
```

Rules:

- `amountKobo > 0`.
- Total restoration for an allocation cannot exceed its allocation amount.
- Restoration rows are immutable and undeletable.
- Restored credit returns to the original lot and retains the original expiry date.
- If the original lot is already expired at reversal time, automatic restoration is unsafe and returns `REVERSAL_REVIEW_REQUIRED` unless a separately approved policy defines another outcome.

### 7.5 `Adjustment`

```prisma
model Adjustment {
  id                       String         @id @default(uuid())
  tenantId                 String
  customerId               String
  kind                     AdjustmentKind
  amountKobo               BigInt
  reason                   String
  createdByTenantId        String
  createdBy                String
  ledgerEntryId            String?        @unique
  effectiveAt              DateTime
  createdAt                DateTime       @default(now())

  @@unique([tenantId, id])
  @@index([tenantId, customerId, effectiveAt])
}
```

Credit adjustment:

- Creates a `CREDIT/ADJUSTMENT` ledger entry.
- Creates a new credit lot.
- Defaults to 12-month expiry unless a documented allowed override is supplied.

Debit adjustment:

- Creates a `DEBIT/ADJUSTMENT` ledger entry.
- Uses the same locked FIFO allocation engine as redemption.
- Cannot exceed active balance.
- Does not require a checkout receipt.

### 7.6 `LoyaltyLedgerEntry`

Required changes:

- Expand type and direction enums.
- Make `receiptId` optional so reversal and adjustment entries can exist without physical receipt evidence.
- Preserve uniqueness for non-null `receiptId`.
- Add optional one-to-one references to `Redemption` and `Adjustment`, or define inverse relations through their `ledgerEntryId` fields.
- Keep `correlationId` unique.
- Keep `reversesEntryId` unique so an original transaction cannot be reversed twice without an explicit multi-reversal design.
- Preserve append-only update/delete triggers.

### 7.7 `Approval`

Required changes:

- Add `targetType`.
- Make `receiptId` optional.
- Add optional `redemptionId`.
- Backfill all existing approvals as `EARN`.
- Add an XOR constraint for target fields.
- Keep requester/decision actor tenant-safe references.
- Keep one approval per controlled action.

### 7.8 Outbox and SMS

The existing outbox model is sufficiently generic. Extend templates and payload validation rather than creating another queue system.

Required templates:

- `redemption-confirmed`
- `redemption-rejected` if ShopCity wants rejection notifications
- `transaction-reversed`
- `balance-adjusted`

Payloads must include a version and stable transaction identifiers. They must not expose internal approval-policy hashes or secrets.

---

## 8. Migration strategy

### 8.1 Migration principles

- Never edit applied Sprint 2 migrations.
- Use expand-and-contract sequencing.
- Add new enums, nullable columns and tables first.
- Backfill existing approval targets before adding strict constraints.
- Replace the temporary credit-lot balance trigger only after allocation tables and validation triggers exist.
- Keep API and worker compatible during rolling deployment.

### 8.2 Recommended migration sequence

#### Migration A — schema expansion

- Add ledger enum values.
- Add redemption, allocation, restoration and adjustment tables.
- Add approval target fields as nullable.
- Make ledger `receiptId` nullable.
- Add indexes and tenant-safe foreign keys.
- Do not yet enable application writes.

#### Migration B — approval backfill and constraints

- Backfill existing approvals to `targetType = EARN`.
- Validate every existing approval has a receipt.
- Add XOR target constraint.
- Add unique redemption approval constraint.

#### Migration C — controlled lot-balance transitions

- Replace `remaining balance is temporarily immutable` with the Sprint 3 transition/commit validation.
- Add allocation/restoration immutability triggers.
- Add deferred invariant checks.
- Preflight all existing credit lots and fail loudly on inconsistency.

### 8.3 Migration verification

Test both:

1. Fresh database: all migrations apply from zero.
2. Upgrade database: realistic Sprint 2 earn, pending approval, outbox and SMS records exist before Sprint 3 migrations apply.

Verification must confirm:

- Existing earn history remains queryable.
- Existing approval rows are correctly backfilled.
- Existing credit-lot balances are unchanged.
- Append-only ledger and receipt triggers still work.
- New constraints reject malformed allocations and restorations.

Update `docs/database/migration-tracker.md` with local and remote evidence.

---

## 9. Workstream 1 — contract and design lock

### Tasks

- Create OpenSpec change `sprint-3-redemption-and-approvals`.
- Run GitNexus impact analysis for `LoyaltyLedgerEntry`, `CreditLot`, `Approval`, `ActiveBalanceService`, `LoyaltyService` and outbox/SMS symbols.
- Create or update ADR for FIFO allocation, restoration and generic approval targets.
- Confirm policy defaults with ShopCity or record them as configurable assumptions.
- Produce request/response/error examples before controller implementation.
- Decide the exact compatibility behaviour of `GET /transactions/{id}` for all ledger types.

### Deliverables

- Approved OpenSpec proposal/design/tasks.
- ADR covering debit allocation and reversal restoration.
- Draft OpenAPI contracts.
- Migration design reviewed before SQL is generated.

### Gate

No controller or service implementation begins until database invariants and API states are agreed.

---

## 10. Workstream 2 — shared FIFO allocation engine

### Responsibilities

The allocation engine receives:

- Tenant and customer.
- Requested debit amount.
- Effective timestamp.
- Optional excluded earn ledger/lot IDs.
- Transaction-scoped Prisma client.

It returns a deterministic allocation plan and persists it atomically.

### Algorithm

1. Validate the amount is a positive safe integer and convert it to `BigInt`.
2. Lock all eligible lots in FIFO order.
3. Exclude expired, depleted and explicitly ineligible lots.
4. Sum the locked active balance.
5. Fail with `INSUFFICIENT_BALANCE` if the sum is lower than the requested debit.
6. Allocate from each lot until the debit is fully funded.
7. Create immutable allocation rows.
8. Decrement each lot using a conditional update.
9. Verify the total allocation equals the debit amount.
10. Return allocation details and reconstructed remaining active balance.

### Deterministic FIFO ordering

```text
expiresAt ASC
then earnedAt ASC
then id ASC
```

### Concurrency requirements

- Run inside the same serializable transaction as the debit ledger entry.
- Use row locking, not a cached balance.
- Retry only recognised PostgreSQL serialization/deadlock conflicts.
- Never retry domain failures such as insufficient balance.
- On exhausted retry, return `REDEMPTION_TRANSACTION_CONFLICT` with HTTP 503.

### Unit tests

- One lot fully consumed.
- One lot partially consumed.
- Several lots consumed in FIFO order.
- Equal-expiry lots use earned time and ID tie-breakers.
- Expired lots skipped.
- Depleted lots skipped.
- Excluded same-purchase lot skipped.
- Insufficient balance returns no partial plan.
- Zero/negative amount rejected.

### Database integration tests

- Allocation totals equal ledger debit.
- Lot cannot become negative.
- Allocation tenant/customer mismatch rejected.
- Allocation update/delete rejected.
- Two concurrent allocations cannot spend the same funds.

---

## 11. Workstream 3 — redemption API

### 11.1 Endpoint

```http
POST /api/v1/transactions/redeem
```

Roles:

- Cashier
- Supervisor
- Admin

Required headers:

- `Idempotency-Key`
- Existing authentication/session/CSRF requirements

Recommended request:

```json
{
  "cardSerialNumber": "SC-00001234",
  "posReceiptNumber": "10501",
  "basketAmountKobo": 2000000,
  "requestedRedemptionKobo": 500000,
  "occurredAt": "2026-07-19T09:44:00+01:00"
}
```

Do not trust client-supplied customer, balance, role, branch, device, maximum allowed amount or approval state.

### 11.2 Policy calculation

Inside the transaction calculate:

```text
basketCapKobo = floor(basketAmountKobo * maxBasketPercent / 100)
maximumAllowedKobo = min(activeBalanceKobo, basketCapKobo)
```

The request fails when:

- Requested amount is below the configured minimum.
- Requested amount exceeds the basket cap.
- Requested amount exceeds active balance.
- Card/customer/device/branch is ineligible.
- Receipt identity is already used.
- The request would consume credit earned on the same purchase.
- The request is identified as offline.

Do not silently reduce a request that exceeds policy. Return the authoritative maximum in error details so the cashier can correct the amount deliberately.

### 11.3 Immediate confirmed flow

Within one serializable transaction:

1. Reserve/resolve the idempotency record.
2. Revalidate actor, session device, branch, card and customer.
3. Derive authoritative receipt week.
4. Reserve immutable receipt evidence.
5. Create the redemption intent.
6. Calculate policy and lock eligible lots.
7. Create `DEBIT/REDEEM` ledger entry.
8. Create FIFO allocations and update lot balances.
9. Mark redemption confirmed and link the ledger entry.
10. Create outbox and SMS intent.
11. Write audit records.
12. Complete the idempotency response.

Recommended `201` response:

```json
{
  "transactionId": "uuid",
  "redemptionId": "uuid",
  "receiptId": "uuid",
  "state": "CONFIRMED",
  "basketAmountKobo": 2000000,
  "redeemedKobo": 500000,
  "maximumAllowedKobo": 600000,
  "remainingBalanceKobo": 930000,
  "allocations": [
    {
      "creditLotId": "uuid",
      "amountKobo": 300000,
      "expiresAt": "2026-11-01T00:00:00.000Z"
    },
    {
      "creditLotId": "uuid",
      "amountKobo": 200000,
      "expiresAt": "2027-01-15T00:00:00.000Z"
    }
  ],
  "smsStatus": "QUEUED"
}
```

### 11.4 Pending approval flow

If requested redemption exceeds `REDEMPTION_APPROVAL_THRESHOLD_KOBO`:

- Create receipt evidence.
- Create redemption intent with `PENDING_APPROVAL`.
- Store the policy version and requested figures.
- Create a redemption-targeted approval.
- Complete idempotency and audit records.
- Return `202`.

Do **not** lock or consume lots indefinitely. No ledger, allocation, lot mutation, outbox or SMS financial confirmation is created before approval execution.

Recommended `202` response:

```json
{
  "state": "PENDING_APPROVAL",
  "redemptionId": "uuid",
  "approvalId": "uuid",
  "requestedRedemptionKobo": 1000000,
  "maximumAllowedKoboAtRequest": 1500000,
  "reasonCode": "REDEMPTION_ABOVE_APPROVAL_THRESHOLD"
}
```

### 11.5 Stable errors

- `SESSION_DEVICE_REQUIRED` — 400
- `DEVICE_NOT_ACTIVE` — 400
- `DEVICE_BRANCH_MISMATCH` — 400
- `VALIDATION_ERROR` — 400
- `CARD_NOT_FOUND` — 404 using the documented anti-enumeration policy
- `RECEIPT_ALREADY_USED` — 409
- `IDEMPOTENCY_CONFLICT` — 409
- `REDEMPTION_BELOW_MINIMUM` — 422
- `REDEMPTION_EXCEEDS_BASKET_CAP` — 422
- `INSUFFICIENT_BALANCE` — 422
- `SAME_PURCHASE_REDEMPTION_NOT_ALLOWED` — 422
- `OFFLINE_REDEMPTION_NOT_ALLOWED` — 422
- `REDEMPTION_POLICY_CHANGED` — 422
- `RATE_LIMITED` — 429
- `REDEMPTION_TRANSACTION_CONFLICT` — 503
- `DEPENDENCY_UNAVAILABLE` — 503

### 11.6 Rate limiting

Add an explicit financial throttle key containing:

- Tenant.
- Staff user.
- Session device.

Document and test runtime `429 RATE_LIMITED`.

---

## 12. Workstream 4 — redemption approval execution

### Approval decision requirements

- Supervisor/Admin only.
- Reason required.
- Requester cannot decide own action.
- Capturing cashier cannot approve the same redemption.
- Decision must be idempotent or return a stable already-decided conflict.

### Approval execution sequence

On approval:

1. Lock the approval and redemption intent.
2. Confirm approval is `PENDING` and not expired.
3. Revalidate branch, device, card, customer and staff eligibility.
4. Recompute active balance from current lots.
5. Recompute basket cap and current policy.
6. Confirm requested amount remains valid.
7. Lock lots in FIFO order.
8. Create debit ledger entry.
9. Create allocations and decrement lots.
10. Mark redemption `CONFIRMED`.
11. Move approval through `APPROVED` to `EXECUTED` in the same transaction.
12. Create outbox/SMS and audit records.

If balance or policy changed, return a stable 422 error and create no partial financial effect.

On rejection:

- Mark approval `REJECTED`.
- Mark redemption `REJECTED`.
- Update receipt review metadata as applicable.
- Create audit record.
- Do not create ledger/allocation/outbox financial confirmation.

On expiry:

- Mark approval and redemption `EXPIRED`.
- Create no financial effect.

### Concurrency tests

- Two supervisors approve simultaneously: exactly one execution.
- Approval competes with another redemption: no overdraw.
- Approval after balance reduction: fails safely.
- Approval after card/customer/device deactivation: fails safely.
- Approval after policy change: fails safely.

---

## 13. Workstream 5 — transaction reversal

### 13.1 Endpoint

```http
POST /api/v1/transactions/{transactionId}/reverse
```

Roles:

- Supervisor
- Admin

Required:

- `Idempotency-Key`
- Non-empty reason

### 13.2 Reversal classes

#### Reverse an earn credit

Safe automatic reversal is allowed only when the unconsumed amount can be removed without making the customer balance or lot history inconsistent.

Recommended rules:

- If the earn lot is completely unconsumed and unexpired, create a `DEBIT/REVERSAL` entry and consume the entire lot.
- If the earn lot is partially consumed, return `REVERSAL_REVIEW_REQUIRED` unless an explicitly approved partial-reversal policy is implemented.
- If the lot is expired or already fully consumed, return `REVERSAL_REVIEW_REQUIRED`.

Do not delete the lot or original earn entry.

#### Reverse a redemption debit

- Create a `CREDIT/REVERSAL` ledger entry.
- Restore each original allocation through immutable restoration rows.
- Increase the original lots by the restored amounts.
- Preserve each lot’s original expiry.
- Reject automatic reversal if any original lot is now expired or restoration would exceed its original amount.

#### Reverse an adjustment

- Credit adjustment reversal creates a debit compensation and consumes the adjustment-created lot only if safe.
- Debit adjustment reversal restores its allocations.
- Unsafe cases return review required.

### 13.3 Reversal response

Return:

- Original transaction ID.
- Reversal transaction ID.
- Reversed amount.
- New active balance.
- Restoration/allocation summary.
- SMS status.

### 13.4 Reversal invariants

- Original entry remains unchanged.
- One automatic reversal per original transaction.
- Reversal amount equals the permitted compensated amount.
- Restoration cannot exceed original allocation.
- Reversal and restoration commit atomically.
- Reversal failure cannot leave lot balances partially restored.

---

## 14. Workstream 6 — manual adjustments

### 14.1 Endpoint

```http
POST /api/v1/adjustments
```

Role:

- Admin only

Required headers:

- `Idempotency-Key`

Recommended request:

```json
{
  "customerId": "uuid",
  "kind": "CREDIT",
  "amountKobo": 50000,
  "reason": "Service recovery credit",
  "effectiveAt": "2026-07-26T10:00:00.000Z",
  "expiryMonths": 12
}
```

### 14.2 Credit adjustment

Within one transaction:

- Validate active customer.
- Create adjustment aggregate.
- Create `CREDIT/ADJUSTMENT` ledger entry.
- Create credit lot with derived expiry.
- Create outbox/SMS intent.
- Write audit and idempotency records.

### 14.3 Debit adjustment

Within one transaction:

- Validate active customer and balance.
- Create adjustment aggregate.
- Create `DEBIT/ADJUSTMENT` ledger entry.
- Consume lots through the shared FIFO allocation engine.
- Create outbox/SMS intent.
- Write audit and idempotency records.

### 14.4 Adjustment protections

- Reason is mandatory and length-limited.
- Amount is positive and within an admin-adjustment ceiling.
- Optional expiry override is bounded and audited.
- Admin cannot submit arbitrary resulting balance.
- Debit adjustment cannot produce negative balance.
- Every adjustment is visible in ledger and audit history.

---

## 15. Workstream 7 — reads and frontend contract

### 15.1 Transaction lookup

Extend:

```http
GET /api/v1/transactions/{transactionId}
```

It must return a discriminated shape based on ledger type:

- Earn: receipt, credit lot, expiry, SMS.
- Redeem: receipt, basket, amount, allocations, approval and SMS.
- Reversal: original transaction, compensation details and restorations.
- Adjustment: kind, reason, allocation or created lot.

Do not expose raw Prisma entities or `bigint` values.

### 15.2 Customer ledger

Continue cursor pagination and add:

- `REDEEM`, `REVERSAL` and `ADJUSTMENT` types.
- Direction.
- Allocation/restoration summaries.
- Reversal linkage.
- Human-readable reason where role permits.

### 15.3 Approval list

Add target discrimination:

- `targetType`
- `redemptionId` or receipt/earn reference
- Requested amount
- Current status
- Policy reason
- Relevant customer/receipt summary

### 15.4 Public configuration

Expose frontend-safe values:

- Minimum redemption.
- Basket percentage cap.
- Approval threshold.
- Offline redemption disabled.

### 15.5 Frontend integration guide

Update `docs/api` with:

- Redeem state machine.
- Retry/idempotency behaviour.
- 201 vs 202 handling.
- Corrective UI for policy errors.
- Approval polling/refresh behaviour.
- Reversal and adjustment role restrictions.
- Explicit prohibition on authorising redemption from cached balance.

---

## 16. Workstream 8 — audit, SMS and observability

### 16.1 Audit events

Minimum events:

- `redemption.requested`
- `redemption.confirmed`
- `redemption.approval_required`
- `redemption.rejected`
- `redemption.expired`
- `redemption.timestamp_override`
- `transaction.reversed`
- `adjustment.credit`
- `adjustment.debit`
- `approval.redeem.execute`
- `approval.redeem.reject`

Metadata should contain stable IDs and amounts but avoid unnecessary full phone numbers or secrets.

### 16.2 SMS behaviour

For confirmed redemption, reversal and adjustment:

- Create outbox and SMS intent in the same financial transaction.
- Do not send directly from API code.
- SMS failure does not change transaction validity.
- Templates must report the resulting active balance where appropriate.
- Provider states remain truthful.

### 16.3 Operational metrics/logging

Add structured fields:

- Transaction type.
- Transaction ID.
- Approval ID.
- Allocation count.
- Retry attempt.
- Conflict category.
- Duration.

Never log full session tokens, provider secrets or unnecessary PII.

---

## 17. Testing plan

### 17.1 Unit tests

#### Redemption policy

- Minimum boundary: below, equal and above.
- Basket-cap rounding.
- Approval-threshold boundary.
- Requested amount greater than balance.
- Requested amount greater than basket cap.
- Same-purchase exclusion.
- Staff/customer/card/device ineligibility mapping.

#### FIFO allocation

- One-lot, multi-lot and partial-lot allocation.
- Expired/depleted exclusion.
- Stable tie-break ordering.
- Exact-balance redemption.
- Insufficient-balance failure with no plan.

#### Reversal

- Full safe earn reversal.
- Partial-consumption review required.
- Redemption restoration plan.
- Expired-source-lot review required.
- Double reversal rejected.

#### Adjustment

- Credit lot creation and expiry.
- Debit FIFO allocation.
- Invalid reason/amount/expiry override.

### 17.2 Database integration tests

- Fresh migration deploy.
- Upgrade from Sprint 2 data.
- Ledger append-only protection remains active.
- Receipt evidence remains immutable.
- Allocation and restoration rows immutable.
- Allocation totals equal debit ledger amount.
- Lot balance cannot go below zero or above original.
- Cross-tenant/customer allocation rejected.
- Approval target XOR constraint.
- One ledger effect per redemption.
- One reversal per transaction.

### 17.3 Concurrency tests

Mandatory:

1. Two redemptions against the same exact available balance: one succeeds; the other receives insufficient balance or a retryable conflict, and total confirmed debit never exceeds balance.
2. Two overlapping redemptions that can both partially allocate the same earliest lot: committed allocation remains FIFO and nonnegative.
3. Same idempotency key and same payload concurrently: both return the original successful response.
4. Same key with different payload: one succeeds; conflicting request returns `IDEMPOTENCY_CONFLICT`.
5. Two approvals for one redemption: exactly one execution.
6. Approval execution racing with direct redemption by the same customer: no overdraw.
7. Reversal racing with another redemption: lot invariant remains valid.

### 17.4 HTTP integration tests

- Cashier confirmed redemption.
- High-value 202 response.
- Supervisor approval and rejection.
- Self-approval rejected.
- Insufficient balance.
- Below minimum.
- Basket cap exceeded.
- Duplicate receipt.
- Same-purchase prohibition.
- Offline indicator rejected.
- Runtime `RATE_LIMITED`.
- Supervisor reversal.
- Admin credit/debit adjustment.
- Cashier receives 403 for reversal and adjustment.
- Response values are JSON-safe numbers.

### 17.5 Outbox/SMS tests

- Confirmed redemption creates one outbox and one SMS record.
- Pending/rejected/expired approval creates no confirmation SMS effect unless a separately documented notification is intended.
- SMS timeout leaves financial transaction committed.
- Worker retry and recovery remain replay-safe.
- Reversal and adjustment templates persist truthful statuses.

### 17.6 Contract tests

OpenAPI must cover:

- Redeem 201 and 202.
- Approval decision responses for redemption.
- Reversal and adjustment responses.
- Stable 400/401/403/404/409/422/429/503 examples.
- Pagination and discriminated transaction schemas.
- Deprecated/compatibility notes where relevant.

Run Spectral, oasdiff and generated OpenAPI cleanliness checks.

### 17.7 Coverage target

- Financial policy/allocation/reversal branches: at least 90% branch coverage.
- Overall repository: target at least 80% where practical.
- Every discovered financial bug receives a regression test.

---

## 18. Implementation sequence

Recommended sequence for one backend engineer: approximately 15–20 focused engineering days, excluding external review delays.

### Phase 1 — design and migration foundation

**Days 1–3**

- OpenSpec and ADR.
- GitNexus impact analysis.
- Draft OpenAPI.
- Prisma schema and migration design.
- Fresh/upgrade migration tests.

**Gate:** schema and invariants reviewed.

### Phase 2 — FIFO engine

**Days 4–6**

- Shared allocation service.
- Row-lock queries.
- Allocation/restoration database constraints.
- Unit and concurrency integration tests.

**Gate:** isolated allocation engine cannot overdraw under concurrency.

### Phase 3 — immediate redemption

**Days 7–9**

- Redeem DTO/controller/service.
- Receipt and idempotency integration.
- Debit ledger, allocations, lot mutation, outbox, SMS and audit.
- Transaction read model.

**Gate:** complete confirmed redemption journey passes HTTP and DB tests.

### Phase 4 — approval-dependent redemption

**Days 10–12**

- Approval schema generalisation.
- 202 pending flow.
- Approval revalidation/execution/rejection/expiry.
- Approval concurrency tests.

**Gate:** approval E2E passes with no pre-execution balance effect.

### Phase 5 — reversals and adjustments

**Days 13–16**

- Reversal planning and restoration.
- Review-required cases.
- Credit/debit adjustment.
- Outbox/SMS/audit integration.

**Gate:** compensating entries preserve immutable history and lot invariants.

### Phase 6 — contract and release hardening

**Days 17–20**

- OpenAPI/Bruno/frontend guide.
- Full unit/e2e/integration suite.
- Architecture check and generated client validation.
- Migration tracker and runbook notes.
- Visible CI evidence.

**Gate:** Sprint 3 exit checklist complete.

Parallel work is possible after Phase 1: frontend can integrate against mocked 201/202 contracts while backend implements the allocation engine.

---

## 19. Story breakdown

### S3-01 — Lock redemption policy and API contract

Acceptance:

- Config defaults documented.
- Redeem request/201/202/errors published.
- OpenSpec and ADR approved.

### S3-02 — Expand ledger and approval schema

Acceptance:

- Fresh and upgrade migrations pass.
- Existing Sprint 2 history remains valid.
- Approval targets are strongly referenced.

### S3-03 — Add redemption and allocation persistence

Acceptance:

- Redemption intent and immutable allocation rows exist.
- Constraints reject invalid totals and cross-tenant links.

### S3-04 — Implement FIFO allocation engine

Acceptance:

- Deterministic multi-lot allocation.
- Expired/depleted/excluded lots skipped.
- No overdraw under concurrency.

### S3-05 — Implement immediate redemption

Acceptance:

- Valid request returns confirmed debit and remaining balance.
- Receipt, ledger, allocations, lot updates, outbox, SMS, audit and idempotency commit atomically.

### S3-06 — Implement high-value redemption approval

Acceptance:

- Pending action has no financial effect.
- Different supervisor can execute once.
- Current policy/balance is revalidated.

### S3-07 — Extend transaction and ledger reads

Acceptance:

- Redeem details and allocations are JSON-safe and documented.
- Cursor pagination remains bounded.

### S3-08 — Implement safe reversal

Acceptance:

- Original ledger remains unchanged.
- Safe debit reversal restores original lots.
- Unsafe reversal returns review required.

### S3-09 — Implement manual adjustments

Acceptance:

- Admin-only credit/debit commands work atomically.
- Credit creates lot; debit uses FIFO.
- Reason and audit are mandatory.

### S3-10 — Extend notifications and operations

Acceptance:

- New templates use outbox worker.
- SMS failures never roll back finance.
- Worker recovery remains replay-safe.

### S3-11 — Complete contract, regression and CI evidence

Acceptance:

- All required gates pass visibly.
- OpenAPI and Bruno are current.
- Migration tracker updated.
- Sprint issue checklist reconciled.

---

## 20. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Two requests consume the same lots | Negative balance/double spend | Row locks, serializable transaction, conditional updates and concurrency tests |
| Application lot updates commit without allocations | Unreconstructable liability | Deferred DB invariant checks and immutable allocation records |
| Approval holds stale balance | Overdraw at execution | Do not reserve lots indefinitely; fully revalidate and lock at execution |
| Reversal restores expired or already-reallocated funds | Incorrect liability | Restoration records, original-expiry preservation and review-required fallback |
| Generalising approvals breaks earn approvals | Sprint 2 regression | Additive fields, backfill, upgrade tests and existing approval regression suite |
| Ledger `receiptId` migration weakens evidence linkage | Orphan transaction records | Type-specific relation checks and database constraints |
| Debit adjustment bypasses lot accounting | Balance/lot mismatch | Reuse the same FIFO engine as redemption |
| API contract changes block frontend | Integration delay | Publish contract first, run oasdiff and compile generated client |
| Long-running locks hurt checkout latency | Poor user experience | Lock only eligible customer lots, deterministic query, bounded retries and performance test |
| SMS changes regress delivery | Customer confusion | Reuse existing outbox/provider path and add template-specific tests |

---

## 21. Definition of done

Every Sprint 3 story must satisfy the repository-wide definition of done plus these financial requirements:

- No floating-point money.
- No client-authoritative balance or allowed amount.
- No confirmed ledger update/delete.
- No direct Redis dependency inside a financial transaction.
- No debit without immutable allocation evidence.
- No allocation without a confirmed debit ledger entry.
- No reversal by editing original rows.
- No approval execution without current-state revalidation.
- No raw `bigint` or Prisma entity in HTTP responses.
- Stable error code, audit event and idempotency behaviour documented.
- Migration and concurrency regression tests included.

---

## 22. Sprint 3 final acceptance checklist

### Contract and policy

- [ ] Redemption defaults confirmed or explicitly accepted as configurable assumptions.
- [ ] OpenSpec and ADR approved.
- [ ] OpenAPI/Bruno contract published before frontend integration.

### Database

- [ ] Ledger supports debit and new entry types.
- [ ] Redemption intent model added.
- [ ] FIFO allocation records added and immutable.
- [ ] Restoration records added and immutable.
- [ ] Approval target generalisation complete.
- [ ] Credit-lot controlled mutation replaces temporary immutability.
- [ ] Fresh and Sprint 2 upgrade migrations pass.

### Redemption

- [ ] Immediate confirmed redemption works.
- [ ] Minimum and basket cap enforced.
- [ ] Active balance checked authoritatively.
- [ ] Same-purchase and offline redemption prohibited.
- [ ] FIFO allocations persisted.
- [ ] Receipt uniqueness and idempotency enforced.
- [ ] Transactional outbox/SMS intent created.

### Approvals

- [ ] High-value redemption returns 202 with no financial effect.
- [ ] Requester/cashier self-approval blocked.
- [ ] Approval revalidates current policy and balance.
- [ ] Concurrent approval executes exactly once.
- [ ] Rejection/expiry creates no financial effect.

### Reversal and adjustment

- [ ] Safe reversal creates compensating ledger entry.
- [ ] Redemption reversal restores original lots through restoration rows.
- [ ] Unsafe reversal returns `REVERSAL_REVIEW_REQUIRED`.
- [ ] Credit adjustment creates a new expiring lot.
- [ ] Debit adjustment uses FIFO allocation.
- [ ] Adjustment reason and admin authorization enforced.

### Quality and release

- [ ] Unit tests pass.
- [ ] Database integration tests pass.
- [ ] Required concurrency tests pass.
- [ ] HTTP/E2E tests pass.
- [ ] OpenAPI lint/diff and generated artifact cleanliness pass.
- [ ] Lint, typecheck, architecture and build pass.
- [ ] API and worker production entrypoint verification passes.
- [ ] Visible GitHub CI evidence recorded for final Sprint 3 head.
- [ ] Migration tracker, frontend guide and relevant runbooks updated.

---

## 23. Handoff to Sprint 4 and Sprint 5

Sprint 3 must leave clean extension points for:

### Sprint 4

- Offline earn batch sync.
- Fraud flags after earn/redeem/reversal/adjustment.
- Redemption, liability and cashier report read models.
- Exportable owner reports.

### Sprint 5

- Scheduled expiry processing.
- Expiry ledger entries and lot-expiration evidence.
- Expiry reminders.
- Security scans, load tests and recovery drills.
- Pilot monitoring and production-readiness sign-off.

The key handoff invariant is that every balance change is already represented by immutable ledger and lot-movement evidence. Later reports and expiry jobs should consume this history rather than inventing a second balance model.
