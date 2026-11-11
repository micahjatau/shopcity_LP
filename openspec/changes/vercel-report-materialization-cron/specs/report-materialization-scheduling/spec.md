## Purpose

Ensure the deployed ShopCity API periodically refreshes its derived report snapshots and makes the outcome observable without exposing an unauthenticated trigger or changing authoritative financial records.

## ADDED Requirements

### Requirement: Scheduled report materialization

The production system SHALL periodically invoke the existing report materialization sweep so report read models are refreshed from authoritative source data.

#### Scenario: Scheduled sweep succeeds

- **WHEN** the configured production schedule invokes report materialization
- **THEN** the system rebuilds reports for the bounded tenant batch and records completed materialization state from the same production database used by the API

#### Scenario: No report source activity exists for the current date

- **WHEN** materialization completes and no source activity exists for the current business date
- **THEN** the system still records a current materialization state and the overview reports no activity rather than presenting a stale day as current

### Requirement: Authenticate scheduled materialization requests

The materialization trigger SHALL reject requests unless they present the configured cron bearer secret, and SHALL fail closed when that secret is absent.

#### Scenario: Valid scheduled request

- **WHEN** a request presents the configured bearer secret
- **THEN** the system permits the report sweep to run

#### Scenario: Missing or invalid scheduled secret

- **WHEN** a request omits or presents an invalid bearer secret, or the expected secret is not configured
- **THEN** the system rejects the request without invoking materialization

### Requirement: Report materialization failure visibility

The scheduled invocation SHALL return a failure response when a sweep fails and SHALL NOT report a successful run for incomplete materialization.

#### Scenario: Sweep fails

- **WHEN** the report materializer or database fails during a scheduled sweep
- **THEN** the invocation returns a non-success response and the materialization state remains failed or retryable according to the materializer's existing behavior

### Requirement: Preserve financial source data

Scheduled report materialization SHALL update only derived report read models and materialization state; it SHALL NOT create, alter, or delete authoritative financial source records.

#### Scenario: Periodic report rebuild

- **WHEN** a scheduled sweep rebuilds report rows
- **THEN** receipts, ledger entries, redemptions, and approvals remain unchanged
