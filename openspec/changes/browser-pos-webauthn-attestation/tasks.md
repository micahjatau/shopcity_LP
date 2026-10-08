# Tasks: Browser-bound POS WebAuthn attestation

## 1. Establish the assurance policy

- [ ] 1.1 Inventory the actual POS hardware, OS, managed-browser policy, and authenticator combinations.
- [ ] 1.2 Define the ShopCity WebAuthn Level 3/FIDO2 profile: platform selection, required user verification, discouraged resident keys, direct/enterprise attestation policy, backup eligibility/state, RP ID, origin allowlist, and privacy/retention boundaries.
- [ ] 1.3 Determine what target authenticators can prove about hardware backing, non-exportability, and non-syncability. Treat `authenticatorAttachment`, AAGUID, and backup flags as evidence inputs, not assurance by themselves.
- [x] 1.4 Record the hard production go/no-go gate and managed-device certificate/agent fallback. Do not claim formal NIST AAL3 compliance.

## 2. Add credential lifecycle schema and contracts

- [ ] 2.1 Add `Device.authBindingMode` (`UNPAIRED`, `HMAC_LEGACY`, `WEBAUTHN`) and pairing metadata; make legacy `fingerprintHash` nullable and retain it only for inventoried HMAC compatibility.
- [x] 2.2 Add `DeviceWebAuthnCredential`, `DeviceEnrollmentChallenge`, `CashierLoginAttempt`, and nullable `Session.deviceCredentialId` with tenant/device/credential integrity constraints and indexes.
- [x] 2.3 Define challenge/attempt lifetime, hashed bearer values, atomic consumption, origin/RP policy, rate limits, and stable response/error contracts.
- [x] 2.4 Define authorization contracts preserving Admin tenant-wide and Supervisor own-branch device scope and non-enumerating cross-branch behavior.
- [x] 2.5 Define exclusive mode transitions, legacy-device inventory/backfill, per-device HMAC retirement, global cutover, rollback window, and final schema cleanup.
- [x] 2.6 Record the additive migration, backup, deployment order, and rollback in `docs/database/migration-tracker.md` before applying it.
- [x] 2.7 Replace the active-device HMAC check with a binding-mode-aware constraint; retain HMAC secret enforcement for active `HMAC_LEGACY` devices and service-level credential checks for `WEBAUTHN` activation.

## 3. Implement pairing and credential lifecycle

- [x] 3.1 Add Admin/branch-Supervisor-scoped pairing authorization creation and WebAuthn registration options for the target POS browser.
- [ ] 3.2 Verify registration challenge, exact origin/RP ID, credential ID, user verification, authenticator metadata, attestation/trust, and the approved hardware-backed/non-syncable policy using a maintained library.
- [x] 3.3 Persist public credential material only; record required AAGUID, attachment, transports, signCount, backup eligibility/state, attestation format/trust result, RP ID, status, and timestamps.
- [x] 3.4 Atomically consume enrollment authorization, activate the credential, set WEBAUTHN mode, audit, and revoke prior device sessions; for HMAC migration, retire the old secret in the same transaction with no fallback.
- [x] 3.5 Add credential rotation/revoke/re-pair operations and test race-safe state transitions and existing non-enumerating branch behavior.

## 4. Implement two-phase cashier login

- [x] 4.1 Keep Supervisor/Admin login on the existing path; implement CASHIER password verification that creates only a short-lived `CashierLoginAttempt` for WebAuthn devices.
- [x] 4.2 Return `DEVICE_ASSERTION_REQUIRED` and public-key options without issuing a ShopCity session, session cookie, CSRF token, or refresh authority.
- [x] 4.3 Add `/auth/cashier-login/complete`; verify the attempt, challenge, signature, exact origin/RP ID, UP/UV, credential/device/user/branch state, and backup/attestation policy before session creation.
- [x] 4.4 Enforce mode exclusivity: UNPAIRED accepts neither proof, HMAC_LEGACY accepts only legacy HMAC during the approved window, and WEBAUTHN accepts only active WebAuthn credentials.
- [x] 4.5 Ensure challenge/attempt consumption and session issuance are replay-safe and atomic; recheck user/device/branch immediately before commit.
- [x] 4.6 Verify that distinct eligible CASHIER accounts can independently authenticate to one paired POS using their own account credentials and the same device-scoped WebAuthn credential; verify each session binding and reject ineligible or cross-branch users.

