# Design: Simplify Staff Authentication and Authorization for the Pilot

## Status and decision boundary

This design turns `docs/repo_review_61.md` into an implementable direction. It is still a **proposed** design: it does not approve a TRD amendment, new environment secret, production policy, staging deployment, or pilot acceptance. Formal Product/Security/Operations approval is required for the BFF trust boundary and the DEVICE_TOKEN-only pilot policy before implementation. The reported Supervisor failure must first be reproduced with sanitized request/correlation evidence; the origin allowlist is a leading hypothesis from the review, not an independently verified root cause.

The target architecture remains Supabase identity verification plus ShopCity-owned sessions and authorization. The main intentional changes are: role-neutral login; a trusted same-origin web/BFF-to-API boundary instead of a manually curated list of ephemeral Preview hostnames; DEVICE_TOKEN as the only cashier proof accepted in the pilot; and server-side derivation of POS identity from that credential.

## Context and authority

- `docs/TRD.md` is the architecture baseline, but Version 1.1 is explicitly proposed and contains contradictory cashier-authentication and CORS requirements. This change does not silently edit or approve it.
- `docs/repo_review_61.md` is the motivating assessment. Its complete recommendation and correction to error enumeration are carried into the proposal/spec.
- `simplify-pilot-pos-device-authentication` defines the additive DEVICE_TOKEN implementation, but currently says existing HMAC_LEGACY/WEBAUTHN behavior remains unchanged and requires exact login Origin allowlisting. This change supersedes those requirements **only for the approved pilot runtime**; it does not delete compatibility code or qualify/approve WebAuthn for a later rollout.
- `browser-pos-webauthn-attestation` is a separate future/compatibility and qualification proposal. Its explicit note that WebAuthn is not the current pilot path remains valid.
- ShopCity sessions, role/tenant/branch scope, CSRF, rate limiting, audit, device revocation, and domain-specific business checks remain authoritative. CORS is not authentication and is never the only access-control measure.
- All results and implementation work must preserve the dirty/untracked checkout. GitNexus proposal impacts are already recorded; any later code-surface expansion requires fresh impact analysis before editing symbols.

## Role and scope model

| ShopCity principal | Authentication                                       | Authoritative scope                                             | POS proof                  | Browser session                                    |
| ------------------ | ---------------------------------------------------- | --------------------------------------------------------------- | -------------------------- | -------------------------------------------------- |
| CASHIER            | Supabase staff credentials plus pilot POS credential | Assigned active branch and tenant                               | DEVICE_TOKEN only in pilot | ShopCity session bound to server-derived device ID |
| SUPERVISOR         | Supabase staff credentials                           | Assigned active branch and tenant                               | None                       | Ordinary ShopCity session                          |
| ADMIN/OWNER        | Supabase staff credentials                           | Tenant-wide policy; device administration remains tenant scoped | None                       | Ordinary ShopCity session                          |
| SYSTEM             | Internal workload identity only                      | Explicit job/service permissions                                | N/A                        | No human sign-in or selectable UI role             |

The role and scope come from the active ShopCity user/session and persisted tenant/branch/device records. A client role selector or client-provided role, tenant, branch, balance, approval, or device ID has no authority. The UI routes based on server-returned role but route hiding is not authorization. Existing approval-separation and resource-specific checks stay in their domain services.

## Sign-in sequence

### Supervisor/Admin

1. The browser submits email/password through the ShopCity same-origin BFF. The frontend contains no role selector and sends no cashier device ID.
2. The BFF verifies the request's browser origin against the trusted canonical origin for this deployment and its environment-to-API mapping. It sends a server-only BFF identity to the selected API.
3. The API validates the BFF identity and validates credentials through Supabase. It does not return Supabase access/refresh tokens to the browser.
4. The API resolves exactly one active ShopCity user and active tenant/account state. Supervisor must have its allowed branch context; Admin/Owner uses tenant-wide policy. `SYSTEM` cannot be assigned to a human user.
5. ShopCity creates its existing server-owned session, secure cookies, CSRF state, audit event and appropriate expiry/revocation state. The frontend routes by persisted role.
6. No POS token, WebAuthn assertion, HMAC proof, localStorage device ID, or POS pairing state participates in Supervisor/Admin sign-in.

### Cashier

