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

#### Scenario: Pairing outcome stays visible in its confirmation dialog

- **GIVEN** an authorized actor starts pairing from the confirmation dialog
- **WHEN** pairing succeeds or fails
- **THEN** the success or error message is displayed inside that dialog
- **AND** the dialog remains open until the actor dismisses it
- **AND** pairing authorization and private credential material are not displayed

#### Scenario: Device management panels adapt to viewport width

- **GIVEN** an authorized actor opens device management
- **WHEN** the viewport is wide enough for a two-column layout
- **THEN** the create-device panel appears to the left of the device list and details
- **WHEN** the viewport is tablet or mobile width
- **THEN** the create-device panel and device list stack vertically

#### Scenario: Device selection uses a styled button menu

- **GIVEN** the actor has one or more devices in their authorized scope
- **WHEN** the actor activates the Device selector
- **THEN** a styled listbox of those devices is displayed from a button matching the page controls
- **AND** the actor can choose a device using pointer or keyboard interaction
- **AND** selection updates the device details without changing the authorized scope

### Requirement: Device-attested sessions remain fail-closed

For CASHIER, valid account authentication SHALL NOT create a ShopCity session until the backend also verifies fresh device proof for an active, branch-compatible device. WebAuthn login SHALL use two phases: password success creates only a short-lived, single-use login attempt and returns `DEVICE_ASSERTION_REQUIRED` with WebAuthn options; it SHALL issue no ShopCity session, session cookie, CSRF token, or refresh authority. Only successful login completion after rechecking account, tenant, device, credential, branch, and challenge state MAY issue a session. Every WebAuthn cashier session SHALL bind both `deviceId` and `deviceCredentialId`. A WebAuthn credential SHALL be scoped to the POS device, not to a single cashier; each eligible cashier SHALL authenticate with their own account credentials and a fresh assertion using that paired device credential. Supervisor/Admin login SHALL remain on the existing path unless separately approved.

#### Scenario: Cashier completes WebAuthn login

- **GIVEN** an active cashier, active tenant/branch, an active WEBAUTHN device, and an active credential registered to that device
- **WHEN** the cashier supplies valid account credentials and completes the assertion for the unexpired login attempt
- **THEN** the backend verifies the assertion and rechecks all user/device/credential/branch state before session creation
- **AND** issues a session bound to both the device and the credential used
- **AND** Earn, Redeem, and offline reconciliation continue to use backend-owned session device identity

#### Scenario: Multiple eligible cashiers share one paired POS

- **GIVEN** an active WEBAUTHN device with an active device-scoped credential and multiple active CASHIER accounts eligible for its branch
- **WHEN** each cashier independently supplies their own valid account credentials and completes a fresh assertion using that POS device credential
- **THEN** each cashier receives a separate session only after their account, tenant, branch, device, credential, and challenge are rechecked
- **AND** each session is bound to the same POS `deviceId` and device-scoped `deviceCredentialId`
- **AND** no separate device pairing or credential registration is required for each cashier

#### Scenario: Password succeeds but device assertion is pending

- **WHEN** valid cashier account credentials are verified for a WEBAUTHN device
- **THEN** the response indicates `DEVICE_ASSERTION_REQUIRED` and returns only a short-lived attempt plus public WebAuthn options
- **AND** no ShopCity session or authentication cookie is created

#### Scenario: Supervisor or Admin changes from the default Cashier selection

- **GIVEN** the shared sign-in form displays a cashier-only pairing warning
- **WHEN** staff selects Supervisor or Admin
- **THEN** the cashier-only warning is cleared
- **AND** the cashier pairing precheck does not block the selected role's credential submission
- **AND** the backend remains authoritative for the authenticated role and session permissions

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

### Requirement: Development enrollment is explicitly isolated

Local development MAY enable WebAuthn enrollment through the explicit `WEBAUTHN_DEV_ENROLLMENT_ENABLED` setting only when `NODE_ENV=development`. This setting SHALL default to false and SHALL be rejected in test, staging, and production environments. It SHALL NOT imply security approval or production qualification. The development opt-in SHALL NOT bypass WebAuthn cryptographic verification, exact origin/RP ID checks, metadata trust policy, database constraints, atomic state transitions, branch authorization, or session revocation. `WEBAUTHN_DEVICE_QUALIFICATION_APPROVED` remains the distinct production qualification gate.

#### Scenario: Developer explicitly enables local enrollment

- **GIVEN** `NODE_ENV=development`, the development opt-in is explicitly true, and the RP ID and allowed origins are configured for that development origin
- **WHEN** an authorized actor starts or completes enrollment in the local development environment
- **THEN** all normal cryptographic, metadata, origin/RP, authorization, database, challenge-consumption, and state checks still apply
- **AND** a successful development test is not recorded or described as hardware qualification

#### Scenario: Development opt-in is attempted outside development

- **GIVEN** `NODE_ENV` is `test`, `staging`, or `production`
- **WHEN** `WEBAUTHN_DEV_ENROLLMENT_ENABLED` is configured as true
- **THEN** environment validation rejects the configuration
- **AND** production enrollment remains controlled only by the separate qualification approval gate

### Requirement: Vercel Preview enrollment is explicitly isolated

