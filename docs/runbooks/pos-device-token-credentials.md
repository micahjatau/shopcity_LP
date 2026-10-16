# POS device-token credential operations

## Configuration

`POS_DEVICE_TOKEN_HMAC_KEY` is a dedicated 32-byte random key encoded as unpadded base64url (43 characters). Generate with an approved cryptographic tool, store only in approved server secret storage, and never reuse `SESSION_SECRET` or `CSRF_SECRET`. The API fails closed for DEVICE_TOKEN operations if missing or invalid. `keyVersion` is 1 for the MVP. Production/staging pairing and cashier login require HTTPS because the credential cookie is Secure and uses the `__Host-` prefix.

The API persists only `HMAC-SHA-256(POS_DEVICE_TOKEN_HMAC_KEY, token)`, keyVersion and credential lifecycle metadata. `POS_DEVICE_TOKEN_HMAC_KEY_VERSION` starts at 1 and increases on every key replacement. The raw random token exists only in the authorized target browser's `__Host-shopcity_pos_device` Secure, HttpOnly, SameSite=Strict, Path=/, host-only cookie (Max-Age 31536000). Do not inspect, export, or log its value. Cashier logout and ordinary ShopCity session refresh preserve the device credential cookie.

## Pair/reset/revoke

Only active same-tenant Admins (any tenant branch) and Supervisors (their assigned branch) may pair/reset. Pair on the actual target POS browser while the approved actor's session is active. The operation requires the existing session-bound double-submit CSRF cookie/header check and is audited with the actor and timestamp. Pairing makes prior credentials and device sessions unusable atomically; the token cookie is emitted only after the transaction commits. A lost response does not permit token recovery; perform a supervised reset/re-pair.

Reset/revoke/deactivation revokes credentials and active device sessions in the same transaction. Reset/deactivation clears the POS cookie only when the request presents the active credential for the selected device; managing device B from a browser holding device A's cookie must not clear A. Server-side revocation is authoritative if the browser is offline. Deactivating a DEVICE_TOKEN device leaves it UNPAIRED; reactivation does not revive an old token, so re-pair it under supervision.

## Key replacement and outage/rollback

MVP supports exactly one active key/version and no dual-key fallback. Replacing the key and increasing its version makes every old token fail verification, including existing sessions (the session guard checks the current active token). Treat replacement as an invalidating maintenance event: announce cashier outage, configure the replacement through approved secret storage with an incremented version, and require supervised re-pairing of each authorized device. Do not fall back to WebAuthn or HMAC_LEGACY, restore the old key/version, or restore old hashes under a new key. If the new key is unavailable/compromised, fail closed and retain the outage until a newly approved key/version is configured and every target browser is supervised and re-paired.

## Recovery and evidence

Record the authorized actor, device, tenant/branch, change reason, and timestamp in server audit events. Never place raw credentials, full cookie headers, passwords, customer data, or secret values in tickets/logs/evidence. Real staging POS pairing, cashier login, reset, revocation, and session invalidation remain required before pilot acceptance; this runbook is not evidence that those checks occurred.