1. The browser submits email/password plus its existing host-only `__Host-shopcity_pos_device` cookie through the BFF. The browser does not send `x-device-id` or a device ID in the login payload.
2. Supabase verifies the credentials. The API resolves the identity to one active ShopCity CASHIER and verifies user, tenant and branch state.
3. In the approved pilot runtime, the environment policy accepts only `DEVICE_TOKEN`. The server computes/verifies the credential HMAC using the dedicated POS device-token key, resolves the active credential/device/branch, checks exact branch compatibility and device status, and derives `session.deviceId` from persisted records. No HMAC_LEGACY or WebAuthn fallback is attempted.
4. The API issues the normal ShopCity session bound to the resolved device and preserves the existing credential cookie lifecycle, CSRF, audit and rate limits. Any pairing/reset/revocation transition continues to invalidate the appropriate sessions atomically.

A missing, invalid, revoked, expired, inactive, cross-tenant, wrong-branch or non-DEVICE_TOKEN credential cannot create a usable Cashier session. A safe pairing message may be shown only after valid credentials identify the caller as Cashier. No public response reveals whether an email or ShopCity account exists before identity is established.

## BFF, Origin, and environment trust

### Recommended trust contract

- Browser traffic uses the same-origin Next.js BFF. Nest is not directly callable by browser code for protected authentication flows after cutover.
- The BFF validates the browser request's canonical `scheme://host[:port]` using a platform-controlled deployment identity or an explicit per-deployment canonical origin. The implementation may use Vercel-provided deployment metadata only after confirming how it is injected and that untrusted incoming headers cannot override it. Do not trust arbitrary `Host`, `Forwarded`, `X-Forwarded-Host`, or client-supplied environment/ref values.
- The BFF forwards original Origin/Referer context only after its own validation. Nest accepts that browser context only when accompanied by the BFF's authenticated server identity; it must not treat a forwarded header by itself as proof of origin.
- The preferred mechanism is a distinct high-entropy server-only BFF credential per environment, held in the web/API secret stores. It is not the Supabase service role key, `SESSION_SECRET`, `CSRF_SECRET`, or `POS_DEVICE_TOKEN_HMAC_KEY`. Use constant-time verification, redact it from all logs/telemetry, never return it to the browser, define a controlled rotation/revocation procedure, and fail closed if it is absent or invalid. A signed short-lived service identity may replace the static credential only with a reviewed design; do not implement both mechanisms as fallback.
- BFF identity authenticates the web tier only; it is not a ShopCity user session and grants no user/tenant/branch permission. Supabase authentication, ShopCity authorization, session cookies, CSRF and login throttling remain required.
- CORS remains non-wildcard. Same-origin browser use does not justify deleting CORS policy for other explicitly approved browser integrations. Inventory such clients before enforcement; each non-browser client keeps a separately scoped server credential rather than borrowing the browser BFF secret.
- Rollout is staged: inventory API consumers; add/validate server identity in non-production; update the BFF to attach it without changing browser contracts; verify all BFF methods and cookie forwarding; enforce it on the approved browser-facing auth surface (and the broader browser API surface only after inventory); then remove the ephemeral Preview-origin dependency. No interval may permit an unauthenticated direct-browser bypass of the chosen auth path.

### Environment contract

| Runtime        | Frontend origin identity                                    | API target                                  | BFF identity                                          | Safe default                                                           |
| -------------- | ----------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------- |
| Local          | Exact local web origin/loopback config                      | Local API only                              | Local-only test credential or explicit local identity | Missing mapping fails validation; never use staging/prod               |
| CI             | Test fixture origin                                         | Isolated test API/Testcontainers            | Ephemeral CI-only test identity                       | No shared secrets or shared database                                   |
| Vercel Preview | Trusted deployment URL/canonical origin verified at runtime | Explicit non-production Preview API mapping | Preview-only secret/identity                          | No implicit staging or production target; missing mapping fails closed |
| Staging        | Explicit approved staging domain                            | Staging API only                            | Staging-only secret/identity                          | Restricted synthetic data and operator access                          |
| Production     | Explicit production domain                                  | Production API only                         | Production-only secret/identity                       | Least privilege; no Preview identity reuse                             |

The API target and canonical origin are explicit deployment configuration; they are not inferred from Git branch/ref names and do not require application source edits for each generated Preview URL. Secrets are never `NEXT_PUBLIC_*`. Configuration is validated on boot/deploy and logs only safe environment labels and a fingerprint/key version, never secret values. Preview-to-Preview shared backend reuse is an Operations decision; it must be explicitly documented and must never cross into Staging/Production by default.