Vercel Preview MAY enable WebAuthn enrollment only when the separate `WEBAUTHN_PREVIEW_ENROLLMENT_ENABLED` opt-in is true and the runtime reports `VERCEL_ENV=preview`. The setting SHALL default to false and SHALL be rejected for Vercel Development, Production, and non-Vercel environments. Preview enrollment SHALL require an exact HTTPS browser origin and an RP ID equal to that Preview hostname, use a non-production backend/database, and SHALL NOT imply production qualification or change the production gate. Preview opt-in SHALL NOT bypass cryptographic verification, metadata trust checks, branch authorization, database constraints, atomic state transitions, or session revocation.

#### Scenario: Explicit Preview enrollment is enabled

- **GIVEN** `VERCEL_ENV=preview`, `WEBAUTHN_PREVIEW_ENROLLMENT_ENABLED=true`, and an exact HTTPS browser origin and matching RP ID are configured
- **AND** the Preview API uses a non-production database
- **WHEN** an authorized actor enrolls a device
- **THEN** the normal WebAuthn verification, trust, authorization, and state checks still apply
- **AND** the successful Preview test is not recorded or described as hardware qualification or production approval

#### Scenario: Preview opt-in is attempted outside Preview

- **GIVEN** `VERCEL_ENV` is absent or is not `preview`
- **WHEN** `WEBAUTHN_PREVIEW_ENROLLMENT_ENABLED` is configured as true
- **THEN** environment validation rejects the configuration
- **AND** enrollment remains disabled unless the separate local-development or production-qualification gate applies

### Requirement: Local and tailnet-scoped unpaired cashier test sessions are isolated

A developer MAY create a short-lived CASHIER test session for local earn/redeem workflow development without pairing a physical device. The path SHALL be disabled by default and require `NODE_ENV=development`, no `VERCEL_ENV`, an explicit `DEV_CASHIER_TEST_SESSION_ENABLED=true` opt-in, a loopback-only `DATABASE_URL`, and deterministic non-delivering SMS mode. When this opt-in is requested, the API listener SHALL bind only to loopback; with the opt-in off, the existing listener behavior SHALL remain unchanged. By default, the endpoint SHALL accept only a loopback HTTP Origin. An operator MAY additionally configure one exact canonical HTTPS `*.ts.net` origin with `DEV_CASHIER_TEST_SESSION_TAILSCALE_ORIGIN`; environment validation SHALL reject this setting unless the entire local-only gate passes. The configured tailnet origin SHALL be exposed only through Tailscale Serve in tailnet-only mode under the operator's Tailscale ACL; Funnel and public exposure are prohibited. API/database access remains loopback/local, requests from any other non-loopback origin SHALL be rejected, and session cookies issued to the HTTPS tailnet origin SHALL be Secure. The path SHALL use an active CASHIER assigned to an active branch and a dedicated active `UNPAIRED` local test device in that branch. The resulting session SHALL be marked `SMOKE`, expire within 15 minutes, and SHALL NOT be refreshable. The exception SHALL be accepted by session resolution only under the same development, local-database, deterministic-SMS, and no-Vercel gate; it SHALL NOT change normal login, enrollment, credential verification, production qualification, or paired-device requirements. All resulting transactions are local test data and SHALL NOT be routed to a remote database or real SMS provider.

#### Scenario: Local cashier workflow session

- **GIVEN** the local-only opt-in and loopback database are configured, deterministic SMS mode is selected, no tailnet origin is required, and an active branch-bound CASHIER exists
- **WHEN** a developer starts a local cashier test session from a loopback HTTP Origin
- **THEN** the backend issues a short-lived smoke session bound to a dedicated `UNPAIRED` local test device without performing WebAuthn pairing
- **AND** normal earn/redeem authorization, validation, audit, and local persistence continue to run
- **AND** the session cannot be created or resolved in Vercel Development, Preview, Production, staging, or any non-loopback database environment

#### Scenario: Exact tailnet origin is explicitly allowed

- **GIVEN** the full local-only gate passes, an exact HTTPS `*.ts.net` origin is configured, an active branch-bound CASHIER exists, and Tailscale Serve exposes the local web server in tailnet-only mode
- **WHEN** a request with that exact Origin starts a local cashier test session
- **THEN** the backend issues the same non-refreshable 15-minute smoke session and both session cookies are Secure
- **AND** requests from a different Tailscale hostname, port, scheme, or any other non-loopback origin are rejected
- **AND** the API remains loopback-bound and the link is not exposed through Funnel or the public internet

#### Scenario: Local cashier test session is disabled or misconfigured

- **GIVEN** the opt-in is false, `NODE_ENV` is not `development`, `VERCEL_ENV` is present, the database is not loopback-only, SMS mode is not deterministic, or a tailnet origin is invalid or configured without the local opt-in
- **WHEN** the local test-session endpoint is called or configuration is validated
- **THEN** the endpoint is unavailable or rejects the request and environment validation rejects unsafe opt-in
- **AND** no session or test device is created

#### Scenario: Local cashier opt-in constrains the API listener

- **GIVEN** `DEV_CASHIER_TEST_SESSION_ENABLED=true`
- **WHEN** the API starts
- **THEN** it listens only on the loopback interface
- **AND** when the opt-in is false, the existing API listener binding remains unchanged
