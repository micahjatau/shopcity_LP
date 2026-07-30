## ADDED Requirements

### Requirement: Shared migration history is verified by deploy evidence
The system MUST treat schema shape alone as insufficient and MUST verify shared-environment migration state through deployable migration history and recorded evidence.

#### Scenario: Remote schema was synchronized by push
- **WHEN** a shared database schema matches application expectations but lacks deploy evidence and migration history alignment
- **THEN** the migration is not considered complete

#### Scenario: Migrate deploy succeeds
- **WHEN** Prisma migrate deploy is applied to a fresh or restored target and the resulting history matches the expected migrations
- **THEN** the migration evidence can be marked complete

### Requirement: Migration completion includes backup and restore evidence
The system MUST record backup and restore or forward-fix rehearsal evidence for migration work that changes shared financial schema or constraints.

#### Scenario: Migration preflight finds incompatible rows
- **WHEN** a preflight detects rows that would violate a new financial invariant
- **THEN** the tracker records remediation or forward-fix steps before the constraint is enforced
