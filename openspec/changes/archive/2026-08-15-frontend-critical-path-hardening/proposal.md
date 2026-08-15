## Why

Repo review 50 shows the frontend now has a real application foundation, but it is still not release-safe. The most urgent blockers are financial input correctness, missing auth/RBAC enforcement, fixture-only "critical" tests, silent offline persistence failures, and the absence of immutable frontend CI evidence. Several UI surfaces also still present placeholders as if they were operationally authoritative.

Without a hardening change, the web app can still mis-handle Nigerian money input, expose role screens without proper session boundaries, give false confidence through static test fixtures, and report offline success without durable local storage.

## What Changes

- Fix money entry and display rules so `MoneyInput` uses an explicit Nigerian currency grammar, rejects ambiguous separators and excess precision, and never silently converts a `1,234` style entry into a decimal amount.
- Introduce a protected application shell with authenticated session gating, branch/role context, and clear cashier/supervisor/admin boundaries before any operational route renders.
- Replace fixture-only "critical flow" coverage with true backend-connected or contract-faithful E2E for the financial core, starting with Earn and then Redeem.
- Extend the same evidence approach to supervisor/admin flows, including approvals, fraud review, reports, audit surfaces and operational summary views.
- Make offline persistence trustworthy by surfacing storage failures instead of swallowing them, and by only claiming "saved offline" after local durability is confirmed.
- Add frontend CI gates for lint, typecheck, unit tests, accessibility, critical Playwright, visual regression, build and token/API drift.
- Complete the accessibility pass for the current component set, including contrast coverage and combobox semantics, before broad reuse.
- Fill out the approved shared component surface needed by the real workflows, including dialogs, sheets, popovers, dropdowns, tabs, accordions, badges, progress, skeletons, alerts, tables, pagination and toast patterns.
- Keep placeholder dashboards and role pages visible only as shells until they are backed by real session, branch and workflow data.

## Out of Scope

- Rewriting the backend financial authority or changing ledger semantics.
- Introducing GraphQL, microservices or a second source of truth for money and approval rules.
- Building the full Supervisor/Admin product surface in one change.
- Replacing the approved design-system baseline with a different frontend stack.
- Shipping partial dark mode or a broad visual redesign unrelated to the blocker set.
- Treating `/testing/critical-flows` as business-flow E2E once real integration tests exist; that route can remain as a deterministic fixture harness.

## Capabilities

### New Capabilities

- `money-input-grammar`: deterministic Nigerian currency parsing, validation and display that rejects ambiguous or malformed money input.
- `session-gated-shells`: authenticated, branch-aware frontend shells that prevent unauthorised workflow access.
- `earn-vertical-slice`: one real backend-connected Earn flow that proves API, money, idempotency and confirmation states end to end.
- `workflow-coverage-expansion`: Supervisor/Admin workflows for approvals, fraud, reports, audit and operational summary become contract-backed rather than fixture-only.
- `durable-offline-persistence`: offline saves only succeed when browser storage has actually committed, and failures are surfaced explicitly.
- `frontend-release-evidence`: frontend CI, accessibility, Playwright and visual-regression checks are mandatory release evidence.
- `accessible-component-hardening`: interactive primitives and shared components must satisfy keyboard, focus, contrast and combobox semantics before reuse.
- `shared-component-surface`: the approved interactive primitives and workflow support components needed by the full frontend scope are implemented rather than left as placeholders.

### Modified Capabilities

- `frontend-foundation`: the `apps/web` foundation is kept, but it now becomes a protected application shell rather than a loose collection of pages.
- `frontend-workflows-shells`: cashier, supervisor and admin shells must be session-aware and contract-backed instead of placeholder-driven.
- `frontend-contract-integration`: the generated OpenAPI client must be exercised by real flows, not only imported.
- `frontend-quality-governance`: release gates now include durable evidence for money, auth, offline correctness and workflow coverage, not just static component checks.

## Impact

Proposal-time GitNexus analysis was attempted for `MoneyInput`, `SessionBootstrap`, and `AppShell` using `npm run proposal:impact -- --file ...`. Each lookup returned `Target not found`, which is consistent with a new-surface or stale-index gap rather than a known indexed blast radius.

Risk classification for this change:

- `apps/web` shell and workflow routing: NEW SURFACE / MEDIUM risk because it governs auth boundaries and route visibility.
- `MoneyInput` parsing and formatting: HIGH risk because it affects financial correctness and user-visible amounts.
- Shared component surface: MEDIUM risk because it broadens the reusable UI API and can introduce accessibility regressions if done piecemeal.
- Offline persistence APIs: MEDIUM risk because they control whether saved transactions are truly durable.
- Frontend CI and release evidence: MEDIUM risk because they raise the quality bar and may fail existing ad hoc workflows until the gates are repaired.

If later implementation needs to edit any backend symbol, run fresh symbol-level GitNexus impact analysis before changing code and record the findings in `docs/development/gitnexus-impact-tracker.md`.

## Rollout / Verification

- Land the money parser fix and unit tests first, including comma-separated Nigerian input, decimal precision limits and signed display cases.
- Add the authenticated shell boundary next so navigation and workflow entry points are protected before deeper screen work lands.
- Build one real Earn vertical slice against the backend contract, then extend the same pattern to Redeem and the supervisor/admin workflow set.
- Convert offline persistence helpers to return success/failure explicitly and add regression tests for quota/write failure paths.
- Keep `/testing/critical-flows` as a fixture harness, but add genuine backend-connected Playwright coverage for the same business outcomes.
- Re-enable browser-level accessibility evidence for contrast and interactive semantics, and keep shared components in Storybook-ready shape.
- Add the remaining shared primitives and workflow support components needed by the product shell before declaring the frontend broadly reusable.
- Add frontend CI that runs on every change and produces immutable evidence for lint, typecheck, test, build, a11y, critical flows and visual regression.

## Open Questions

1. Should the first real vertical slice be Earn-first or Login/session-first?
2. Do we create shared packages (`packages/ui`, `packages/api-client`, `packages/design-tokens`) now, or keep the initial hardening within `apps/web`?
3. Which tool should own visual regression for the first certified baseline: Playwright screenshots, Storybook snapshots, or a dedicated service?
4. Should the Supervisor/Admin workflow expansion land in the same change, or as a follow-up after the Earn/Redeem path is stable?
