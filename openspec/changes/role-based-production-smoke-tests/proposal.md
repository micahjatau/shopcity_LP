## Why

ShopCity currently has role-aware frontend workflows and an existing Playwright test foundation, but it does not yet have one deterministic, release-oriented smoke subsystem that proves the deployed Cashier, Supervisor, and Admin journeys work end to end. The existing regression suites are not sufficient as a fast release gate because they do not consistently combine real browser interaction, authenticated API fixture preparation, durable financial assertions, reconciliation, production isolation, and release evidence.

This change turns the approved role-based production smoke-test design into an implementable, auditable subsystem. It is intentionally narrower than exhaustive regression coverage and is designed to run automatically against staging release candidates and manually, with approval, against an isolated production smoke tenant.

## What Changes

- Add a smoke-only Playwright configuration and validated staging/production environment configuration.
- Add deterministic fixture preflight, baseline capture, mutable-state reset, and fail-closed behavior.
- Add a CSRF-aware authenticated API helper for setup, post-condition verification, and reconciliation.
- Add UI authentication helpers for dedicated Cashier, Supervisor, and Admin credentials.
- Add secret-free evidence, timing, outcome classification, and artifact verification.
- Add Cashier, Supervisor, and Admin role smoke suites covering the release-critical workflows in the design.
- Add cross-role Earn approval, Redeem, and reversal scenarios.
- Add critical RBAC and business-rule guardrails.
- Add staging Offline Earn coverage and explicitly policy-controlled production Offline Earn coverage.
- Add canonical financial reconciliation, mutable fixture restoration, post-run invariants, and cleanup-failure semantics.
- Add automatic staging and approval-gated, single-concurrency production GitHub Actions workflows.
- Add an operator runbook covering one-time provisioning, execution, evidence privacy, and `FAIL_RECONCILIATION` recovery.

## Non-Goals

- Building smoke-only backend bypass endpoints, database backdoors, or test-only authorization paths.
- Replacing unit, integration, accessibility, security, performance, or full E2E regression suites.
- Exhaustively testing every validation permutation, report filter, browser/device combination, or fraud-rule matrix.
- Using ordinary ShopCity operational tenants, customers, branches, cards, or devices for production smoke.
- Deleting immutable ledger, transaction, or audit history during cleanup.
- Intentionally degrading shared Redis, Supabase/Postgres, or Vercel infrastructure.

## Source Documents

- Design: `docs/superpowers/specs/2026-08-26-role-based-production-smoke-test-design.md`
- Implementation plan: `docs/superpowers/plans/2026-08-26-role-based-production-smoke-test-implementation.md`
- Product and architecture baseline: `docs/TRD.md`

## Capabilities

### New Capabilities

- `role-based-production-smoke-tests`: a release smoke subsystem for deterministic browser/API workflow certification, evidence, and reconciliation.

### Modified Capabilities

- `frontend-release-evidence`: release evidence can consume exact-candidate-SHA smoke results.
- `workflow-coverage-expansion`: role-based browser coverage expands across Cashier, Supervisor, Admin, cross-role, guardrail, and offline paths.

## Impact

Expected implementation surface:

- `apps/web/playwright.smoke.config.ts`
- `apps/web/tests/smoke/**`
- `apps/web/package.json` and root `package.json`
- `scripts/smoke/**`
- `.github/workflows/staging-smoke.yml`
- `.github/workflows/production-smoke.yml`
- `docs/runbooks/smoke-testing.md`
- optionally `README.md` and the existing release-certification workflow

No production application controller, Prisma migration, ledger schema change, or smoke-only API route is authorized by this proposal.
