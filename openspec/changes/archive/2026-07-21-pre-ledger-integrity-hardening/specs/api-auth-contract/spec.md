## ADDED Requirements

### Requirement: Bearer-authenticated unsafe requests do not require CSRF

The system SHALL allow unsafe requests authenticated with bearer session tokens to proceed without CSRF verification.

#### Scenario: Bearer request bypasses CSRF

- **WHEN** a client sends a POST request with a valid bearer session token and no CSRF cookie or header
- **THEN** the request is authorized if the session is valid and the CSRF guard does not reject it

### Requirement: Cookie-authenticated unsafe requests require CSRF

The system SHALL require matching CSRF cookie and header values for unsafe requests authenticated with session cookies.

#### Scenario: Cookie request requires CSRF

- **WHEN** a client sends a POST request using a session cookie without a matching CSRF header and cookie pair
- **THEN** the request is rejected with a CSRF failure

### Requirement: OpenAPI documents the transport-specific auth contract

The system SHALL document bearer and cookie session usage so API clients can determine when CSRF is required.

#### Scenario: Receipt endpoint documents contract

- **WHEN** the OpenAPI document is generated for the receipt capture endpoint
- **THEN** the auth contract indicates the unsafe-request CSRF behavior and the supported bearer or session authentication modes
