# Proposal: Reviews 58–60 release-gap closure

## Why

`docs/repo_review_58.md` through `docs/repo_review_60.md` rate the repository suitable for controlled pilot validation, but not formally releasable. The remaining work is one financial-display correctness defect in cashier activity, two bounded cashier usability/contract improvements, and incomplete production certification evidence. This existing change is expanded rather than duplicated because its unresolved release-certification scope already owns every Review 60 gap. It closes those gaps without reopening the settled ledger, auth, offline, device, or frontend-shell architecture.

## What changes

### Cashier workflow

- Add a real, focused card-scan/card-number input directly to `/cashier`; retain `/cashier/lookup`, `/cashier/earn`, `/cashier/redeem`, and `/cashier/sync` as deep-linkable workflow routes.
- Resolve the card through the existing authoritative lookup contract and render the verified customer context on the overview.
- Carry verified card context into Earn and Redeem without trusting frontend-submitted balance, role, status, or eligibility.
- Replace the placeholder recent-activity panel with a bounded backend-backed “today’s transactions” projection (5–10 rows, scoped to the authenticated branch/tenant and current business day), including time, receipt/reference, operation, amount, and outcome.
- Add loading, empty, offline, authorization, and lookup-error states with accessible focus management and mobile layout coverage.
- Replace the overloaded activity `amountKobo` field with operation-specific integer-kobo fields. Earn rows MUST expose only an authoritative loyalty-credit amount when known; they MUST NOT fall back to receipt purchase amount. When no authoritative pending Earn credit projection exists, the API and UI MUST state that calculation is pending rather than show a monetary amount.
- Render Earn and Redeem with unambiguous semantic direction (`+` / `−`) or equally explicit labels.
- Consume the generated OpenAPI reporting client for cashier activity, regenerate it from the revised contract, and remove handwritten activity response parsing.

### Release and deployment evidence

- Add an immutable candidate evidence bundle containing candidate SHA, workflow head SHA, successful required-check conclusions, deployment artifact SHA, environment, timestamp, and verifier version.
- Record exact-head protected-branch settings and prove that the required `ci` context is valid at merge time rather than a stale or unmatched check name.
- Record Frankfurt frontend/backend/database topology and explicitly decide whether the duplicate `shopcity` Vercel project is intentional, legacy, or must be removed; do not delete it automatically.
- Refresh stale release/topology documentation and reconcile OpenSpec task status with actual implementation and evidence.
- Run final GitNexus `detect_changes()` and preserve the final diff, residual-risk review, and evidence review.

### Authenticated business benchmarks

- Execute reproducible authenticated production or release-candidate measurements for card lookup, confirmed Earn, pending-approval Earn, confirmed Redeem, and supervisor dashboard/report workflows.
- Measure real frontend navigation/RSC and frontend-proxy behavior, not only health checks, unauthenticated rejection, or repeated page loads.
- Record at least P50 and P90 for every path, exact deployed SHA, environment/topology, authentication/device setup, sample size, outcome against TRD thresholds, and raw result artifacts.
- Validate targets of lookup <2 seconds, Earn confirmation <3 seconds, Redeem confirmation <3 seconds, and dashboard summary <5 seconds.

### Pilot and recovery evidence

- Provision or migrate actual pilot POS devices, verify branch binding, activation, attestation, revocation, and session behavior, and retain safe evidence without exposing secrets.
- Verify migration and backup/restore evidence for any schema or operational changes, update `docs/database/migration-tracker.md`, and retain restore-drill output.
- Execute the authenticated benchmark using the provisioned pilot setup.
- Open or update the protected-master PR only after candidate, security, benchmark, recovery, deployment, and diff evidence are complete.

## Capabilities

### New capabilities

- `cashier-overview-checkout-entry`: On-dashboard scanner/search and verified customer context.
- `cashier-today-transaction-summary`: Bounded authenticated same-day activity projection with operation-specific amounts and pending-calculation representation.
- `authenticated-checkout-benchmark-evidence`: Exact-SHA business-path performance evidence.
- `release-candidate-provenance`: Immutable candidate, workflow, deployment, branch, topology, and security evidence.
- `pilot-device-and-recovery-certification`: Pilot device and backup/restore proof required for certification.

### Modified capabilities

- `frontend-shell-routing`: `/cashier` becomes genuinely scanner-first while preserving route separation and deep links.
- `frontend-release-evidence`: Certification requires exact-head security, topology, protected-branch, benchmark, migration/restore, and final-diff evidence.
- `workflow-coverage-expansion`: Add authenticated browser coverage for the overview lookup-to-action flow and today-activity states.

## Impact

- Frontend: `apps/web/app/(shell)/cashier/page.tsx`, cashier workflow components, API hooks, styles, Playwright/a11y/visual coverage.
- Backend: existing scoped transaction/activity read contracts and additive controller/service DTO needed for operation-specific activity amounts; no changes to ledger authority, calculation authority, or confirmed financial history.
- Release tooling: `.github/workflows/`, `scripts/release-evidence/`, benchmark harnesses, evidence schemas, and release runbooks.
- Operations: protected GitHub branch settings, Vercel project/deployment topology, pilot POS devices, production/staging credentials, database backup/restore evidence.
- Documentation: `docs/database/migration-tracker.md`, topology/release evidence, OpenSpec artifacts, and final review record.

## Non-goals

- No GraphQL, microservices, ledger rewrite, balance authority change, or frontend-authoritative approvals.
- No automatic deletion of any Vercel project.
- No release certification based solely on `/health/live`, unauthenticated `/auth/me`, or synthetic page-load probes.
- No persistence of raw device attestation secrets in browser storage or evidence artifacts.
