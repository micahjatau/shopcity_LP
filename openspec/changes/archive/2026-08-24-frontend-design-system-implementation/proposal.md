## Why

ShopCity now has an approved frontend design-system baseline in `docs/frontend/design-system/`, but `apps/web` does not yet contain the product frontend that will operationalize it. The backend already exposes the authority for sessions, customers, cards, earn/redeem, approvals, fraud/review, reports, offline sync and pilot operations through generated OpenAPI contracts. The next frontend change must turn the design-system documents into a governed, accessible, contract-backed application foundation rather than a collection of one-off screens.

Without this change, frontend implementation risks drifting into a generic admin dashboard, duplicating backend financial rules, using brand red ambiguously for operational states, and missing the accessibility/offline/audit guarantees required for cashier, supervisor and admin workflows.

## What Changes

- Establish the `apps/web` frontend foundation and route structure for cashier, supervisor and admin shells.
- Generate and consume ShopCity semantic tokens from `docs/frontend/design-system/tokens.json` for CSS/Tailwind-ready styling.
- Build owned accessible primitives, ShopCity product components, workflow components and role shells from the design-system component layers.
- Integrate the generated OpenAPI client through a small frontend API adapter instead of hand-maintained response types.
- Implement core screens and states for login/session, lookup, earn, redeem, approvals, fraud/review, offline sync, reports, operations and audit surfaces.
- Add Storybook, component tests, accessibility checks, Playwright critical flows, visual regression and token/API drift checks as release gates.

## Out of Scope

- Changing backend financial authority, append-only ledger rules, approval policy, redemption rules or offline-sync semantics unless a documented contract gap is approved separately.
- Introducing GraphQL, microservices or a second frontend-maintained source of financial truth.
- Building an incomplete dark mode for POS/admin v1.
- Replacing generated OpenAPI client types with hand-written frontend DTOs.
- Treating ShopCity brand red as the default work-surface background or as the only danger/error signal.
- Customer self-service, native mobile apps, POS hardware integration beyond scanner/print-ready UX conventions, or unsupported offline redemption.

## Capabilities

### New Capabilities

- `frontend-foundation`: a token-driven `apps/web` foundation with ShopCity brand assets, semantic styling, routes and reusable component boundaries.
- `frontend-accessibility-interaction`: WCAG 2.2 AA interaction behavior for keyboard, touch, scanner, focus, validation, dialogs, async states and offline/sync indicators.
- `frontend-workflows-shells`: role-shaped cashier, supervisor and admin shells with contract-backed earn, redeem, approval, fraud, offline, report, operations and audit workflows.
- `frontend-contract-integration`: generated OpenAPI client consumption through a centralized API adapter, domain error dictionary, idempotency handling and cache policy.
- `frontend-quality-governance`: Storybook, visual regression, accessibility, E2E, token drift, API drift and frontend release quality gates.

### Modified Capabilities

- `production-entrypoint-verification`: future release certification must account for the frontend build artifact once `apps/web` becomes part of the deployable product.
- `financial-workflow-contracts`: frontend confirmations and transaction views must present generated backend states without inventing financial semantics.
- `pilot-operations-summary`: admin operations UI must faithfully reflect the backend summary and reconciliation/staleness state.

## Impact

Proposal-time GitNexus analysis was attempted for `docs/frontend/design-system/README.md` and the planned frontend design-system target. No concrete indexed application symbol was emitted for this documentation-only/new-frontend surface. This is expected because `apps/web` currently contains only `public/brand/.gitkeep` and does not yet expose indexed frontend symbols.

Risk classification for this proposal:

- `apps/web` foundation: NEW SURFACE / MEDIUM risk because it establishes frontend architecture, scripts and quality gates.
- `docs/frontend/design-system/tokens.json`: MEDIUM risk because token generation becomes the source for brand, accessibility and component styling.
- `docs/api/openapi.json` and generated client flow: MEDIUM risk because frontend behavior must track backend contracts without drift.
- Existing backend symbols: not directly modified by this proposal. Any later backend/API gap fix must run symbol-level GitNexus impact analysis before edits and record results in `docs/development/gitnexus-impact-tracker.md`.

No HIGH or CRITICAL indexed findings were returned for the proposal-time frontend planning target, but backend financial/API surfaces remain high-integrity if later changes are needed.

## Rollout / Verification

- Validate OpenSpec artifacts with `npm run openspec:validate` before implementation starts and after planning edits.
- Generate token outputs from `tokens.json` and fail CI on uncommitted token drift.
- Export/lint/diff OpenAPI and regenerate the frontend client before contract-backed UI work is accepted.
- Add Storybook states for primitives, ShopCity product components and workflow components.
- Add automated accessibility checks for shared components and critical routes, plus keyboard-only workflow coverage.
- Add Playwright critical flows for login, lookup, earn confirmed, earn awaiting approval, duplicate receipt, redeem confirmed, insufficient balance/cap, approval decision, offline sync outcomes, fraud review, CSV/report freshness and session/device revocation.
- Add visual-regression baselines for buttons/inputs, status badges, transaction confirmation, approval decision, offline queue, consequential dialogs, data table, report workspace and role shells.
- Add production build/typecheck/lint/test gates once frontend scripts are introduced.

## Open Questions

1. Should `packages/ui`, `packages/design-tokens` and `packages/api-client` be created immediately, or should the first implementation keep these boundaries under `apps/web` until the frontend stabilizes?
2. Which visual-regression service/tool should be the first accepted baseline for component and workflow screenshots?
3. Is the first implementation branch strictly `frontend-development`, or should a separate integration branch be created before merging frontend build/deploy concerns into the backend repository?
