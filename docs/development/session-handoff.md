# ShopCity LP Session Handoff

Updated: 2026-10-09

## Repository state

- Repository: `shopcity_LP`
- Branch: `workflow-states-implementation`
- Main work commit: `f412879` — `feat: complete Supervisor and local POS workflows`
- Previous overview commit: `47d4d72`
- The main worktree is committed. Machine-generated `micah/BrowserMetrics/*.pma` files remain local and are ignored; do not add them to a commit.
- No production or remote configuration was changed.

## Completed work

- Supervisor overview uses live, branch-scoped reporting and paginated/searchable approvals.
- Supervisor transactions load the first bounded branch page by default; receipt number is optional, and server-side status, staff, and minimum-amount filters precede cursor pagination. Ordering is newest effective time, then ledger-entry ID. Detail and reversal safeguards remain intact.
- The duplicate branch-scope sentence was removed from the transaction page. Desktop and mobile shell footers now say “Powered by Radar Solutions.”
- Login role guidance and login-background loading were updated.
- Added a default-off local cashier test-session path. It requires development mode, a loopback database, deterministic SMS, and no Vercel environment; optional Tailscale access requires one exact HTTPS origin. The API binds to loopback when enabled. It does not change production login or device qualification.
- OpenAPI/client and migration-tracker artifacts were updated. The receipt-number query is optional in the OpenAPI integration contract.

## Local runtime and safety

- `shopcity-next.service` serves the local frontend on `127.0.0.1:6767`; the backend is on `127.0.0.1:3000`. The Tailscale Serve frontend uses port `8444`.
- Two pending migrations were applied to the local database only after backup to `/tmp/shopcity-signin-pre-migration-20261008.dump`; status is recorded in `docs/database/migration-tracker.md`.
- POS pairing remains unresolved: the latest enrollment completion returned `DEVICE_ENROLLMENT_INVALID`; the device is still `ACTIVE` / `UNPAIRED` with no credentials. The authenticator type (external security key vs platform authenticator) is not yet clarified. Do not relax attestation or authenticator policy before that decision.
- The WebAuthn OpenSpec remains in progress for real-device assurance/production qualification and Preview configuration.

## Verification

- Backend unit tests: 63 suites, 443 tests passed.
- Web unit tests: 27 suites, 202 tests passed.
- Integration suite: 33 passed, 1 skipped; 157 tests passed, 2 skipped. The OpenAPI receipt-search integration assertion was corrected and the full suite rerun successfully.
- Root/web lint and typechecks, client typecheck, backend and isolated web builds, OpenAPI lint, Semgrep (0 findings), OpenSpec validation, and `npm run format:check` passed.
- Playwright Supervisor route sweep and transaction reversal flow passed against the existing local frontend; local cashier test-session flow passed with its development flag enabled.
- GitNexus pre-commit detection reported critical aggregate blast radius (auth/session changes across 29 flows); the affected auth/session paths have focused tests and integration coverage.

## Playwright local-dev note

The standalone Playwright dev server on `:3100` can conflict with the already-running Next dev server because both use `apps/web/.next`. The verified local workaround is to reuse `:6767`:

```bash
cd apps/web
PLAYWRIGHT_BASE_URL=http://127.0.0.1:6767 \
PLAYWRIGHT_REUSE_EXISTING_SERVER=true \
npx playwright test --config ./playwright.config.ts tests/workflow-routes.spec.ts \
  -g 'verifies copy hierarchy, Cashier header typography'
```

The user decided this standalone-server issue is not necessary to pursue now.

## Active specifications

- `shell-footer-branding`: complete.
- `supervisor-transaction-receipt-search-dialog`: complete after lint verification.
- `browser-pos-webauthn-attestation`: still in progress; hardware assurance and production qualification remain gated.
