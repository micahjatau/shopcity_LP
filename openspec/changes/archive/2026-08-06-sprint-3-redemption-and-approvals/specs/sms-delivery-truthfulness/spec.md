## ADDED Requirements

### Requirement: Redemption SMS uses transactional outbox

The system MUST create redemption SMS intent through the transactional outbox only after a redemption is confirmed.

#### Scenario: Confirmed redemption queues SMS

- **WHEN** a redemption commits a debit ledger entry
- **THEN** the same transaction persists one outbox event and one SMS intent for the redemption confirmation

#### Scenario: Pending redemption creates no confirmation SMS

- **WHEN** a redemption is accepted as pending approval
- **THEN** the system creates no redemption-confirmed SMS intent before approval execution

### Requirement: Reversal and adjustment SMS states remain truthful

The system MUST use the existing provider truthfulness rules for reversal and adjustment SMS messages and MUST NOT mark them delivered without provider evidence.

#### Scenario: Reversal SMS provider cannot confirm delivery

- **WHEN** the provider cannot confirm delivery for a reversal notification
- **THEN** the SMS record is stored as SENT, FAILED, or SUPPRESSED, not DELIVERED

### Requirement: SMS failure does not invalidate Sprint 3 financial transactions

The system MUST keep confirmed redemption, reversal, and adjustment transactions valid when SMS delivery later fails.

#### Scenario: Adjustment SMS fails

- **WHEN** an adjustment is committed and its SMS later fails in the worker
- **THEN** the adjustment ledger entry, lot movement, audit record, and idempotency response remain valid
