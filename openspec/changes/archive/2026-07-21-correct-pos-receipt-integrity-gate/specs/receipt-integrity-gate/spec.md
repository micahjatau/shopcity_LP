## ADDED Requirements

### Requirement: Physical POS receipt identity must be required and unique per receipt week
The system MUST require a physical POS receipt number when capturing a receipt, MUST preserve that physical identity through migration of legacy receipts, and MUST treat the normalized weekly physical receipt identity as the uniqueness boundary.

#### Scenario: Missing physical receipt number is rejected
- **WHEN** a cashier submits a receipt capture without a POS receipt number
- **THEN** the system rejects the request

#### Scenario: Duplicate receipt number within the same week is rejected
- **WHEN** two receipt submissions use the same normalized POS receipt number for the same tenant, branch, and receipt week
- **THEN** the second submission is rejected even if it uses a different idempotency key, cashier, or card

#### Scenario: Week boundary allows a new weekly receipt sequence
- **WHEN** the same physical POS receipt number occurs in a different receipt week
- **THEN** the system accepts it if the week calculation places it in a different unique scope

#### Scenario: Legacy receipts preserve their physical identity
- **WHEN** an existing receipt row is migrated from the legacy schema and contains the stored POS reference
- **THEN** the migrated record keeps the original physical POS receipt identity instead of a generated UUID

#### Scenario: Unmappable legacy receipt rows are not fabricated
- **WHEN** a legacy receipt row does not contain a trustworthy POS receipt reference
- **THEN** the migration or validation path quarantines the row instead of inventing a replacement identity

### Requirement: Receipt capture must be tied to active device and authenticated branch context
The system MUST require an active device for cashier receipt capture and MUST derive the receipt branch from authenticated tenant context or the bound device rather than trusting an arbitrary submitted branch.

#### Scenario: Wrong-branch device is rejected
- **WHEN** a cashier submits a receipt using a device that does not belong to the cashier’s branch
- **THEN** the system rejects the receipt capture

#### Scenario: Missing device is rejected
- **WHEN** a cashier submits a receipt capture without a device attribution
- **THEN** the system rejects the receipt capture

#### Scenario: Arbitrary branch submission is not accepted
- **WHEN** a cashier tries to submit a branch identifier that differs from the authenticated cashier or bound device context
- **THEN** the system rejects the request or ignores the submitted branch and uses the authenticated branch context

### Requirement: Receipt timestamps must be bounded and override-gated
The system MUST store the server capture time separately from the POS transaction time and MUST reject POS timestamps that are future-dated or outside the configured tolerance unless a supervisor override is explicitly provided and audited.

#### Scenario: Future POS timestamp is rejected
- **WHEN** the submitted POS transaction time is in the future beyond the configured tolerance
- **THEN** the system rejects the receipt capture

#### Scenario: Stale POS timestamp is rejected without override
- **WHEN** the submitted POS transaction time is older than the configured tolerance window and no override is supplied
- **THEN** the system rejects the receipt capture

#### Scenario: Explicit override is audited
- **WHEN** a privileged supervisor approves a stale or cross-branch capture through the override path
- **THEN** the system records the override in audit history and persists the receipt with the approved context

### Requirement: Receipt persistence must enforce tenant-safe ownership and one actor field
The system MUST persist receipt ownership with tenant-composite relations and a single authoritative actor reference so that receipt records cannot drift across tenant boundaries or store conflicting actor identifiers.

#### Scenario: Cross-tenant ownership is rejected
- **WHEN** a receipt references a branch, device, or actor that belongs to a different tenant
- **THEN** the database or service validation rejects the write

#### Scenario: Receipt stores one authoritative actor reference
- **WHEN** a receipt is created
- **THEN** the persisted record stores one authoritative captured-by user reference and does not require duplicate actor fields to stay in sync

### Requirement: Receipt capture must enforce safe monetary bounds
The system MUST reject purchase amounts that are not safe integers or that exceed the configured operational ceiling.

#### Scenario: Unsafe integer purchase amount is rejected
- **WHEN** a receipt submission contains a purchase amount that cannot be represented as a safe integer
- **THEN** the system rejects the request

#### Scenario: Excessive purchase amount is rejected or escalated
- **WHEN** a receipt submission exceeds the configured operational ceiling
- **THEN** the system rejects the request or requires the configured approval path
