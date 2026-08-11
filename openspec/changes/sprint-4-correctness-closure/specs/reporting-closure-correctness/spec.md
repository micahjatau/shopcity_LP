## ADDED Requirements

### Requirement: Reporting snapshots use authoritative as-of evidence

The system SHALL materialize reports only from authoritative source evidence at or before the requested as-of watermark and SHALL not depend on mutable current row state for historical totals.

#### Scenario: Future source rows are excluded from the snapshot

- **WHEN** a report is built for a watermark before a later transaction occurred
- **THEN** the later transaction is excluded from the totals and does not appear in the snapshot

### Requirement: Customer activity counts confirmed financial events only

The system SHALL compute customer activity and dormancy from confirmed financial activity rather than from pending, rejected, or expired request records.

#### Scenario: Pending redemption does not count as activity

- **WHEN** a customer has a pending or rejected redemption request with no confirmed ledger effect
- **THEN** the request does not increase visit counts or reset dormancy

### Requirement: Same-tenant report rebuilds share one lock domain

The system SHALL use one tenant-wide locking scope for all reporting rebuilds so tenant and branch materialization cannot delete or overwrite each other’s output.

#### Scenario: Tenant and branch rebuilds overlap

- **WHEN** a tenant rebuild and a branch rebuild are triggered at the same time for the same tenant
- **THEN** only one materialization proceeds at a time and the resulting rows remain consistent

### Requirement: Duplicate-attempt reporting reads immutable evidence

The system SHALL derive duplicate-attempt reporting from append-only evidence instead of mutable fraud-flag counters so historical counts remain stable after later flag resolution.

#### Scenario: Duplicate-attempt history remains stable after resolution

- **WHEN** a duplicate-attempt flag is later resolved
- **THEN** the historical duplicate-attempt count for an earlier watermark does not disappear

### Requirement: Report refresh requests are durably scheduled

The system SHALL persist report refresh requests through a durable queue or outbox instead of relying only on a detached in-process promise.

#### Scenario: Refresh request is accepted durably

- **WHEN** the API accepts a report refresh request
- **THEN** the refresh work is durably recorded before the request completes
