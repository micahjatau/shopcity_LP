## MODIFIED Requirements

### Requirement: SMS provider idempotency by outbox event

The system MUST pass the outbox event ID to a provider-side idempotency field when that provider documents one. For Termii, whose documented send API does not provide an idempotency field, the system MUST reserve the tenant/outbox event locally before submission and MUST NOT automatically replay an ambiguous Termii submission. A stale reservation or ambiguous response MUST be marked outcome-unknown and require provider-history verification before manual replay.

#### Scenario: Duplicate dispatch returns same provider identity

- **WHEN** the same outbox event is retried with a provider that documents an idempotency field
- **THEN** the outbox event ID is passed in that field
- **AND** the provider resolves retries to the same external delivery identity

#### Scenario: Termii submission reservation prevents concurrent sends

- **WHEN** two workers attempt to submit the same Termii outbox event concurrently
- **THEN** only the worker that claims the local reservation sends the request
- **AND** the other worker does not submit a duplicate

#### Scenario: Termii submission outcome is ambiguous

- **WHEN** a Termii request times out, has a transport failure or HTTP 5xx, returns a successful HTTP response without a valid `code: ok` marker, or its local reservation becomes stale
- **THEN** the event is marked outcome-unknown and is not automatically resubmitted
- **AND** an operator is instructed to verify Termii history before any manual replay

## ADDED Requirements

### Requirement: Normalize Termii submission evidence truthfully

The system MUST send the existing single-recipient transactional SMS intent through Termii's standard send API using `type: plain` and `channel: dnd`, and MUST record a successful Termii response with `code: ok` only as `SENT`, never `DELIVERED`. It MUST retain `message_id` or `message_id_str` when returned, and MUST keep accepted messages `SENT` when no provider ID is returned. It MUST NOT send undocumented idempotency fields or expose API keys, message bodies, raw recipients, or provider response bodies in logs or persisted diagnostics. Only an explicit HTTP 429 response may be automatically retried; ambiguous outcomes and other provider rejections MUST be terminal.

#### Scenario: Termii accepts a message

- **WHEN** Termii returns HTTP success with `code: ok`
- **THEN** the notification is recorded as `SENT`
- **AND** a returned Termii message ID is retained as the provider reference
- **AND** the response is not treated as delivery evidence

#### Scenario: Termii accepts without a provider message ID

- **WHEN** Termii returns HTTP success with `code: ok` but no message ID
- **THEN** the notification remains `SENT` without a provider reference
- **AND** the system does not resend the accepted message or claim handset delivery

#### Scenario: Termii rejects a message

- **WHEN** Termii returns an unsuccessful HTTP response or a response code other than `ok`
- **THEN** the notification is recorded as `FAILED` with a normalized non-sensitive error
- **AND** the raw response is not logged or persisted

#### Scenario: Termii explicitly rate-limits a request

- **WHEN** Termii returns HTTP 429
- **THEN** the failure is classified as retryable by the bounded outbox retry policy

#### Scenario: Termii delivery evidence is unavailable to the worker

- **GIVEN** the Termii adapter does not consume a delivery callback or report endpoint
- **WHEN** Termii accepts a message
- **THEN** the message remains `SENT` until a separately specified, authenticated delivery-evidence path is implemented
