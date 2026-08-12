## ADDED Requirements

### Requirement: Pilot operations summary is admin-only and source-backed

The system SHALL expose an admin-only pilot operations summary built from authoritative operational and financial signals.

#### Scenario: Admin can read pilot summary

- **WHEN** an authenticated admin requests the pilot operations summary
- **THEN** the response includes release metadata and source-backed aggregates for outbox backlog, SMS status, offline-sync failures, fraud backlog, report staleness, and ledger reconciliation status

#### Scenario: Non-admin access is denied

- **WHEN** a cashier or supervisor requests the pilot operations summary
- **THEN** the request is rejected with the existing authorization behavior
- **AND** no privileged operational details are disclosed

### Requirement: Production observability is release-aware and redacted

The system SHALL emit operational telemetry that identifies the running release without exposing secrets or protected user data.

#### Scenario: Logs contain release metadata and redaction

- **WHEN** the application or worker writes structured logs in a configured environment
- **THEN** each log stream includes service and release metadata suitable for pilot investigation
- **AND** secrets, cookies, tokens, credentials, and protected payload fields are redacted

#### Scenario: Sentry is optional and non-blocking

- **GIVEN** Sentry is not configured or is temporarily unavailable
- **WHEN** a financial workflow commits successfully
- **THEN** observability degradation does not roll back the committed financial effect
- **AND** the application remains able to serve requests and background work

### Requirement: Reconciliation signals surface mismatches without mutating evidence

The system SHALL detect and report reconciliation mismatches but SHALL NOT repair financial history from the operations endpoint.

#### Scenario: Reconciliation reports mismatch counts only

- **GIVEN** authoritative source totals and derived read-model or health checks disagree
- **WHEN** the pilot summary is generated
- **THEN** the response marks reconciliation as unhealthy and reports mismatch counts
- **AND** no ledger, lot, or read-model data is silently rewritten by that read path
