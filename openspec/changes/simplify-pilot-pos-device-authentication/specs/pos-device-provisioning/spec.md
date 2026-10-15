## MODIFIED Requirements

### Requirement: Exclusive device authentication binding modes

Each device SHALL accept exactly one cashier authentication proof according to its persisted binding mode. `UNPAIRED` SHALL accept no proof, `HMAC_LEGACY` SHALL accept only the existing HMAC proof, `WEBAUTHN` SHALL accept only an active WebAuthn credential, and `DEVICE_TOKEN` SHALL accept only its active keyed device-token cookie credential. No mode SHALL fall back or downgrade to another proof. Existing HMAC_LEGACY and WEBAUTHN devices SHALL remain unchanged unless separately migrated through their existing approved flows.

#### Scenario: Device token login is exclusive

- **WHEN** a cashier logs into an active DEVICE_TOKEN device with valid account password and the active browser token cookie
- **THEN** the backend SHALL verify the token against the device's one active credential and issue a session bound to that persisted device ID
- **AND** missing/invalid token, disabled credential, inactive device/branch/user/tenant, tenant mismatch, or branch mismatch SHALL fail closed with generic device authentication failure
- **AND** HMAC or WebAuthn proof SHALL not be accepted for that DEVICE_TOKEN device

#### Scenario: Existing binding modes do not downgrade

- **WHEN** a login is attempted on an UNPAIRED, HMAC_LEGACY, or WEBAUTHN device
- **THEN** the existing mode-specific behavior SHALL remain exclusive and unchanged
- **AND** DEVICE_TOKEN SHALL not become a fallback for any existing proof mode

### Requirement: Keyed device-token credential storage

The system SHALL store only HMAC-SHA-256 of a random device token under dedicated `POS_DEVICE_TOKEN_HMAC_KEY`, plus key version, tenant/device association, status, creation/pair/revoke timestamps, and last-use metadata. The key SHALL be a 32-byte base64url secret from approved server secret storage and SHALL never be `SESSION_SECRET` or `CSRF_SECRET`. MVP SHALL use one active key/version; missing or malformed configuration SHALL fail closed. Replacing the key SHALL increment the configured version and SHALL invalidate old credentials/sessions without fallback. At most one active credential SHALL exist per device.

#### Scenario: Token is never stored or disclosed

- **WHEN** a device token is paired
- **THEN** only the keyed hash and key version SHALL be persisted
- **AND** the raw token SHALL be returned only as the target browser's HttpOnly cookie and SHALL not appear in JSON, logs, URLs, analytics, or browser persistent script-readable storage

#### Scenario: Key replacement invalidates credentials

- **WHEN** the dedicated HMAC key is replaced
- **THEN** old hashes SHALL not validate under the new key
- **AND** active credentials/sessions SHALL be invalidated and require authorized supervised re-pairing
- **AND** no dual-key fallback SHALL be used

### Requirement: Authorized target-browser pairing and reset

Only an active Supervisor or Admin in the device's tenant SHALL pair/reset/revoke DEVICE_TOKEN credentials. Supervisors SHALL be restricted to their assigned branch; Admins MAY manage any branch in their own tenant. Device and branch SHALL be active, and tenant/device/branch scope SHALL be checked without cross-tenant enumeration. Pair/reset SHALL require authenticated session-bound `shopcity_csrf` plus matching `x-csrf-token`, audit actor/time, and set/clear the token cookie only on the authorized actor's current target-browser response. Pair/reset/revoke/deactivate SHALL atomically invalidate credentials and all active device sessions.

#### Scenario: Authorized pairing

- **WHEN** an eligible same-tenant Admin or in-branch Supervisor pairs an active device from the target browser
- **THEN** the server SHALL atomically revoke prior device token credential(s) and active device sessions, create one active keyed credential, set DEVICE_TOKEN mode, and record the actor/time audit event
- **AND** only after commit SHALL the response set `__Host-shopcity_pos_device` with Secure, HttpOnly, SameSite=Strict, Path=/, no Domain, and Max-Age=31536000

#### Scenario: Unauthorized, inactive, or cross-tenant pairing

- **WHEN** the actor lacks role/scope, the device or branch is inactive, or tenant does not match
- **THEN** the operation SHALL fail without credential/session mutation and preserve non-enumerating behavior

#### Scenario: Reset/revoke/deactivation

- **WHEN** an authorized actor resets/revokes a credential or deactivates the device
- **THEN** the credential and device sessions SHALL be invalidated atomically and audited
- **AND** the response SHALL clear the target-browser token cookie when it reaches that browser
- **AND** server-side revocation SHALL remain effective when cookie clearing cannot reach the browser

### Requirement: Token cookie and session lifecycle

The token cookie SHALL be host-only (`__Host-` prefix, no Domain), Secure, HttpOnly, SameSite=Strict, Path=/, and have Max-Age 31536000. Deployed environments SHALL require HTTPS. Cashier logout SHALL preserve this device cookie. Ordinary ShopCity session refresh SHALL preserve, not renew, nor change the device credential/cookie. Refresh and session resolution SHALL revalidate session device, user, tenant, branch, and status. Financial operations SHALL continue to trust only authenticated `session.deviceId`.

#### Scenario: Logout and refresh preserve device credential

- **WHEN** cashier logs out or refreshes the ShopCity session
- **THEN** only session/CSRF lifecycle SHALL change
- **AND** the device token cookie and device credential last-use state SHALL not be cleared or renewed by those operations

### Requirement: Public login Origin integrity

Public login SHALL enforce exact canonical Origin allowlist validation. Referer origin MAY be used only when Origin is absent. Missing, malformed, or non-allowlisted origin SHALL be rejected. The login endpoint SHALL not require a pre-login session-bound CSRF pair, but SHALL preserve Origin integrity, current rate limiting, generic errors, and Supabase password verification.

#### Scenario: Login Origin rejected

- **WHEN** Origin is missing and Referer is absent, or the selected origin is not allowlisted
- **THEN** login SHALL fail before creating a ShopCity session

#### Scenario: Valid cashier token login

- **WHEN** a cashier submits valid credentials from an allowlisted origin with their paired device cookie
- **THEN** Supabase password verification SHALL succeed before the backend validates the active credential and rechecks account/device/branch status
- **AND** the ShopCity session SHALL be bound to persisted `session.deviceId`

### Requirement: Same-origin proxy preserves token cookie transport

The web same-origin proxy SHALL forward incoming Cookie, Origin, and Referer headers and preserve upstream Set-Cookie headers without exposing HttpOnly token contents to frontend code.

#### Scenario: Pair and login through proxy

- **WHEN** browser pairing or cashier login is sent through the same-origin proxy
- **THEN** request cookie/origin evidence SHALL reach the API and API cookie attributes SHALL reach the browser unchanged
