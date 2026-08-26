## 1. Pre-Implementation Analysis

- [x] 1.1 Run GitNexus impact analysis for the redemption service methods that create immediate and pending redemptions, and record direct callers, affected processes, and risk level before editing.
- [x] 1.2 Run GitNexus impact analysis for approval decision/list mapping symbols before changing REDEEM approval includes or response mapping.
- [x] 1.3 Run GitNexus impact analysis for SMS persistence/outbox symbols before changing `SmsMessage` ownership or uniqueness.
- [x] 1.4 Inspect the current Prisma schema, latest Sprint 3 migration, and `docs/database/migration-tracker.md` to confirm applied migration boundaries and required forward-only migration work.

## 2. Approval Target Integrity

- [x] 2.1 Update pending high-value redemption creation so REDEEM approvals persist `redemptionId` only and do not set approval-level `receiptId`.
- [x] 2.2 Update approval list, detail, execution, rejection, and expiry queries to load receipt evidence through `redemption.receipt` for REDEEM targets.
- [x] 2.3 Update response mapping and OpenAPI documentation so redemption approval receipts come from the redemption relation.
- [x] 2.4 Add unit coverage proving REDEEM approval creation does not populate `receiptId` and response mapping still exposes the required receipt evidence.

## 3. Redemption Validation Order

- [x] 3.1 Reorder redemption request validation so active balance, minimum amount, basket cap, maximum allowed redemption, and requested amount checks run before confirmed-vs-pending branching.
- [x] 3.2 Ensure invalid high-value requests do not create receipts, redemptions, approvals, idempotency responses, SMS rows, outbox events, or audit success records.
- [x] 3.3 Correct pending redemption receipt audit state so the requesting cashier is not recorded as the approver for an unexecuted financial action.
- [x] 3.4 Add tests for invalid high-value requests with insufficient balance, exceeded basket cap, and zero maximum allowed redemption.

## 4. Redemption Race Classification

- [x] 4.1 Add redemption-specific `P2002` classification for idempotency record uniqueness, receipt identity uniqueness, redemption receipt linkage, ledger receipt linkage, and approval target linkage.
- [x] 4.2 Replay the completed response for same-key/same-payload idempotency races after a uniqueness conflict.
- [x] 4.3 Return `IDEMPOTENCY_CONFLICT` for same-key/different-payload races after a uniqueness conflict.
- [x] 4.4 Return `RECEIPT_ALREADY_USED` for duplicate physical receipt races after a uniqueness conflict.
- [x] 4.5 Return a documented stable redemption transaction conflict when a one-to-one uniqueness race cannot be replayed safely.
- [x] 4.6 Add unit tests for each `P2002` classification branch and ensure raw Prisma errors do not leak to API callers.

## 5. Database Financial Invariants

- [x] 5.1 Create a new forward-only Prisma migration for deferred constraint triggers covering debit allocation totals, ledger type/direction, allocation ownership, redemption ledger linkage, allocation-plus-lot reduction, and restoration-plus-lot increase.
- [x] 5.2 Keep all financial amounts as integer kobo and preserve append-only ledger history in the migration and implementation.
- [x] 5.3 Add migration tests or integration tests proving valid redemption allocation commits and invalid direct allocation/restoration writes fail at PostgreSQL commit.
- [x] 5.4 Regenerate the Prisma client after schema changes.
- [x] 5.5 Update `docs/database/migration-tracker.md` with fresh database, upgraded seeded database, and remote/shared deployment evidence status.

## 6. SMS Ownership Generalization

- [x] 6.1 Change SMS persistence schema so `receiptId` can be optional where required and one receipt can relate to multiple SMS delivery records.
- [x] 6.2 Preserve `outboxEventId` as the unique replay-safe SMS delivery intent and provider idempotency key.
- [x] 6.3 Add nullable transaction/ledger references needed for redemption, reversal, and manual adjustment notifications without creating synthetic receipts.
- [x] 6.4 Update SMS/outbox services and tests so receipt-backed earn/redemption messages and non-receipt financial messages use the same provider-truth status rules.

## 7. Read Contracts And Release Evidence

- [x] 7.1 Update transaction lookup to return confirmed redemption debit details, receipt evidence, ledger entry, and allocation summaries instead of `UNSUPPORTED_TRANSACTION_TYPE`.
- [x] 7.2 Update customer ledger or transaction read responses where needed to expose redemption allocation summaries and reversal/adjustment-compatible references.
- [x] 7.3 Update OpenAPI artifacts, generated client validation, and Bruno examples for high-value redemption approval and redemption transaction lookup changes.
- [x] 7.4 Add or update public configuration documentation for frontend-safe redemption policy values if affected by validation-order changes.

## 8. PostgreSQL Concurrency Coverage

- [x] 8.1 Add Testcontainers coverage proving a real high-value redemption approval can be created, listed, and executed against PostgreSQL.
- [x] 8.2 Add concurrent same-idempotency-key redemption tests proving both callers receive the original response.
- [x] 8.3 Add concurrent same-receipt/different-idempotency-key tests proving only one financial effect commits and the loser receives `RECEIPT_ALREADY_USED`.
- [x] 8.4 Add overlapping balance redemption tests proving concurrent redemptions cannot overdraw credit lots.
- [x] 8.5 Add concurrent approval execution tests proving two supervisors cannot execute one approval twice.
- [x] 8.6 Add approval-execution-racing-redemption tests proving debit allocation cannot overdraw active balance.

## 9. Verification

- [x] 9.1 Run `npm run prisma:generate` after schema changes.
- [x] 9.2 Run the targeted unit specs for redemption, approval, idempotency, SMS/outbox, and transaction lookup changes.
- [x] 9.3 Run `npm run test:integration` for PostgreSQL migration and concurrency evidence.
- [x] 9.4 Run `npm run lint` and `npm run build`.
- [x] 9.5 Run OpenSpec validation for `address-repo-review-22` and fix any proposal/spec/task inconsistencies.
- [x] 9.6 Run GitNexus `detect_changes()` before any commit to verify affected symbols and execution flows match the expected scope.
