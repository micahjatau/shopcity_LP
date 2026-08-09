## ADDED Requirements

### Requirement: Eligible earn reversals complete atomically

The system SHALL reverse an eligible, unused earn transaction by creating the compensating reversal ledger effect, immutable evidence, audit records, outbox intent, SMS intent, and an idempotent 201 response.

#### Scenario: Safe earn reversal succeeds

- **WHEN** an eligible supervisor reverses an unused earn transaction
- **THEN** the system creates the compensating reversal effect and returns a successful reversal response

### Requirement: Reversal requests are unique per original transaction

The system SHALL prevent multiple automatic reversals for the same original transaction and SHALL return a stable conflict or the original idempotent response for repeated requests as documented by the API.

#### Scenario: Duplicate reversal is submitted

- **WHEN** a confirmed transaction has already been reversed
- **THEN** the system creates no second reversal effect and returns the documented stable response

### Requirement: Manual adjustment policy is server-authoritative

The system SHALL derive manual adjustment expiry from validated server configuration and SHALL enforce the configured amount ceiling for credit and debit adjustments.

#### Scenario: Caller supplies expiry months

- **WHEN** a client submits an adjustment request with an expiry override
- **THEN** the system ignores the override and uses the configured expiry policy

#### Scenario: Adjustment exceeds configured ceiling

- **WHEN** an adjustment amount exceeds the configured ceiling
- **THEN** the system rejects the request without creating a financial effect

### Requirement: Receiptless transaction read models are truthful

The system SHALL not fabricate receipt-specific identifiers for receiptless transactions and SHALL expose explicit transaction-type details for reversals and adjustments.

#### Scenario: Adjustment is retrieved

- **WHEN** a receiptless adjustment transaction is returned by the read model
- **THEN** receipt-specific fields remain null and the response includes adjustment-specific details

### Requirement: Rejected redemptions do not claim expiry

The system SHALL not record redemption.expired audit evidence when a redemption is rejected for a non-expiry reason.

#### Scenario: Redemption is rejected

- **WHEN** a supervisor rejects a pending redemption
- **THEN** the audit trail records the rejection only and does not record an expiry event
