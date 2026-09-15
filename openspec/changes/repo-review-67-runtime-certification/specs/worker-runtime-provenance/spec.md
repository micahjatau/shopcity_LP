## ADDED Requirements

### Requirement: API and worker are certified as one release unit

Release certification MUST verify that the long-lived worker is deployed from the same immutable candidate SHA as the API and reports readiness from the actual worker entrypoint.

#### Scenario: Worker provenance matches

- **GIVEN** a candidate API and worker deployment
- **WHEN** certification checks runtime provenance
- **THEN** both runtimes report the exact candidate SHA
- **AND** the worker deployment identity and `SHOPCITY_WORKER_READY` evidence are recorded

#### Scenario: Worker is absent or mismatched

- **GIVEN** the worker is unavailable, not ready, or reports a different SHA
- **WHEN** release certification runs
- **THEN** certification fails before claiming SMS/outbox delivery readiness
- **AND** the evidence identifies the missing or mismatched provenance

### Requirement: Outbox-to-provider delivery is proven

Certification MUST exercise a controlled earn-to-outbox flow through the worker and verify terminal provider state without exposing secrets.

#### Scenario: Worker processes an earn event

- **GIVEN** an isolated staging fixture and a ready worker
- **WHEN** an earn creates an outbox event
- **THEN** the worker processes the event
- **AND** evidence records the terminal state, timestamps, candidate SHA, and safe identifiers
- **AND** credentials, cookies, tokens, and sensitive provider payloads are excluded
