## ADDED Requirements

### Requirement: truthful reversal unavailable boundary
The system MUST reject reversal requests with HTTP 503 and `REVERSAL_UNAVAILABLE`, and it MUST NOT expose any successful accepted-work envelope for the reversal operation.

#### Scenario: reversal request is unavailable
- **WHEN** a client submits a reversal request
- **THEN** the API returns HTTP 503 with `success: false`
- **AND** the response includes `error.code = REVERSAL_UNAVAILABLE`
- **AND** no reversal record, idempotency record, or outbox event is created

### Requirement: truthful receiptless unsupported contract
The system MUST return a stable HTTP 422 `UNSUPPORTED_TRANSACTION_TYPE` response for unsupported receiptless transaction-detail reads, and the public contract MUST describe that response explicitly.

#### Scenario: receiptless detail is requested
- **WHEN** a client requests a receiptless transaction detail
- **THEN** the API returns HTTP 422 with `error.code = UNSUPPORTED_TRANSACTION_TYPE`
- **AND** the read model remains receipt-backed only

### Requirement: device kek validation and versioning
The system MUST require a versioned device attestation KEK with sufficient entropy, and it MUST reject KEK values that match session, CSRF, or SMS credential material.

#### Scenario: weak or reused KEK is provided
- **WHEN** startup validation evaluates the device KEK environment
- **THEN** the process fails fast for a missing, weak, malformed, or reused key
- **AND** the failure identifies the KEK version or validation rule that failed

### Requirement: active device secret invariant
The database MUST prevent a device from being ACTIVE unless its attestation secret ciphertext, version, and rotation timestamp are all present.

#### Scenario: device is activated without complete secret metadata
- **WHEN** an update attempts to mark a device ACTIVE without complete secret metadata
- **THEN** the write is rejected by validation or by a database constraint
- **AND** the device remains non-active

### Requirement: resumable legacy device reprovisioning
The system MUST support a resumable device cutover flow that moves a device through LEGACY, REPROVISION_REQUIRED, SECRET_ISSUED, DEVICE_ACKNOWLEDGED, and ACTIVE states, and it MUST only activate the device after acknowledgement succeeds.

#### Scenario: legacy device is reprovisioned
- **WHEN** the backfill or cutover process targets a legacy device
- **THEN** the device is marked REPROVISION_REQUIRED
- **AND** a one-time secret is issued
- **AND** the device becomes ACTIVE only after acknowledgement is recorded

### Requirement: branch scoped device administration
The system MUST enforce branch-scoped device administration unless the actor has tenant-wide admin access.

#### Scenario: supervisor is outside the branch
- **WHEN** a supervisor attempts to list, create, or update a device outside their authorized branch
- **THEN** the request is denied without cross-branch enumeration

### Requirement: enforceable validation-scope gate
The system MUST execute a real validation-scope test target in CI and MUST treat release-critical commands as invalid if they appear only in optional or manual workflows or are guarded by step-level `continue-on-error`.

#### Scenario: a command is only present in an optional workflow
- **WHEN** the validation-scope gate evaluates repository workflows
- **THEN** it fails if a release-critical command is missing from the mandatory CI path

### Requirement: protected release evidence
The system MUST produce exact-head protected restore evidence that includes backup identity, checksum, checked-out SHA, migration inventory comparison, Prisma migrate status, object probes, financial probes, logs, and final outcome.

#### Scenario: protected restore runs for a release SHA
- **WHEN** the protected restore workflow executes for an immutable release SHA
- **THEN** the reports are written to a SHA-scoped evidence directory
- **AND** the evidence package can be uploaded even on failure

### Requirement: production sms smoke guardrails
The system MUST provide an approval-gated production SMS smoke command that sends at most one message, uses a real provider mode, targets an allowlisted destination, and emits redacted JSON evidence.

#### Scenario: production SMS smoke is executed
- **WHEN** an operator runs the approved smoke command
- **THEN** the command requires explicit approval and a unique correlation ID
- **AND** the output redacts full phone numbers and credentials

### Requirement: quarantine exclusive ownership
The system MUST ensure each receipt can belong to at most one nonterminal destructive batch at a time.

#### Scenario: two batches race for the same receipt
- **WHEN** concurrent staging attempts claim the same receipt ID
- **THEN** only one batch acquires ownership
- **AND** the other batch fails without corrupting staged state

### Requirement: quarantine operator validation and upgrade safety
The system MUST reject unreplaced operator placeholders, blank reasons, and incompatible support-table layouts, and it MUST keep support-table evolution upgrade-safe.

#### Scenario: placeholder operator data is submitted
- **WHEN** a quarantine batch is executed with placeholder operator metadata
- **THEN** the operation fails before any destructive change occurs
- **AND** the batch report records the validation failure
