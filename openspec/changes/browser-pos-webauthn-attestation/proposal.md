# Change: Pair cashier registers with browser WebAuthn

## Why

ShopCity's current cashier security already depends on device-bound sessions: Earn and Redeem reject cashier requests without an active, branch-compatible device, and refresh rechecks device/session eligibility. The browser proof currently relies on per-device HMAC secrets and a manually supplied `fingerprintHash`. That makes provisioning operationally awkward and the fingerprint name overstates what a browser can identify.

This change replaces the proof mechanism, not the existing device, branch, session, audit, or financial controls. It proposes WebAuthn for browser-mediated device possession, with a separate credential lifecycle and a hard assurance qualification gate before production.

## What Changes

- Add explicit device binding modes: `UNPAIRED`, `HMAC_LEGACY`, and `WEBAUTHN`. Each mode accepts only its own proof; a WEBAUTHN device never falls back to HMAC.
- Add a separate `DeviceWebAuthnCredential` entity for credential ID, public key, authenticator/attestation metadata, backup signals, lifecycle state, and timestamps. A device may have multiple active credentials for controlled rotation.
- Add one-time enrollment authorization and short-lived cashier login-attempt records. Pairing authorization is tenant/device/branch-bound, high entropy, single-use, audited, and submitted in a POST body; it is not a reusable password or URL token.
- Make cashier login two-phase: password success creates only a short-lived login attempt and returns `DEVICE_ASSERTION_REQUIRED` plus WebAuthn options—no ShopCity session/cookie. A separate completion operation verifies the assertion and rechecks account/device/branch state before creating a session.
- Bind each WebAuthn cashier session to both `deviceId` and `deviceCredentialId`; credential revocation blocks refresh and revokes sessions established with that credential.
- Define WebAuthn credentials as POS-device-scoped, not cashier-scoped: multiple eligible cashiers may use the same paired POS credential while authenticating with their own account credentials; no per-cashier pairing or cross-device passkey sync is required.
- Preserve current provisioning authorization: Admin may manage tenant devices; Supervisor may manage only devices in their own branch, with existing non-enumerating cross-branch behavior.
- Make `fingerprintHash` nullable during migration, preserve it only as legacy metadata/proof material for inventoried HMAC devices, and set it to null for new WebAuthn devices. Remove the field only after legacy HMAC retirement.
- Target a WebAuthn Level 3 / FIDO2 device-bound profile with platform authenticator selection, required user verification, discouraged resident keys, and attestation evaluation. Do not claim formal NIST AAL3 compliance. Hardware-backed, non-exportable, non-syncable register assurance is a hard pre-production gate; if the fleet cannot establish it, use a managed-device certificate/agent for device identity and retain WebAuthn for cashier authentication.
- Update the TRD to make cashier device binding a security invariant rather than optional attribution.

## Capabilities

### Modified Capabilities

- `pos-device-provisioning`: preserve Admin tenant-wide and Supervisor own-branch authority while moving new device enrollment to an explicit WebAuthn credential lifecycle and exclusive binding modes.

## Impact

- Auth login, session issuance/refresh/resolution, credential revocation, device provisioning, Prisma migrations, OpenAPI and generated clients.
- Admin/Supervisor device management and cashier login UX.
- `docs/TRD.md`, migration tracker, security policy, and device operations runbook.
- Auth, RBAC-scope, challenge replay/race, session/credential revocation, migration, and browser tests.

Earn/Redeem amounts, eligibility, ledger, approvals, idempotency, and branch authorization rules do not change. Cashier device binding is clarified as an existing enforcement invariant, not a new financial rule.

## Acceptance Summary

- A new device is `UNPAIRED` and cannot establish cashier sessions until pairing completes. New WebAuthn devices have `fingerprintHash = null`.
- Pairing uses high-entropy, tenant/device/branch-scoped, short-lived, single-use authorization and a fresh registration challenge; completion is audited and atomic.
- `POST /auth/login` for a cashier returns a short-lived password-verified login attempt and WebAuthn options but no ShopCity session or cookie. Only successful `/auth/cashier-login/complete` can issue a session.
- Before session issuance, the server verifies challenge/attempt freshness and consumption, origin, RP ID, credential ID, signature, UP and UV, approved backup/attestation policy, account/device/credential/branch status, and branch compatibility.
- Multiple eligible CASHIER accounts can independently sign in to the same paired POS using their own account credentials and that device's WebAuthn proof; each session is separately authorized and bound to the same device and credential.
- `Session.deviceCredentialId` binds each WebAuthn session to the credential used. Revoking that credential prevents refresh and revokes its active sessions; device revocation blocks all device sessions.
- `HMAC_LEGACY` accepts HMAC only, `UNPAIRED` accepts neither, and `WEBAUTHN` accepts WebAuthn only. Migration to WEBAUTHN atomically revokes prior device sessions and retires the HMAC credential; no downgrade fallback is allowed.
- Admin/Supervisor device authority remains tenant-wide/own-branch respectively; out-of-scope results remain non-enumerating.
- Production rollout is blocked until the approved POS browser/OS/authenticator combination is proven to satisfy the hardware-backed, non-syncable register-binding policy. If it cannot, do not characterize generic/synced passkeys as register identity; use an approved managed-device alternative.
