# Tasks: Simplify Staff Authentication and Authorization for the Pilot

## 0. Proposal and preservation

- [x] 0.1 Capture branch `workflow-states-implementation`, HEAD `9ae97bcee0cf9132c716431819124f45d1e9a285`, and preserve the pre-existing dirty/untracked work; do not stage, clean, reset, or commit.
- [x] 0.2 Review `docs/repo_review_61.md`, relevant TRD requirements, the active DEVICE_TOKEN spec, and the separate WebAuthn proposal; record conflicts and approval boundaries.
- [x] 0.3 Run and record proposal-time GitNexus impacts before drafting: auth UI/controller/service LOW; shared `proxyRequest` MEDIUM with seven direct HTTP-method callers. Re-run impact before any implementation symbol edits, and re-review expanded proxy surfaces.
- [x] 0.4 Draft the proposal and delta requirements, including role-neutral login, BFF/origin trust, DEVICE_TOKEN pilot-only policy, server-derived device identity, safe errors, operator accounts, and independent NO-GO gates.
- [x] 0.5 Draft this design and task plan. The user authorized local implementation on 2026-10-18; this does not close external Security/Platform/Operations decisions, remote configuration, deployment, or runtime acceptance gates.

## 1. Diagnose and approve before implementation

- [ ] 1.1 Reproduce the reported Supervisor/Admin sign-in failure on an authorized non-production target. Capture request ID, sanitized frontend/BFF/API statuses, Supabase outcome, ShopCity identity mapping result, and environment mapping without collecting passwords, cookie values, raw tokens, or secrets.
- [ ] 1.2 Determine the actual failing boundary (origin/canonical host, deployment-to-API mapping, BFF forwarding, Supabase verification, ShopCity user/status lookup, session/cookie creation, or other). Record confirmed cause separately from hypotheses; do not patch until evidence identifies the failing step.
- [ ] 1.3 Inventory every browser and non-browser client of the Nest API and every route/method forwarded through `proxyRequest`. Identify which clients can migrate to the BFF and which need separately scoped service identity. Do not enforce a global gateway policy with unknown consumers.
- [ ] 1.4 Obtain Security/Platform approval for canonical Origin derivation, trusted proxy metadata, BFF identity mechanism, BFF credential scope, direct-client compatibility, rotation/revocation, and log redaction.
- [ ] 1.5 Obtain Operations approval for Local/CI/Preview/Staging/Production frontend-to-API mappings and secret ownership. Confirm Preview cannot target Staging/Production by default and identity is not inferred from Git refs.
- [ ] 1.6 Obtain Product/Security approval that DEVICE_TOKEN is the sole cashier proof accepted by the current pilot environment, including explicit supervised re-pairing for legacy devices. Separately decide whether WebAuthn/hardware-backed assurance remains a post-pilot production gate.
- [ ] 1.7 Confirm Supabase identity-to-ShopCity user uniqueness, active status checks, password-reset/invitation owner, branch assignment model, and any existing Admin MFA requirements. No role or scope decision is inferred from the login UI.

## 2. Reconcile normative documentation

- [ ] 2.1 Amend proposed `docs/TRD.md` only after approval: §3.2, §9, §10.2, §11, §13.3, §§14.1–14.3, §15, §21, §22.3, Appendix A (environment variables), Appendix B (stable errors), and §26/open decisions as applicable.
- [ ] 2.2 Make Supabase identity/password/reset versus ShopCity user/session/RBAC responsibility explicit; retain secure sessions, CSRF, audit, rate limiting, account status, revocation, and domain-specific authorization.
- [ ] 2.3 Add an explicit scope matrix: Cashier = assigned branch plus pilot DEVICE_TOKEN; Supervisor = assigned branch without POS proof; Admin/Owner = tenant scope without POS proof; System = internal-only, not a human login role.
- [ ] 2.4 Amend the active `simplify-pilot-pos-device-authentication` delta so its exact-Origin/manual Preview allowlist and unchanged HMAC/WebAuthn runtime statements are explicitly superseded only for the approved pilot runtime. Preserve compatibility implementation/data and separate future qualification requirements; do not leave competing active requirements.
- [ ] 2.5 Preserve `browser-pos-webauthn-attestation` as separate future/compatibility work; update its pilot note only if needed so it does not claim WebAuthn is a current-pilot prerequisite or imply it has been hardware-qualified.
- [ ] 2.6 Keep the TRD version proposed until formal TRD owners approve it. Add/update an ADR only if the architecture decision owners require a durable record beyond this OpenSpec change.
- [ ] 2.7 Validate all affected OpenSpec changes and confirm no unresolved active requirement contradicts the approved pilot behavior.

