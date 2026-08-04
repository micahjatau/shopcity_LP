## ADDED Requirements

### Requirement: Actor and audit relationships must be tenant-aware

The system MUST ensure customer registration, card issuance, replacement, and audit logs cannot reference users from another tenant.

#### Scenario: Tenant-matched actor references are accepted

- **WHEN** a customer, card, or audit record references a user from the same tenant
- **THEN** the write succeeds

#### Scenario: Cross-tenant actor references are rejected

- **WHEN** a record attempts to reference a user from a different tenant
- **THEN** the database rejects the write

### Requirement: Replacement relationships must remain tenant-local

The system MUST ensure replacement links between cards are tenant-local and cannot connect card history across tenants.

#### Scenario: Tenant-local replacement is accepted

- **WHEN** a card replacement references another card in the same tenant
- **THEN** the write succeeds

#### Scenario: Cross-tenant replacement is rejected

- **WHEN** a card replacement attempts to reference a card from another tenant
- **THEN** the database rejects the write
