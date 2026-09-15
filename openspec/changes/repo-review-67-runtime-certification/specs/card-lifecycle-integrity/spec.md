## ADDED Requirements

### Requirement: Card identity is canonicalized server-side

Card lifecycle operations MUST normalize serial identity on the server using one shared rule before lookup, assignment, replacement, blocking, or unblocking.

#### Scenario: Equivalent serial forms are submitted

- **GIVEN** a serial value with surrounding whitespace or client-specific formatting
- **WHEN** a card lifecycle request is processed
- **THEN** the server applies the shared persisted-identity normalization consistently
- **AND** client-side formatting cannot bypass ownership checks

### Requirement: Replacement emits its required notification

A successful card replacement MUST create the required SMS/outbox notification exactly once and preserve replacement audit evidence.

#### Scenario: Card replacement succeeds

- **GIVEN** an authorized replacement request
- **WHEN** the replacement transaction commits
- **THEN** the replacement notification outbox event exists exactly once
- **AND** replacement audit evidence identifies the affected card and actor
