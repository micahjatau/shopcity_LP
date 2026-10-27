# POS WebAuthn Phase 2: schema and security contract

**Scope:** OpenSpec `browser-pos-webauthn-attestation`, Phase 2 tasks 2.1–2.6 only. This document fixes persistence and protocol contracts for later implementation; it does not claim that API handlers, enforcement, hardware qualification, or UI exist.

## Persistence contract

- `Device.authBindingMode` is explicit and defaults to `UNPAIRED`; `pairedAt` records successful pairing. `fingerprintHash` becomes nullable and remains legacy-only metadata/proof material for explicitly inventoried HMAC devices. No existing device is automatically declared `HMAC_LEGACY` based on assumptions about its secret or fingerprint. New WebAuthn devices use a null fingerprint.
- `DeviceWebAuthnCredential` holds a globally unique credential ID, public key only, AAGUID, sign counter, authenticator attachment/transports, backup eligibility and state, attestation format and trust result, RP ID, lifecycle status, and pairing/revocation/audit timestamps. Private keys are never stored. A device can have multiple credentials for controlled rotation.
- `DeviceEnrollmentChallenge` binds tenant, branch, device, authorizing actor, purpose, registration challenge, expiry, and consumed state. `CashierLoginAttempt` binds tenant, user, branch, device, assertion challenge, expiry, purpose, and consumed state. Both store hashes, not bearer values or raw challenges. Composite relations enforce tenant/device/branch ownership; enrollment challenge actor references use the challenge's own `tenantId` together with `actorUserId`, so a different-tenant actor cannot be attached at the database layer. Login attempts' user relation additionally requires the user's branch to equal the attempt/device branch. Application checks must still enforce the cashier's role and current eligibility.
- `Session.deviceCredentialId` is nullable for existing, non-cashier, and explicitly transitional legacy sessions. Its composite FK references a credential belonging to the same `deviceId`. Later WebAuthn cashier session creation must set it; application-owned current-state checks must require that credential remain active and bound to the same active device.
- The schema is an additive expansion. It does not backfill device modes, issue credentials, accept proofs, or implement atomic consumption. Existing HMAC columns and fingerprints remain pending a separately approved inventory and rollback window.

## Provisional security policy (approval required)

These values are explicit implementation targets, **provisional until security approval**:

| Value                                            | Provisional contract                                                                                                                                                                                                                                                                |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pairing authorization and registration challenge | Server-side expiry after 5 minutes                                                                                                                                                                                                                                                  |
| Cashier login attempt and assertion challenge    | Server-side expiry after 2 minutes                                                                                                                                                                                                                                                  |
| Bearer/challenge entropy                         | At least 32 bytes from a cryptographically secure random generator (CSPRNG)                                                                                                                                                                                                         |
| Persistence                                      | Store SHA-256 hashes only for bearer authorizations, attempts, and challenge values; never persist or log raw values                                                                                                                                                                |
| Consumption                                      | One-time atomic compare-and-consume; concurrent submissions yield at most one success                                                                                                                                                                                               |
| Failed-proof throttling                          | Proposed limit: 5 failures per 15 minutes per account/device scope; approval pending. Current request buckets are login IP/account/pair, cashier-completion IP/hashed-attempt, and enrollment-completion IP/device; these are not a shared per-account/device failed-proof counter. |

Expiry and consumed columns describe state; they do not implement a transaction or rate limiter. Runtime request throttles currently allow five requests per 15-minute bucket: cashier login uses IP/account/pair keys, cashier assertion completion uses IP plus a hash of the attempt token, and public enrollment completion uses IP and device ID. These are request limits, not a shared failed-proof budget per account/device; security approval is required before treating them as the approved policy. Handlers must perform atomic consumption and recheck authoritative account, tenant, branch, device, credential, and policy state immediately before committing pairing or session issuance. Schema fields alone are not enforcement.

## Authorization contract

- Admin device-management scope is tenant-wide, subject to existing permission checks.
- Supervisor scope is limited to devices in the Supervisor's own authorized branch. Out-of-branch and missing-device cases remain non-enumerating and use the same opaque public outcome; neither existence nor credential inventory is disclosed.
- Cashiers have no device-administration authority. Enrollment actor identity is retained for audit/integrity; application authorization must validate current role, tenant, and branch scope at operation time rather than trusting stored actor values.
- Current-state authorization remains application-owned and is repeated at completion. Database relations prevent cross-tenant and cross-branch device linkage and ensure login-attempt user/device branch equality, but do not replace role authorization.

## Exclusive binding-mode contract

