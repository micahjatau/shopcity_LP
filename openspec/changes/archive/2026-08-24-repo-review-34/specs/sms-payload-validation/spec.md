## ADDED Requirements

### Requirement: Every active SMS template has a strict payload schema

The system SHALL define discriminated, versioned payload schemas for `earn-confirmed`, `redemption-confirmed`, `transaction-reversed`, and `balance-adjusted` templates.

#### Scenario: Missing required financial field fails validation

- **WHEN** an SMS payload is missing a required amount, balance, transaction ID, customer relationship, or expiry value used by its template
- **THEN** payload validation MUST fail before rendering or provider invocation.

#### Scenario: Invalid numeric amount fails safely

- **WHEN** an SMS payload contains an invalid or negative integer amount string
- **THEN** validation MUST return a classified payload error and MUST NOT throw an unclassified BigInt conversion error.

### Requirement: Outbox SMS intents use validated builders

The system SHALL create active SMS outbox payloads through template-specific payload-builder functions and reject direct unvalidated raw payload construction.

#### Scenario: Builder enforces template consistency

- **WHEN** code creates an outbox SMS intent
- **THEN** the payload builder MUST enforce template name, version, required IDs, phone number, and financial fields.

### Requirement: Malformed SMS payloads are terminal

The SMS worker SHALL classify every `SmsPayloadError` as terminal, dead-letter malformed payloads on the first processing attempt, and skip provider calls.

#### Scenario: Provider is not called for malformed payload

- **WHEN** the worker receives an invalid SMS payload
- **THEN** the worker MUST store a stable failure code and validation detail, MUST NOT call the provider, and MUST NOT retry the malformed payload.
