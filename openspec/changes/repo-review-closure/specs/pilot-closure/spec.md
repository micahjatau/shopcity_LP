# Pilot Closure Requirements

## ADDED Requirements

### Requirement: Stable adjustment retry identity

The system SHALL associate an adjustment idempotency identity and effective timestamp with a logical draft operation and reuse them when retrying after an ambiguous outcome, including after a page reload within the server retention window. The browser SHALL NOT persist raw adjustment/customer payloads to retain this identity.

#### Scenario: Adjustment committed but response lost

- **WHEN** an authorized operator retries the same unchanged adjustment after an ambiguous response
- **THEN** the request reuses the original identity and the system records at most one adjustment

#### Scenario: Page reload after an ambiguous outcome

- **WHEN** the adjustment page reloads before the outcome is resolved and the operator re-enters the exact same draft within the server idempotency retention window
- **THEN** the request reuses the original idempotency key and effective timestamp without exposing the raw payload in browser storage
- **AND** the server returns the original result or completes the same logical operation without a duplicate ledger effect

#### Scenario: Retry identity is expired or unavailable

- **WHEN** the prior outcome is unresolved but its retry identity has expired or cannot be recovered
- **THEN** the system does not silently create a new identity for the same draft and directs the operator to resolve the prior outcome before submitting again

#### Scenario: Draft payload changes

- **WHEN** an operator materially changes or cancels the draft
- **THEN** the changed operation does not accidentally replay the prior adjustment result

### Requirement: Paired-settlement reversal is grouped and atomic

The system SHALL treat a confirmed receipt containing exactly one confirmed REDEEM debit and its associated confirmed automatic net-spend EARN credit as one settlement reversal unit. A request using either original transaction ID SHALL resolve the receipt pair and reverse both effects in one serializable transaction. The system SHALL remove the exact recorded Earn amount and restore the exact historical redemption allocations; it SHALL NOT recalculate Earn or allocate against today's FIFO state. Both compensating ledger entries remain append-only. The response SHALL include the receipt ID, both original IDs, both compensating IDs, amount of Earn credit removed, amount of redeemed credit restored, restored allocations, and final active balance. One grouped audit event SHALL link both pairs of ledger entries, and one customer SMS SHALL be queued.

#### Scenario: Eligible paired settlement is reversed

- **GIVEN** both original entries are confirmed, share the same tenant, customer, and receipt, and the Earn entry is the settlement-generated net-spend credit paired with the Redeem entry
- **AND** the Earn lot is complete, unexpired, and unused, and every historical redemption allocation is coherent, unexpired, and fully restorable
- **WHEN** an authorized operator requests reversal using either original transaction ID
- **THEN** both compensating entries and all exact allocation restorations commit together or none commit
- **AND** the response identifies both original/reversal pairs, removed Earn kobo, restored redemption kobo, restored allocations, and final balance
- **AND** one grouped audit event and one customer SMS are recorded

#### Scenario: Grouped reversal retry and concurrent requests

- **GIVEN** a grouped reversal has completed
- **WHEN** the same actor retries the same reason with the same idempotency key using either original transaction ID
- **THEN** the original grouped response is returned without duplicate ledger entries, restorations, audit events, or SMS messages
- **WHEN** concurrent requests attempt to reverse either leg
- **THEN** at most one grouped reversal commits

#### Scenario: Pair or reversal history is malformed

- **GIVEN** the receipt has a missing, extra, unconfirmed, mismatched, or historically inconsistent settlement effect, including one leg already reversed without its partner
- **WHEN** an operator requests grouped reversal
- **THEN** the request returns REVERSAL_REVIEW_REQUIRED without writing any compensating entry, restoration, audit event, or SMS

#### Scenario: Earn or redeemed credit is not safely reversible

- **GIVEN** the Earn lot is missing, inconsistent, expired, or partially/fully consumed, or any original redemption allocation is missing, inconsistent, expired, already partially restored, or exceeds the source lot's original amount
- **WHEN** an operator requests grouped reversal
- **THEN** the request returns REVERSAL_REVIEW_REQUIRED without changing the ledger, lots, redemption, or balance

#### Scenario: Notification delivery fails after commit

- **GIVEN** the grouped financial reversal and durable notification intent have committed
- **WHEN** asynchronous SMS/outbox delivery fails
- **THEN** the committed reversal remains unchanged and notification retry/failure is handled separately from financial history

### Requirement: DEVICE_TOKEN runtime certification

The project SHALL define and execute an authorized staging acceptance path using DEVICE_TOKEN rather than treating legacy HMAC smoke as certification of the target path.

#### Scenario: Authorized physical POS smoke

- **WHEN** approved staging configuration, authorized accounts, and a physical target device are available
- **THEN** the smoke verifies provisioning, device-bound cashier session, scope/CSRF, revocation and re-pair behavior and records its evidence

### Requirement: Provider delivery truthfulness

The system SHALL distinguish provider acceptance or SENT status from confirmed delivery and SHALL NOT automatically resend uncertain provider acceptance where duplicate delivery is possible.

#### Scenario: Provider has no DLR

- **WHEN** a provider accepts a message but offers no delivery receipt
- **THEN** reports and operator interfaces do not claim DELIVERED

#### Scenario: Acceptance is untrackable

- **WHEN** Arkesel acceptance cannot be attributed to a trackable ID for the requested recipient
- **THEN** the result is recorded as uncertain/terminal and is not automatically retried

### Requirement: Approved, versioned consent evidence

The registration experience SHALL display approved privacy/consent language and choices from an authoritative versioned source, and persist the matching notice version and selected consent values.

#### Scenario: Review registration consent

- **WHEN** a supervisor reviews a pending customer registration
- **THEN** loyalty-program and marketing-message choices are visible before submission

#### Scenario: Persist consent

- **WHEN** registration is completed
- **THEN** the recorded version and choices match the approved text and choices shown to the operator/customer

### Requirement: Deployment environment isolation

Deployment identity SHALL be supplied and validated per deployment environment rather than selected through committed tenant/project IDs or Git-ref-specific hardcoding.

#### Scenario: Missing or mismatched environment identity

- **WHEN** required deployment identity is missing or conflicts with the expected environment
- **THEN** configuration fails safely rather than routing the application to an unintended environment

### Requirement: Truthful branch-creation retry contract

Branch creation SHALL provide consistent retry semantics between the client and backend.

#### Scenario: Replayed logical create

- **WHEN** the same branch-create operation is submitted again after an ambiguous outcome
- **THEN** the system returns the original result without creating a duplicate, or the client does not claim idempotency and follows an explicitly safe recovery contract
