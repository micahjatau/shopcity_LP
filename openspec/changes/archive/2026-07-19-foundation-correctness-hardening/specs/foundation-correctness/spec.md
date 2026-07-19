## ADDED Requirements

### Requirement: canonical API contract and envelope
The system MUST expose a single canonical `/api/v1` contract without double-prefixing versioned routes, and it MUST document the success and error envelope shapes used at runtime.

#### Scenario: generated contract path is singular
- **WHEN** the OpenAPI document is exported
- **THEN** versioned routes SHALL appear once under the `/api/v1` server/base path

#### Scenario: success envelope is documented
- **WHEN** Swagger is rendered for a successful endpoint
- **THEN** the response schema SHALL show the runtime success envelope fields

### Requirement: request correlation metadata
The system MUST generate or preserve a request identifier for every API response and MUST include that identifier in error payloads.

#### Scenario: request ID is returned
- **WHEN** a client calls any API endpoint
- **THEN** the response SHALL include a request identifier in its metadata

#### Scenario: error payload carries request ID
- **WHEN** the system returns an error response
- **THEN** the error payload SHALL include the same request identifier for traceability

### Requirement: health endpoint correctness
The system MUST expose unauthenticated liveness and readiness endpoints, MUST return 503 when readiness dependencies fail, and MUST verify Redis with an actual `PING`.

#### Scenario: readiness dependency fails
- **WHEN** PostgreSQL or Redis is unavailable
- **THEN** the readiness endpoint SHALL return HTTP 503

#### Scenario: Redis health is real
- **WHEN** readiness checks Redis
- **THEN** the system SHALL perform a Redis protocol ping rather than only opening a TCP socket

### Requirement: production Swagger gating
The system MUST disable Swagger in production unless documentation is explicitly enabled by configuration.

#### Scenario: production hides docs by default
- **WHEN** the application runs in production with no override
- **THEN** the Swagger UI SHALL not be served

#### Scenario: non-production can expose docs
- **WHEN** the application runs outside production or with an explicit docs flag
- **THEN** Swagger MAY be served

### Requirement: stable domain errors
The system MUST return stable domain error codes for known business and infrastructure failures rather than only generic HTTP-family labels.

#### Scenario: duplicate receipt uses domain code
- **WHEN** a duplicate receipt is rejected
- **THEN** the error SHALL use a stable receipt-specific code

#### Scenario: forbidden action uses stable code
- **WHEN** a user is blocked by role or state
- **THEN** the error SHALL return a stable authorization code that the frontend can map deterministically

### Requirement: architecture boundary enforcement
The system MUST enforce module boundaries in CI so feature modules cannot import forbidden peers or shared layers outside the approved graph.

#### Scenario: forbidden module import is blocked
- **WHEN** a module imports another module outside the approved dependency graph
- **THEN** the architecture check SHALL fail the build

#### Scenario: shared layers remain allowed
- **WHEN** a module imports approved shared infrastructure or common code
- **THEN** the architecture check SHALL pass

### Requirement: quality gate coverage
The system MUST run OpenAPI drift, lint, and formatting checks as part of the baseline quality gate.

#### Scenario: contract drift is detected
- **WHEN** the implementation changes the public API contract
- **THEN** the OpenAPI drift check SHALL fail until the change is reviewed and accepted

#### Scenario: formatting issues fail validation
- **WHEN** source or doc formatting drifts from the repo standard
- **THEN** the formatting check SHALL fail
