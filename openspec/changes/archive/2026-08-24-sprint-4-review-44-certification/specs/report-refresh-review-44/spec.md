## ADDED Requirements

### Requirement: Terminal report refresh events are excluded from recovery

The system SHALL explicitly prove that `report.refresh` recovery only republishes eligible unfinished work and excludes terminal events.

#### Scenario: Completed report refresh is excluded from recovery

- **GIVEN** a persisted `report.refresh` outbox event has `processedAt` set
- **WHEN** recovery runs
- **THEN** the event is excluded from recovery
- **AND** no queue publication occurs
- **AND** no report materialization work is triggered

#### Scenario: Dead-lettered report refresh is excluded from recovery

- **GIVEN** a persisted `report.refresh` outbox event has `deadLetteredAt` set
- **WHEN** recovery runs
- **THEN** the event is excluded from recovery
- **AND** no queue publication occurs
- **AND** no report materialization work is triggered

#### Scenario: Eligible unfinished report refresh still recovers

- **GIVEN** a persisted `report.refresh` outbox event is unfinished and eligible for retry or stale recovery
- **WHEN** recovery runs
- **THEN** the event is republished and processed normally
