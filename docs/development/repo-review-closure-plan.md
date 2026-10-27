# Repo Review Closure Plan

**Basis:** review findings supplied for `workflow-states-implementation` at `9ae97bcee0cf9132c716431819124f45d1e9a285`, plus the open items in `docs/development/session-handoff-2026-10-16-pos-fraud-sms-followups.md`. This is a planning artifact, not independent re-verification of those findings. Preserve all pre-existing dirty/untracked files; inspect `git status --short` before any implementation. At plan creation, the tracked dirty files explicitly identified for preservation were `AGENTS.md`, `CLAUDE.md`, `apps/web/styles/supervisor-routes.css`, and `apps/web/tsconfig.tsbuildinfo`; preserve existing untracked artifacts as well. Pilot remains **NO-GO** until P1 issues and runtime gates below are closed.

## Outcomes and guardrails

1. Prevent duplicate or semantically incorrect financial mutations on retry/correction.
2. Certify the actual `DEVICE_TOKEN` path and provider/runtime behavior in an authorized staging environment.
3. Ensure privacy statements, environment identity, and operator-facing financial units are safe and accurate.
4. Restore OpenSpec as an actionable source of truth without broad refactoring or feature expansion.
5. Keep offline Earn secondary until online checkout and POS acceptance are complete.

Do not change ledger history, approximate a grouped reversal with an ordinary adjustment, deploy/pair a remote device without authorization, or claim live/staging acceptance based on CI alone. No broad monolith refactoring or reporting expansion in the pilot closure scope.

## Updated execution order (2026-10-18)

This order supersedes the earlier phase ordering below where they conflict. The grouped Redeem+Earn reversal Finance technical gate is closed; the pilot remains **NO-GO**.

1. **Auth/TRD and BFF-origin trust reconciliation (highest technical priority).** Reproduce and diagnose the reported Supervisor login rejection before attributing it to a boundary. Reconcile proposed TRD 1.1, `simplify-pilot-pos-device-authentication`, and the WebAuthn pilot-scope clarification around the agreed pilot model: Supabase verifies staff identity/passwords; ShopCity owns sessions/RBAC; Supervisor/Admin keep ordinary login; Cashiers use DEVICE_TOKEN; the backend derives `session.deviceId` from persisted device state. Specify the same-origin BFF contract, which browser Origin is validated, how each environment supplies its exact allowlist, and which proxy context is trusted. Do not weaken origin checks or invent a root cause. Draft artifacts now exist at `openspec/changes/simplify-staff-authentication-and-authorization/` (`proposal.md`, `design.md`, `specs/`, `tasks.md`). The user authorized bounded local implementation; it is not a confirmed fix or external approval. Obtain decision-owner approval, resolve documented decisions, and amend the proposed TRD before remote configuration, deployment, or rollout.
2. **Deployment/environment identity.** Remove committed and Git-ref-selected target identity only after the auth/origin model is explicit; validate each deployment's backend, tenant/branch context, and allowed frontend origins.
3. **Branch-create idempotency.** Settle the bounded client/backend retry contract and test replay, concurrency, changed payload, tenant scope, and ambiguous outcomes.
4. **Privacy/legal approval in parallel with steps 1–3.** Obtain approved notice/consent wording and retention/export/deletion semantics; do not treat the draft as approved.
5. **Candidate freeze and release evidence.** Assemble an exact candidate SHA deliberately from reviewed allowlisted files, then run protected CI and separately required security checks. Do not stage the entire dirty worktree.
6. **Authorized runtime sequence against that exact candidate.** Supervisor/Admin login and role smoke first, then physical DEVICE_TOKEN POS smoke, then real-provider SMS smoke. Runtime evidence is not interchangeable with CI.

Read-only Vercel preview metadata and a GET of its `/login` page were inspected under the current diagnostic request. A sanitized, branch-specific Preview environment pull from `shopcity-lp` found `SHOPCITY_BACKEND_URL` is not an HTTP(S) URL, while `SHOPCITY_API_BASE_URL`, `SHOPCITY_DEPLOYMENT_ENV`, and `SHOPCITY_BFF_SHARED_SECRET` are absent. The corresponding `shopcity-api` Preview environment also lacks `SHOPCITY_BFF_SHARED_SECRET`, `SHOPCITY_DEPLOYMENT_ENV`, and `PILOT_CASHIER_DEVICE_TOKEN_ONLY`; the configured BFF secrets therefore cannot be verified as present/matching. No environment values or secret contents were emitted, and no remote configuration was changed. The web/API mapping and auth boundary are not deployable as inspected; this does not prove the cause of the older reported login failure. No authenticated login attempt, deployment, provider send, or physical-device acceptance occurred. The eventual candidate must be assembled and reviewed file-by-file while preserving all existing dirty and untracked work.

