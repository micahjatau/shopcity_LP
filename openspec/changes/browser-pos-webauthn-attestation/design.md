# Design: Browser-bound POS WebAuthn attestation

## Context and Existing Invariants

ShopCity already requires an active, branch-compatible device-bound session for cashier financial workflows. Device status and branch eligibility are checked during login, session resolution, and refresh. Earn/Redeem consume backend-owned `session.deviceId`; those controls remain unchanged.

The current device record combines several concepts: `fingerprintHash`, an encrypted per-device HMAC secret, active status, and branch binding. The new design separates the logical ShopCity device from each public-key credential used to authenticate that device. WebAuthn changes the proof, not cashier account identity, RBAC, or financial authorization.

## Goals

- Use WebAuthn for browser-held device proof without asking cashiers to handle persistent HMAC secrets.
- Preserve device/branch authority and fail-closed cashier session behavior.
- Bind WebAuthn sessions to the exact credential used so credential revocation is effective at refresh and request authorization.
- Make migration explicit and downgrade-resistant.
- Establish only an assurance claim supported by the actual POS hardware, OS, browser, and authenticator.

## Non-goals

- Replacing Supabase password verification, backend sessions, RBAC, CSRF, or financial controls.
- Requiring WebAuthn for Supervisor/Admin sign-in as part of this change.
- Treating a browser fingerprint or installation ID as device possession proof.
- Claiming formal NIST AAL3 compliance or universal physical-machine identity from generic WebAuthn.
- Accepting a synced consumer passkey as proof of a specific register.

## Persistence Model

### `Device`

Retain the logical tenant/branch-bound record and status; add `authBindingMode` with `UNPAIRED`, `HMAC_LEGACY`, and `WEBAUTHN`, plus `pairedAt`. New devices begin UNPAIRED. Existing devices with an approved legacy secret are explicitly inventoried/backfilled as HMAC_LEGACY; devices without an authenticator remain UNPAIRED. `fingerprintHash` becomes nullable in the expand migration, is retained only for legacy compatibility/metadata, and is null for new WebAuthn devices. It is not a new-device authenticator and is removed in a later contract migration after HMAC retirement.

### `DeviceWebAuthnCredential`

Keep credential records separate from `Device` so credentials can be revoked, replaced, and audited without conflating device identity. Store tenant/device IDs, globally unique credential ID, COSE public key, AAGUID, signature counter, authenticator attachment, transports, backup eligibility/state, attestation format and verified trust/policy result, RP ID, status, `pairedAt`, and `revokedAt`. Store public material only, never private key material. Retain only attestation data required by the approved verification/privacy policy.

A Device may have multiple credentials to support controlled rotation. Each credential is scoped to the POS device, not to an individual cashier. Any active CASHIER account eligible for that device's tenant and branch may use the same paired device credential in a separate login ceremony with that cashier's own account credentials; per-cashier device enrollment is not required. Credentials are not synced across POS devices. Login options list only active credentials belonging to that device. The implementation must not infer hardware backing solely from `authenticatorAttachment: "platform"`, AAGUID, or backup flags without validating what the target environment actually guarantees.

### `DeviceEnrollmentChallenge`

Represent the high-entropy one-time authorization for pairing and its WebAuthn registration challenge, binding tenant, device, branch, requesting actor, expiry, purpose, and consumed state. Persist hashes of bearer authorization/challenge values where feasible; consume atomically. Do not put the authorization in URL paths/query strings, logs, analytics, or persistent browser storage. Exchange it over HTTPS in the pairing flow, preferably as a POST-body value scanned/entered on the target POS.

### `CashierLoginAttempt`

After valid Supabase password verification for a CASHIER, create a short-lived server-side attempt bound to the user, tenant, device, eligible active credential set, and authentication challenge. Store only a hash of its unguessable bearer ID and the needed verified attempt metadata—never the password or Supabase tokens. A login attempt is not a ShopCity session: it has no session cookie, refresh authority, CSRF authority, or access to authenticated endpoints. Consume it once on completion and expire it quickly.

### `Session.deviceCredentialId`

Add nullable `deviceCredentialId` to `Session` with a relation to `DeviceWebAuthnCredential`. It is required for a WebAuthn-bound cashier session and null for Supervisor/Admin sessions and explicitly transitional HMAC_LEGACY sessions. Refresh and session guards must verify that the credential is still ACTIVE and belongs to the session's active device. Credential revocation revokes active sessions for that credential; device/branch revocation invalidates all associated sessions.

## Device Binding Modes and Migration

| Mode          | Accepted cashier proof                     | Allowed transition                                  |
| ------------- | ------------------------------------------ | --------------------------------------------------- |
| `UNPAIRED`    | None                                       | Successful authorized WebAuthn pairing → `WEBAUTHN` |
| `HMAC_LEGACY` | Existing HMAC only                         | Explicit verified WebAuthn pairing → `WEBAUTHN`     |
| `WEBAUTHN`    | Active registered WebAuthn credential only | Re-pair/credential rotation under WebAuthn policy   |

