## ADDED Requirements

### Requirement: Normalize Africa's Talking submission evidence truthfully

The system MUST treat Africa's Talking recipient status codes `100` (Processed), `101` (Sent), and `102` (Queued) as provider acceptance and record the notification as `SENT`, never `DELIVERED`. It MUST retain a matching recipient `messageId` when provided. Unknown or unsuccessful recipient status codes MUST NOT be interpreted as acceptance, and raw provider payloads MUST NOT be logged or persisted as diagnostics.

#### Scenario: Africa's Talking accepts a recipient

- **WHEN** the matching recipient has a recognized accepted status code and a provider `messageId`
- **THEN** the notification is recorded as `SENT`
- **AND** the matching `messageId` is retained as the provider reference

#### Scenario: Africa's Talking accepts without a provider ID

- **WHEN** the matching recipient has a recognized accepted status code but no provider `messageId`
- **THEN** the notification remains `SENT`
- **AND** no delivery is inferred from the missing reference

#### Scenario: Africa's Talking rejects a recipient

- **WHEN** the matching recipient has a rejection or unknown status code
- **THEN** the notification is recorded as `FAILED` with a normalized, non-sensitive failure category
- **AND** it is not treated as sent or delivered