## Current staff-auth implementation status (2026-10-19)

- The user authorized bounded local staff-authentication/BFF implementation on 2026-10-18. The reported deployed Supervisor/Admin failure remains unreproduced; this code is not claimed as its confirmed fix. An independent code-level review found no issues, but did not verify deployed environment values or runtime acceptance.
- Root Jest (71 suites/569 tests), root lint/typecheck/build, web Jest (33 suites/318 tests), web accessibility Jest (31 suites/307 tests), disposable `auth-http.int-spec.ts` (22 tests), web lint/typecheck/build, the critical browser suite (4 tests), production visual-regression screenshots (6 tests), browser accessibility (3 tests), Semgrep (0 findings), and strict OpenSpec validation (53 changes) passed.
- The broad `apps/web` visual-suite failure is diagnosed as host memory exhaustion. The 107-test run used the Next development server; kernel logs record an OOM kill of its `next-server` (PID 741075) at 16:53:01 on 2026-10-19 with about 2.0 GiB anonymous RSS. The run log ended at 16:55:26 with subsequent localhost:3100 refusals. The card-assignment test passes in isolation (1/1). The prior login screenshot also included the local-only cashier test control, unlike the production baseline. Playwright setup is now split into 101 deterministic workflow tests (dev-only flags explicit, isolated `.next-playwright-dev`) and six production visual-regression tests (public flags false at build time and `next start` from isolated `.next-playwright-production`). `playwright --list` confirms the 101+6=107 split. The production build/test script and full suite have not been run after this configuration change because the 2026-10-19 host sample showed swap near-saturated (3.8/4 GiB); do not rerun until memory headroom is available. `reuseExistingServer` is disabled so Playwright owns and terminates its own server.
- The deployed staff-login failure remains unconfirmed. Read-only Vercel inspection found the latest Ready preview was created 2026-10-16, before local commit `66510ed` (2026-10-19), so it cannot exercise the newer BFF boundary. Its `/login` page returned 200 with a Vercel request ID; no login attempt was made because no authorized test identity or correlated failure request ID was provided. The BFF can reject deployment/API mapping, trusted canonical Origin, or BFF secret/environment mismatch; downstream failures can occur in Supabase verification, ShopCity user/scope checks, or session-cookie issuance. A sanitized end-to-end trace still needs browser/BFF and Nest request IDs/status categories, environment labels and release SHA; never collect credentials, raw tokens, BFF secrets, or cookie values. The visual suite does not require Nest and exercises mocked/fallback paths; backend-connected tests are separate. The destructive legacy `scripts/dev/run-live-e2e.sh` is now fail-closed. `npm run e2e:live:full` points to a new Testcontainers runner that creates its own resource-capped Postgres/Redis, uses an in-memory local Supabase Auth stub and deterministic SMS mode, sets explicit loopback-only environment values without loading `.env.local`, migrates/seeds only the container database, starts Nest and Next, checks `/health/ready`, runs Playwright serially, and tears down only its owned child process groups, containers, temporary home and unique Next output directory. The package-level and test-level guards reject non-loopback/remote targets, wrong database name, mismatched web/API origins, remote Supabase/Redis, and real-provider mode. Safety tests (4/4) and the focused API-proxy test (3/3) pass. The backend-connected suite has not executed. Its runner was invoked only for preflight and refused before creating temporary files, containers, or app processes: 1.8 GiB RAM available and 232 MiB swap free. That reading remains below the runner's current 5 GiB/1 GiB thresholds. The top RSS consumers were two Node/Next processes (~1.1 GiB each) and Java (~0.8 GiB). The runner prints RAM/swap and command-name-only process RSS before starting, and applies 1.5 GiB/1 CPU to Postgres, 0.25 GiB/0.25 CPU to Redis, a 768 MiB Node heap ceiling, and one Playwright worker. The E2E login helper now traverses the same-origin BFF and checks that the server-generated request ID matches the response envelope; the corresponding proxy test passes. No remote configuration, deployment, or runtime smoke occurred. Product/Security/Operations approvals, TRD ratification, physical POS and real-provider acceptance, and other closure gates remain open; pilot remains **NO-GO**.

## Sequenced work

### Phase 0 — Confirm baseline and specification (before code changes)

- Re-check branch, HEAD, working-tree status and retain all existing changes/artifacts.
- Select or create focused OpenSpecs for adjustment retry identity, grouped settlement reversal/manual review, DEVICE_TOKEN smoke acceptance, privacy/consent, deployment environment identity, and any approved UX changes. Consolidate/supersede stale specs before relying on them.
- Use GitNexus impact analysis before changing each affected symbol; record risk/blast radius. Refresh its stale index before relying on graph results.
- Capture current CI and test baseline. The supplied review reports Actions run `38921598270` passed its six listed jobs at the reviewed SHA; independently confirm required security checks on the merge candidate.

