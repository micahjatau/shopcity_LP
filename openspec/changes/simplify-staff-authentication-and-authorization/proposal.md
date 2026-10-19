# Change: Simplify Staff Authentication and Authorization for the Pilot

## Why

`docs/repo_review_61.md` identifies a demonstrated Supervisor sign-in failure: an approved Vercel Preview hostname can be rejected by the exact frontend-origin allowlist and surfaced as a generic invalid-credentials error. The current pilot path also combines role selection, Supabase identity, ShopCity user/session mapping, origin checks, a Next.js-to-Nest proxy, and multiple cashier device-identity signals. The result is difficult to operate and diagnose even though the underlying security boundaries are valuable.

The proposed TRD v1.1 also has conflicting cashier-authentication language: earlier sections describe WebAuthn as the normative cashier path, while later sections and active pilot work select DEVICE_TOKEN. A bounded, explicit pilot model is needed before further auth implementation. This change simplifies the operational path without removing Supabase, ShopCity sessions/RBAC, CSRF, auditing, throttling, or server-side cashier device binding.

The reported Supervisor failure must be reproduced and diagnosed during implementation; this proposal does not assume that origin configuration is the only possible cause.

## Goals

- Make login role-neutral: staff enter credentials, and the authenticated ShopCity user record determines the role and workspace.
- Keep Supervisor/Admin login independent of POS pairing and cashier device state.
- Use Supabase for staff identity/password verification and ShopCity for user mapping, sessions, authorization, and audit.
- Make DEVICE_TOKEN the sole cashier device-proof mechanism accepted for this pilot; resolve device identity from the opaque credential on the server.
- Replace manually maintained Preview-hostname dependencies with an explicit, environment-bound same-origin BFF trust model; do not remove origin/CSRF protections or enable wildcard credentialed CORS.
- Keep common role, tenant, branch, and paired-POS authorization server-side and consistent without broad service refactoring.
- Make operational account setup and login failures understandable without exposing credentials or enabling account enumeration.
- Reconcile the proposed TRD and active authentication OpenSpecs with the approved pilot direction before implementation is considered complete.

## Proposed pilot model

1. **Identity and sessions:** Supabase verifies email/password and owns the approved password-reset flow; the backend never stores raw passwords or returns Supabase tokens to the browser. The backend resolves the Supabase identity to exactly one active ShopCity user. ShopCity remains authoritative for role, tenant, branch, account status, session creation/revocation, CSRF, and business authorization. A Supabase identity without one active linked ShopCity user confers no ShopCity access.
2. **Role-neutral entry:** Remove the Cashier/Supervisor/Admin selector from login. Do not accept a client-selected role as authentication or authorization input. After successful authentication, route according to the server-returned ShopCity role: CASHIER to `/cashier`, SUPERVISOR to `/supervisor`, and ADMIN to `/admin`.
3. **Supervisor/Admin:** Preserve the normal password/session login path. These roles do not require a POS token, device identifier, WebAuthn assertion, or HMAC device proof. Tenant/branch scope continues to come from backend session context and authorization policy. Keep any already-approved Admin MFA requirement; this change does not waive it.
4. **Cashier:** Require the valid staff credentials plus the paired POS's `__Host-shopcity_pos_device` HttpOnly cookie. The API hashes/verifies the opaque token, resolves its active `DeviceTokenCredential` and associated device/branch, and derives `session.deviceId` from that persisted relationship. The browser does not submit `x-device-id`, a device ID in the login body, or a persistent localStorage device locator. Pairing/reset remains an authorized, audited Supervisor/Admin operation.
5. **Pilot binding modes:** DEVICE_TOKEN is the only paired-device proof accepted for pilot Cashier login. UNPAIRED devices remain unable to establish a Cashier session. HMAC_LEGACY and WEBAUTHN implementation/data may remain for compatibility or a separately approved future qualification, but neither is an active pilot login path. No mode fallback, silent downgrade, or implicit migration is permitted; any existing device that must enter the pilot path requires an explicit approved re-pair/migration procedure.
6. **BFF and origin trust:** Browser auth flows use the same-origin ShopCity web/BFF. The BFF validates the browser-facing origin against trusted, validated deployment identity rather than requiring source edits or an API allowlist entry for every generated Preview hostname. The BFF authenticates server-to-server to the API using a server-only per-environment credential or an equivalent reviewed deployment identity. The API rejects browser-facing authentication calls that bypass the trusted BFF path. The design must define the canonical origin source and trusted proxy metadata; arbitrary client-supplied Host/Forwarded/X-Forwarded-* values are not trust anchors. Keep exact origin/CSRF intent, secure cookies, and no wildcard credentialed CORS. The credential must never reach browser bundles, logs, analytics, or error responses; define rotation, fail-closed behavior, and test/local/CI handling before implementation.
7. **Authorization:** The backend builds an authoritative auth context from the ShopCity user, active session, tenant, branch, role, and server-derived device binding. Common role, branch-scope, tenant-scope, and paired-POS requirements should use shared guards/policies where practical. Resource ownership, approval-separation, card state, and financial eligibility remain domain-specific service checks. No user-provided role, tenant, branch, balance, approval, or device ID becomes authority.
8. **Operational accounts:** Seeds remain available for local development, automated tests, and disposable environments only. Staging/pilot operators use individually provisioned named accounts and an approved password setup/reset process; shared seeded default passwords are not an operational login mechanism.
9. **Errors and support:** Before credentials establish identity, return a generic non-enumerating sign-in failure. After valid credentials identify a Cashier, return a safe actionable pairing/revocation outcome when applicable; never expose account existence from an invalid-password request. Upstream service failures show a generic message plus request/reference ID. Structured server logs record the internal reason and request ID while redacting passwords, tokens, cookies, session/CSRF values, and sensitive payloads.

