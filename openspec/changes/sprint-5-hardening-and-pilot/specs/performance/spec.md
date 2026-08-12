## ADDED Requirements

### Requirement: Pilot performance uses reproducible synthetic load

The system SHALL validate pilot readiness with reproducible load tests that use synthetic credentials, cards, and receipts.

#### Scenario: Load uses synthetic data only

- **WHEN** k6 performance scenarios are executed
- **THEN** they authenticate with synthetic test users and data
- **AND** no real customer credentials or production receipt identities are written to performance artifacts

### Requirement: Core pilot paths meet agreed thresholds

The system SHALL evaluate core pilot journeys against explicit latency and failure-rate thresholds.

#### Scenario: Lookup and checkout thresholds pass

- **WHEN** card lookup, earn, and redeem pilot scenarios complete
- **THEN** their measured failure rate stays below the agreed threshold
- **AND** their latency metrics satisfy the agreed p95 limits for pilot certification

#### Scenario: Report isolation does not overwhelm checkout

- **GIVEN** admin report refresh or report reads are running concurrently with checkout traffic
- **WHEN** the report-isolation scenario completes
- **THEN** checkout latency does not exceed the approved isolation multiplier
- **AND** no financial invariants fail

### Requirement: Performance evidence includes post-load financial validation

The system SHALL reject a performance pass if the system is fast but leaves inconsistent financial state.

#### Scenario: Load result requires reconciliation success

- **WHEN** a financial load scenario completes
- **THEN** post-load validation confirms receipt, ledger, lot, and reconciliation invariants remain valid
- **AND** a scenario is not accepted as passing if invariant validation fails even when HTTP latency appears healthy
