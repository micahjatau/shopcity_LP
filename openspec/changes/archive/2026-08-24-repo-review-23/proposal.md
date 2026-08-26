## Why

Repo review 23 found that Sprint 3 redemption, approval, ledger, SMS, and API work is directionally sound but not yet production-truthful across runtime behavior, database constraints, tests, and contracts. This change creates a Sprint 3A hardening pass so current financial workflows can be made trustworthy before new reversal or adjustment development resumes.

## What Changes

- Reconcile Sprint 3 task trackers with verified runtime, database, migration, API, and release evidence.
- Harden redemption request validation so invalid high-value requests fail before receipt, redemption, approval, ledger, allocation, outbox, SMS, audit, or idempotency completion records are created.
- Enforce online-only redemption semantics with stale/future timestamp rejection and stable domain errors.
- Normalize redemption unique-conflict outcomes, including idempotency, duplicate receipt, and approval target conflicts.
- Add database state constraints and commit-time evidence checks for redemptions, approvals, ledger entries, restoration evidence, and immutable redemption evidence.
- Reuse one redemption policy engine for request capture and approval execution.
- Add explicit approval and redemption locking, automatic approval expiry, and deterministic concurrent approval loser outcomes.
- Implement typed SMS template rendering and validation for confirmed redemptions, with consistent transaction ownership references.
- Replace earn-shaped transaction reads with discriminated financial transaction and customer ledger responses.
- Make OpenAPI truthful for redemption 201/202 responses, documented domain errors, and unavailable reversal behavior.
- Add deterministic clocks, HTTP coverage, stronger database integration assertions, coverage thresholds, and current-head release evidence.
- Defer real reversal execution and manual adjustment expansion until the hardening exit gates pass.

## Capabilities

### New Capabilities

- `sprint-3a-hardening`: Coordinates the repo-review-23 hardening pass and defines the exit gates that must pass before Sprint 3 feature development resumes.

### Modified Capabilities

- `financial-workflow-contracts`: Redemption, approval, ledger, transaction read, customer ledger, OpenAPI, and reversal-boundary requirements become stricter and more truthful.
- `sms-delivery-truthfulness`: SMS rendering and ownership requirements expand to include redemption-confirmed notifications and template payload validation.
- `migration-safety`: Migration evidence and database invariant requirements expand to include Sprint 3A financial state constraints and commit-time evidence checks.

## Impact

- Affects `src/modules/redemptions`, `src/modules/approvals`, `src/modules/loyalty`, financial read models, OpenAPI decorators, SMS/outbox workers, shared transaction helpers, Prisma schema/migrations, and financial tests.
- Requires forward-only database migrations and updates to `docs/database/migration-tracker.md` for schema changes and verification evidence.
- Requires expanded unit, HTTP, e2e, integration, OpenAPI, generated-client, Bruno, and coverage validation before declaring Sprint 3 complete.
- Keeps the backend API-first modular monolith shape and preserves append-only financial history; no GraphQL, microservices, or frontend-trusted balances/roles/approvals are introduced.
