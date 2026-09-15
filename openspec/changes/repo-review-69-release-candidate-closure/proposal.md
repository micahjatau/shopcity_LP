# Proposal: Close repo review 69 release-candidate gaps

## Why

`docs/repo_review_69.md` finds the current `chore/release-certification-followup` branch substantially more complete than `master`, but not yet releasable. Two reporting defects remain, and the branch must be reconciled with the release line before runtime evidence can be trusted. Certification issues #39–#42 remain open for exact-SHA staging, performance, worker/SMS, and final evidence proof.

## What changes

### Reporting correctness

- Compute business-day snapshot cutoffs at the end of the configured ShopCity timezone day, not at a UTC calendar boundary.
- Include card-replacement SMS in branch-scoped SMS reports by resolving ownership through the SMS message’s card/customer relationship when no receipt is present.
- Add regression coverage for Lagos/Africa timezone boundaries, next-day exclusion, tenant and branch scope, and replacement SMS attribution.

### Release-line reconciliation

- Reconcile `chore/release-certification-followup` with current protected `master` without merging obsolete staging-only history.
- Produce one clean candidate from the resulting master lineage and open the candidate PR through the protected workflow.
- Freeze the candidate SHA after protected CI, CodeQL, Gitleaks, Trivy, static, frontend, integration, E2E, Docker, and GitNexus checks pass.
- Classify existing Vercel projects and retire or disconnect obsolete projects only with explicit owner approval; do not alter active aliases or deployments.

### Runtime certification

- Run staging duplicate-receipt certification against the exact candidate and prove `409 RECEIPT_ALREADY_USED`, durable duplicate evidence, and no `500`.
- Run authenticated k6 report-isolation performance evidence using a valid approved fixture.
- Deploy and certify the long-lived worker at the exact candidate SHA, including readiness, deployment identity, and real or approved provider terminal-state evidence.
- Assemble the final release evidence bundle and require all verifier gates before production promotion.

## Impact

- `src/modules/reports/report-materializer.service.ts`, report service/read models, SMS scope joins, and affected unit/integration/contract tests.
- Protected branch/PR workflows, release evidence scripts and schemas, worker deployment/runtime provenance, and deployment runbooks.
- Vercel project inventory and operational certification evidence.
- No change to ledger arithmetic, append-only financial history, authorization boundaries, or SMS provider architecture.

## Acceptance criteria

1. Historical report cutoffs match the configured business timezone and exclude events after the local reporting day.
2. Branch SMS reports include receipt-linked and card-linked replacement messages exactly once while preserving tenant/branch authorization.
3. The release candidate is reachable from protected `master`, has required protected checks, and is frozen before runtime certification.
4. Issues #39–#42 have exact-SHA evidence for duplicate receipts, report performance, worker/SMS lifecycle, and final readiness verification.
5. No production promotion occurs without matching API/worker provenance and complete release evidence.

## Non-goals

- No broad feature work or redesign of the reports, ledger, cards, or SMS architecture.
- No direct merge from divergent staging into master.
- No fake or deterministic SMS provider in production.
- No deletion or rewriting of confirmed financial, audit, outbox, or SMS history.
