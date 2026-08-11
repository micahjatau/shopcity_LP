## ADDED Requirements

### Requirement: Only the offline sync owner finalizes canonical attempt state

The system SHALL allow only the request that creates an `OfflineSyncAttempt` to persist the canonical result for that attempt unless another request explicitly acquires ownership through a safe lock/claim.

#### Scenario: Follower timeout is ephemeral

- **GIVEN** request A creates an offline sync attempt and is still processing
- **AND** request B submits the exact same attempt and waits for replay output
- **WHEN** request B times out before request A writes `responseJson`
- **THEN** request B returns a retryable `SYNC_RECORD_PROCESSING` response without updating the canonical `OfflineSyncAttempt`
- **AND** request A can still persist the final canonical result

#### Scenario: Follower cannot overwrite confirmed owner result

- **GIVEN** request A confirms an offline earn after request B has already timed out waiting
- **WHEN** the canonical offline sync attempt is read after both requests complete
- **THEN** the row contains request A's confirmed result and is not overwritten by request B's retryable response

### Requirement: Offline to online same-receipt boundary produces one financial effect

The system SHALL reject or replay an online earn that submits the same canonical receipt after an offline earn has already succeeded, without duplicating receipts, ledger entries, credit lots, outbox events, or approvals.

#### Scenario: Online loses after offline success

- **GIVEN** an offline earn has confirmed a receipt
- **WHEN** an online earn submits the same tenant, branch, receipt number, and receipt week with a different idempotency key
- **THEN** the online request deterministically loses with the existing duplicate-receipt behavior
- **AND** authoritative financial counts remain one receipt, one earn ledger entry, and one credit lot

### Requirement: True online/offline receipt races produce one financial effect

The system SHALL handle concurrent online and offline earns for the same canonical receipt with different idempotency keys and different offline local IDs such that exactly one financial effect is committed.

#### Scenario: Online and offline race on the same receipt

- **GIVEN** an online earn and an offline earn start concurrently for the same canonical receipt
- **WHEN** both requests settle
- **THEN** exactly one path succeeds or replays the canonical success
- **AND** database counts show one receipt, one earn ledger entry, and one credit lot

### Requirement: Distinct offline local IDs cannot double-credit one receipt

The system SHALL reject or replay concurrent offline earns for the same canonical receipt even when their `localId` and idempotency keys differ.

#### Scenario: Offline records race with different local identities

- **GIVEN** two offline batch records have different `localId` values and idempotency keys but the same canonical receipt identity
- **WHEN** they are processed concurrently
- **THEN** at most one record creates financial effects
- **AND** authoritative financial counts remain one receipt, one earn ledger entry, and one credit lot