## DEVICE_TOKEN and compatibility

- Reuse the existing `DeviceTokenCredential` lifecycle and dedicated `POS_DEVICE_TOKEN_HMAC_KEY` described in the active device-auth spec. Persist only HMAC-SHA-256(token, key), key version and lifecycle/scope metadata; raw token is only the target POS's Secure, HttpOnly, SameSite=Strict, `__Host-`, Path=/ cookie with no Domain.
- The cookie is the credential, not a second factor combined with a localStorage ID. API login ignores/does not authorize from legacy `x-device-id` or payload IDs. Remove cashier-login dependence on localStorage ID. Preserve non-secret selected-device locators used by Supervisor/Admin device-management workflows; those are not login authority.
- Preserve one active credential per device, authorized branch-scoped pairing, server-side revalidation and session invalidation. Missing/malformed keys fail closed; a key rotation invalidates old credentials and requires supervised re-pairing, without overlapping-key fallback.
- The approved pilot API policy accepts DEVICE_TOKEN only. Existing HMAC_LEGACY/WEBAUTHN data/code may remain for separately approved non-pilot testing/qualification, but cannot authorize cashier sessions in the pilot environment. A legacy device needs explicit supervised re-pair/migration; do not convert DB rows or erase evidence implicitly. A future post-pilot decision must say whether hardware-backed WebAuthn/managed-device assurance is still a production gate.
- Do not remove WebAuthn enrollment/verification code or delete historical migrations as part of this bounded change. Separate capability retirement requires its own impact review, migration/backup plan and approval.

## API, user errors, and operations

### Public error contract

Retain stable machine-readable error codes from the API standard, while decoupling them from sensitive user-facing detail. Before credentials establish identity, unknown email, invalid password, missing/inactive ShopCity mapping, and other identity failures use a generic sign-in message and a non-enumerating code/status policy. Origin/BFF failure and rate limits use their stable safe contract but never trigger credential verification or session creation. Service outages show a generic message plus request/reference ID. Once credentials validly identify a Cashier, a safe generic POS pairing message may be shown; do not disclose another user/device/tenant or distinguish credential records in a way that enables probing. Supervisor/Admin UI never mentions register pairing.

Every denial/failure has a correlated request ID and a structured internal reason. Logs/audit may distinguish internal causes (`INVALID_CREDENTIAL`, `SHOPCITY_USER_INACTIVE`, `ORIGIN_REJECTED`, `BFF_IDENTITY_INVALID`, `DEVICE_TOKEN_REVOKED`, `LOGIN_THROTTLED`, `SUPABASE_UNAVAILABLE`) but must exclude passwords, raw tokens, BFF credentials, session/CSRF cookies, Supabase tokens and sensitive payloads. Existing login limits and security events remain effective.

### Account provisioning

Supabase remains the password-verification and password-reset provider unless a separately approved change says otherwise. ShopCity user provisioning is separate: resolve an authenticated identity to one uniquely linked active ShopCity user. Seeds/default passwords are synthetic and restricted to local, CI and disposable environments. Staging/pilot operators are individually provisioned through an approved workflow and set/reset their own password; credentials are never committed, shared through artifacts, or embedded in smoke scripts. Preserve existing Admin MFA requirements/decisions; this proposal does not silently remove or claim completed MFA.

## API and schema compatibility

No financial schema, ledger, role, or balance migration is planned. Prefer configuration, BFF header, login client/DTO changes, and targeted policy tests. If removing a request DTO/header field would break existing clients, first inventory them, deprecate it, then remove it in a documented contract change; it must not influence authority during transition. If every non-browser API caller or direct browser client cannot be identified, do not enforce a new global gateway policy until the integration contract is resolved. Use OpenAPI/client generation CLIs if the public contract changes. No remote/shared migration or staging mutation is authorized by these artifacts.

## Rollout, rollback, and release gates

