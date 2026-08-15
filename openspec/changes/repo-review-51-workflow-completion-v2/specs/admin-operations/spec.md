## ADDED Requirements

### Requirement: Manual adjustments are deliberate admin workflows

The frontend SHALL expose manual adjustment creation with consequence preview.

#### Scenario: Adjustment preview shows consequence

- **GIVEN** an admin starts an adjustment
- **WHEN** the amount and type are entered
- **THEN** the UI shows the effect on customer balance before submission

### Requirement: Users are created and managed through admin workflow

The frontend SHALL expose staff user creation and role/status management.

#### Scenario: Admin can create a staff user

- **GIVEN** an admin opens user management
- **WHEN** they submit a valid new staff user
- **THEN** the user appears in the list with the selected role and branch

#### Scenario: Human-ineligible roles are not offered

- **GIVEN** the user role picker renders
- **WHEN** the admin selects a role
- **THEN** roles that are not assignable to human accounts are omitted

### Requirement: Devices are created and managed through admin workflow

The frontend SHALL expose device creation, update, and status management.

#### Scenario: Device create or update is visible

- **GIVEN** an admin opens device management
- **WHEN** they create or update a device
- **THEN** the UI shows the saved device state and any status or rotation controls that apply

### Requirement: Branch management is visible where supported

The frontend SHALL expose branch create or edit views when the backend supports them.

#### Scenario: Branch actions appear only when supported

- **GIVEN** the backend contract supports branch create or edit
- **WHEN** an admin opens branch management
- **THEN** the UI exposes those actions instead of a static list only

### Requirement: Audit and pilot operations are live and source-backed

The frontend SHALL render audit trails and pilot operations from live backend data.

#### Scenario: Audit entries are readable

- **GIVEN** an admin opens the audit trail
- **WHEN** entries are listed
- **THEN** each entry shows actor, action, and target context where available

#### Scenario: Pilot health is not demo data

- **GIVEN** an admin opens pilot health
- **WHEN** the data loads
- **THEN** the panel reflects live outbox, SMS, offline-sync, fraud, report, and reconciliation signals rather than fabricated numbers
