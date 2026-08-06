## ADDED Requirements

### Requirement: Approvals have strongly referenced target types

The system SHALL support typed approval targets for earn and redemption actions using database-enforced references rather than free-form target IDs.

#### Scenario: Existing earn approvals are migrated

- **WHEN** Sprint 3 approval migrations run against Sprint 2 data
- **THEN** existing receipt-bound approvals are backfilled as earn targets and remain queryable

#### Scenario: Approval has multiple targets

- **WHEN** an approval row attempts to reference both an earn receipt and a redemption target
- **THEN** the database rejects the row through the target exclusivity constraint

### Requirement: Redemption approval execution revalidates current state

The system SHALL revalidate approval status, actor eligibility, requester separation, branch/device/card/customer eligibility, current policy, active balance, and FIFO lot eligibility before executing an approved redemption.

#### Scenario: Balance changes before approval

- **WHEN** a pending redemption approval is approved after another transaction reduced available balance below the requested amount
- **THEN** execution fails with a stable policy or balance error and creates no partial financial effect

#### Scenario: Two supervisors approve simultaneously

- **WHEN** two eligible supervisors attempt to approve the same pending redemption concurrently
- **THEN** exactly one approval execution creates the debit ledger effect

### Requirement: Redemption approval rejection and expiry have no financial effect

The system SHALL mark redemption approvals as rejected or expired without creating ledger entries, allocations, lot mutations, outbox financial confirmations, or SMS financial confirmations.

#### Scenario: Supervisor rejects redemption

- **WHEN** an eligible supervisor rejects a pending redemption with a required reason
- **THEN** the approval and redemption are rejected and no customer balance changes
