## ADDED Requirements

### Requirement: Device-bound sessions are revalidated continuously
The system SHALL validate the linked device and its branch during every guarded request and before every refresh/session rotation.

#### Scenario: Blocked device request is rejected
- **WHEN** an active session's linked device is no longer ACTIVE
- **THEN** guarded request resolution MUST return 401 and MUST NOT authorize the request.

#### Scenario: Ineligible device refresh is rejected
- **WHEN** an active session's linked device is missing, cross-tenant, attached to an inactive branch, or branch-incompatible with the user
- **THEN** refresh/session rotation MUST return 401 and MUST NOT issue a replacement session.

### Requirement: Device blocking revokes active sessions
The system SHALL revoke all active sessions linked to a device when that device becomes blocked or otherwise ineligible.

#### Scenario: Device blocking races with refresh
- **WHEN** device blocking and refresh/session rotation occur concurrently
- **THEN** at most one final state MUST exist and no replacement session may remain active for the blocked device.

#### Scenario: Reactivated device does not restore revoked sessions
- **WHEN** a blocked device is later reactivated
- **THEN** sessions revoked during the block MUST remain unusable.

### Requirement: Device revocation is audited
The system SHALL record an audit entry whenever sessions are revoked because of device status or device-branch eligibility.

#### Scenario: Device status revokes sessions
- **WHEN** session revocation is triggered by device ineligibility
- **THEN** the audit record MUST identify the device, affected tenant, reason, actor or system source, and timestamp.

### Requirement: Device attestations are replay-protected
The system SHALL persist accepted attestation nonce hashes per device and reject reuse of an accepted attestation.

#### Scenario: First attestation use succeeds
- **WHEN** a valid, unexpired, correctly signed attestation with a new nonce is submitted
- **THEN** the system MUST consume the nonce and may create the session in the same transaction.

#### Scenario: Replayed attestation fails
- **WHEN** the same attestation nonce is submitted again for the same device
- **THEN** the system MUST reject it with a stable replay error and MUST NOT create a session.

#### Scenario: Concurrent attestation replay allows one session
- **WHEN** two concurrent requests submit the same valid attestation for the same device
- **THEN** exactly one request MAY create a session and every other request MUST fail as replayed.

### Requirement: Attestation timestamps and secrets are validated
The system SHALL reject attestations outside the allowed timestamp window, reject future timestamps beyond clock-skew allowance, and use only a high-entropy device/server secret for signatures.

#### Scenario: Expired or future attestation fails
- **WHEN** an attestation timestamp is expired or too far in the future
- **THEN** the system MUST reject it before issuing a session.

#### Scenario: Rotated device secret invalidates old attestations
- **WHEN** a device secret is rotated or revoked
- **THEN** attestations signed with the old secret MUST fail.