There is no proof fallback across modes. In particular, a WEBAUTHN device never accepts its retained HMAC secret. For a legacy device migration, verify the new registration, then in one transaction activate the credential, set mode to WEBAUTHN, revoke existing device sessions, retire/null the encrypted HMAC secret, and write the audit event. If the transaction fails, leave the device in HMAC_LEGACY with its existing secret unchanged. Keep legacy schema columns until the approved rollback window closes; remove them in a later contract migration.

New production devices are never created as HMAC_LEGACY. The database requires active attestation-secret metadata only when `authBindingMode = HMAC_LEGACY`; active UNPAIRED devices may be created and managed before pairing, and WEBAUTHN devices rely on their active credential checks in service/transaction logic. Keep cashier authentication fail-closed for UNPAIRED devices. After the approved device inventory has migrated and the rollback window has closed, disable production HMAC login globally and remove HMAC login/client/rotation/configuration code, KEK dependency, backfill utilities, and schema fields. Historical migration files remain immutable.

## Pairing Flow

1. An authorized Admin creates/manages a tenant device; an authorized Supervisor can manage only a device assigned to their own branch. Preserve existing non-enumerating cross-branch behavior.
2. The device starts UNPAIRED (or stays HMAC_LEGACY until migration commits). The actor requests a one-time pairing authorization bound to tenant/device/branch and audited.
3. On the real POS browser, an explicit user action opens the pairing screen and invokes `navigator.credentials.create()` with the server's fresh options.
4. Request profile: `authenticatorAttachment: "platform"`, `userVerification: "required"`, `residentKey: "discouraged"`, and attestation `"direct"` for qualification. Enterprise attestation may be enabled only on managed browsers/platforms where policy permits it and after privacy review. These options request behavior; they do not alone prove hardware-backed/non-exportable storage.
5. The backend uses a maintained WebAuthn library to verify challenge, origin, RP ID, credential response, user verification, credential properties, and approved attestation/trust policy. It records AAGUID, attachment, transports, backup eligibility/state, signCount, attestation format/trust result, RP ID, and timestamps as required by policy.
6. Reject known backup-eligible/syncable credentials where register binding requires non-syncability. Require attestation/managed-device evidence sufficient for the approved hardware-backed, non-exportable key policy. If the target fleet cannot establish that assurance, do not activate it as a register-bound device; use the approved managed-device alternative.
7. In one transaction, store/activate the credential, update binding mode and paired state, consume authorization, revoke prior sessions as required, retire legacy HMAC material on migration, and audit the operation.

The pairing authorization is a one-time enrollment capability, not a reusable human password. Credential registration is always performed on the target POS browser, not the administrator's separate workstation.

## Two-Phase Cashier Login

1. The browser submits username/password and the selected non-secret device ID to the existing login operation.
2. Supabase verifies the account. For CASHIER, the backend rechecks active user/tenant, active device/branch, matching user branch, `authBindingMode`, and active credential state. For WEBAUTHN, it creates a short-lived `CashierLoginAttempt`, then returns `DEVICE_ASSERTION_REQUIRED`, its unguessable attempt ID, and WebAuthn request options. No ShopCity session, session cookie, CSRF token, or refresh capability is issued yet.
3. The browser invokes `navigator.credentials.get()` from the sign-in interaction with `userVerification: "required"` and only the active credential IDs registered to that device.
4. The browser posts the attempt ID and assertion to `/api/v1/auth/cashier-login/complete`.
5. The backend verifies and atomically consumes the attempt/challenge, then rechecks account, tenant, device, credential, branch, status, and policy state immediately before session creation. It validates expected origin/RP ID, credential ID, signature, challenge, user-presence, user-verification, and approved backup/attestation policy. No session is created for any failed check.
6. On success, issue the ShopCity session bound to both `deviceId` and `deviceCredentialId`, then set the existing secure session/CSRF cookies and audit the event.

Supervisor/Admin login continues through the existing account-authentication path unless a separate MFA change is approved. During migration, HMAC_LEGACY devices use HMAC only under the bounded legacy policy; UNPAIRED devices cannot log in operationally; WEBAUTHN devices use WebAuthn only.

## Assertion Verification Checklist

| Check                                                                     | Required |
| ------------------------------------------------------------------------- | -------- |
| Challenge is random, expected, unexpired, and atomically consumed once    | Yes      |
| Login attempt is unexpired, bound to the verified user/device, and unused | Yes      |
| Expected HTTPS origin and exact RP ID                                     | Yes      |
| Credential ID is registered, active, and associated with this device      | Yes      |
| Device and branch are active; tenant and cashier branch match             | Yes      |
| Cashier account and tenant are active                                     | Yes      |
| Signature verifies against the stored public key                          | Yes      |
| User presence and user verification flags are present                     | Yes      |
| Backup/sync and attestation evidence satisfy approved register policy     | Yes      |
| Device or credential revoked; challenge/attempt replayed                  | Reject   |

