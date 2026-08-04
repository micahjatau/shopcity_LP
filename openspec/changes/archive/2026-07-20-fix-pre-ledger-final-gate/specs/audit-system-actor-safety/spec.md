## ADDED Requirements

### Requirement: Audit writes must support system-generated events

The system MUST allow audit entries to be written without a human actor when the event is produced by a background job or system process.

#### Scenario: Human actor from the same tenant is accepted

- **WHEN** an audit record references a user from the same tenant
- **THEN** the write succeeds

#### Scenario: System-generated audit entry is accepted

- **WHEN** an audit record is created without a human actor
- **THEN** the write succeeds

### Requirement: Audit actor references must remain tenant-local

The system MUST reject any audit record that references a user from another tenant.

#### Scenario: Cross-tenant actor reference is rejected

- **WHEN** an audit record references a user from a different tenant
- **THEN** the database rejects the write
