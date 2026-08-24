## Context

`docs/repo_review_57.md` identifies bounded pilot blockers rather than a new architecture problem. The existing cashier route split, backend-authoritative ledger, offline replay, and Frankfurt deployment topology are retained. The change crosses frontend workflows, role-safe read models, sessions/devices, configuration, CI/release evidence, and production measurement.

The implementation must preserve append-only financial history, backend authority over balances and eligibility, branch/device ownership, idempotent offline replay, and existing deep links. Existing uncommitted repository changes are unrelated working state and must be preserved.

## Goals / Non-Goals

**Goals:**

- Make the cashier home scanner-first while retaining dedicated workflow routes.
- Expose complete but minimized post-scan verification and actionable Earn outcomes.
- Enforce role-aware idle expiration and mature POS enrollment.
- Make branch configuration, idempotency policy, CSP, and release evidence explicit and testable.
- Produce authenticated business-path performance evidence tied to an immutable release candidate.

**Non-Goals:**

- No replacement of the ledger, redemption, approval, or offline financial architecture.
- No GraphQL, microservices, or multi-branch product expansion beyond authoritative branch scoping.
- No automatic deletion of the duplicate Vercel project; ownership must be decided and documented first.
- No frontend-only session timeout or client-authoritative balance/eligibility logic.

## Decisions

### 1. Preserve route separation and add a quick lookup entry point

Keep `/cashier`, `/cashier/lookup`, `/cashier/earn`, `/cashier/redeem`, and `/cashier/sync`. Add the scan/search action to the overview and pass verified card context into dedicated routes. Do not embed transaction forms in the overview.

### 2. Use role-safe backend projections

Return masked phone and explicit eligibility fields from the cashier lookup/customer DTO. The backend remains responsible for staff exclusion, card state, balance, and eligibility reasons; the UI only renders the projection.

### 3. Enforce inactivity at session resolution

Store configurable idle windows by role and reject/revoke sessions whose `lastUsedAt` exceeds the role window. Use a 30-minute cashier window and a 15-minute supervisor/admin window by default, with server-side environment configuration and tests. Keep absolute expiry as a second bound. Frontend timers may communicate status but cannot enforce access.

### 4. Provision devices administratively

Introduce an admin-controlled enrollment flow that binds an active device to a branch and produces the attestation material required by the backend without exposing or persisting raw secrets in cashier browser storage. Existing manually provisioned devices remain valid during a staged migration; new devices must use enrollment, and administrators can revoke or rotate legacy credentials before pilot certification.

### 5. Make configuration authority explicit

Authenticated operational configuration resolves tenant/branch from session context. Public configuration remains limited and cacheable with bounded freshness/stale behavior; it must never override authenticated scope.

### 6. Prefer scoped idempotency over pretending every mutation is financial

Document the selected TRD interpretation: all financial, approval, reversal, adjustment, card-lifecycle, and other retry-sensitive mutations require idempotency; low-risk metadata edits do not. Enforce and test the policy at shared mutation boundaries.

### 7. Make release evidence immutable and business-path based

The verifier must independently match candidate SHA, workflow head SHA, successful conclusions, and deployment artifact SHA. Release evidence must include protected-branch status, topology/project decisions, and authenticated lookup/Earn/Redeem/report benchmarks measured through real client navigation rather than repeated page loads.

### 8. Apply CSP through the frontend deployment boundary

Add a strict, environment-aware Next.js security-header policy with documented exceptions only where required by the application. Verify headers in browser/deployment checks without weakening backend Helmet.

## Risks / Trade-offs

- [DTO changes break generated clients] → Regenerate OpenAPI/Orval artifacts and add contract tests.
- [Idle expiry disrupts active cashiers] → Use role-specific configuration, visible warning state, and preserve absolute expiry separately.
- [Provisioning migration strands existing POS devices] → Support an explicit enrollment transition and fail closed when attestation is absent.
- [Public cache serves stale policy] → Bound freshness/stale windows and never use public config as authenticated authorization input.
- [Idempotency rollout changes retry behavior] → Additive migration, endpoint inventory, and replay/conflict tests before enforcement.
- [CSP blocks required assets] → Begin with report-only validation where supported, inventory violations, then enforce with focused browser checks.
- [Performance evidence is not reproducible] → Pin candidate SHA, record environment and authentication setup, and retain raw benchmark artifacts.

## Migration Plan

1. Add delta specs and implementation tasks; inventory affected endpoints, session roles, devices, and release evidence.
2. Implement DTO/UI and session behavior behind compatible contracts; regenerate API artifacts.
3. Add additive provisioning/config/idempotency schema changes if required, with migration and rollback evidence.
4. Deploy CSP and release-verifier changes, then run unit, integration, frontend, and security-header checks.
5. Provision or migrate pilot POS devices and verify protected branch settings.
6. Run authenticated production business-path benchmarks and publish exact-head release evidence.
7. Roll back UI/header changes independently if needed; do not roll back applied financial or audit migrations—use expand-and-contract follow-up migrations.

## Open Questions

- Warning UX before the 30-minute cashier or 15-minute supervisor/admin idle cutoff.
- Whether the existing device attestation model can support enrollment without a new secret schema.
- Final idempotency endpoint inventory and retention period.
- Whether `shopcity` is intentionally retained as a third Vercel project.
- Production benchmark credentials, safe test data, and report endpoint fixture strategy.
