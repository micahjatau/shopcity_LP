## MODIFIED Requirements

### Requirement: POS devices are administratively provisioned

The system SHALL allow an authorized Admin to manage tenant devices and an authorized Supervisor to manage only devices in their own branch, including create, inspect, pair, revoke, and re-pair. Existing non-enumerating cross-branch behavior SHALL be preserved. Device enrollment SHALL use explicit `UNPAIRED`, `HMAC_LEGACY`, and `WEBAUTHN` binding modes. New devices SHALL start `UNPAIRED` and remain non-operational until WebAuthn pairing succeeds. Pairing authorization SHALL be high entropy, short-lived, single-use, tenant/device/branch-bound, audited, consumed atomically, and exchanged without placing its bearer value in URL paths/query strings, logs, analytics, or persistent browser storage. New-device UI SHALL NOT require a manual hardware fingerprint; `fingerprintHash` SHALL be nullable legacy data and SHALL be null for new WebAuthn devices.

#### Scenario: Admin or branch Supervisor starts enrollment

- **WHEN** an Admin starts enrollment for a tenant device or a Supervisor starts enrollment for a device in their own branch
- **THEN** the backend creates or selects the branch-bound device record and issues a short-lived pairing authorization
- **AND** the device remains non-operational until pairing completes
- **AND** the action is audited

#### Scenario: Supervisor targets a device outside their branch

- **WHEN** a Supervisor attempts to inspect, enroll, pair, or revoke a device outside their authorized branch
- **THEN** the request is denied using the existing non-enumerating behavior
- **AND** no device state or credential is changed

#### Scenario: POS browser completes pairing

- **GIVEN** an unexpired, unused pairing authorization bound to an eligible device
- **WHEN** the target POS browser completes a fresh WebAuthn registration ceremony
- **THEN** the backend verifies the challenge, exact origin, RP ID, credential response, user verification, and approved device-assurance policy
- **AND** stores public credential material and required authenticator metadata only
- **AND** atomically activates the credential, changes the device to `WEBAUTHN`, consumes the authorization, and audits the result

### Requirement: Device-attested sessions remain fail-closed

For CASHIER, valid account authentication SHALL NOT create a ShopCity session until the backend also verifies fresh device proof for an active, branch-compatible device. WebAuthn login SHALL use two phases: password success creates only a short-lived, single-use login attempt and returns `DEVICE_ASSERTION_REQUIRED` with WebAuthn options; it SHALL issue no ShopCity session, session cookie, CSRF token, or refresh authority. Only successful login completion after rechecking account, tenant, device, credential, branch, and challenge state MAY issue a session. Every WebAuthn cashier session SHALL bind both `deviceId` and `deviceCredentialId`. Supervisor/Admin login SHALL remain on the existing path unless separately approved.

#### Scenario: Cashier completes WebAuthn login

- **GIVEN** an active cashier, active tenant/branch, an active WEBAUTHN device, and an active credential registered to that device
- **WHEN** the cashier supplies valid account credentials and completes the assertion for the unexpired login attempt
- **THEN** the backend verifies the assertion and rechecks all user/device/credential/branch state before session creation
- **AND** issues a session bound to both the device and the credential used
- **AND** Earn, Redeem, and offline reconciliation continue to use backend-owned session device identity

#### Scenario: Password succeeds but device assertion is pending

- **WHEN** valid cashier account credentials are verified for a WEBAUTHN device
- **THEN** the response indicates `DEVICE_ASSERTION_REQUIRED` and returns only a short-lived attempt plus public WebAuthn options
- **AND** no ShopCity session or authentication cookie is created

#### Scenario: Cashier login proof is invalid or incomplete

- **WHEN** login lacks a valid assertion, attempt, challenge, credential, signature, user-presence/user-verification signal, active device, or branch compatibility
- **THEN** login completion is rejected with a stable safe error
- **AND** no operational cashier session is issued

### Requirement: Raw attestation secrets are not browser-persisted

Production WebAuthn authentication SHALL store public credential material only and SHALL NOT require a cashier to enter, remember, or persist a raw device HMAC secret. Binding modes SHALL be exclusive: `UNPAIRED` accepts neither proof, `HMAC_LEGACY` accepts only its inventoried legacy HMAC proof during the bounded migration, and `WEBAUTHN` accepts only active WebAuthn credentials. A WEBAUTHN device SHALL never fall back to HMAC. New production devices SHALL NOT be enrolled with HMAC. On successful per-device HMAC migration, the backend SHALL atomically activate WebAuthn, change mode, revoke prior device sessions, retire the legacy secret, and audit the transition.

#### Scenario: WebAuthn device receives an HMAC assertion

