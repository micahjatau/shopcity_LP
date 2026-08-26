## Why

The latest repository review confirms that ShopCity's core ledger and deployment topology are strong, but pilot certification remains blocked by cashier workflow mismatches, weak idle-session enforcement, incomplete POS provisioning, and unreliable release evidence. This change closes the bounded correctness and release-governance gaps identified in `docs/repo_review_57.md` without reopening the completed frontend architecture work.

## What Changes

- Restore a scanner/search-first quick lookup surface on `/cashier` while preserving dedicated Earn, Redeem, and lookup routes.
- Extend the cashier lookup contract and UI with masked phone, staff/earning eligibility, card status, and actionable eligibility reasons.
- Require a valid receipt number and positive purchase amount before Earn submission; align the advisory calculation with the backend ceiling rule.
- Map domain error codes to actionable cashier messages for duplicate receipts, inactive/staff cards, insufficient balance, approval, and offline/network states.
- Enforce server-side inactivity expiration based on role, while retaining an absolute session lifetime.
- Replace manual cashier entry of device attestation secrets with an administrable POS provisioning and session-gating workflow; do not persist raw secrets in the browser.
- Make Cashier customer views use role-safe masked phone projections rather than full phone numbers.
- Strengthen release certification so evidence is tied to the exact immutable commit, successful workflow conclusions, and deployment artifacts.
- Make authenticated session branch context authoritative for operational configuration instead of relying on default public tenant/branch settings.
- Add bounded server-side/HTTP caching for public branch configuration after branch scoping is authoritative.
- Decide and document the TRD scope for idempotency on retry-sensitive state-changing mutations, then enforce the selected policy consistently.
- Add a strict frontend Content Security Policy and update the production security-header verification.
- Document the Frankfurt deployment topology, resolve whether the duplicate `shopcity` Vercel project is intentional, and refresh stale release/topology evidence.
- Replace infrastructure-only performance probes with an authenticated production benchmark for lookup, Earn, Redeem, and supervisor reporting; correct the harness to measure real client navigation/RSC behavior.
- Document and verify required protected-branch gates; operational configuration and production measurements are included as release tasks, not runtime product behavior.

## Capabilities

### New Capabilities

- `cashier-trd-compliance`: Scanner-first checkout launch, complete post-scan verification, required Earn inputs, exact advisory calculation, and actionable cashier error handling.
- `session-inactivity-enforcement`: Role-aware server-side idle-session expiry and rejection/revocation behavior.
- `pos-device-provisioning`: Admin-controlled POS enrollment and secure device/session binding without cashier-managed attestation secrets.
- `branch-aware-configuration`: Authenticated branch authority and bounded public-configuration caching.
- `mutation-idempotency-policy`: Explicit, consistently enforced idempotency coverage for retry-sensitive mutations.
- `frontend-security-headers`: Strict frontend CSP and release verification for browser security headers.
- `checkout-performance-certification`: Authenticated business-path latency evidence and realistic frontend performance measurement.

### Modified Capabilities

- `frontend-shell-routing`: Extend the compact cashier launcher with an immediate card scan/search action while retaining dedicated workflow routes.
- `cashier-data-minimization`: Require masked, role-safe customer phone projections in all cashier customer views.
- `frontend-release-evidence`: Require exact-head workflow and deployment provenance plus successful check conclusions for release certification, including topology, duplicate-project, protected-branch, and checkout-benchmark evidence.

## Impact

- Frontend cashier routes and workflow components under `apps/web/app/(shell)/cashier/**` and `apps/web/components/workflows/**`.
- Card lookup, customer projection, loyalty/Earn error contracts, and generated API/OpenAPI artifacts under `src/modules/**` and `apps/web/**`.
- Authentication/session/device modules, persistence schema or migrations if provisioning requires them, and related tests.
- Release-verification scripts, CI workflows, deployment evidence, and documentation under `.github/`, `scripts/`, and `docs/`.
- Protected-branch settings and authenticated production checkout benchmarks must be verified outside the repository where applicable.