## 5. Bind and revoke sessions by credential

- [x] 5.1 Populate `Session.deviceCredentialId` for WebAuthn cashier sessions and preserve it on session refresh/rotation.
- [x] 5.2 Update session resolution and refresh eligibility to require the exact credential remain active and associated with the session device.
- [x] 5.3 Revoke sessions for a revoked credential; invalidate all sessions for a revoked device/branch; cover race conditions with concurrent refresh and revocation.
- [x] 5.4 Preserve non-cashier and smoke-session behavior across the shared `AuthService.issueSession` path; add focused regression tests for every caller.

## 6. Implement Admin/Supervisor and cashier UX

- [x] 6.1 Update Admin → Devices for pending/unpaired state, pairing authorization, credential status, revoke, rotate, and recovery.
- [x] 6.2 Preserve branch-scoped Supervisor permissions and non-enumerating cross-branch responses in UI and API tests.
- [x] 6.3 Replace cashier secret entry with the two-phase WebAuthn interaction and clear unsupported/expired/revoked/re-pair states.
- [x] 6.4 Remove manual `fingerprintHash` entry; set it null for WebAuthn devices. Any optional random browser installation ID is non-secret locator metadata only.
- [x] 6.5 Ensure pairing authorization, private credential material, HMAC secrets, and password/login-attempt secrets never appear in URLs, logs, analytics, or persistent browser storage.

## 7. Migrate legacy HMAC devices

- [ ] 7.1 Inventory and classify every existing device as HMAC_LEGACY or UNPAIRED; verify no device is silently dual-mode.
- [ ] 7.2 Re-pair pilot devices and verify atomic per-device transition, session revocation, secret retirement, and audit evidence.
- [ ] 7.3 During the bounded window, prove HMAC_LEGACY accepts only HMAC, WEBAUTHN accepts only WebAuthn, and UNPAIRED accepts neither.
- [ ] 7.4 After all production devices and rollback criteria pass, disable production HMAC login and remove `x-device-attestation`, browser HMAC generation, one-time secret/rotation UI, production KEK dependency, backfill utilities, and legacy schema in the approved contract migration.
- [x] 7.5 Update the migration tracker, TRD, device runbook, and security incident/credential recovery procedures.

## 8. Verify and qualify production hardware

- [x] 8.1 Add unit tests for signatures, exact origin/RP ID, UP/UV, attestation/backup policy, expired/replayed/raced attempts, invalid state, and wrong branch/tenant.
- [x] 8.2 Add integration tests for schema/migration backfill, pairing, two-phase login, session credential propagation, refresh, credential/device revocation, and exclusive migration modes.
- [x] 8.3 Add Playwright virtual-authenticator coverage and verify cashier login never creates a session before assertion completion.
- [ ] 8.4 Test real supported POS browser/OS/authenticator combinations and retain evidence of hardware backing, non-exportability, non-syncability, and required attestation/managed-policy behavior.
- [ ] 8.5 Block production cutover unless hardware qualification passes; otherwise select and qualify the managed-device alternative.
- [ ] 8.6 Regenerate OpenAPI/web client, run focused tests/typecheck/lint/build/Semgrep/migration validation, and run approved pilot flows.
- [ ] 8.7 Run GitNexus `detect_changes()`, inspect the final diff, and record final rollout/rollback evidence before closure.
- [x] 8.8 Add a development-only opt-in for repeatable local enrollment tests; reject it outside `NODE_ENV=development` and retain all verification/state checks.