- **GIVEN** a device is in WEBAUTHN mode
- **WHEN** a client submits only a legacy HMAC proof or WebAuthn verification fails
- **THEN** the backend rejects authentication without falling back to HMAC or issuing a device-less session

#### Scenario: Legacy HMAC migration is incomplete

- **GIVEN** a device is explicitly inventoried in HMAC_LEGACY mode and the approved migration window remains open
- **WHEN** it authenticates using its existing valid HMAC proof
- **THEN** only that legacy mode may accept the proof
- **AND** no new production device is enrolled in HMAC_LEGACY mode
- **AND** a missing or invalid proof fails closed

## ADDED Requirements

### Requirement: POS WebAuthn challenges are scoped and replay-resistant

The backend SHALL issue cryptographically random, short-lived challenges bound to tenant, device, branch, purpose, and the specific enrollment/login attempt. The backend SHALL atomically consume each enrollment authorization, WebAuthn challenge, and login attempt at most once. Assertion verification SHALL require the exact configured RP ID and allowed origin, a registered credential ID and valid signature, user presence, user verification, active user/device/credential/branch state, and the approved backup/attestation policy. The backend SHALL use a maintained WebAuthn verifier rather than custom protocol parsing. Challenge replay protection SHALL not rely on signature counters alone.

#### Scenario: Challenge is expired, replayed, or raced

- **GIVEN** a pairing/login challenge is expired, already consumed, or concurrently completed more than once
- **WHEN** a registration or assertion response is submitted
- **THEN** at most one valid completion can succeed
- **AND** no additional session or credential activation occurs

#### Scenario: Request has wrong origin, RP ID, credential, or branch

- **WHEN** WebAuthn verification receives an unexpected origin/RP ID, credential not associated with the selected device, invalid signature, or branch mismatch
- **THEN** the backend rejects the operation without revealing cross-branch device existence
- **AND** no session, activation, or mode transition is committed

### Requirement: Credential revocation invalidates bound sessions

Every WebAuthn cashier session SHALL identify the exact active `deviceCredentialId` used at login. Session resolution and refresh SHALL reject sessions whose credential is revoked, inactive, or no longer associated with the active device. Revoking a credential SHALL revoke active sessions established with that credential; deactivating a device or branch SHALL invalidate all sessions associated with that device.

#### Scenario: Credential is revoked while its device remains active

- **GIVEN** a cashier session is bound to a credential that is revoked while another credential or the device remains active
- **WHEN** the session is used or refreshed
- **THEN** the backend rejects it and no renewed session is issued
- **AND** unrelated credentials remain governed by their own status

#### Scenario: Device is revoked

- **WHEN** an authorized actor deactivates a device
- **THEN** all cashier sessions associated with that device fail session resolution and refresh regardless of credential status

### Requirement: Production authenticator assurance is qualified before rollout

Production cashier device binding SHALL use a WebAuthn Level 3/FIDO2 profile with platform authenticator selection, required user verification, discouraged resident keys, and an approved attestation/backup policy. `authenticatorAttachment`, AAGUID, and backup signals SHALL be treated as evidence inputs, not assumed proof of hardware-backed, non-exportable, non-syncable storage. Production rollout SHALL be blocked until the approved POS browser/OS/authenticator combination is shown to meet ShopCity's register-binding policy. The design SHALL NOT claim formal NIST AAL3 compliance. If the target environment cannot establish the required assurance, device identity SHALL use an approved managed-device certificate/agent or equivalent rather than a syncable passkey.

#### Scenario: Target POS authenticator cannot establish register binding

- **GIVEN** qualification shows that the target authenticator is syncable, exportable, unsupported, or otherwise cannot meet the approved register-binding policy
- **WHEN** production rollout is considered
- **THEN** rollout is blocked
- **AND** the system does not represent generic WebAuthn or a synced credential as proof of a specific physical register
- **AND** an approved managed-device alternative is selected for device identity

### Requirement: Browser reset has an audited re-pair recovery path

The system SHALL allow an authorized Admin to revoke/re-pair any tenant device and an authorized Supervisor to do so only within their own branch. Recovery SHALL create a new credential; the server SHALL NOT export or recover a private key or raw HMAC secret. Re-pairing or credential rotation SHALL revoke sessions according to the credential/device scope and SHALL be audited.

#### Scenario: POS browser storage or authenticator is lost

- **WHEN** an authorized actor revokes the unavailable credential and starts a new pairing ceremony within their device scope
- **THEN** the old credential can no longer authenticate or refresh its sessions
- **AND** the replacement credential is associated with the device only after successful policy-compliant pairing
- **AND** revocation and re-pair actions are audited
