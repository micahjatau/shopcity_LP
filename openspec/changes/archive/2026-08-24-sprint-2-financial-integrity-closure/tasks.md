## 1. Impact Analysis And Migration Design

- [x] 1.1 Run GitNexus impact analysis before editing Prisma schema/migrations, receipt/earn transaction symbols, and public API controller/decorator symbols; record risk and blast radius in `docs/development/gitnexus-impact-tracker.md`.
- [x] 1.2 Inspect current Prisma receipt, ledger, credit-lot, approval, and idempotency models plus existing migration tests before drafting the migration.
- [x] 1.3 Draft a single financial integrity closure migration with preflight checks for non-positive receipt amounts and credit-lot/ledger mismatches.

## 2. Receipt Evidence Integrity

- [x] 2.1 Add a database constraint requiring positive receipt purchase amounts.
- [x] 2.2 Add a PostgreSQL trigger that rejects updates to receipt purchase-evidence fields after insertion.
- [x] 2.3 Keep receipt workflow metadata mutable for review status, reviewer identity, approval identity, and review/approval timestamps.
- [x] 2.4 Add integration tests proving evidence field updates fail and allowed approval/review metadata updates still succeed.
- [x] 2.5 Update `docs/database/migration-tracker.md` with the new migration and evidence status.

## 3. Credit Lot Ledger Integrity

- [x] 3.1 Add database validation requiring credit lots to match their source ledger tenant, customer, original amount, and earned timestamp.
- [x] 3.2 Require the referenced ledger entry for a credit lot to be type `EARN` and direction `CREDIT`.
- [x] 3.3 Add a PostgreSQL trigger that rejects updates to credit-lot tenant, customer, earn ledger reference, original amount, and earned timestamp.
- [x] 3.4 Preserve controlled mutability of `remainingAmountKobo` under the existing non-negative and not-greater-than-original constraints.
- [x] 3.5 Add integration tests for invalid credit-lot source inserts and immutable source-field update rejection.

## 4. Earn Transaction Concurrency

- [x] 4.1 Refactor earn transaction execution behind a bounded retry wrapper for known PostgreSQL serialization failures.
- [x] 4.2 Add small random jitter between serialization retries.
- [x] 4.3 Return a temporary concurrency domain error when serialization retries are exhausted.
- [x] 4.4 Map actual receipt uniqueness violations to the stable `RECEIPT_ALREADY_USED` code and stop using duplicate receipt codes for serialization conflicts.
- [x] 4.5 Add unit or integration coverage for serialization retry success, exhausted retry mapping, and duplicate receipt uniqueness mapping.

## 5. Public API Governance

- [x] 5.1 Create an ADR documenting the chosen response envelope/error shape and how it reconciles with the TRD.
- [x] 5.2 Define the canonical public workflows as `POST /transactions/earn`, `GET /approvals`, and `POST /approvals/{id}/decision`.
- [x] 5.3 Mark duplicate receipt-specific write and approval endpoints deprecated in OpenAPI or remove them if no compatibility need remains.
- [x] 5.4 Standardize the relevant duplicate/concurrency error codes in API documentation and OpenAPI examples.
- [x] 5.5 Regenerate and verify OpenAPI; update Orval, Bruno, or error mapping artifacts if present and affected.

## 6. Sprint 2 Release Evidence

- [x] 6.1 Run the Sprint 2 acceptance suite covering normal earn, idempotent replay, idempotency conflict, duplicate receipt race, staff exclusion, high-value approval, concurrent approvals, expired approval, inactive eligibility, ledger mutation rejection, receipt mutation rejection, lot source mutation rejection, SMS timeout, and serialization conflict behavior.
- [x] 6.2 Run full release verification: format, lint, typecheck, architecture check, unit tests, e2e tests, integration tests, migration deploy tests, OpenAPI lint/diff, app build, and worker build.
- [ ] 6.3 Record visible current-head evidence with commit SHA, workflow/run or command references, date, and artifact references in `docs/database/migration-tracker.md`.
- [x] 6.4 Reconcile the Sprint 2 issue checklist with completed items, deferred follow-ups, final migration names, CI evidence, OpenAPI artifact reference, and explicit exit-gate decision.

## 7. Final Verification

- [x] 7.1 Run `openspec validate --changes sprint-2-financial-integrity-closure`.
- [x] 7.2 Run GitNexus `detect_changes` for the completed implementation and confirm affected symbols/flows match the planned closure scope.
- [x] 7.3 Run `git status`, review staged/uncommitted changes, and ensure unrelated local work remains untouched.