## Required acceptance criteria

### Role-neutral sign-in and server authorization

- The effective role/scope matrix is explicit: Cashier = assigned active branch plus DEVICE_TOKEN; Supervisor = assigned active branch without POS proof; Admin/Owner = tenant-scoped without POS proof; System = internal-only and not assignable through human login.
- Supabase remains responsible for password reset/invitation verification as currently approved; ShopCity creates no human session for `SYSTEM`.

- Login has no role selector; a role cannot be supplied or changed by the browser.
- A valid active Supervisor/Admin can sign in through the approved Preview/BFF path without any POS state and is routed to the workspace matching the persisted ShopCity role.
- A Supabase-authenticated identity with no active linked ShopCity user receives no ShopCity session.
- Tenant/branch permissions and sensitive operations remain enforced by backend guards/policies; direct API tests prove client role/scope values cannot elevate access.

### BFF, origin, and deployment isolation

- A newly approved Preview can use the documented deployment mapping without a source-code edit or an ad hoc origin-allowlist patch for its generated hostname.
- The BFF authenticates to the matching environment's API using a server-only trust mechanism; unauthenticated direct browser calls to protected browser-auth API paths fail closed.
- Origin validation uses a documented canonical source and exact deployment/environment policy. Spoofed Host/Forwarded/X-Forwarded-* headers, an untrusted origin, a mismatched Preview-to-API mapping, missing proxy credentials, and cross-environment credentials fail safely.
- The proxy credential is absent from client bundles, browser responses, logs, analytics, and test artifacts. Rotation and failure behavior are tested.
- CSRF checks, Secure/HttpOnly/SameSite session cookies, session revocation, login throttling, audit events, and no-wildcard credentialed CORS remain effective.
- Proxy regression tests cover the HTTP methods and existing Cookie/Origin/Referer/Set-Cookie behavior affected by the shared BFF route.

### DEVICE_TOKEN-only Cashier pilot

- A valid paired token cookie resolves to one active credential/device/branch, and the ShopCity session's `deviceId` is derived from that persisted relationship. The raw token is stored only in the host-only `__Host-shopcity_pos_device` Secure, HttpOnly, SameSite=Strict, Path=/ cookie (no Domain); only its keyed HMAC and lifecycle metadata are persisted.
- Cashier login does not require or persist a device ID in localStorage, the request body, or `x-device-id`; test both successful login and stale/missing/revoked cookie outcomes.
- Supervisor/Admin login succeeds without Cashier device proof. HMAC_LEGACY and WEBAUTHN proofs are rejected for pilot Cashier authentication, and no cross-mode fallback exists.
- UNPAIRED devices, inactive users/tenants/branches/devices, revoked credentials, and incompatible branch assignments cannot establish or retain a usable Cashier session.
- Pair/reset/revoke/deactivation retain existing authorization scope, CSRF, audit, cookie, and session-invalidation guarantees. Any explicit re-pair migration is documented and tested without changing confirmed financial history.

### Operational UX and errors

- Invalid credentials and other pre-auth failures remain non-enumerating and use stable API error codes/request IDs; internal logs retain actionable, secret-free reason codes and request correlation.
- A valid Cashier credential with a missing/revoked POS pairing receives a safe, role-appropriate message; Supervisor/Admin errors never mention register pairing.
- Users receive a request/reference ID for service failures, and tests assert that secrets and sensitive payloads are not logged.
- Staging/pilot account setup documents individually provisioned operator accounts and reset/setup; shared seed passwords are restricted to local/test/disposable use.

