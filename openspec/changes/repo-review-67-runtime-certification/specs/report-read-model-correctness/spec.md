## ADDED Requirements

### Requirement: Executive summary metrics have explicit operational semantics

Executive-summary metrics MUST document and implement whether each value is a stock, flow, or state count, including redemption, cashier, and SMS queued metrics.

#### Scenario: Report data contains activity

- **GIVEN** report fixtures with known transactions, redemptions, cashier activity, and outbox states
- **WHEN** the executive summary is generated
- **THEN** each metric matches its documented definition
- **AND** queued SMS counts reflect actual queued/terminal outbox state rather than inferred or stale values

#### Scenario: Report data is empty or partial

- **GIVEN** an empty or partially populated reporting period
- **WHEN** the executive summary is generated
- **THEN** metrics use explicit zero/unknown semantics without fabricated activity
- **AND** the response contract remains stable
