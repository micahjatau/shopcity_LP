## Purpose

Define one auditable purchase settlement that applies previously earned credit and awards new credit only on the remaining amount paid, without exposing partial financial outcomes.

## ADDED Requirements

### Requirement: Redeem settles prior credit and net-paid Earn atomically

The system MUST treat a confirmed redemption as one purchase settlement. For basket amount `B` and confirmed redemption amount `R`, it MUST calculate `netPaidAmountKobo = B - R` and calculate earned credit using the authoritative branch earn rate (or configured default) and the existing integer-kobo Earn formula. The debit, FIFO allocations, EARN ledger entry, new credit lot when earned credit is positive, response, and outbox records MUST commit or roll back together.

#### Scenario: Redeem prior credit and earn on the paid remainder

- **GIVEN** the customer has ₦5,000 of previously eligible credit
- **WHEN** the cashier submits a ₦10,000 basket with ₦3,000 redemption and the settlement is confirmed at the default 2% rate
- **THEN** one physical receipt has one ₦3,000 REDEEM debit and one ₦140 EARN credit, one new ₦140 credit lot is created, the customer's closing balance is ₦2,140, and the response reports net paid ₦7,000, earned ₦140, redeemed ₦3,000, and closing balance ₦2,140

#### Scenario: Full-payment Earn remains unchanged

- **GIVEN** no loyalty credit is redeemed for a purchase
- **WHEN** the cashier records the purchase through the normal Earn workflow
- **THEN** the existing Earn behavior, policy, response, and approval semantics remain unchanged

#### Scenario: Zero earned amount creates no zero-value ledger or lot

- **GIVEN** the configured earn policy rounds the net-paid amount to zero earned kobo
- **WHEN** the redemption settlement is confirmed
- **THEN** the redemption may be confirmed, `earnedKobo` is zero, and no zero-amount EARN ledger entry or credit lot is created

### Requirement: Same-purchase redemption uses only pre-existing credit

The system MUST allocate the redemption debit only from eligible credit lots available before the settlement's new Earn effect is created. A newly earned lot from the same receipt MUST NOT fund that receipt's redemption. The physical receipt remains unique by tenant, branch, receipt week, and normalized POS receipt number, and may have at most one EARN and one REDEEM ledger effect.

#### Scenario: New settlement Earn cannot fund its own redemption

- **GIVEN** a settlement will earn credit on the amount paid after redemption
- **WHEN** the debit is allocated
- **THEN** every allocation references a previously existing eligible lot and none references the settlement's new Earn lot

#### Scenario: One receipt can carry both typed ledger effects

- **GIVEN** a confirmed redemption settlement creates both effects for one receipt
- **WHEN** the ledger effects are persisted
- **THEN** the database accepts exactly one EARN and one REDEEM effect for that receipt while rejecting a second effect of either same type

#### Scenario: A different operation cannot reclaim a completed physical receipt

- **GIVEN** a physical receipt has already been recorded by the normal Earn or redemption workflow
- **WHEN** another request attempts to claim that physical receipt as a separate purchase
- **THEN** the request is rejected as `RECEIPT_ALREADY_USED` and creates no additional receipt or financial effect

### Requirement: Approval gates the entire settlement

The system MUST create no redemption debit, Earn credit, allocation, credit lot, or settlement SMS while a redemption settlement awaits approval. If either the redemption policy or the existing basket-level Earn purchase policy requires approval, both effects MUST remain pending and MUST execute together only after an authorized approval decision revalidates the applicable policy. Rejection or expiry MUST create neither effect.

#### Scenario: High-value redemption remains financially pending

- **GIVEN** the requested redemption requires supervisor approval
- **WHEN** the cashier submits the settlement
- **THEN** the response is pending and no ledger entries, allocations, credit lots, or settlement SMS exist

#### Scenario: Earn-side approval holds the redemption too

- **GIVEN** the redemption is below its approval threshold but the basket amount requires purchase approval under the existing Earn policy
- **WHEN** the cashier submits the settlement
- **THEN** the whole settlement remains pending with no debit or Earn effect