| Device mode   | Accepted cashier proof                                   | Transition contract                                                                                                                        |
| ------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `UNPAIRED`    | None                                                     | Authorized successful WebAuthn pairing transitions to `WEBAUTHN`                                                                           |
| `HMAC_LEGACY` | Existing HMAC only during the approved bounded migration | Explicitly verified WebAuthn transition to `WEBAUTHN`; retire HMAC in the same transaction as credential activation and session revocation |
| `WEBAUTHN`    | Active WebAuthn credential for that device only          | WebAuthn re-pair/rotation under approved policy                                                                                            |

There is no dual-mode period at request time and no fallback: a `WEBAUTHN` device never accepts HMAC, including if WebAuthn verification fails. A failed transition leaves a legacy device in its prior state; it cannot produce a device-less cashier session. Database schema does not itself enforce proof selection or transitions.

## Public protocol and outcomes (later phases)

Phase 2 defines stable outcomes; it does **not** implement them. `DEVICE_ASSERTION_REQUIRED` belongs only to Phase 4's password-success/WebAuthn-login step and must not be returned or wired into runtime behavior during Phase 2. Before a valid assertion is completed, password success may yield only the short-lived attempt and public WebAuthn request options: no ShopCity session, session cookie, CSRF token, refresh authority, or authenticated endpoint access. The attempt is not a session.

Later public responses must use stable safe error codes and avoid account, device, or credential enumeration. The proposed public outcomes are:

| Outcome code                | HTTP status             | Meaning and disclosure boundary                                                                                                                                                                                                                 |
| --------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DEVICE_ASSERTION_REQUIRED` | `202 Accepted`          | Phase 4 only: password verified for a WebAuthn-bound cashier; only short-lived attempt and public assertion options are returned. No session, cookie, CSRF, refresh authority, or authenticated access.                                         |
| `DEVICE_AUTH_FAILED`        | `401 Unauthorized`      | Generic login failure for invalid/expired/replayed attempt or challenge, invalid signature/origin/RP ID, inactive account/device/credential/branch, or mode mismatch. Do not reveal which check failed or whether an account/credential exists. |
| `DEVICE_NOT_AVAILABLE`      | `404 Not Found`         | Opaque device administration result used identically for a missing device and a device outside the caller's authorized tenant/branch scope; response body/code and disclosure are identical.                                                    |
| `DEVICE_ENROLLMENT_INVALID` | `400 Bad Request`       | Generic enrollment failure for invalid/expired/replayed authorization or challenge, failed registration verification, or disallowed state; no device/credential existence details.                                                              |
| `RATE_LIMITED`              | `429 Too Many Requests` | Generic throttling outcome when the proposed failure limit is exceeded; reveal no account/device/credential lookup result.                                                                                                                      |

These HTTP status/code pairs are the concrete API contract for later implementation. Status values and rate-limit policy remain subject to pending security approval; approval may revise policy through an explicit contract update, not an undocumented implementation divergence. Internal role/authorization failures must still follow the existing authorization policy and must never disclose cross-branch existence; missing and out-of-scope device administration responses use the same `DEVICE_NOT_AVAILABLE` status and body. All listed failures fail closed with no session or pairing state transition. Never return internal verifier detail or reveal which binding check failed.

## Migration, deployment, and rollback

1. Before shared deployment, operators inventory every existing device and explicitly classify it; approve the policy values, data handling, and rollback window. Review records with missing/ambiguous legacy proof as `UNPAIRED`, not HMAC by inference.
2. Take and restore-test a backup before shared rollout. Apply only this additive expansion after approval; verify constraints and indexes on fresh and upgraded databases. No remote database was modified by Phase 2 authoring.
3. Deploy no runtime relying on these tables until the later pairing/login phases and operational runbooks are ready. Preserve existing HMAC behavior only for explicitly inventoried legacy devices under the bounded policy; new devices remain unpaired until a later successful pairing implementation.
4. Keep fingerprint and HMAC schema/data available through the operator-approved rollback window. Before a device transitions, failed pairing leaves its prior state unchanged. After transition, no rollback may restore HMAC as an authentication fallback for a `WEBAUTHN` device; recovery is a forward fix or approved re-pair/managed-device alternative, never a device-less session.
5. Any eventual removal of legacy schema is a separate contract migration after complete inventory/cutover, restore proof, and approved rollback-window closure. Do not edit this migration after shared application.

On 2026-10-06, `20261005_browser_pos_webauthn_phase_2` was applied to the repo-linked development Supabase project `nmuedccamqacgszvosvm` as part of a 12-migration Prisma deployment after a mode-0600 schema/data dump and successful restored-copy rehearsal. All 10 existing devices now default to `UNPAIRED`; no device was classified as `HMAC_LEGACY`, and production pairing remains disabled. This is development-database evidence only; production/shared rollout still requires device inventory, security approval, and its own backup/rollback gate. Phase 2 contains no runtime handlers, API surface, client behavior, or enforcement claim.
