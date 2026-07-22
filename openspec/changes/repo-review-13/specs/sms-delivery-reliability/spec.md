## ADDED Requirements

### Requirement: Production SMS mode is safe
The system MUST refuse to start the worker with deterministic SMS mode when `NODE_ENV` is production, and MUST validate the required configuration for the selected provider mode before creating the provider.

#### Scenario: deterministic mode is blocked in production
- **WHEN** the worker starts with `NODE_ENV=production` and `SMS_PROVIDER_MODE=deterministic`
- **THEN** startup MUST fail before any delivery work begins

#### Scenario: real mode requires endpoint configuration
- **WHEN** the worker starts with `SMS_PROVIDER_MODE=real`
- **THEN** the system MUST require a provider URL
- **AND THEN** startup MUST fail if the URL is missing

### Requirement: Delivery state matches provider evidence
The system MUST only record SENT, DELIVERED, or SUPPRESSED when the provider returns that outcome or a trusted callback confirms it, and MUST NOT infer delivery success from a send attempt alone.

#### Scenario: provider outcome is stored as reported
- **WHEN** an SMS provider returns a terminal delivery outcome
- **THEN** the system MUST persist that outcome without upgrading it to a stronger state

#### Scenario: no delivery is inferred from request acceptance alone
- **WHEN** a provider accepts a request without confirming delivery
- **THEN** the system MUST NOT record the message as DELIVERED

### Requirement: SMS retries are bounded
The system MUST stop automatic republishing of an SMS delivery after the configured maximum retry budget is exhausted and MUST mark the delivery as dead-lettered for manual recovery.

#### Scenario: repeated failures consume the retry budget
- **WHEN** an SMS delivery fails repeatedly during automatic recovery
- **THEN** the system MUST increment the attempt count and schedule the next retry until the maximum is reached

#### Scenario: exhausted retries become manual work
- **WHEN** the retry budget is exhausted
- **THEN** the system MUST mark the delivery as dead-lettered
- **AND THEN** it MUST NOT automatically republish that delivery again

### Requirement: Replay-safe outbox recovery
The system MUST be able to republish a recoverable outbox event without depending on BullMQ retaining a prior completed or failed job record, and MUST preserve provider idempotency for the underlying SMS send.

#### Scenario: a retained BullMQ job does not block recovery
- **WHEN** a recoverable outbox event is retried after a previous BullMQ job remains recorded
- **THEN** the system MUST still create an executable retry path for that outbox event

#### Scenario: the provider sees one logical send
- **WHEN** the same outbox event is republished after recovery
- **THEN** the system MUST use the same provider idempotency key for that logical SMS send
