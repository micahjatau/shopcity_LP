# frontend-contract-integration Specification

## ADDED Requirements

### Requirement: Generated OpenAPI client remains the contract source

The system SHALL consume the generated OpenAPI client through a thin frontend adapter rather than duplicated handwritten DTOs.

#### Scenario: Client generation stays authoritative

- **WHEN** backend contracts change and the client is regenerated
- **THEN** frontend adapters consume the generated output without introducing a second copy of the response schema

#### Scenario: Adapter centralizes cross-cutting concerns

- **WHEN** the frontend makes an authenticated API request
- **THEN** the adapter handles credentials, session behavior, CSRF-related wiring, and typed error mapping in one place

### Requirement: Idempotency and error mapping are preserved

The system SHALL preserve idempotency keys and map API failures into domain-appropriate frontend states.

#### Scenario: Uncertain retries reuse the same key

- **WHEN** a logical transaction is retried after an uncertain network outcome
- **THEN** the same idempotency key is retained for that logical operation

#### Scenario: Business-rule failures are mapped consistently

- **WHEN** the API returns validation, conflict, authorization, or connectivity failures
- **THEN** the UI receives a mapped domain error state rather than raw transport details
