# branch-scoped-device-administration Specification

## ADDED Requirements

### Requirement: Supervisors manage devices only within their branch

The system MUST restrict supervisor device listing, creation, and updates to the supervisor's assigned branch.

#### Scenario: Supervisor lists devices

- **WHEN** a supervisor lists devices
- **THEN** the system returns only devices for that supervisor's branch

#### Scenario: Supervisor creates a device

- **WHEN** a supervisor creates a device for a different branch
- **THEN** the system rejects the request and does not reveal cross-branch device existence

### Requirement: Admin users retain tenant-wide device administration

The system MUST allow admin users to manage devices across the tenant.

#### Scenario: Admin updates a device in another branch

- **WHEN** an admin updates a device outside their branch
- **THEN** the update succeeds if the request is otherwise valid

### Requirement: Cross-branch access failures do not leak existence

The system MUST respond to unauthorized cross-branch device access with a non-enumerating failure mode.

#### Scenario: Supervisor accesses another branch's device

- **WHEN** a supervisor requests a device that belongs to another branch
- **THEN** the system returns a 404 or stable forbidden response without confirming the device exists