Use a maintained WebAuthn verifier; do not implement CBOR, COSE, attestation, or assertion signature verification by hand. Server challenges provide replay resistance; signCount is retained and evaluated according to authenticator behavior, but must not be the sole replay defense because some authenticators report zero or non-monotonic counters.

## Credential and Session Revocation

- Revoking a credential marks it inactive, audits the reason/actor, and revokes active sessions with its `deviceCredentialId`.
- Refresh and request session resolution require the referenced credential to remain active and associated with the active session device.
- Revoking/deactivating a device or its branch invalidates all associated cashier sessions regardless of credential.
- Re-pairing/rotating a credential revokes existing device sessions before new sessions can be created.
- Re-pair recovery creates a new credential; private keys and HMAC secrets are never recovered/exported.

## Authorization Scope

- Admin: tenant-wide device creation, pairing authorization, inspection, revoke, and recovery, subject to existing permission checks.
- Supervisor: same operations only for devices in their own authorized branch.
- Cashier: no device administration.
- Cross-branch/missing-device responses preserve current non-enumerating semantics.

## Assurance Profile and Production Gate

Target WebAuthn Level 3 / FIDO2, with platform-authenticator selection, required user verification, discouraged resident credentials, fresh RP/origin-bound challenges, and direct attestation evaluation. Enterprise attestation is an option only when the managed browser/platform permits it and privacy policy is approved. Record backup eligibility/state and all required authenticator metadata, but do not assume those fields alone prove hardware protection.

The intended ShopCity profile is AAL3-inspired: password/account proof plus phishing-resistant WebAuthn possession proof with user verification, replay protection, and device/branch/session binding. Do not claim formal NIST AAL3 compliance or certification. Before production, demonstrate for the approved POS browser + OS + authenticator combination that the private key is hardware-protected, non-exportable, and non-syncable with acceptable attestation/managed-device evidence. This is a hard pre-production gate. If evidence is unavailable, generic WebAuthn may remain a cashier user-authentication factor, but device identity must move to an approved managed-device certificate/agent or equivalent; do not accept synced credentials as register proof.

## TRD, API, and Operational Impact

- Update the TRD device/session model, cashier auth invariant, role-scoped device administration, two-phase login, and production assurance gate.
- Add credential, enrollment challenge, cashier login attempt, and session credential references in additive Prisma migrations; update `docs/database/migration-tracker.md` before applying any migration. Preserve `@IsUUID()` for branch IDs; seed valid RFC UUIDs and reconcile the historical seeded branch ID through a guarded forward migration. Replace the legacy active-device HMAC check with a binding-mode-aware check.
- Update OpenAPI, stable error/response contracts, generated web client, admin device UI, runbooks, and browser setup guidance using repository CLIs.
- Remove manual `fingerprintHash` input; set new WebAuthn devices to null and retain legacy values only until HMAC cutover.

## Testing and Rollout

- Unit tests: valid/invalid signatures, exact origin/RP ID, user presence/verification, backup policy, attestation policy, expired/replayed/concurrent attempts, and every state transition.
- Integration tests: pairing, transactionally changing mode, no fallback, account+assertion session issuance, `deviceCredentialId` propagation on refresh, credential/device revocation, and migration backfill.
- Browser tests: Chromium virtual authenticator for behavior; separate hardware qualification on actual managed POS devices.
- RBAC tests: Admin tenant-wide and Supervisor same-branch only, with non-enumerating cross-branch behavior.
- Rollout: schema/policy → pairing → two-phase cashier login → credential-bound session/revocation → Admin/Supervisor UX → legacy migration → actual POS hardware qualification → production HMAC cutover.

## Vercel Preview Enrollment

Vercel Preview enrollment uses a separate `WEBAUTHN_PREVIEW_ENROLLMENT_ENABLED` flag, disabled by default, and is available only when the API runtime reports `VERCEL_ENV=preview`. Do not reuse `WEBAUTHN_DEV_ENROLLMENT_ENABLED` or `WEBAUTHN_DEVICE_QUALIFICATION_APPROVED`. Configure the API Preview with the exact HTTPS browser-app origin and an RP ID equal to that Preview hostname; use a non-production database. Vercel environment configuration and the Preview deployment remain operator-owned. Preview enrollment is behavior testing only and does not qualify authenticators or change the production NO-GO gate.

## Rollback

Before per-device mode transition, a failed registration leaves the existing HMAC_LEGACY device unchanged. After successful transition, HMAC material is retired for that device and is not a fallback. Restore service by fixing WebAuthn verification, using a newly approved managed-device alternative, or controlled re-pairing; never by issuing a device-less cashier session or silently re-enabling HMAC for WEBAUTHN devices. Schema remains additive until migration evidence and the documented rollback window permit contract removal.
