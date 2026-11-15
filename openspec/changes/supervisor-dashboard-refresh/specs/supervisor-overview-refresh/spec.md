## Purpose

Ensure the Supervisor overview's manual Refresh action rebuilds and displays the latest branch-scoped report snapshot instead of merely re-reading stale derived data.

## ADDED Requirements

### Requirement: Refresh the authenticated Supervisor branch

The Supervisor overview refresh action SHALL invoke an authenticated refresh request that materializes only the branch assigned to the current Supervisor session before reloading the displayed snapshot.

#### Scenario: Refresh succeeds

- **GIVEN** a Supervisor is authenticated and assigned to branch A
- **WHEN** the Supervisor activates Refresh
- **THEN** the system durably records the refresh intent, materializes branch A, and reloads the snapshot after materialization completes
- **AND** the response exposes no cron secret or other branch's data

#### Scenario: Replay an already-completed refresh request

- **GIVEN** the same completed idempotency key and request are replayed
- **WHEN** the refresh request is received again
- **THEN** the system returns the original accepted result without creating another audit/outbox intent or repeating immediate materialization

#### Scenario: Refresh is outside the session branch scope

- **GIVEN** a Supervisor is assigned to branch A
- **WHEN** a refresh is requested for another branch
- **THEN** the request is rejected and no other branch is materialized

#### Scenario: Materialization fails

- **GIVEN** the refresh intent has been durably recorded
- **WHEN** branch materialization fails
- **THEN** the request returns a failure and the overview reports that refresh failed rather than claiming its values are current
