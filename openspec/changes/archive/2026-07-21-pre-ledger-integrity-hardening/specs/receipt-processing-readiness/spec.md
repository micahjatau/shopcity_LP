## ADDED Requirements

### Requirement: Legacy receipt migrations reject ambiguous identities

The system SHALL reject receipt integrity upgrades when legacy POS receipt identities are blank, whitespace-only, or duplicated within the same tenant, branch, and receipt week before mutating receipt data.

#### Scenario: Duplicate legacy identities are blocked

- **WHEN** two legacy receipt rows normalize to the same external POS receipt number within the same tenant, branch, and receipt week
- **THEN** the receipt integrity migration fails with a duplicate-identity error and does not partially rewrite receipt identity columns

#### Scenario: Blank legacy identities are blocked

- **WHEN** a legacy receipt row has a null or whitespace-only external receipt number
- **THEN** the receipt integrity migration fails before any legacy receipt columns are dropped or renamed

### Requirement: Upgrade-path verification uses only preceding migrations

The system SHALL verify receipt integrity upgrades by applying only migrations that precede the target migration under test.

#### Scenario: Later migrations are excluded

- **WHEN** the receipt integrity upgrade test prepares a database snapshot for the target migration
- **THEN** only earlier migrations are copied into the temporary migration set and any later migrations are excluded

### Requirement: Receipt capture is transactionally authoritative

The system SHALL revalidate receipt participant eligibility during receipt capture and persist receipt state atomically so that one successful capture produces one receipt outcome, even under concurrent requests.

#### Scenario: Concurrent capture produces one conflict

- **WHEN** two requests submit the same physical receipt at the same time
- **THEN** one request captures the receipt successfully and the other receives a conflict response
- **AND** the system stores only one receipt row for that physical identity

#### Scenario: Ineligible participant is rejected in-transaction

- **WHEN** a device, branch, customer, or card becomes ineligible before the capture transaction commits
- **THEN** the capture fails and no receipt row, approval record, or idempotency response is committed

### Requirement: High-value receipts require review before earnings

The system SHALL classify receipts above the configured flag threshold as flagged and receipts above the approval threshold as pending approval, and SHALL not release earnings until the required approval is recorded.

#### Scenario: Flagged receipts are retained for review

- **WHEN** a receipt amount is above the flag threshold but at or below the approval threshold
- **THEN** the system records the receipt as flagged and preserves the requesting actor for later review

#### Scenario: Pending approval receipts need a separate approver

- **WHEN** a receipt amount is above the approval threshold
- **THEN** the system records the receipt as pending approval and requires a supervisor approval record with a different approving actor before earnings can be released

### Requirement: Receipt device identity comes from the authenticated session

The system SHALL resolve the device associated with a receipt from the authenticated session and SHALL reject client-supplied device identifiers for capture.

#### Scenario: Spoofed device identifiers are rejected

- **WHEN** a client submits a receipt with a device identifier that does not match the authenticated session device
- **THEN** the system rejects the capture or ignores the spoofed value and records the session-bound device identity instead

### Requirement: Device history is immutable after capture

The system SHALL preserve historical receipt-to-device references and SHALL not allow deletion of a device that is referenced by captured receipts.

#### Scenario: Referenced device deletion is blocked

- **WHEN** a user attempts to delete a device that appears on a captured receipt
- **THEN** the deletion is rejected and the receipt continues to reference the original device identity

### Requirement: Idempotency records are actor-scoped and expirable

The system SHALL scope idempotency records to the tenant and actor, expire them, and replay the full stored response for a completed request with the same request hash.

#### Scenario: Completed request is replayed

- **WHEN** the same actor submits the same idempotency key and identical receipt payload after a completed capture
- **THEN** the system returns the stored success response instead of creating a second receipt or a second earnings record