## 3. Implement and validate BFF/origin/environment trust

- [x] 3.1 Re-run GitNexus impact on `proxyRequest` and newly discovered helpers/callers before edits; report any HIGH/CRITICAL risk and keep changes bounded to the approved client/route surface. Recorded in `docs/development/gitnexus-impact-tracker.md`; proxy remains MEDIUM due to seven method callers; no HIGH/CRITICAL result.
- [x] 3.2 Define validated, explicit API target and canonical Origin configuration for Local, CI, Preview, Staging, and Production. Missing, malformed, mismatched, or cross-environment configuration fails closed; Preview never implicitly targets a production API. Local/Preview resolution and fail-closed remote target rules are implemented; actual per-environment values remain Operations-owned.
- [ ] 3.3 Store distinct BFF credentials/identities in approved server-side secret stores; never place them in `NEXT_PUBLIC_*`, source, browser bundles, responses, logs, test snapshots, or shared artifacts. Implement approved redaction, rotation, revocation, and constant-time/equivalent identity validation.
- [x] 3.4 Make the BFF validate trusted canonical browser Origin and environment identity before proxying; do not trust arbitrary Host/Forwarded/X-Forwarded-* values. Keep exact Origin/Referer fallback behavior only as approved and validate origin values, not full Referer paths.
- [x] 3.5 Forward the approved server-only BFF identity upstream and enforce it at the agreed browser-auth API boundary. Ensure direct browser bypass fails closed; preserve separately scoped internal/service clients and avoid using CORS as authentication. Identity is scoped to public login and cashier-login completion; runtime bypass acceptance remains pending.
- [ ] 3.6 Preserve/verify Cookie, Origin, Referer, request body, abort/timeout behavior, response status/body and all Set-Cookie attributes across GET/POST/PUT/PATCH/DELETE/OPTIONS/HEAD as applicable. Do not leak the service credential or suppress secure cookies.
- [ ] 3.7 Keep cookie-based CSRF checks on state-changing authenticated operations, pre-login origin integrity, login throttling, secure cookie attributes, audit and session revocation. BFF identity is not a user session or authorization grant.
- [ ] 3.8 Add configuration, proxy, direct-bypass, spoofed-header, absent/malformed Origin, cross-environment credential, secret-leakage, rotation and failure tests. Verify local/CI tests use isolated test credentials and disposable infrastructure only.

## 4. Implement role-neutral staff authentication

- [x] 4.1a Remove login role selection and client-selected role authority; route only from the backend-returned role and reject internal/unknown roles.
- [ ] 4.1b Confirm the approved Supabase password-reset/invitation flow and update the accessible help action without inventing an unavailable workflow; preserve the existing Admin MFA decision.
- [ ] 4.2 After Supabase credential verification, resolve exactly one active ShopCity user and active tenant/account/branch scope; never issue a ShopCity session for an unlinked, ambiguous, inactive, or out-of-scope identity.
- [x] 4.3 Return the minimal server-owned role/session context needed by the web app; route to Cashier/Supervisor/Admin workspace from persisted role. Reject or ignore client-supplied role/scope as authority; System is not selectable or assignable to a human.
- [x] 4.4 Ensure Supervisor/Admin login and session creation do not consult POS cookie, device ID, HMAC, WebAuthn, or cashier pairing state; focused tests cover incidental device IDs.
- [ ] 4.5 Keep tenant/branch policies and resource-specific checks server-side. Extract/reuse common policy only where targeted review demonstrates duplication; do not refactor unrelated services.
- [ ] 4.6 Add controller/service tests for active/unlinked/ambiguous users, disabled users/tenants/branches, role changes/session revocation, forged scope, Supervisor/Admin without POS state, and session/CSRF behavior.

