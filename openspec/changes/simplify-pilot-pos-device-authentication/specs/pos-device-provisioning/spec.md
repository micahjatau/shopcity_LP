## MODIFIED Requirements

### Requirement: Exclusive device authentication binding modes

Each device SHALL accept exactly one cashier authentication proof according to its persisted binding mode. `UNPAIRED` SHALL accept no proof, `HMAC_LEGACY` SHALL accept only the existing HMAC proof, `WEBAUTHN` SHALL accept only an active WebAuthn credential, and `DEVICE_TOKEN` SHALL accept only its active keyed device-token cookie credential. No mode SHALL fall back or downgrade to another proof. Deployed Preview, Staging, and Production runtimes SHALL require the explicit `PILOT_CASHIER_DEVICE_TOKEN_ONLY=true` policy and SHALL issue Cashier sessions only from DEVICE_TOKEN credentials. Local/test compatibility code and legacy data remain intact; they do not authorize a deployed pilot runtime to accept HMAC_LEGACY or WEBAUTHN.

#### Scenario: Device token login is exclusive

- **WHEN** a cashier logs into an active DEVICE_TOKEN device with valid account password and the active browser token cookie
- **THEN** the backend SHALL verify the token against the device's one active credential and issue a session bound to that persisted device ID
- **AND** missing/invalid token, disabled credential, inactive device/branch/user/tenant, tenant mismatch, or branch mismatch SHALL fail closed with generic device authentication failure
- **AND** HMAC or WebAuthn proof SHALL not be accepted for that DEVICE_TOKEN device

#### Scenario: Deployed pilot rejects legacy cashier proof

- **GIVEN** the runtime is deployed to Preview, Staging, or Production with the required DEVICE_TOKEN-only policy
- **WHEN** login is attempted on an UNPAIRED, HMAC_LEGACY, or WEBAUTHN device without an active DEVICE_TOKEN credential
- **THEN** the Cashier SHALL receive no ShopCity session
- **AND** no alternate proof SHALL be accepted or silently migrated

#### Scenario: Local compatibility mode does not downgrade

- **GIVEN** a local/test compatibility runtime is explicitly used outside the deployed pilot
- **WHEN** login is attempted on a device
- **THEN** only the proof matching its persisted binding mode MAY be accepted
- **AND** DEVICE_TOKEN SHALL not become a fallback for HMAC_LEGACY or WEBAUTHN

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
- **AND** a reset/deactivation response SHALL clear the POS token cookie only when the presented cookie is the active credential for the selected device
- **AND** server-side revocation SHALL remain effective when cookie clearing cannot reach the browser

#### Scenario: Reset a different device from this browser

- **GIVEN** the current browser holds device A's credential
- **WHEN** an authorized actor resets device B from that browser
- **THEN** device B's credential and sessions SHALL be revoked
- **AND** the response SHALL NOT clear device A's cookie or alter its browser locator
- **AND** device A's credential SHALL remain usable

#### Scenario: Deactivate and reactivate a device-token device

- **WHEN** a DEVICE_TOKEN device is deactivated and later reactivated
- **THEN** deactivation SHALL revoke the active token credential and sessions and transition the device to UNPAIRED with no pairedAt value
- **AND** reactivation SHALL leave it UNPAIRED and require a new authorized target-browser pairing before cashier login
- **AND** reactivation SHALL NOT restore or accept the revoked credential
- **AND** HMAC_LEGACY and WEBAUTHN activation behavior SHALL remain unchanged

### Requirement: Token cookie and session lifecycle

The token cookie SHALL be host-only (`__Host-` prefix, no Domain), Secure, HttpOnly, SameSite=Strict, Path=/, and have Max-Age 31536000. Deployed environments SHALL require HTTPS. Cashier logout SHALL preserve this device cookie. Ordinary ShopCity session refresh SHALL preserve, not renew, nor change the device credential/cookie. Refresh and session resolution SHALL revalidate session device, user, tenant, branch, and status. Financial operations SHALL continue to trust only authenticated `session.deviceId`.

#### Scenario: Logout and refresh preserve device credential

