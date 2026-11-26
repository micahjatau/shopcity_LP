## ADDED Requirements

### Requirement: Financial schema drift uses a forward-only verified reconciliation

A financial-schema reconciliation MUST be additive, transaction-safe, idempotent, and fail closed on incompatible rows or object-definition collisions. It MUST preserve all financial data and deployed tenant-composite foreign keys, indexes, RLS settings, and policies outside the explicitly reviewed scope.

#### Scenario: Reconciliation runs against a clean migrated database

- **WHEN** the reconciliation is applied after the complete Prisma migration chain
- **THEN** existing canonical definitions MUST remain unchanged and reapplication MUST be safe

#### Scenario: Reconciliation runs against drifted Preview-shaped schema

- **WHEN** required financial functions, triggers, or checks are absent or stale
- **THEN** the migration MUST restore the reviewed definitions and validate existing rows without modifying financial data

#### Scenario: Object name exists with an unexpected definition

- **WHEN** the migration encounters an existing same-named trigger or constraint with a different definition
- **THEN** the migration MUST stop and roll back instead of overwriting or accepting the mismatch

#### Scenario: Shared Preview apply is requested

- **WHEN** a migration has passed disposable-database and CI verification but has not received separate Preview authorization and a fresh read-only preflight
- **THEN** it MUST NOT be applied to Preview or Production