#### Scenario: Approval executes both settlement effects once

- **GIVEN** a pending settlement remains eligible under its captured policy and an authorized supervisor approves it
- **WHEN** approval execution completes
- **THEN** the debit, FIFO allocations, Earn ledger, credit lot, closing balance, combined SMS, and approval execution state commit together

#### Scenario: Rejection or expiry creates no financial effects

- **GIVEN** a settlement is pending approval
- **WHEN** a supervisor rejects it or it expires
- **THEN** it has no redemption debit, Earn credit, allocation, credit lot, or settlement SMS

### Requirement: Settlement retries are idempotent

The system MUST persist and replay the completed settlement response for a retry with the same idempotency key and request payload. A retry MUST NOT duplicate receipts, ledger effects, allocations, credit lots, outbox events, or SMS messages.

#### Scenario: Confirmed settlement is retried

- **GIVEN** a redemption settlement has committed
- **WHEN** the same actor retries the same request with the same idempotency key
- **THEN** the original response is returned and exactly one settlement's financial and notification records remain

### Requirement: Settlement contracts expose both effects truthfully

A confirmed redemption response MUST expose integer-kobo basket amount, redeemed amount, net-paid amount, earned amount, redemption transaction ID, Earn transaction ID when an Earn effect exists, and closing balance. Pending responses MUST NOT claim completed debit, Earn, or closing-balance effects. Cashier activity and transaction detail MUST show both effects linked to the same physical receipt without presenting them as two receipts.

#### Scenario: Confirmed result exposes authoritative values

- **GIVEN** a settlement has committed
- **WHEN** the cashier reads its response or transaction detail
- **THEN** both ledger effects and their authoritative integer-kobo amounts are represented under the same receipt identity

#### Scenario: Pending result does not claim a completed Earn

- **GIVEN** a settlement awaits approval
- **WHEN** its response or activity row is rendered
- **THEN** earned and redeemed effects are shown as pending or unavailable, not as confirmed amounts

### Requirement: One settlement sends one combined SMS

The system MUST enqueue at most one customer SMS for a confirmed redemption settlement. The message MUST communicate the redeemed amount, earned amount, and closing available credit. Existing queued redemption notifications without the new settlement fields MUST remain processable during rollout.

#### Scenario: Confirmed settlement notification

- **GIVEN** a redemption settlement confirms with both financial effects
- **WHEN** the notification worker renders the settlement message
- **THEN** one message communicates the redemption, Earn, and closing balance, and no separate Earn-confirmed message is queued

#### Scenario: Legacy queued redemption notification is processed

- **GIVEN** a pre-deployment redemption SMS payload contains only the legacy redemption fields
- **WHEN** the worker processes it after deployment
- **THEN** it is rendered using the legacy-compatible message path rather than failed as malformed

### Requirement: Paired settlement reversals are grouped

The system MUST NOT reverse only one ledger effect for a receipt that has both settlement effects. The current approved grouped-reversal contract is defined by `openspec/changes/repo-review-closure/specs/pilot-closure/spec.md`; until that implementation is verified and released, requests for either leg MUST remain fail-closed. Once available, either original ID resolves to the full receipt pair, and both compensating effects and exact allocation restorations commit atomically.

#### Scenario: Paired settlement is reversed after grouped support is available

- **GIVEN** a receipt has exactly one confirmed REDEEM debit and its confirmed settlement-generated EARN credit
- **WHEN** either original ledger entry is submitted to the reversal endpoint after grouped support is released
- **THEN** both effects are compensated atomically under the approved grouped-reversal contract

#### Scenario: Paired settlement remains blocked before grouped support is available

- **GIVEN** a receipt has both confirmed settlement effects and grouped reversal support is not released
- **WHEN** either ledger entry is submitted to the reversal endpoint
- **THEN** the request fails with `REVERSAL_REVIEW_REQUIRED` and neither settlement effect is changed
