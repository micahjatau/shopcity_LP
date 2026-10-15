## ADDED Requirements

### Requirement: Normalize Arkesel SMS delivery evidence

The system MUST send Arkesel V2 requests with the `api-key` header and documented JSON fields; for one recipient, `recipients` MUST contain that digits-only number in the required nested-array shape. The system MUST treat an accepted Arkesel V2 send as `SENT`, retain the Arkesel message ID when provided, and map only recognized delivery evidence to terminal states. Raw provider responses, API keys, message contents, and unmasked phone numbers MUST NOT be logged or persisted as provider diagnostics.

#### Scenario: Arkesel accepts a send

- **WHEN** Arkesel receives the `api-key` header and a single recipient nested in the documented recipients array and reports a successful send with the message ID for that recipient
- **THEN** the notification is recorded as `SENT`
- **AND** the returned ID is retained as the provider message ID for DLR polling

#### Scenario: Arkesel confirms delivery

- **GIVEN** the DLR response is keyed by the matching provider message ID
- **WHEN** its status is `DELIVERED`
- **THEN** the notification transitions from `SENT` to `DELIVERED`

#### Scenario: Arkesel reports a non-terminal state

- **GIVEN** the DLR response is keyed by the matching provider message ID
- **WHEN** its status is `SUBMITTED` or `QUEUED`
- **THEN** the notification remains `SENT`

#### Scenario: Arkesel reports a terminal failure

- **GIVEN** the DLR response is keyed by the matching provider message ID
- **WHEN** its status is `NOT_DELIVERED`, `PROHIBITED`, or `EXPIRED`
- **THEN** the notification transitions from `SENT` to `FAILED`

#### Scenario: Arkesel returns no recognized delivery evidence

- **GIVEN** the DLR response is missing, unknown, or not keyed by the requested provider message ID
- **WHEN** the worker processes the response
- **THEN** the notification remains `SENT`
- **AND** it remains eligible for a later paced poll
