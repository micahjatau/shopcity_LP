## Purpose

Keep receipt capture and approval compatibility routes delegated to canonical loyalty and approval orchestration.

## Requirements

### Requirement: Receipt capture uses canonical earning orchestration
The system SHALL route receipt capture and earn processing through the canonical loyalty service and SHALL NOT maintain a second receipt financial transaction path.

#### Scenario: Deprecated receipt capture delegates to loyalty
- **WHEN** a deprecated receipt capture request is accepted
- **THEN** the request is processed by the canonical earn orchestration used by `POST /api/v1/transactions/earn`

### Requirement: Receipt module does not export duplicate financial logic
The receipt module SHALL NOT register or export stale services that independently implement idempotency, duplicate receipt handling, review decisions, or approval-policy logic.

#### Scenario: Duplicate receipt service is removed or reduced
- **WHEN** receipt module providers are inspected
- **THEN** no provider contains independent receipt financial write orchestration outside the canonical loyalty and approval services
