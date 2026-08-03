## ADDED Requirements

### Requirement: Adjustment records require committed ledger linkage
The system SHALL align Prisma schema, migrations, services, fixtures, and specifications with the invariant that committed Adjustment records have a non-null ledger entry relationship unless a formal draft lifecycle is introduced.

#### Scenario: Committed-only Adjustment model
- **WHEN** the committed-only Adjustment model is selected
- **THEN** `ledgerEntryId` and its Prisma relationship MUST be non-nullable, the database column MUST be migrated to NOT NULL after historical preflight, and Prisma Client MUST be regenerated.

#### Scenario: Null Adjustment linkage is attempted
- **WHEN** application code or fixtures attempt to persist a committed Adjustment without a ledger entry
- **THEN** validation or database constraints MUST reject it.

### Requirement: Adjustment ledger-link regressions are covered
The system SHALL test invalid and valid Adjustment ledger linkage variants across kind, customer, tenant, direction, amount, effective date, missing ledger, and historical preflight paths.

#### Scenario: Adjustment linked to unsupported ledger kind
- **WHEN** an Adjustment links to EARN, REDEEM, or REVERSAL ledger entries
- **THEN** the system MUST reject the Adjustment.

#### Scenario: Adjustment linked outside customer or tenant
- **WHEN** an Adjustment links to another customer's ledger or a cross-tenant ledger
- **THEN** the system MUST reject the Adjustment.

#### Scenario: Valid Adjustment variants pass
- **WHEN** a valid credit Adjustment with one lot or valid debit Adjustment with exact allocations is submitted
- **THEN** the system MUST accept it and preserve financial invariants.

### Requirement: Receiptless financial workflow scope is truthful
The system SHALL keep receiptless Adjustment/Reversal execution outside the halfway release unless branch provenance, approvals, allocations, SMS, audit, read models, OpenAPI, and E2E coverage are complete.

#### Scenario: Receiptless execution deferred
- **WHEN** receiptless execution scope is deferred for halfway
- **THEN** endpoints and UI-facing contracts MUST truthfully return unavailable or omit unsupported capability claims.