- **WHEN** cashier logs out or refreshes the ShopCity session
- **THEN** only session/CSRF lifecycle SHALL change
- **AND** the device token cookie and device credential last-use state SHALL not be cleared or renewed by those operations

### Requirement: Device management uses fresh state and pins pending pairing

The Admin and Supervisor device-management screens SHALL disable device mutations when the current list failed to load or refresh, while retaining stale information for context. During an in-flight pairing operation, device selection SHALL remain locked to the confirmed target; only that target's non-secret locator may be written after pairing succeeds. Reset/deactivation SHALL clear the local locator only when it names the selected device. For mutations backed by the device idempotency API, an uncertain retry of the same target and payload SHALL reuse the same Idempotency-Key within the server retention window; a changed payload, target, or completed new user intent SHALL receive a new key.

#### Scenario: Device refresh fails

- **WHEN** a device list refresh fails after previously loaded devices are displayed
- **THEN** stale devices MAY remain visible for context
- **AND** create, pair, reset, revoke, deactivate, and reactivate actions SHALL remain disabled until a successful refresh

#### Scenario: A device mutation has an uncertain outcome

- **WHEN** a create or update request may have committed but its response was not reliably received
- **THEN** retrying the same operation with the same target and payload SHALL reuse its Idempotency-Key
- **AND** changing the payload/target or beginning a new operation after success SHALL use a fresh key
- **AND** no new device or repeated state-transition side effect SHALL result from a same-key retry

#### Scenario: Pairing is pending

- **WHEN** pairing is pending for a confirmed target device
- **THEN** the device selector SHALL not change the selected target until the operation settles
- **AND** a successful response SHALL write only the confirmed target's non-secret locator

### Requirement: Public login Origin integrity

Browser-facing public login SHALL use the same-origin web/BFF route. The BFF SHALL derive trusted browser origins from explicit `SHOPCITY_WEB_ORIGINS` plus approved Vercel deployment metadata for generated Preview hosts; it SHALL NOT infer API targets from Git refs or trust client-supplied Host/Forwarded/X-Forwarded-* metadata. The BFF SHALL require an explicit environment-to-API mapping outside Local/test and SHALL require HTTPS targets in deployed environments. Deployed API login SHALL require the configured server-only `SHOPCITY_BFF_SHARED_SECRET` and a matching `SHOPCITY_DEPLOYMENT_ENV` header; the API SHALL not treat Origin/Referer alone as BFF identity. Origin SHALL be canonical and Referer origin MAY be used only when Origin is absent. Local/test without a BFF secret remains restricted to exact `CORS_ORIGIN_ALLOWLIST` origins. Public login does not require a pre-login session-bound CSRF pair and SHALL preserve rate limiting, generic failures, and Supabase password verification.

#### Scenario: Login Origin or BFF identity rejected

- **WHEN** Origin is missing and Referer is absent, malformed or untrusted, or the BFF credential/environment does not match the API target
- **THEN** login SHALL fail before creating a ShopCity session
- **AND** the response SHALL not disclose the BFF credential or user/account existence

#### Scenario: Valid cashier token login

- **WHEN** a cashier submits valid credentials from an allowlisted origin with their paired device cookie
- **THEN** Supabase password verification SHALL succeed before the backend validates the active credential and rechecks account/device/branch status
- **AND** the ShopCity session SHALL be bound to persisted `session.deviceId`

### Requirement: Same-origin proxy preserves token cookie transport

The web same-origin proxy SHALL preserve Cookie, validated Origin/Referer, request body, status, timeout behavior, and upstream Set-Cookie attributes. It SHALL discard browser-supplied BFF identity and attach the server-configured `x-shopcity-bff-token` plus `x-shopcity-deployment-environment` only for the public login and cashier-login completion upstream requests. These headers SHALL never be exposed to browser code, responses, logs, or analytics.

#### Scenario: Pair and login through proxy

- **WHEN** browser pairing or cashier login is sent through the same-origin proxy
- **THEN** request cookie/origin evidence SHALL reach the API and API cookie attributes SHALL reach the browser unchanged
