# Staging smoke runtime reliability

## ADDED Requirements

### Requirement: Unexpected API failures expose safe correlated diagnostics

The API SHALL return a stable request identifier for unexpected failures and SHALL emit a server-side diagnostic containing the request identifier, route pattern, HTTP method, status, and exception classification without recording secrets, cookies, authorization material, query values, or sensitive request payloads.

#### Scenario: Unexpected exception during smoke-session bootstrap

- **WHEN** smoke-session bootstrap raises an unhandled application, database, or dependency exception
- **THEN** the response is a safe 500 error with a request identifier
- **AND** the server log contains the matching request identifier and actionable exception classification
- **AND** no authentication secret or session material is logged

### Requirement: Smoke-session bootstrap is reliable for configured smoke roles

The smoke-session endpoint SHALL create valid short-lived sessions for each configured smoke role and SHALL map expected credential, device, replay, and policy failures to explicit non-500 responses.

#### Scenario: Repeated role bootstrap

- **WHEN** the smoke workflow bootstraps each configured role using valid credentials and scoped device attestation where required
- **THEN** each request succeeds without an unexpected 500 response
- **AND** each session remains scoped to the configured tenant and role

#### Scenario: Expected bootstrap rejection

- **WHEN** a bootstrap request has invalid credentials, invalid attestation, or a replayed attestation
- **THEN** the API returns the documented 4xx response and safe error code
- **AND** no session is created

### Requirement: Customer ledger retrieval supports smoke reconciliation

The customer ledger endpoint SHALL retrieve the deterministic smoke customer's ledger and serialize all returned monetary values as integer kobo without unexpected 500 responses.

#### Scenario: Ledger reconciliation read

- **WHEN** an authorized smoke supervisor or administrator requests the smoke customer's ledger
- **THEN** the API returns a successful paginated ledger response
- **AND** ledger entries, allocations, restorations, credit lots, and SMS status fields are represented consistently
- **AND** the response supports post-run financial reconciliation

#### Scenario: Ledger dependency or data failure

- **WHEN** ledger retrieval encounters a database or dependency failure
- **THEN** the API emits a correlated safe diagnostic
- **AND** the response does not expose internal exception details or secrets
