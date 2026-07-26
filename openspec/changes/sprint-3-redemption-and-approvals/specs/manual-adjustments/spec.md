## ADDED Requirements

### Requirement: Admin credit adjustment creates auditable credit
The system SHALL allow only admins to create manual credit adjustments that create an adjustment aggregate, credit ledger entry, new credit lot, audit record, idempotency response, outbox event, and SMS intent.

#### Scenario: Admin credits customer
- **WHEN** an admin submits a valid credit adjustment with a positive amount and mandatory reason
- **THEN** the system creates a new expiring credit lot and returns the confirmed adjustment transaction response

### Requirement: Admin debit adjustment uses FIFO allocation
The system SHALL allow only admins to create manual debit adjustments that consume active lots through the shared FIFO allocation engine and cannot exceed active balance.

#### Scenario: Admin debits customer
- **WHEN** an admin submits a valid debit adjustment within active balance
- **THEN** the system creates a debit adjustment ledger entry and immutable FIFO allocation rows

#### Scenario: Debit adjustment exceeds balance
- **WHEN** a debit adjustment amount exceeds active balance
- **THEN** the API returns `422 INSUFFICIENT_BALANCE` and creates no partial financial effect

### Requirement: Adjustment reason and bounds are enforced
The system SHALL require documented reasons, positive amounts, role authorization, and configured bounds for manual adjustments.

#### Scenario: Cashier attempts adjustment
- **WHEN** a cashier submits a manual adjustment request
- **THEN** the API returns `403` and creates no adjustment

#### Scenario: Missing reason is rejected
- **WHEN** an admin submits an adjustment without a non-empty reason
- **THEN** the API returns `400 VALIDATION_ERROR`
