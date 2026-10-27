# Change: Simplify pilot POS device authentication with browser token credentials

## Why

The pilot cashier login needs a practical device-bound credential without a WebAuthn ceremony. Current WebAuthn and bounded HMAC modes must remain independently exclusive for existing devices while the new additive DEVICE_TOKEN mode is introduced.

## What Changes

- Add `DEVICE_TOKEN` as a third exclusive `Device.authBindingMode`; do not migrate or downgrade existing `HMAC_LEGACY` or `WEBAUTHN` devices.
- Add a tenant/device-linked `DeviceTokenCredential` containing only keyed HMAC-SHA-256 credential hash, key version, active/revoked lifecycle timestamps, and last-use metadata. Enforce no more than one active credential per device.
- Allow only an active Supervisor/Admin of the same tenant (Supervisor in their assigned branch; Admin any branch in their tenant) to pair/reset a device on the authorized actor's current target-browser response. Pair/reset requires the existing session-bound double-submit CSRF contract, active device/branch checks, and audit evidence.
- Store the random token only in `__Host-shopcity_pos_device` (Secure, HttpOnly, SameSite=Strict, Path=/, no Domain, Max-Age=31536000). Require HTTPS in deployed environments. Do not renew or clear it on cashier logout or ordinary ShopCity session refresh.
- Use dedicated `POS_DEVICE_TOKEN_HMAC_KEY` (32 random bytes, base64url from approved secret storage), key version 1 for the MVP, and HMAC-SHA-256(token,key) only. Never use SESSION_SECRET or CSRF_SECRET. Missing/invalid configuration fails closed. Key replacement invalidates all stored token credentials and requires supervised re-pairing; document outage/rollback.
- Cashier password verification remains the existing Supabase flow. For DEVICE_TOKEN devices, validate token cookie against the active credential and recheck tenant/device/branch/user status, then issue the existing ShopCity session bound to authoritative `session.deviceId`. Do not issue a device-less cashier session or permit fallback between modes.
- Public login validates Origin against allowed same-origin/configured origins; Referer is only a fallback if Origin is absent. Reject missing or unapproved origin, preserve rate limits and generic failures, and do not require a pre-login session CSRF pair.
- Pair/reset/revoke/deactivate invalidate active device sessions atomically. Reset clears the token cookie when the response reaches the target browser; server-side revocation is authoritative.
- Keep financial authorization unchanged: endpoints continue to trust authenticated `session.deviceId` only. No loyalty, ledger, reward, calculation, SMS, worker, or independent credential-store changes.
- Add minimal Device Management UX, OpenAPI/generated client updates, and verify cookie forwarding through the same-origin web proxy.

## Scope and compatibility

This change is additive. `UNPAIRED`, `HMAC_LEGACY`, `WEBAUTHN`, and `DEVICE_TOKEN` each accept only their own proof (UNPAIRED accepts none). Existing WebAuthn/HMAC code and the separate `browser-pos-webauthn-attestation` OpenSpec remain unchanged except where additive enum handling is required. No migration is applied to a shared/remote database; no commit, deploy, or pilot acceptance is claimed.

## Operational constraints

Do not use live customer data, start an SMS/background worker, contact a provider, or apply a migration to shared/remote state. Local migration application is permitted only after proving the database is disposable/local and backed up; otherwise validate artifacts without applying. Actual staging POS pairing and E2E remain an explicit external gate.
