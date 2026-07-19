## ADDED Requirements

### Requirement: financial policy defaults are explicit and kobo-correct
The system MUST define policy thresholds in integer kobo and MUST keep runtime defaults, sample environment values, and public configuration aligned with the intended business policy.

#### Scenario: policy values reflect business thresholds
- **WHEN** the application loads its default policy configuration
- **THEN** the redemption and approval thresholds MUST correspond to the intended kobo amounts

#### Scenario: public configuration matches runtime policy
- **WHEN** a client reads public configuration
- **THEN** the policy values MUST match the active runtime defaults

### Requirement: the database schema is deployable and seeded
The system MUST represent schema changes with Prisma migrations and MUST provide repeatable seed data for the Phase 1 foundation records.

#### Scenario: fresh deployment can be provisioned
- **WHEN** a new database is initialized from scratch
- **THEN** the schema MUST be created through migrations and the seed data MUST be applied successfully

#### Scenario: migration history is tracked
- **WHEN** a schema change is prepared for release
- **THEN** the migration tracker MUST record the migration and any restore or backup verification

### Requirement: browser authentication is coherent and safe
The system MUST expose safe session and user responses, MUST keep session renewal semantics internally consistent, and MUST enforce CSRF validation for unsafe browser requests.

#### Scenario: auth responses hide internal secrets
- **WHEN** a client calls the authentication endpoints
- **THEN** the response MUST not expose session hashes, internal session identifiers, or other secret material

#### Scenario: unsafe requests require CSRF proof
- **WHEN** a browser performs a state-changing request
- **THEN** the request MUST present a valid CSRF token that matches the server-side session state

#### Scenario: production cookies are hardened
- **WHEN** the application runs in production
- **THEN** session cookies MUST be marked Secure and use an appropriate same-site policy

### Requirement: the OpenAPI contract reflects the real API shape
The system MUST document request and response DTOs with meaningful schema metadata and MUST publish the runtime envelope shape for the primary API surfaces.

#### Scenario: generated schemas include DTO fields
- **WHEN** OpenAPI is exported
- **THEN** the documented request schemas MUST include the actual DTO properties instead of empty placeholder objects

#### Scenario: response envelopes are documented
- **WHEN** OpenAPI is exported for a successful or failed endpoint
- **THEN** the success and error envelopes MUST describe the runtime metadata and payload shape

### Requirement: integration tests exercise real persistence
The system MUST validate Phase 1 flows with tests that use real database behavior for the persistence and HTTP boundary that matters.

#### Scenario: duplicate customer registration is real
- **WHEN** the same customer phone is registered twice against the same tenant
- **THEN** the second request MUST fail using the real persistence rules

#### Scenario: card replacement preserves history
- **WHEN** a card is replaced
- **THEN** the previous card MUST remain in history and the replacement MUST be linked correctly

### Requirement: domain invariants are enforced consistently
The system MUST enforce tenant scope, entity state, and enum validity for customers, cards, users, branches, and devices.

#### Scenario: blocked customers cannot surface active cards
- **WHEN** a customer is blocked
- **THEN** card lookup MUST reject the customer’s active card as unavailable

#### Scenario: tenant scope is preserved
- **WHEN** a user, branch, device, customer, or card is created or updated
- **THEN** the entity MUST remain scoped to the tenant that owns the request context

#### Scenario: invalid state values are rejected early
- **WHEN** a client submits an invalid role or status
- **THEN** validation MUST fail before the request reaches persistence

### Requirement: mutations, audit, and traceability are atomic
The system MUST record audit entries consistently with the mutations they describe and MUST carry the request identifier through application-visible audit data.

#### Scenario: a failed audit does not orphan state
- **WHEN** a mutation cannot be recorded with its audit entry
- **THEN** the operation MUST not leave partial or contradictory state behind

#### Scenario: request IDs are traceable
- **WHEN** the system records an auditable action
- **THEN** the stored audit entry MUST include the request identifier when one is available

### Requirement: baseline quality gates stay enforced
The system MUST run the repository’s baseline quality checks for build, formatting, linting, type checking, schema validation, contract drift, and architecture boundaries.

#### Scenario: CI catches contract or schema drift
- **WHEN** the public API contract or schema changes unexpectedly
- **THEN** the baseline CI gate MUST fail until the change is reviewed

#### Scenario: architecture violations fail validation
- **WHEN** a feature module imports a forbidden peer or shared layer
- **THEN** the architecture check MUST fail
