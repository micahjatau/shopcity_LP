# Tasks

## Updated execution order (2026-10-18)

The grouped Redeem+Earn reversal Finance technical gate is closed. The pilot remains **NO-GO**. The following order supersedes the earlier phase sequence where they conflict:

1. Reconcile the proposed TRD/auth model and diagnose the reported Supervisor/Admin login rejection: Supabase identity verification, ShopCity-owned sessions/RBAC, ordinary Supervisor/Admin login, DEVICE_TOKEN cashier binding, server-derived `session.deviceId`, and an explicit same-origin BFF/browser-Origin trust model. Reproduce before changing code; do not weaken origin checks or guess the cause. Draft artifacts are at `openspec/changes/simplify-staff-authentication-and-authorization/` (`proposal.md`, `design.md`, `specs/`, `tasks.md`). Obtain decision-owner approval, resolve documented design decisions, and amend the proposed TRD before implementation.
2. Fix deployment/environment identity and validate per-environment API/backend and allowed-origin mappings.
3. Resolve branch-create idempotency semantics and align client/backend behavior.
4. Obtain Product/Legal notice, consent, retention, export, and deletion approval in parallel with steps 1–3.
5. Assemble an exact candidate SHA from a deliberately reviewed file list, then run protected CI and separate required security checks. Do not stage the whole dirty worktree.
6. Against that exact candidate, run Supervisor/Admin login/role smoke, then physical DEVICE_TOKEN POS smoke, then real-provider SMS smoke.

No staging, deployment, remote pairing, provider send, staging/commit, or physical-device acceptance is authorized by this plan update.

## Baseline and decisions

- [x] Confirm baseline branch `workflow-states-implementation`, HEAD `9ae97bcee0cf9132c716431819124f45d1e9a285`, dirty/untracked state; preserve unrelated work throughout.
- [x] Record Product/Finance choice: atomic grouped paired-settlement reversal and exact-pair eligibility, fail-closed cases, idempotency/replay, response, audit, and one-SMS semantics (approved 2026-10-18).
- [ ] Obtain product/legal approval for privacy/consent wording and retention semantics. A clearly marked template is at `docs/development/drafts/customer-loyalty-privacy-notice-v0.1.md`; it is not approved, authoritative, or used by the application.
- [ ] Obtain operations prerequisites for authorized staging, physical POS/browser, provider access, and test accounts.
- [ ] Refresh stale GitNexus index; run and record impact analysis before changing each affected symbol. The index is now refreshed and exact post-change impacts are recorded in `docs/development/gitnexus-impact-tracker.md`; this cannot retroactively establish pre-edit coverage for earlier slices, so keep this process item open and use current impacts for future edits.

## P1 mutation/accounting safety

- [x] Bind adjustment idempotency key and `effectiveAt` to the logical draft operation across page reload; persist no raw adjustment/customer payload, and preserve prior identities if a draft payload changes and later returns to an earlier value. Session-scoped storage keeps only a SHA-256 payload digest and identity fields; expired, corrupt, unavailable, or non-digestable recovery fails closed.
- [x] Cover committed-but-unacknowledged retries across page reload, double submit, payload changes, success/new operation, expired/unavailable identity fail-closed behavior, and server retention. Focused helper and UI tests verify remount recovery, payload privacy, per-identity clearing, and expiry/unavailable/corrupt fail-closed paths alongside existing retry/success coverage. Do not claim edits after ambiguity are inherently safe.
- [x] Complete and independently clear the approved atomic paired settlement reversal. The raw Prisma/PostgreSQL SQLSTATE `40001` retry path is recognized, bounded to the existing three-attempt transaction loop, and independently reviewed with no remaining findings. No changes were made to `LotAllocationService`.
- [x] Verify exact-pair success/replay through either leg; same-key and distinct-key races; changed-payload idempotency conflict; consumed and expired Earn lots; expired redemption source; partial reversal/restoration evidence; missing/corrupt pair effects; same-tenant customer mismatch; cross-tenant FK rejection; DB protection against deleting the Earn lot or mutating allocation evidence; append-only originals; one grouped audit, one `fraud.evaluate` event, one SMS intent; and asynchronous SMS retry without financial rollback or duplicate intent. The disposable Testcontainers suite completed with all 10 tests passing after migrations. Distinct-key concurrency yields one grouped reversal and `TRANSACTION_ALREADY_REVERSED` for the loser; final active wallet is 5,000 kobo. SMS retry reuses the same outbox event twice while keeping one message intent and unchanged ledger cardinality. Focused service/controller Jest, typecheck, Nest build, integration-spec TypeScript compilation, and scoped ESLint passed. The earlier 40001 race failure is resolved. No shared DB or staging was used. Protected `ci.yml` runs `test:integration:prime` and `test:integration`.

