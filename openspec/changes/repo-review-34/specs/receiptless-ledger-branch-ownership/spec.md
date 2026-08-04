## ADDED Requirements

### Requirement: Receiptless financial entries have branch provenance or are disabled

The system SHALL either assign immutable tenant-safe branch ownership to receiptless Adjustment/Reversal entries or formally disable those capabilities for the halfway release.

#### Scenario: Branch ownership is available

- **WHEN** a receiptless financial entry is created or backfilled
- **THEN** its branch provenance MUST be established, tenant-safe, immutable, and auditable.

#### Scenario: Branch ownership is unavailable

- **WHEN** branch provenance cannot be established for receiptless entries before the halfway release
- **THEN** application paths MUST prevent operators from creating unsupported receiptless records and production capability claims MUST mark them deferred.

### Requirement: Branch-scoped ledger reads include only authorized receiptless entries

The system SHALL include authorized receiptless entries in customer-ledger lists and transaction detail while preventing cross-branch exposure.

#### Scenario: Authorized receiptless transaction detail

- **WHEN** an authorized user requests transaction detail for a receiptless Adjustment or Reversal in their permitted branch scope
- **THEN** the API MUST return a type-specific response instead of failing solely because no Receipt exists.

#### Scenario: Cross-branch receiptless entry is hidden

- **WHEN** a user requests a receiptless ledger entry owned by another branch outside their authorization
- **THEN** the system MUST not expose that entry.

### Requirement: Approval lists handle receiptless targets truthfully

The system SHALL include valid receiptless approval targets or explicitly exclude disabled receiptless capabilities from the release contract.

#### Scenario: Valid receiptless target is not silently dropped

- **WHEN** receiptless capabilities are enabled and a valid receiptless target exists
- **THEN** approval-list responses MUST include it according to authorization rules.
