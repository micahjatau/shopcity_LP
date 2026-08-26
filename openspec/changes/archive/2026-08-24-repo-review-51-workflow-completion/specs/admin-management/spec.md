## ADDED Requirements

### Requirement: Users, devices, and branches are full admin workflows

The frontend SHALL expose create, edit, and status workflows for administrative master data where the backend supports them.

#### Scenario: Admin can create staff users

- **GIVEN** an admin opens user management
- **WHEN** they create a valid staff user
- **THEN** the user appears in the list with the selected role and branch

#### Scenario: Human-ineligible roles are not offered

- **GIVEN** the role picker is shown to an admin
- **WHEN** the form renders
- **THEN** the picker omits roles that the backend policy does not allow for human accounts

#### Scenario: Devices can be created and updated

- **GIVEN** an admin opens device management
- **WHEN** they create or update a device
- **THEN** the UI shows the saved device state and any attestation or status controls that apply

#### Scenario: Branch management is visible where supported

- **GIVEN** the backend contract supports branch create or edit
- **WHEN** an admin opens branch management
- **THEN** the UI exposes those actions rather than a static list only

### Requirement: Pilot health is source-backed and not demo-driven

The frontend SHALL render pilot health from live backend data rather than fake metrics.

#### Scenario: Pilot health shows live operations data

- **GIVEN** an admin opens pilot health
- **WHEN** the data loads
- **THEN** the panel reflects live outbox, SMS, offline-sync, fraud, report, and reconciliation signals

#### Scenario: Demo state is not shown as truth

- **GIVEN** pilot health data is unavailable
- **WHEN** the panel renders
- **THEN** the UI shows a clear fallback state instead of fabricated numbers

### Requirement: Audit and operations surfaces support investigation

The frontend SHALL expose audit trail and operations views that help users investigate what happened.

#### Scenario: Audit entries are readable and navigable

- **GIVEN** an admin opens the audit trail
- **WHEN** entries are listed
- **THEN** each entry is rendered with actor, action, and target context where available

#### Scenario: Operations summary links to actionable detail

- **GIVEN** an admin opens the operations summary
- **WHEN** a signal requires attention
- **THEN** the UI can navigate to the related detail or explain the next action
