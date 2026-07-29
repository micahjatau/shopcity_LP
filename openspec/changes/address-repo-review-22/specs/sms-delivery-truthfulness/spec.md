## ADDED Requirements

### Requirement: SMS delivery truth applies to generalized ownership
The system SHALL apply provider-truthful SMS status handling to delivery records owned by receipt-backed earns/redemptions and non-receipt reversals or adjustments.

#### Scenario: Non-receipt notification is sent
- **WHEN** a reversal or adjustment SMS is dispatched without a receipt reference
- **THEN** its persisted status follows the same provider evidence rules as receipt-backed SMS messages

### Requirement: Outbox idempotency survives receipt uniqueness removal
The system SHALL keep outbox event identity as the SMS provider idempotency key after receipt-level SMS uniqueness is removed.

#### Scenario: Multiple receipt-related notifications dispatch
- **WHEN** multiple outbox events relate to one receipt
- **THEN** each event maps to its own replay-safe provider idempotency key and delivery record
