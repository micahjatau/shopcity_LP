## ADDED Requirements

### Requirement: Immediate redemption confirms atomically
The system SHALL confirm eligible online redemption requests in one transaction that creates receipt evidence, redemption intent, debit ledger entry, FIFO allocations, lot updates, audit records, idempotency response, outbox event, and SMS intent.

#### Scenario: Cashier redemption succeeds
- **WHEN** an authorized cashier submits a valid redemption request with an idempotency key
- **THEN** the API returns `201` with transaction ID, redemption ID, receipt ID, redeemed amount, maximum allowed amount, remaining balance, allocation summary, and queued SMS status

### Requirement: Redemption policy is server-authoritative
The system SHALL derive active balance, basket cap, maximum allowed redemption, same-purchase eligibility, device/branch eligibility, and approval state on the backend.

#### Scenario: Requested amount exceeds basket cap
- **WHEN** a redemption request exceeds the configured basket percentage cap
- **THEN** the API returns `422 REDEMPTION_EXCEEDS_BASKET_CAP` with the authoritative maximum so the client can correct the request

#### Scenario: Same-purchase credit would be consumed
- **WHEN** a redemption would consume credit earned on the same receipt purchase
- **THEN** the API returns `422 SAME_PURCHASE_REDEMPTION_NOT_ALLOWED` and creates no financial effect

### Requirement: High-value redemption creates pending approval without financial effect
The system SHALL create a redemption intent and approval for redemption requests above the configured approval threshold without creating a debit ledger entry, allocations, lot mutations, outbox financial confirmation, or SMS financial confirmation.

#### Scenario: Redemption requires approval
- **WHEN** a valid redemption request exceeds the approval threshold
- **THEN** the API returns `202` with pending state, redemption ID, approval ID, requested amount, maximum allowed amount at request, and reason code

### Requirement: Redemption idempotency is stable
The system SHALL return the original redemption response for repeated requests with the same idempotency key and same payload, and SHALL reject conflicting payload reuse.

#### Scenario: Same key repeats confirmed redemption
- **WHEN** the same redemption request is retried with the same idempotency key
- **THEN** the API returns the original response and creates no duplicate financial effect

#### Scenario: Same key conflicts
- **WHEN** a different redemption payload reuses an existing idempotency key
- **THEN** the API returns `409 IDEMPOTENCY_CONFLICT`
