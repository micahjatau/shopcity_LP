## 1. Proposal Safety And Baseline

- [x] 1.1 Review `docs/repo_review_19.md`, this change's proposal/design/specs, and the prior Sprint 2 financial integrity closure artifacts for scope boundaries.
- [x] 1.2 Before editing implementation symbols, run GitNexus impact analysis for each touched function/class/method and warn before proceeding if any result is HIGH or CRITICAL.
- [x] 1.3 Confirm the current credit-lot migration state and identify the next Prisma migration name for the lifecycle closure.

## 2. Credit-Lot Lifecycle Migration

- [x] 2.1 Add a Prisma migration that preflights existing `CreditLot` rows for expiry parity with the twelve-month UTC month-clamp rule.
- [x] 2.2 Add or replace database trigger logic that rejects credit-lot inserts/updates when `expiresAt` is not derived from `earnedAt`.
- [x] 2.3 Extend credit-lot immutability protection so updates to `expiresAt` are rejected.
- [x] 2.4 Temporarily reject direct updates to `remainingAmountKobo` until Sprint 3 introduces controlled debit/allocation workflows.
- [x] 2.5 Add a `BEFORE DELETE` trigger that prevents deleting `CreditLot` rows.
- [x] 2.6 Update `docs/database/migration-tracker.md` with the new migration, backup/restore status, and verification evidence status.

## 3. Credit-Lot Lifecycle Tests

- [x] 3.1 Add integration coverage proving valid derived expiry is accepted, including normal, month-end, and leap-day cases.
- [x] 3.2 Add integration coverage proving invalid `expiresAt` inserts or updates are rejected.
- [x] 3.3 Change the current direct `remainingAmountKobo` update test so it expects rejection and unchanged persisted values.
- [x] 3.4 Add integration coverage proving credit-lot deletion is rejected.
- [x] 3.5 Run the affected integration spec with `npx jest test/immutable-earn-ledger.int-spec.ts --runInBand` or the repo-appropriate equivalent.

## 4. Earn Retry Classification

- [x] 4.1 Narrow `isTransactionConflict` in the loyalty earn path to classify only Prisma `P2034` as retryable.
- [x] 4.2 Narrow the receipt-service transaction conflict classifier consistently, or remove duplicate broad classification if it is no longer needed.
- [x] 4.3 Update unit tests to prove `P2034` is retried and `P2028`, `P2031`, and generic transaction-message errors are not retried.
- [x] 4.4 Verify exhausted approved conflicts still return `EARN_TRANSACTION_CONFLICT` and actual receipt uniqueness violations still return `RECEIPT_ALREADY_USED`.

## 5. Earn OpenAPI Error Contract

- [x] 5.1 Add endpoint-specific OpenAPI error examples or schemas for `POST /transactions/earn` while preserving the ADR 008 envelope shape.
- [x] 5.2 Document 400 examples for `SESSION_DEVICE_REQUIRED`, `DEVICE_NOT_ACTIVE`, and validation errors where applicable.
- [x] 5.3 Document 404 `CARD_NOT_FOUND`, 409 `RECEIPT_ALREADY_USED` and `IDEMPOTENCY_CONFLICT`, 422 policy/approval errors, and 503 `EARN_TRANSACTION_CONFLICT` and `DEPENDENCY_UNAVAILABLE`.
- [x] 5.4 Regenerate `docs/api/openapi.json` and update any generated API artifacts required by the repo workflow.
- [x] 5.5 Add or update OpenAPI integration assertions proving the earn operation exposes the endpoint-specific stable error examples.

## 6. Verification And Closure Evidence

- [x] 6.1 Run the targeted unit and integration tests for retry mapping, credit-lot lifecycle guards, and OpenAPI contract assertions.
- [x] 6.2 Run the repo-required verification commands, including `npm run lint`, `npm run build`, `npm run test`, OpenAPI generation/lint/diff checks, and migration deployment checks as applicable.
- [x] 6.3 Record current-head verification evidence, command references, commit SHA when available, and artifact references in the migration tracker and Sprint 2 closure notes.
- [x] 6.4 Reconcile and update the Sprint 2 GitHub issue checklist, keeping it open if any lifecycle guard, OpenAPI contract, or visible CI evidence remains incomplete.
- [x] 6.5 Run GitNexus `detect_changes()` or the repo CLI equivalent before commit/review to confirm affected symbols and flows match the expected scope.
