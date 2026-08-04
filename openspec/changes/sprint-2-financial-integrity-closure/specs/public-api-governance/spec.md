## ADDED Requirements

### Requirement: Response envelope decision

The system SHALL have a recorded architecture decision for the public response envelope and error shape before Sprint 2 is closed.

#### Scenario: Envelope ADR recorded

- **WHEN** API governance artifacts are reviewed
- **THEN** an ADR MUST state whether the implementation keeps `{ success, data, meta }` and `{ success, error, meta }` or changes to the TRD's envelope and RFC 7807-style errors

#### Scenario: TRD alignment recorded

- **WHEN** the ADR chooses the implemented envelope
- **THEN** the TRD or follow-up documentation MUST be updated or explicitly referenced as superseded for response envelope details

### Requirement: Canonical financial workflows

The system SHALL identify one canonical public earn workflow and one canonical public approval decision workflow for new frontend integration.

#### Scenario: Canonical earn endpoint

- **WHEN** frontend integration documentation references receipt earning
- **THEN** it MUST identify `POST /transactions/earn` as the canonical earn endpoint

#### Scenario: Canonical approval endpoint

- **WHEN** frontend integration documentation references approval decisions
- **THEN** it MUST identify `POST /approvals/{id}/decision` as the canonical approval decision endpoint

### Requirement: Duplicate endpoint deprecation

The system SHALL either remove duplicate public financial endpoints or mark them deprecated with canonical replacements.

#### Scenario: Receipt write endpoint retained

- **WHEN** `POST /receipts` remains exposed
- **THEN** OpenAPI and documentation MUST mark it deprecated or not recommended for new frontend integration and MUST point to `POST /transactions/earn`

#### Scenario: Receipt approval endpoints retained

- **WHEN** receipt-specific approve/reject endpoints remain exposed
- **THEN** OpenAPI and documentation MUST mark them deprecated or not recommended for new frontend integration and MUST point to `POST /approvals/{id}/decision`

### Requirement: Generated API artifacts updated

The system SHALL regenerate and verify public API artifacts after API governance changes.

#### Scenario: OpenAPI updated

- **WHEN** endpoint deprecation, error code, or envelope documentation changes
- **THEN** `docs/api/openapi.json` MUST be regenerated and pass OpenAPI lint and diff checks

#### Scenario: Client/examples updated when present

- **WHEN** Orval client, Bruno examples, or error mapping documentation are present for affected endpoints
- **THEN** those artifacts MUST be regenerated or updated to match the canonical workflow decision
