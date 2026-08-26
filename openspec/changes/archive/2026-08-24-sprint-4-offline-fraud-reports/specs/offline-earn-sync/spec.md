## ADDED Requirements

### Requirement: Offline earn batches are bounded and replay-safe

The system MUST accept offline earn records in batches with deterministic per-record results and MUST enforce a configured maximum batch size.

#### Scenario: Batch exceeds the configured limit

- **WHEN** a client submits more records than the configured offline batch maximum
- **THEN** the system MUST reject the batch before processing records

### Requirement: Offline earn batches reuse the canonical earn path

The system MUST process offline earn records by converging into the same canonical earn execution used by online earn requests before any financial write occurs.

#### Scenario: Offline record is accepted

- **WHEN** a valid offline earn record is submitted in a batch
- **THEN** the system MUST execute the same earn calculation, ledger creation, credit lot creation, approval handling, audit logging, and outbox behavior used for an online earn

### Requirement: Offline batches are atomic per record

The system MUST process each offline earn record independently so that one invalid record does not roll back neighboring valid records.

#### Scenario: Mixed batch contains one invalid record

- **WHEN** a batch contains valid and invalid offline earn records
- **THEN** the system MUST return a per-record result for each input record and MUST preserve successful records even if other records fail

### Requirement: Offline replay is idempotent and conflict-safe

The system MUST preserve the original response for a replayed offline record when the record identity and canonical request are unchanged.

#### Scenario: Identical offline replay arrives

- **WHEN** the same local record is replayed with the same idempotency key and canonical payload
- **THEN** the system MUST return the original result without duplicating financial effects

### Requirement: Offline record conflicts use stable outcomes

The system MUST map offline sync conflicts to stable error outcomes for duplicate local IDs, idempotency conflicts, receipt reuse, card state failures, actor mismatch, device mismatch, branch mismatch, week mismatch, request expiry, and retryable transaction conflicts.

#### Scenario: Same local ID with different payload arrives

- **WHEN** the same local ID is replayed with a different canonical payload
- **THEN** the system MUST reject the record with a sync-record conflict outcome

#### Scenario: Same idempotency key with changed canonical request arrives

- **WHEN** the same idempotency key is reused with a changed canonical request
- **THEN** the system MUST reject the record with an idempotency conflict outcome

#### Scenario: Wrong device is used

- **WHEN** the server determines the offline record originated from a different device than the authenticated request context
- **THEN** the system MUST reject the record with a device mismatch outcome

### Requirement: Server-side verification is authoritative

The system MUST derive or verify cashier, device, branch, card state, receipt week, and request age on the server and MUST NOT trust those fields from the client as authoritative.

#### Scenario: Submitted week differs from derived week

- **WHEN** the submitted receipt week differs from the server-derived week
- **THEN** the system MUST reject the record with a stable sync-week conflict outcome

#### Scenario: Record is too old for offline sync

- **WHEN** the offline record age exceeds the configured maximum offline age
- **THEN** the system MUST reject the record as expired without creating financial effects

### Requirement: Offline sync attempts are persisted as evidence

The system MUST persist each processed offline sync attempt as evidence with its canonical identifiers, derived status, and durable error or transaction references.

#### Scenario: Attempt is confirmed

- **WHEN** an offline record completes successfully
- **THEN** the system MUST persist a confirmed sync attempt linked to the resulting transaction identifier

### Requirement: Offline earns remain earn-only

The system MUST reject offline attempts to execute redemption, approval, card replacement, or manual adjustment behavior.

#### Scenario: Offline record requests a blocked flow

- **WHEN** an offline request attempts any non-earn financial action
- **THEN** the system MUST reject the request without creating a ledger mutation
