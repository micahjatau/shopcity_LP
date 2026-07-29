## ADDED Requirements

### Requirement: SMS messages are uniquely owned by outbox event
The system SHALL use the outbox event identity as the unique replay-safe owner of an SMS delivery intent.

#### Scenario: Same outbox event is retried
- **WHEN** SMS dispatch is retried for the same outbox event
- **THEN** the system reuses or updates the same SMS delivery record rather than creating a duplicate delivery intent

### Requirement: SMS messages can reference non-receipt transactions
The system SHALL allow SMS delivery records for financial events that do not have their own receipt, including reversals and manual adjustments.

#### Scenario: Manual adjustment notification is created
- **WHEN** a manual adjustment requires customer notification
- **THEN** the SMS delivery record can be persisted without a receipt reference

### Requirement: Multiple SMS messages can relate to one receipt
The system SHALL allow multiple SMS delivery records to relate to the same receipt when they correspond to different outbox events or financial actions.

#### Scenario: Receipt has earn and reversal notifications
- **WHEN** an earn notification and a later reversal notification both relate to one receipt
- **THEN** both SMS delivery records can persist because their outbox event identities differ

### Requirement: Existing delivery truth remains unchanged
The system SHALL preserve truthful provider-reported SMS statuses while changing ownership and reference fields.

#### Scenario: Provider cannot confirm delivery
- **WHEN** a provider returns only send acceptance for a receipt-backed or non-receipt SMS
- **THEN** the SMS status is not marked `DELIVERED` without delivery evidence
