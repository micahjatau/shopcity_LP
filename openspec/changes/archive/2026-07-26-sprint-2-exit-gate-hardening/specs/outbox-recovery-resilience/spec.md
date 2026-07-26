## ADDED Requirements

### Requirement: Backfill missing SMS delivery records
The system MUST create or recover an SmsMessage record for a recoverable outbox event before dispatch if the record is absent and the payload is valid.

#### Scenario: Historical outbox row has no SMS record
- **WHEN** a recoverable outbox row is claimed without an SmsMessage row
- **THEN** the worker creates the delivery record from persisted payload data before sending

### Requirement: Recover published or stale non-terminal work
The system MUST re-enqueue PUBLISHED, FAILED, and stale QUEUED outbox work when the related SMS message is not terminal and the recovery threshold has elapsed.

#### Scenario: Redis loses an in-flight job
- **WHEN** an outbox row is PUBLISHED and the SMS record is still QUEUED after the recovery threshold
- **THEN** the worker re-enqueues the job exactly once

### Requirement: Concurrent workers do not duplicate delivery
The system MUST ensure that multiple worker instances can scan the same set of recoverable rows without creating duplicate SMS deliveries.

#### Scenario: Two workers claim the same recovery batch
- **WHEN** two workers run recovery at the same time
- **THEN** each outbox row is processed by at most one worker