## 5. Implement DEVICE_TOKEN-only Cashier pilot behavior

- [x] 5.1 Add/validate an explicit pilot runtime policy that permits only DEVICE_TOKEN for cashier session creation in the approved pilot environment; missing/invalid policy fails closed. Keep non-pilot/compatibility mode tests separate.
- [x] 5.2 Resolve the POS token through the existing keyed credential (`HMAC-SHA-256` with dedicated POS key), DeviceTokenCredential, Device, tenant and branch. Derive `session.deviceId` exclusively from persisted server records; the focused test includes a mismatched client locator.
- [x] 5.3 Remove deployed pilot login reliance on localStorage device ID, `x-device-id`, or a body device ID. Preserve only an explicit local-development compatibility opt-in and non-secret Admin/Supervisor locators.
- [ ] 5.4 Fail closed for missing/invalid/expired/revoked token, wrong mode, inactive user/tenant/branch/device, cross-tenant identity, or branch mismatch. Never fallback to HMAC_LEGACY, WebAuthn, or an unbound Cashier session.
- [ ] 5.5 Preserve pair/reset/revoke/deactivate scope, CSRF, audit, cookie attributes, one-active-credential/key rules, and atomic session invalidation. Document and test explicit supervised re-pairing; do not silently migrate or mutate legacy rows.
- [ ] 5.6 Add focused tests for token credential resolution, one active credential, revoked/rotated key, wrong branch, client-supplied ID mismatch, no localStorage dependency, no mode fallback, logout/refresh cookie preservation, and session invalidation.

## 6. Make failures supportable and operational credentials safe

- [x] 6.1 Map stable API codes/statuses to non-enumerating pre-identity messages; unknown email, bad password, inactive/missing ShopCity mapping, and similar failures must not confirm account existence. UI messages are generic; unlinked/inactive/System login failures share the generic credential response.
- [x] 6.2 Return request/reference IDs on BFF boundary failures and preserve API request IDs for service errors. Login UI shows safe generic help and references; it does not mention register pairing for Supervisor/Admin failures.
- [ ] 6.3 Log internal reason codes and request correlation while redacting passwords, BFF/POS credentials, cookies, Supabase tokens, session/CSRF values and sensitive request bodies. Add tests against logs and error payloads.
- [ ] 6.4 Restrict shared seeded defaults to local/CI/disposable use. Create the approved staging/pilot named-operator invitation/password-reset procedure; do not put passwords in seed artifacts, smoke scripts, environment examples, or shared notes.
- [ ] 6.5 Preserve login throttling, audit events, session expiry/revocation and currently approved Admin MFA behavior.

## 7. Verification, rollout, and release evidence

- [ ] 7.1 Run focused auth/controller/BFF/device tests, disposable Testcontainers integration tests, browser/e2e role-login tests, typecheck, lint, build, OpenAPI/client checks if contracts change, strict OpenSpec validation, and applicable security checks.
- [ ] 7.2 Verify no financial behavior, ledger, balance authority, branch approval rules, audit semantics, or SMS delivery behavior changed. No shared database or staging may substitute for disposable test verification.
- [ ] 7.3 Validate per-environment misconfiguration and secret failures in local/CI; test a newly approved Preview hostname without an application source edit while proving Preview cannot call Staging/Production.
- [ ] 7.4 Review targeted diff and run GitNexus `detect_changes()` on the deliberate candidate scope; do not stage unrelated work or claim exact-candidate evidence from the combined dirty worktree.
- [ ] 7.5 Obtain authorization and exact candidate SHA before deployment. Run Supervisor/Admin sign-in and role smoke first, physical DEVICE_TOKEN POS smoke second, real-provider SMS smoke third; record test identity/source, environment, exact SHA, request IDs and redacted evidence.
- [ ] 7.6 Document rollback to the prior exact code/config and secret revocation procedure. Rollback must not remove CSRF/origin checks, accept browser-selected device IDs, permit legacy mode fallback, or create device-less Cashier sessions.
- [ ] 7.7 Keep pilot **NO-GO** until Product/Security/Operations approvals, exact-candidate CI/security, authorized runtime smoke, physical POS and real-provider evidence, privacy/legal decisions, deployment identity and remaining independent gates are closed.
