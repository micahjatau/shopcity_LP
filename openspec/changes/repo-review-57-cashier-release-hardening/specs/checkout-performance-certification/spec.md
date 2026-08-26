## ADDED Requirements

### Requirement: Release performance evidence covers business paths

Release certification SHALL include authenticated production measurements for card lookup, confirmed/pending Earn, confirmed Redeem, and supervisor dashboard/report workflows.

#### Scenario: Checkout benchmark is recorded

- **WHEN** performance evidence is assembled for a release candidate
- **THEN** each required business path has recorded P50/P90 latency, environment, candidate SHA, and outcome

### Requirement: Frontend measurement represents user navigation

The performance harness SHALL measure real client navigation or RSC behavior and SHALL not certify checkout performance using only repeated unauthenticated page loads or infrastructure health probes.

#### Scenario: Benchmark harness runs

- **WHEN** the checkout benchmark executes
- **THEN** it performs the authenticated workflow interactions and records the business-path timings
