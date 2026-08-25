## ADDED Requirements

### Requirement: Redemption state is database-enforced

The database MUST enforce coherent redemption lifecycle fields for pending approval, confirmed, rejected, expired, and reversed redemptions.

#### Scenario: Confirmed redemption lacks ledger evidence

- **WHEN** a confirmed redemption row has no ledger entry, missing confirmation time, or confirmed amount that differs from requested amount
- **THEN** the database rejects the row

#### Scenario: Pending redemption has confirmed effects

- **WHEN** a pending-approval redemption row has ledger entry, confirmed amount, confirmation time, rejection time, or reversal time populated
- **THEN** the database rejects the row

### Requirement: Approval state is database-enforced

The database MUST enforce coherent approval decision and execution fields for pending, approved, executed, rejected, and expired approvals.

#### Scenario: Pending approval has decision fields

- **WHEN** a pending approval row has decision actor, reason, decision time, or execution time populated
- **THEN** the database rejects the row

#### Scenario: Executed approval lacks required fields

- **WHEN** an executed approval lacks decision or execution fields
- **THEN** the database rejects the row

### Requirement: Ledger evidence is validated at commit

The database MUST validate confirmed ledger entries at commit so ledger type, direction, amount, and required evidence are coherent.

#### Scenario: Earn ledger lacks credit lot evidence

- **WHEN** an `EARN` credit ledger entry is committed without a receipt and exactly one matching credit lot
- **THEN** the database rejects the transaction

#### Scenario: Redeem ledger lacks allocation evidence

- **WHEN** a `REDEEM` debit ledger entry is committed without a receipt, confirmed redemption, or allocations equal to the ledger amount
- **THEN** the database rejects the transaction

#### Scenario: Reversal ledger lacks compensation evidence

- **WHEN** a reversal ledger entry is committed without a reversed entry, opposite direction, matching amount, and coherent compensation evidence
- **THEN** the database rejects the transaction

### Requirement: Redemption evidence is immutable after capture

The database MUST prevent mutation of captured redemption evidence fields that define the original financial request.

#### Scenario: Captured redemption evidence is changed

- **WHEN** tenant, branch, customer, card, device, receipt, requested amount, basket amount, policy maximum snapshot, policy version, requesting actor, or request timestamp is updated after capture
- **THEN** the database rejects the mutation

#### Scenario: Redemption lifecycle field is changed legally

- **WHEN** only allowed lifecycle fields change according to the redemption state machine
- **THEN** the database permits the mutation

### Requirement: Sprint 3A migrations carry upgrade and rollback evidence

Sprint 3A database migrations MUST include local fresh/upgrade verification, CI or equivalent verification, shared deployment evidence, and backup/restore or forward-fix rehearsal records before being marked complete.

#### Scenario: Migration tracker lacks shared evidence

- **WHEN** a Sprint 3A migration is locally verified but not verified in shared staging or equivalent
- **THEN** its tracker entry remains incomplete for shared deployment

#### Scenario: Constraint migration finds incompatible data

- **WHEN** a migration preflight identifies data that would violate a new financial invariant
- **THEN** the migration plan records remediation or forward-fix steps before enforcing the constraint
