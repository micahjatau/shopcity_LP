## ADDED Requirements

### Requirement: Select Twilio explicitly and preserve truthful acceptance

The system MUST select Twilio only when `SMS_PROVIDER_VENDOR=twilio` and `SMS_PROVIDER_MODE=real` are explicitly configured with validated credentials and exactly one sender source. The existing eBulkSMS default MUST remain unchanged. A successful Twilio message-create response with a valid message SID MUST be recorded as `SENT`; it MUST NOT be recorded as `DELIVERED` without authenticated delivery evidence.

#### Scenario: Twilio accepts a message

- **WHEN** Twilio returns a successful message-create response with a non-empty message SID
- **THEN** ShopCity stores the Twilio SID as the provider reference
- **AND** records the message as `SENT`, not `DELIVERED`

#### Scenario: Twilio returns an invalid success response

- **WHEN** Twilio's SDK returns success without a valid message SID
- **THEN** ShopCity records a terminal outcome requiring provider-history verification
- **AND** does not automatically submit the same event again

#### Scenario: eBulkSMS remains the default

- **WHEN** no provider vendor is configured
- **THEN** the provider factory continues to select eBulkSMS for real mode

### Requirement: Reserve Twilio submissions against duplicate outbox dispatch

Because the Twilio Messages create endpoint does not document provider-side idempotency, the system MUST atomically reserve the local tenant/outbox event before a Twilio request. A duplicate or recovered job MUST NOT issue a second request while the reservation is fresh. The freshness window MUST be at least the worker recovery threshold and MUST extend beyond the Twilio SDK request timeout by a safety margin. If the reservation remains after that window, the system MUST mark the message and outbox event terminal with an outcome-unknown diagnostic and require provider-history verification before any manual replay. Only an explicit HTTP 429 rejection MAY be retried automatically.

#### Scenario: Reserve before dispatch

- **GIVEN** a queued Twilio SMS event with no existing submission reservation
- **WHEN** the worker claims the event
- **THEN** it persists a reservation tied to the tenant and outbox event before calling Twilio
- **AND** proceeds with at most one active submission for that event

#### Scenario: Duplicate job encounters a fresh reservation

- **GIVEN** another worker has recently reserved the same Twilio outbox event
- **WHEN** a duplicate job is handled
- **THEN** the duplicate job does not call Twilio

#### Scenario: Recovery finds a stale reservation

- **GIVEN** a Twilio submission reservation remains beyond both the worker recovery threshold and the provider request timeout window
- **WHEN** outbox recovery handles the event
- **THEN** the SMS and outbox event become terminal/dead-lettered with an outcome-unknown diagnostic
- **AND** the worker does not automatically replay the provider request

#### Scenario: Recovery does not expire a reservation before the provider timeout window

- **GIVEN** the Twilio request timeout plus safety margin exceeds the worker recovery threshold
- **AND** a reservation is younger than the provider timeout window
- **WHEN** a duplicate or recovered job is handled
- **THEN** it does not call Twilio or mark the event outcome-unknown

#### Scenario: Twilio explicitly rate-limits before acceptance

- **GIVEN** Twilio returns HTTP 429 for a message-create request
- **WHEN** the provider result is persisted
- **THEN** the reservation is cleared and the existing bounded retry policy may schedule a retry

#### Scenario: Twilio request outcome is ambiguous

- **GIVEN** a transport timeout, connection failure, malformed successful response, or HTTP 5xx after a Twilio request begins
- **WHEN** the provider result is recorded
- **THEN** the attempt is terminal until Twilio history is checked
- **AND** no automatic retry creates a duplicate message

### Requirement: Do not infer Twilio delivery without callback evidence

Until a separately authenticated and replay-safe Twilio status-callback integration is implemented, Twilio messages MUST remain `SENT` after acceptance and MUST NOT be reported as `DELIVERED` based on the create response.

#### Scenario: Twilio acceptance without callbacks

- **GIVEN** a Twilio message-create request is accepted
- **AND** status-callback ingestion is not configured
- **WHEN** the message is inspected
- **THEN** its status is `SENT`
- **AND** no handset delivery claim is made