**Exit:** requirements, decision owners, acceptance criteria, and test surfaces are explicit; working-tree preservation is confirmed.

### Phase 1 — P1 mutation and accounting safety

#### 1A. Stable adjustment retries

- In the admin adjustment flow, bind one idempotency key and one `effectiveAt` to the logical draft operation; reuse them on transport retry.
- Retain identity through ambiguous outcomes; refresh it only after definitive success, explicit cancellation, or a material payload change according to the service contract.
- Ensure changed payloads cannot replay an old result, and validate backend request identity remains consistent.
- Add tests for lost response/retry, double-submit, payload changes, success/new operation, and server idempotency retention.

**Acceptance:** retry after a committed-but-unacknowledged request yields one adjustment and stable request identity; no duplicate financial ledger effect.

#### 1B. Paired Redeem+Earn reversal policy

- Obtain product/finance approval for one of two safe options: implement an atomic grouped compensating reversal for every settlement effect and redemption allocation, or keep automated reversal unavailable and define a documented, auditable supervisor/admin manual-review procedure.
- Do not use a balance adjustment as a substitute for reversal semantics.
- Test single-effect compatibility, grouped paired-effect correction, allocation/lot restoration, idempotency, audit trail, and refusal paths. Verify append-only history remains intact.

**Acceptance:** every paired settlement has an authorized correction route; partial reversal cannot silently leave inconsistent reward/redemption effects.

### Phase 2 — P1 operational acceptance gates

#### 2A. DEVICE_TOKEN staging smoke and physical POS

- Replace/update legacy HMAC-attestation smoke setup (`live-backend-e2e.spec.ts`, staging/production smoke configuration) to provision and authenticate through `DEVICE_TOKEN`; remove obsolete secret dependency only after verifying no consumers remain.
- Use approved staging `POS_DEVICE_TOKEN_HMAC_KEY` and `SHOPCITY_BACKEND_URL`, authorized accounts, and a physical target POS/browser. These prerequisites were unavailable at the handoff; do not invent credentials or pair an unapproved device.
- Exercise provisioning/pairing, cashier sign-in, device-bound session, CSRF, branch/tenant scope, revocation/deactivation, and re-pair behavior on the target runtime.
- Preserve HMAC_LEGACY and WEBAUTHN mode exclusivity where those modes remain supported; no fallback/downgrade.

**Acceptance:** recorded staging smoke and physical-device checklist pass using DEVICE_TOKEN; CI and local integration tests remain green. No pilot claim before authorization and evidence are recorded.

#### 2B. Real-provider SMS acceptance

- Run authorized real-provider smoke for configured SMS provider(s), recording request/acceptance, provider identifiers, and delivery receipts where available.
- Validate terminal/uncertain Arkesel acceptance without a trackable recipient ID is not auto-retried; confirm Africa's Talking `SENT` is never presented as `DELIVERED` when no DLR exists.
- Confirm reports/UI preserve queued/sent/delivered/failed distinctions and document provider limitations.

**Acceptance:** provider-specific evidence is recorded; no CI-only claim of handset delivery; retry behavior cannot send duplicate messages after uncertain acceptance.

#### 2C. Privacy and consent approval

- Obtain product/legal approval for retention, export/deletion, loyalty consent, marketing consent, and notice wording before real customer onboarding; otherwise replace provisional promises with approved interim copy.
- Establish one authoritative versioned consent/notice source consumed by UI and backend capture. Display both consent choices in registration review before submission.
- Test displayed copy/version equals persisted consent evidence and consent choices are accurately reflected.

**Acceptance:** no provisional policy is represented as approved; captured notice version and operator/customer-visible text cannot drift.

### Phase 3 — P1/P2 deployment and mutation integrity

#### 3A. Deployment environment identity

- Remove committed environment-specific tenant/branch/project/origin identity from Vercel configuration and staging-ref hardcoding in configuration service; require deployment environment variables with validation and safe failure for missing/mismatched identity.
- Define Preview/Staging/Production variable ownership and mapping; test that each deployment targets only its intended backend, tenant, branch, and allowed origins.
- Review prior misrouting incident and add an automated configuration guard against cross-environment values.

**Acceptance:** committed config contains defaults/schema, not live identity; environment isolation is demonstrated before staging is considered trustworthy.

#### 3B. Branch creation idempotency

