## ADDED Requirements

### Requirement: Normalize Arkesel SMS delivery evidence

The system MUST send Arkesel V2 requests with the `api-key` header and documented JSON fields; for one recipient, `recipients` MUST contain that digits-only number in the required nested-array shape. An accepted Arkesel V2 send SHALL be recorded as `SENT` only when a non-empty message ID can be associated with the requested recipient. If Arkesel accepts the request but returns no trackable ID, the system MUST record a terminal failure with a non-sensitive instruction to verify provider history before retrying; it MUST NOT automatically retry the uncertain send. The system MUST map only recognized delivery evidence to terminal states. Raw provider responses, API keys, message contents, and unmasked phone numbers MUST NOT be logged or persisted as provider diagnostics.

#### Scenario: Arkesel accepts a send

- **WHEN** Arkesel receives the `api-key` header and a single recipient nested in the documented recipients array and reports a successful send with the message ID for that recipient
- **THEN** the notification is recorded as `SENT`
- **AND** the returned ID is retained as the provider message ID for DLR polling

#### Scenario: Arkesel accepts without a trackable recipient ID

- **WHEN** Arkesel reports a successful request but returns no non-empty message ID for the requested recipient
- **THEN** the notification is recorded as a terminal failure with an instruction to verify provider history before retry
- **AND** the system does not associate an ID for a different recipient or automatically resend the uncertain message

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