1. Reproduce Supervisor failure in an authorized non-production environment; capture request ID, sanitized BFF/API status and environment identity without passwords/cookies/secrets. Determine whether origin, deployment mapping, Supabase, ShopCity mapping, or session creation actually fails.
2. Obtain Product/Security/Operations approval of the BFF identity, canonical-origin source, exact environment matrix, client inventory, DEVICE_TOKEN-only pilot policy, and post-pilot WebAuthn assurance disposition.
3. Amend the proposed TRD and affected OpenSpecs. Freeze the API/BFF contract and secret operations before code.
4. Implement and test in local/CI and disposable Testcontainers only. Validate environment failure modes, route policy, rate limits, role scope, and cookie behavior. Preserve legacy mode data/code and do not stage/deploy.
5. After approved environment configuration, deploy the API/BFF compatibility update in a controlled sequence, then enforce the BFF boundary. Roll back to the prior exact candidate/config if Supervisor login, direct-client compatibility, origin handling, or session/CSRF checks fail. Never roll back by disabling origin/CSRF, accepting client device IDs, or creating device-less Cashier sessions.
6. Freeze an exact candidate and run protected CI/security checks. With explicit runtime authorization, smoke Supervisor/Admin first; then physical DEVICE_TOKEN POS; then real-provider SMS. Record exact candidate SHA and evidence. CI does not prove staging, physical-device, provider delivery, or legal approval. Pilot remains NO-GO until all independent gates pass.

Rollback is an application/config rollback, not a database destructive change. BFF credentials are environment-scoped and revocable; rollback must not re-enable broad wildcard CORS or stale Preview allowlists as an unreviewed fallback. If the gateway trust cannot be safely deployed, keep the current restrictive origin gate and pilot NO-GO rather than weaken it.

## Threats and controls

| Threat/failure                              | Required control/evidence                                                                                                                                               |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spoofed forwarded host/origin               | Trust only verified platform metadata/config; BFF rejects mismatch; API requires server identity; test spoofed Host/Forwarded headers.                                  |
| BFF secret theft or cross-environment reuse | Unique per-environment identity, secret manager, strict redaction, rotation/revocation, no client exposure, tests rejecting Preview credential at Staging/Production.   |
| Preview deployment targets production       | Explicit environment mapping and startup validation; no Git-ref inference; Preview secret cannot authenticate to Production API.                                        |
| Direct API bypass                           | BFF identity enforcement on agreed browser auth surface; enumerate direct clients and retain separate least-privilege service auth; direct browser test fails closed.   |
| CSRF/login abuse                            | Keep CSRF for cookie-authenticated state changes, pre-login origin integrity, throttling, session cookie security and audit; BFF identity does not replace user auth.   |
| Account enumeration                         | Generic pre-identity response and stable safe codes; request IDs; internal reasons remain secret-free.                                                                  |
| Client claims another POS                   | Ignore/retire client device locator for cashier login; derive device from keyed credential and persisted association.                                                   |
| Legacy mode downgrade                       | Pilot environment accepts DEVICE_TOKEN only; no fallback; explicit audited re-pair; compatibility modes remain segregated.                                              |
| Session survives status/revocation change   | Recheck user/tenant/branch/device/credential on use/refresh; pair/revoke/deactivate invalidates sessions atomically.                                                    |
| Test or seeded credentials used in pilot    | Startup/env validation and runbook; named individually provisioned operators; no shared default password in runtime acceptance.                                         |
| Overbroad proxy regression                  | Re-run GitNexus impact for `proxyRequest` before edits; tests for GET/POST/PUT/PATCH/DELETE/OPTIONS/HEAD, cookies, headers, timeouts, body and Set-Cookie preservation. |

## Decisions requiring approval before implementation

1. **BFF policy owner (Security/Platform):** confirm static per-environment BFF credential versus reviewed short-lived identity; establish canonical origin source and trusted header contract; identify exact browser-facing API surface and all direct clients.
2. **Environment owner (Operations):** approve Local/CI/Preview/Staging/Production API target and secret mapping, including whether Preview deployments share a non-production API. Confirm no Preview-to-Staging/Production default.
3. **Product/Security:** affirm DEVICE_TOKEN-only cashier login for the pilot and decide separately whether WebAuthn/hardware-backed assurance remains a post-pilot production gate.
4. **Auth owner:** confirm Supabase identity mapping uniqueness/active account checks, role/branch assignment, and account invite/password-reset ownership; preserve any required Admin MFA.
5. **API owner:** map stable public codes/statuses to generic UI copy and request-ID handling while maintaining non-enumeration before identity is established.
6. **Operations:** approve operator provisioning/reset/runbook, BFF secret rotation/revocation, and authorized runtime evidence process.
7. **Finance/Product/Legal:** no changes are proposed to finance/privacy decisions; existing unrelated outstanding approvals remain independent pilot gates.

If any decision is unresolved, leave its task blocked and do not implement that surface. The proposal/spec remain non-authoritative until approval; no credentials, service access, environment configuration, or physical acceptance is inferred.
