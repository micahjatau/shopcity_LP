# Report semantics and completeness

## ADDED Requirements

### Requirement: Separate stocks from daily flows

The system SHALL expose current stock metrics in an explicitly current snapshot and SHALL NOT copy current materialization-time stocks into historical daily rows.

#### Scenario: Rebuild historical series

- **GIVEN** customer and liability stocks differ between July 1 and September 9
- **WHEN** reports are rebuilt on September 9
- **THEN** the July 1 daily row retains only July 1-attributed values and the current snapshot is dated with its actual `asOf`

### Requirement: Preserve as-of reconstruction

The system SHALL classify redemptions, reversals, SMS, expiry, and liability using only state known at the requested watermark and local report timezone.

#### Scenario: Later reversal

- **GIVEN** a redemption is confirmed before the watermark and reversed after it
- **WHEN** the report is materialized at the earlier watermark
- **THEN** it is counted as confirmed and not reversed

### Requirement: Complete cashier activity

The cashier report SHALL expose earn count/value, credit issued, redemption count/value, approval requests, duplicate attempts, reversals, and fraud flags with documented non-overlapping counting rules.

#### Scenario: Mixed cashier activity

- **GIVEN** a cashier has earn, redeem, approval, duplicate, reversal, and fraud events
- **WHEN** the cashier report is generated
- **THEN** each metric is attributed once to the correct date and branch and successful transaction count does not include exception-only events

### Requirement: Complete redemption reporting

The redemption report SHALL expose value, basket ratio, approval lifecycle counts, lots consumed/allocation detail, and authoritative remaining balance.

#### Scenario: Empty basket denominator

- **GIVEN** the configured basket-ratio denominator is zero
- **WHEN** a redemption summary is generated
- **THEN** the ratio is null/explicitly unavailable rather than infinite or fabricated

### Requirement: Ranked customer performance

The system SHALL provide deterministic rankings for spend, current balance, visit frequency, and dormant high-value customers, scoped by tenant, branch, date, and as-of inputs.

#### Scenario: Equal ranking values

- **GIVEN** two customers have equal spend
- **WHEN** the ranking is requested
- **THEN** the result uses a documented stable tie-breaker and bounded limit