- Decide whether branch creation is contractually idempotent. If yes, implement persisted backend idempotency bound to tenant and request payload and return the original result on retry; otherwise remove misleading frontend key and explicitly handle ambiguous outcomes.
- Test concurrent/replayed requests, changed payload, tenant scope, and ambiguous response.

**Acceptance:** frontend and backend agree on idempotency guarantees; repeated logical create cannot create duplicate branches.

### Phase 4 — P2 operator usability and product hygiene

- Replace kobo/BPS inputs in adjustment/policy UI with formatted naira and percentage presentation; convert only at the UI boundary to integer kobo/BPS. Preserve integer financial logic and test round-trip, bounds, precision, and validation.
- Update stale login/cashier product language (OTP overrides, campaigns, paired security key) to accurately describe supported workflows and DEVICE_TOKEN pairing.
- Set authenticated operational web/API crawler policy to `noindex, nofollow` and disallow crawling; verify metadata and `/robots.txt`. This is hygiene, not a security boundary.
- Keep these changes in focused specs and include accessibility/localization/formatting checks where applicable.

### Phase 5 — OpenSpec governance (P2)

- Inventory all non-archived change directories; group overlapping generations (POS auth, repo reviews, cashier/supervisor redesigns, SMS-provider work).
- For each: determine current, superseded, completed-but-unchecked, or still-actionable status from implementation/tests/CI; do not infer completion from stale checkboxes alone.
- Explicitly close the device-auth OpenSpec's final `5.4` review checkbox and the fraud-review OpenSpec's visual-review checkbox. Record evidence separately: CI visual tests passed, but that is not authorized live/staging visual or POS acceptance.
- Archive superseded/completed specs per repository workflow; update surviving specs with current decisions, dependencies, acceptance evidence, and owners. Explicitly supersede WebAuthn pilot requirements where DEVICE_TOKEN is the approved direction.
- Run strict OpenSpec validation and review generated/archive diffs.

**Acceptance:** a contributor can identify the active source of truth for each pilot area; no contradictory active spec remains for the same behavior.

### Phase 6 — Pilot follow-through and deferred maintenance

- Certify ordinary online checkout first. Treat offline Earn as secondary; then separately test device/cashier binding, replay/idempotency, age/week limits, branch/card/customer state, and recovery behavior before enabling it for pilot.
- After pilot, split large services/components by domain operation/use case (not arbitrary file size), with behavior-preserving tests and GitNexus impact review. Defer unless a specific defect requires earlier change.
- Audit `apps/web/public`: identify runtime-served assets, move design references/prototypes out of production public assets, optimize required artwork, remove duplicate/typo artifacts only after usage checks. Record before/after build size.
- Remove tracked `tsconfig.tsbuildinfo` when safe, confirming ignore rules and no workflow depends on it.
- Avoid expanding the already mature reporting subsystem absent an owner-approved requirement. Resolve fraud-review component duplication only if it causes demonstrated divergence.

## Cross-cutting verification and release evidence

For each implementation change, use the repository's relevant OpenSpec, GitNexus impact before symbol edits, focused tests, and `detect-changes` on the exact staged scope before committing. Preserve dirty files and inspect diff/status throughout.

Required gates as applicable:

- Root and web lint/typecheck/build; formatting and `git diff --check`.
- Focused Jest/unit and integration tests; full suites for financial/auth changes.
- Semgrep/security checks and architecture/OpenAPI/OpenSpec validation.
- Playwright/accessibility/visual checks for changed user workflows.
- Supabase migration/RLS verification only if database/RLS changes are made; update migration tracker for every schema change/applied migration.
- GitNexus impact and final `detect-changes`; investigate unexpected symbols/flows.
- CI on exact merge candidate, including separate required security checks (CodeQL, Gitleaks, Trivy) rather than extrapolating from another run.
- Authorized staging provider/POS acceptance evidence for runtime-only claims.

## Release decision

**NO-GO** while any P1 mutation/accounting issue, privacy approval, deployment identity risk, or required staging/provider gate remains unresolved. **GO for a limited pilot** only after an accountable owner signs off each P1 decision and runtime checklist, exact-SHA CI/security checks pass, and rollback/support procedures are ready. Keep offline Earn disabled or explicitly out of scope until separately certified.

## Risks and unresolved decisions

- Product/finance must choose grouped compensating reversal versus documented manual review.
- Product/legal must approve privacy and consent language and retention semantics.
- Operations must provide authorized staging settings, accounts, provider access, and physical POS/browser.
- Branch create idempotency semantics and OpenSpec archival policy should be confirmed before changing API contracts or archiving artifacts.
- The supplied review text ends mid-sentence in its final “What I would do next” section; this plan incorporates all complete findings supplied above and does not infer missing recommendations.