### TRD, compatibility, and release evidence

- The TRD amendment explicitly resolves the WebAuthn-versus-DEVICE_TOKEN pilot contradiction and updates the auth endpoint/error contract in §§3.2, 9, 10.2, 11, 13.3, 14.1–14.3, 15, 21, 22.3, Appendix A (environment configuration), Appendix B (stable error catalogue), and §26 as applicable. WebAuthn remains a separately qualified future/compatibility mechanism unless formally approved; its proposed hardware-assurance requirement is not silently represented as either satisfied or removed.
- `simplify-pilot-pos-device-authentication`, `browser-pos-webauthn-attestation`, and role-based smoke requirements have one consistent pilot source of truth, including DEVICE_TOKEN-only runtime acceptance and the BFF trust boundary.
- Focused auth/controller/proxy tests, end-to-end role login tests, device-token tests, typecheck, lint, build, and applicable security checks pass before candidate freeze.
- Release smoke occurs only on a deliberately assembled exact candidate: Supervisor/Admin login first, then physical DEVICE_TOKEN POS, then real-provider SMS. CI is not staging, physical-device, or provider acceptance.

## Non-goals and boundaries

- Do not replace Supabase Auth/password reset, ShopCity-owned sessions/RBAC, CSRF, audit, login throttling, approved Admin MFA, or secure cookie sessions.
- Do not delete the WebAuthn/HMAC compatibility implementation or rewrite all authorization services. Any retirement/data migration is separately reviewed; existing modes never silently downgrade.
- Do not weaken origin validation, use wildcard credentialed CORS, trust arbitrary forwarded headers, or expose a reusable proxy secret to the browser.
- Do not change ledger, balance, approval, reversal, SMS financial semantics, or other money authority.
- Branch-create idempotency remains a separate bounded change. Product/Legal privacy wording and retention/export/deletion approval remain parallel gates. Exact-candidate CI/security, authorized staging, physical POS, and real-provider acceptance remain release gates, not evidence this proposal can manufacture.
- No staging deployment, remote pairing, real customer onboarding, provider send, database migration, stage, or commit is authorized by this proposal.

## Impact

Potential implementation and documentation surfaces, subject to design-time GitNexus review:

- `apps/web/components/auth/login-form.tsx` and role-aware redirect/session bootstrap.
- `apps/web/app/api/v1/[...path]/route.ts` and validated per-environment BFF/API identity configuration.
- `src/modules/auth/auth.controller.ts`, `src/modules/auth/auth.service.ts`, login DTO/response contracts, and auth tests.
- DEVICE_TOKEN credential resolution and session/device tests; shared guards/policies only where the focused design confirms duplication or a trust-boundary gap.
- Local/test seed and staging operator setup documentation, auth runbooks, `docs/TRD.md`, affected active OpenSpecs, OpenAPI/client artifacts only if the contract changes, and targeted Playwright/integration coverage.

No schema migration is presumed. Inventory non-browser and direct-browser API clients before enforcing BFF-only routing; preserve separately authorized clients and their contracts. If a request DTO/header removal or schema migration is needed, stop and add a separately reviewed compatibility/migration plan, backup/rollback evidence, and migration-tracker entry before implementation.

## Source documents and sequencing

- `docs/repo_review_61.md` — motivating findings and proposed simplification.
- `docs/TRD.md` — architecture baseline, currently Version 1.1 **proposed**; formal amendment approval remains required.
- `openspec/changes/simplify-pilot-pos-device-authentication/` — active DEVICE_TOKEN pilot behavior.
- `openspec/changes/browser-pos-webauthn-attestation/` — WebAuthn compatibility/qualification, explicitly not the current pilot path.
- `openspec/changes/role-based-production-smoke-tests/` and `openspec/changes/repo-review-closure/` — release and runtime evidence gates.
- `docs/development/gitnexus-impact-tracker.md` — proposal-time impact findings for this change.

Sequence: reproduce the reported Supervisor failure and inspect sanitized request/correlation evidence; agree the TRD/BFF trust design and compatibility policy; implement behind exact environment validation; certify role login; then freeze a candidate before POS and provider smoke. Deployment identity must not be inferred from an arbitrary Git ref. Privacy/legal approval proceeds in parallel, and the pilot remains **NO-GO** until all independent approval and runtime gates close.
