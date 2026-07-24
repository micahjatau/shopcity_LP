## ADDED Requirements

### Requirement: Recovery only processes supported SMS work
The SMS recovery path MUST only republish supported `sms.send` work with a valid payload version and required fields.

#### Scenario: unsupported event types do not loop
- **WHEN** recovery encounters an outbox record whose event type is not supported for SMS delivery
- **THEN** the system MUST treat it as terminal work instead of repeatedly republishing it

#### Scenario: invalid payloads are rejected before resend
- **WHEN** recovery encounters an SMS payload with an unsupported version or missing required fields
- **THEN** the system MUST not republish the payload as if it were valid SMS work

### Requirement: Exhausted retries and poison events become terminal
The SMS recovery path MUST dead-letter exhausted deliveries and poison events, and MUST NOT automatically republish them again.

#### Scenario: retry budget exhaustion stops republishing
- **WHEN** a delivery reaches the configured maximum retry budget
- **THEN** the system MUST mark it as dead-lettered and stop automatic republishing

#### Scenario: poison events are terminalized
- **WHEN** recovery cannot reconstruct a valid SMS message from a poison outbox event
- **THEN** the system MUST move the event to a terminal failure state instead of looping forever
