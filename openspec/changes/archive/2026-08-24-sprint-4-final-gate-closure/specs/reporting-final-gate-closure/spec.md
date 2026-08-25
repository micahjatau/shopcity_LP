## ADDED Requirements

### Requirement: Historical report snapshots use authoritative as-of evidence

The system SHALL reconstruct historical reporting state from authoritative lifecycle and ledger evidence at or before the requested watermark and SHALL not read mutable current state as historical truth.

#### Scenario: Later redemption does not affect an earlier snapshot

- **WHEN** a report is built for an as-of timestamp before a later redemption is confirmed
- **THEN** the later redemption is excluded from the snapshot and earlier totals remain unchanged

### Requirement: Historical snapshots include lot, approval, redemption, and SMS state

The system SHALL reconstruct lot, approval, redemption, and SMS state from evidence as of the watermark instead of using today's mutable row state.

#### Scenario: Later status changes do not rewrite the past

- **WHEN** a lot, approval, redemption, or SMS record changes after the watermark
- **THEN** the historical report continues to reflect the state that existed at the watermark

### Requirement: Customer performance counts confirmed financial activity only

The system SHALL count only confirmed financial activity when computing customer visits, dormancy, and performance summaries.

#### Scenario: Pending redemption does not reset activity

- **WHEN** a redemption is still pending approval at the watermark
- **THEN** it does not increment visit counts or reset dormancy

### Requirement: Same-tenant reporting rebuilds share one lock domain

The system SHALL use one tenant-wide locking scope for all reporting rebuilds so tenant and branch materialization cannot delete or overwrite each other’s output.

#### Scenario: Tenant and branch rebuilds overlap

- **WHEN** a tenant rebuild and a branch rebuild are triggered at the same time for the same tenant
- **THEN** only one materialization proceeds at a time and the resulting rows remain consistent

### Requirement: Duplicate-attempt reporting reads immutable evidence

The system SHALL derive duplicate-attempt reporting from append-only evidence instead of mutable fraud counters so historical counts remain stable after later flag resolution.

#### Scenario: Duplicate-attempt history remains stable after resolution

- **WHEN** a duplicate-attempt flag is later resolved
- **THEN** the historical duplicate-attempt count for an earlier watermark does not disappear

### Requirement: Report refresh requests are durably scheduled and recoverable

The system SHALL persist report refresh requests through a durable queue or outbox and SHALL allow recovered refresh work to complete exactly once.

#### Scenario: Refresh request survives a worker restart

- **WHEN** the API accepts a report refresh request and the worker restarts before completion
- **THEN** the refresh request remains recoverable and is completed without creating duplicate materialization output