## Runtime gates

- [ ] Diagnose and close the reported Supervisor/Admin login usability failure before cashier POS qualification. Reconcile the proposed TRD 1.1 and active pilot-auth specs against the draft artifacts in `openspec/changes/simplify-staff-authentication-and-authorization/` without changing Supabase identity verification, ShopCity-owned sessions/RBAC, normal Supervisor/Admin login, DEVICE_TOKEN cashier binding, or server-derived device identity. Document and test the exact same-origin BFF/browser-Origin trust model and deployment-specific allowlist; do not fix a configuration mismatch by weakening origin validation. The draft artifacts are not approved implementation specs; decision-owner approval and the TRD amendment remain open.
- [ ] Update staging/live smoke to DEVICE_TOKEN; remove legacy attestation secret dependency only after consumer audit.
- [ ] Run authorized DEVICE_TOKEN staging smoke and physical POS checklist (provision, sign-in, device-bound session, CSRF/scope, revoke/deactivate/re-pair).
- [ ] Run authorized real-provider SMS smoke; record provider acceptance and DLR evidence/limitations; verify uncertain acceptance is not resent and SENT is not presented as DELIVERED.
- [ ] Do not claim acceptance until prerequisites and evidence are recorded.

## Privacy, deployment, and API integrity

- [ ] Use approved authoritative versioned consent/privacy notice for display and persisted consent evidence; show loyalty and marketing choices in registration review. The display-only review-dialog sub-slice now presents the form's current loyalty and marketing choices; approval of consent/privacy wording, authoritative source, and retention semantics remains outstanding.
- [ ] Remove committed deployment identity and staging-ref identity hardcoding; validate environment mappings and add cross-environment configuration guard.
- [ ] Decide branch-create idempotency contract; align UI and backend; test replays, concurrency, changed payload, tenant boundary, and ambiguous outcome.

## UX and governance

- [x] Present financial values in naira/percent with integer kobo/BPS conversions at the presentation boundary; test precision, bounds, and round-trip. Focused admin component tests cover normal adjustment/policy entry and successful submission with integer-kobo/BPS generated-client payloads.
- [x] Replace stale operational copy; login role descriptions and cashier sign-in guidance now match implemented role capabilities and paired POS device-token authentication.
- [x] Add noindex/nofollow and crawler disallow directives; verify they are hygiene only.
- [ ] Complete artifact-level OpenSpec reconciliation and archive only after evidence. Initial scoped inventory is recorded in `docs/development/openspec-active-change-inventory-2026-10-17.md` (53 active changes reported; no archival performed; source/task evidence is incomplete). The WebAuthn proposal now explicitly supersedes only the pilot pathway in favor of DEVICE_TOKEN while preserving its separate mode/qualification scope. The device-auth `simplify-pilot-pos-device-authentication` task 5.4 still needs exact-scope GitNexus detect-changes/final diff and dirty-file preservation evidence; the fraud-review `fraud-review-results-presentation` task 4.4 still needs an actual browser visual review after Chromium is available. CI visual checks are not staging acceptance.
- [ ] Run strict OpenSpec validation and verify no contradictory active source of truth remains.

## Deferred and release

- [ ] Certify online checkout before offline Earn; separately test offline binding, replay, limits, eligibility, and recovery before enabling.
- [ ] Defer broad monolith splits, reporting expansion, fraud UI deduplication, public asset cleanup, and tracked build-info removal unless explicitly approved/needed.
- [ ] Run applicable root/web lint, typecheck, builds, tests, Semgrep, Playwright/accessibility, API/OpenSpec checks, and exact-candidate CI/security gates. Root/web Jest suites, root/web lint and typecheck, root Nest build, focused web tests, explicit Semgrep rules (0 findings), strict OpenSpec validation, targeted Prettier, and `git diff --check` passed. Root-wide `format:check` fails on existing generated `.next-*` trees and unrelated dirty files (1,799 files flagged); do not bulk-format them. Browser visual/physical-POS/provider acceptance and exact-candidate CI/security remain open.
- [ ] Run GitNexus detect-changes on exact staged scope; inspect diff and working-tree status; preserve unrelated artifacts. Current full-worktree detection (20 files/47 symbols/19 processes) is CRITICAL and includes unrelated dirty work; there is no staged exact candidate, so this does not close the release gate.
- [ ] Record owner sign-off and runtime evidence; keep pilot NO-GO until every P1 gate and rollback/support readiness are satisfied.
