## ADDED Requirements

### Requirement: Branch ownership must be encoded in the database

The system MUST represent branch ownership with tenant-aware database constraints so a branch cannot be referenced as if it belonged to a different tenant.

#### Scenario: Tenant-owned branch is accepted

- **WHEN** a branch is created for a tenant and later referenced by rows from the same tenant
- **THEN** the database accepts the relationship

#### Scenario: Cross-tenant branch reference is rejected

- **WHEN** a row attempts to reference a branch that belongs to a different tenant
- **THEN** the database rejects the write

### Requirement: Tenant-scoped child rows must match parent ownership

The system MUST prevent `User`, `Device`, `Customer`, and `Card` rows from attaching to parent records owned by another tenant.

#### Scenario: Customer and card ownership stay aligned

- **WHEN** a customer and card are created for the same tenant and branch lineage
- **THEN** the write succeeds

#### Scenario: Mixed tenant ownership is rejected

- **WHEN** a user, device, customer, or card write mixes tenant-owned parents from different tenants
- **THEN** the database rejects the write
