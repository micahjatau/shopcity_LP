# Design: Pilot POS DEVICE_TOKEN authentication

## Persistence and credential rules

Add enum value `DEVICE_TOKEN`. Add a separate `DeviceTokenCredential` with tenantId/deviceId, unique credential id, `tokenHash`, `keyVersion`, `status`, paired/created/updated/revoked timestamps, and nullable `lastUsedAt`. Enforce tenant/device relation integrity and a partial unique database index on `deviceId` for `ACTIVE` rows. Persist no raw credential or reversible ciphertext. Generate a 32-byte CSPRNG token and encode base64url. The sole active key is `POS_DEVICE_TOKEN_HMAC_KEY`; it must decode to exactly 32 bytes and is used as the HMAC-SHA-256 key. MVP starts at keyVersion 1 and permits exactly one configured active key/version. Planned key replacement increments the configured version, invalidates old credentials and sessions (session resolution rechecks the current token), and requires authorized target-browser re-pairing. Never restore an old key/version or use fallback/dual-key validation.

Keep WebAuthn tables and HMAC legacy fields intact. New mode transitions are from UNPAIRED to DEVICE_TOKEN or explicit re-pair/reset within DEVICE_TOKEN. Never silently change HMAC_LEGACY or WEBAUTHN to DEVICE_TOKEN, and never accept one mode's proof in another.

## Pair and reset lifecycle

An authenticated, active Admin or Supervisor performs pairing/reset in the browser that should retain the device cookie. Admin scope is any active branch in the actor's tenant; Supervisor scope is only their assigned branch. Cross-tenant and out-of-scope devices remain non-enumerating. Pair/reset are authenticated state changes and require the existing session-bound CSRF cookie/header validation. Pairing locks the device and atomically revokes prior credential(s), all active sessions, and issues exactly one new active hash record with key version, actor/time audit metadata. Only after the transaction commits does the HTTP response set the raw random token cookie. If response delivery fails, the credential remains unexposed and a reset/re-pair is required; no plaintext token is stored for retry. Reset/revoke/deactivation atomically marks credentials revoked and active sessions revoked, audits the actor/time/reason, and sends an exact cookie-clear header on that authorized browser response. Server-side revocation is authoritative when the browser cannot be reached.

Cookie contract: `__Host-shopcity_pos_device=<base64url>`; `Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=31536000`; no Domain. Runtime must reject deployed HTTP origins. Preserve the cookie on cashier logout and ordinary ShopCity session refresh. Do not extend its Max-Age through session refresh.

## Cashier login and Origin integrity

The existing public `/auth/login` path verifies the password using Supabase. For a CASHIER selecting a device, only DEVICE_TOKEN mode reads the `__Host-shopcity_pos_device` cookie. Compute keyed HMAC and compare against exactly the active credential for that tenant/device/keyVersion, with constant-time byte comparison. Recheck active tenant, user, device, branch, and exact cashier branch compatibility in the login transaction; lock device/credential rows against concurrent reset/revoke; update `lastUsedAt`; issue the normal ShopCity session with `deviceId` from the persisted device. No user-submitted or frontend-derived deviceId may override this binding. Invalid/missing cookie, credential, status, mode, tenant, or branch returns the existing generic device auth failure.

For public `/auth/login`, require Origin to be an exact canonical origin in the configured allowlist. If Origin is absent only, use Referer's origin as fallback; reject missing/invalid/non-allowlisted values. This endpoint is not exempt from origin integrity, but pre-login session-bound CSRF cannot exist and is not required. Existing rate limits and generic login errors remain. The cashier token cookie is not sent as a request header and does not grant an authenticated session by itself.

## Session lifecycle and authorization

Sessions for DEVICE_TOKEN devices have `deviceId` and no new device credential foreign key; credential identity is checked at login and revocation invalidates all existing sessions for the device in the same database transaction. Existing guards continue to require active user/tenant/device/branch and branch compatibility. Device reset, credential revoke, device deactivation, and branch inactivation revoke all active sessions atomically before responding. Session refresh revalidates the persisted device/session linkage and normal eligibility but neither consumes, renews, nor modifies the long-lived token credential/cookie. Cashier logout clears only ShopCity session/CSRF cookies and leaves the POS token cookie.

Earn/Redeem and all financial endpoints continue to use the authenticated session's `deviceId`. Do not add request-supplied device authority or change financial/loyalty logic.

## Client and proxy

The web login submits the selected device id as a locator only; the browser sends its HttpOnly token cookie automatically. Pair controls appear only in the existing authorized device management surface, label the current browser as the target browser, and provide reset/revoke status. Do not store token in localStorage/sessionStorage, app state, URLs, logs, or analytics. Same-origin proxy forwards `cookie`, `origin`, and `referer` and preserves API `Set-Cookie` response headers; verify the `__Host-` cookie survives proxying and is scoped by the browser to the web origin.

## Migration / rollback

Add an additive PostgreSQL enum value, credential table, indexes, constraints, and foreign keys. Update migration tracker before applying. Do not mutate existing binding mode rows. Rollback before use: deploy compatible code first if needed, then drop only new credentials/table/enum value if PostgreSQL/version constraints permit; otherwise use a forward migration. Once credentials are issued, rollback/outage is fail-closed: restore the approved key/config, or atomically revoke all device-token credentials/sessions and require supervised re-pairing. Never invent a token or fall back to HMAC/WebAuthn. The MVP key replacement playbook assumes all credentials become invalid and all devices are re-paired under supervision.
