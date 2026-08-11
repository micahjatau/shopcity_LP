## ADDED Requirements

### Requirement: Report exports are CSV-only in Sprint 4

The system SHALL provide report exports in CSV format and SHALL NOT expose XLSX or PDF exports in Sprint 4.

#### Scenario: Export is requested

- **WHEN** a caller requests a report export with `format=csv`
- **THEN** the system returns CSV content for the requested report if the caller is authorized

### Requirement: Export access is role-restricted

The system SHALL restrict raw exports to admin or owner access and SHALL keep supervisor export access branch-scoped.

#### Scenario: Cashier requests an export

- **WHEN** a cashier requests a report export
- **THEN** the system denies the request

#### Scenario: Supervisor requests a cross-branch export

- **WHEN** a supervisor requests a report export outside their branch scope
- **THEN** the system denies the request without revealing tenant-wide data

### Requirement: Export refresh is asynchronous

The system SHALL provide an admin-only report refresh operation that returns immediately without performing a full report rebuild synchronously in the request path.

#### Scenario: Admin triggers refresh

- **WHEN** an admin requests report refresh
- **THEN** the system returns `202 Accepted` and schedules background materialization

### Requirement: Contracts stay aligned with runtime behavior

The system SHALL keep OpenAPI, the generated client, Bruno journeys, and OpenSpec artifacts aligned with the implemented report and fraud surface.

#### Scenario: Public surface changes

- **WHEN** a report or fraud endpoint changes shape
- **THEN** the published contract artifacts are regenerated or updated in the same change
