## 1. Tracker And Baseline Truth

- [x] 1.1 Reopen or split Sprint 3 tracker items whose checked status is contradicted by repo review 23 evidence.
- [x] 1.2 Reopen corrective review tracker items from `address-repo-review-22` for validation ordering, P2002 classification, and transaction/customer-ledger read models.
- [x] 1.3 Split Sprint 3 migration evidence tracking into local fresh/upgrade, CI, shared staging, and backup/restore or forward-fix rehearsal subtasks.
- [x] 1.4 Record Sprint 3A exit gates so reversal execution and expanded manual adjustments remain blocked until the hardening pass is verified.

## 2. Redemption Request Hardening

- [x] 2.1 Run GitNexus impact analysis for redemption request validation symbols before editing service code.
- [x] 2.2 Reorder redemption validation so identity, idempotency, receipt identity, active balance, minimum, basket cap, and sufficient-balance checks all run before immediate-versus-pending branching.
- [x] 2.3 Ensure invalid high-value redemption requests create no receipt, redemption, approval, ledger, allocation, outbox, SMS, success audit, or completed idempotency side effects.
- [x] 2.4 Add redemption timestamp skew validation for stale and future cashier requests with stable `OFFLINE_REDEMPTION_NOT_ALLOWED` or timestamp-domain errors.
- [x] 2.5 Strengthen redemption DTO and route validation for idempotency key length, card serial length, receipt number length, UUID path params, and whitespace-only strings.
- [x] 2.6 Normalize redemption-specific unique conflicts for idempotency replay/conflict, duplicate receipt identity, redemption/ledger receipt links, and approval target conflicts.
- [x] 2.7 Correct pending redemption receipt evidence so pending requests do not record cashier reviewer or approver fields before financial approval execution.
- [x] 2.8 Populate `ledgerEntryId`, `redemptionId`, `receiptId`, and `outboxEventId` consistently for immediate and approval-executed redemption notifications.
- [x] 2.9 Add or update unit and integration tests for validation ordering, online-only timestamp rejection, conflict classification, pending receipt evidence, and zero-side-effect invalid requests.

## 3. Policy And Shared Financial Primitives

- [x] 3.1 Run GitNexus impact analysis for redemption policy and allocation symbols before editing shared financial logic.
- [x] 3.2 Strengthen redemption configuration validation for positive minimum redemption, max-safe-integer kobo bounds, basket percent range, and threshold/minimum consistency.
- [x] 3.3 Move approval execution redemption policy checks to the same policy service and policy-version generator used by redemption request capture.
- [x] 3.4 Add policy tests for approval threshold boundary, zero balance, basket smaller than minimum, basket-percentage rounding, maximum safe integer, invalid configuration, policy-version changes, and policy-version stability.
- [x] 3.5 Reject FIFO allocation requests that provide both redemption and adjustment targets or neither target before database writes.
- [x] 3.6 Add explicit Prisma transaction `maxWait` and `timeout` values to shared financial serializable transaction options.
- [x] 3.7 Add PostgreSQL FIFO tests for random insert order, expiry ordering, earned-time tie-breaks, ID tie-breaks, partial last-lot consumption, expired/zero-balance exclusion, and tenant/customer isolation.

## 4. Database Financial Invariants

- [x] 4.1 Run GitNexus impact analysis for affected Prisma models and database integration helpers before schema or migration edits.
- [x] 4.2 Add preflight checks for existing redemption, approval, ledger, restoration, and immutable-evidence rows that would violate new constraints.
- [x] 4.3 Create a forward migration adding redemption lifecycle constraints, including `expiredAt` support where needed.
- [x] 4.4 Create a forward migration adding approval lifecycle constraints and an index on pending approvals by tenant, status, and expiry time.
- [x] 4.5 Create deferred commit-time validation for ledger evidence by type and direction, covering earn, redeem, adjustment, and reversal evidence.
- [x] 4.6 Add restoration/reversal aggregate checks for restoration sums, original debit customer, allocation source consistency, `reversesEntryId`, and one automatic reversal per original entry.
- [x] 4.7 Add immutable redemption evidence protection for tenant, branch, customer, card, device, receipt, requested amount, basket amount, policy snapshots, actor, and request timestamp.
- [x] 4.8 Update `docs/database/migration-tracker.md` with migration intent, preflight results, local verification, shared verification status, and backup/restore or forward-fix evidence.
- [x] 4.9 Add database integration tests proving invalid state-machine, ledger-evidence, restoration, and immutable-evidence writes are rejected.

## 5. Approval Execution And Expiry

- [x] 5.1 Run GitNexus impact analysis for approval execution, rejection, expiry, and listing symbols before editing approval code.
- [x] 5.2 Lock approval, redemption, changing receipt evidence, eligible lots, allocation rows, and relevant credit lots inside approval execution transactions.
- [x] 5.3 Keep conditional state transitions as compare-and-set guards after explicit row locking.
- [x] 5.4 Add automatic approval expiry processing using locked pending-approval selection and atomic approval/redemption expiry updates.
- [x] 5.5 Ensure list responses do not expose time-expired approvals as actionable pending approvals before the expiry worker catches up.
- [x] 5.6 Decide and document policy-change execution outcomes as retryable pending state or terminal machine-readable rejection/expiry state.
- [x] 5.7 Strengthen concurrent approval execution tests to assert exactly one execution, exactly `APPROVAL_ALREADY_DECIDED` for the loser, and single ledger/allocation/outbox/SMS/audit effects.
- [x] 5.8 Use two distinct supervisor users in concurrent approval execution tests.

## 6. SMS And Outbox Truthfulness

- [x] 6.1 Run GitNexus impact analysis for SMS rendering, outbox worker, and notification builder symbols before editing SMS code.
- [x] 6.2 Add a typed SMS template registry including `earn-confirmed`, `redemption-confirmed`, `transaction-reversed`, and `balance-adjusted`.
- [x] 6.3 Implement `redemption-confirmed` rendering with redeemed amount, remaining balance, and customer-facing receipt context when available.
- [x] 6.4 Add per-template payload validation that terminally categorizes or dead-letters invalid payloads instead of falling back to generic text.
- [x] 6.5 Backfill or administratively derive transaction references for historical SMS/outbox rows where possible.
- [x] 6.6 Add real provider renderer tests for redemption text, missing redemption fields, null receipt with non-receipt references, retryable/terminal template failures, and duplicate outbox delivery idempotency.

## 7. Transaction Reads And API Truth

- [x] 7.1 Run GitNexus impact analysis for transaction read, customer ledger, OpenAPI helper, redemption controller, and reversal controller symbols before editing public contracts.
- [x] 7.2 Replace earn-shaped transaction lookup responses with discriminated financial transaction responses for `EARN`, `REDEEM`, future `ADJUSTMENT`, and `REVERSAL` types.
- [x] 7.3 Expand customer ledger responses with transaction type, direction, aggregate IDs, reversal linkage, allocation summary, restoration summary, role-safe reasons, and operational SMS state.
- [x] 7.4 Resolve SMS state by ledger ownership first, aggregate ownership second, and receipt fallback only for historical rows.
- [x] 7.5 Add explicit OpenAPI decorators for redemption 201 confirmed and 202 pending approval response bodies.
- [x] 7.6 Document stable redemption domain errors with examples and correct generic OpenAPI helper examples per status.
- [x] 7.7 Hide the public reversal route or replace impossible 201 documentation with a structured unavailable/review-required boundary.
- [x] 7.8 Add scripts or runnable commands for OpenAPI export, lint, diff, client generation, client typecheck, and Bruno tests.

## 8. Deterministic Tests And Release Evidence

- [x] 8.1 Run GitNexus impact analysis for any clock, testing utility, and financial timestamp symbols before introducing deterministic clock support.
- [x] 8.2 Add a clock port and fixed test clock for receipt week derivation, lot expiry, approval expiry, transaction timestamps, and retry response timestamps.
- [x] 8.3 Add HTTP integration tests for confirmed redemption, pending redemption, validation envelope, auth/role failures, CSRF, inactive device, duplicate receipt, idempotency replay/conflict, basket cap, balance errors, rate limiting, and approval approve/reject/expiry.
- [x] 8.4 Strengthen database concurrency tests to assert exact losing error codes plus ledger, receipt, redemption, allocation, credit-lot, idempotency, outbox, SMS, and audit counts.
- [x] 8.5 Add Jest branch coverage thresholds for `src/modules/redemptions`, `src/modules/approvals`, `src/common/balance`, and outbox-worker code.
- [x] 8.6 Run and record current-head static checks, unit tests, e2e tests, integration tests, coverage, OpenAPI generation/lint/diff, generated-client typecheck, Bruno tests, and architecture checks.
- [x] 8.7 Record staging migration, staging redemption/approval smoke test, and real or sandbox SMS-provider verification with truthful status.
- [x] 8.8 Run `npm run build`, `npm run lint`, `npm run test`, and targeted integration/OpenAPI/client commands required by the changed areas.
- [x] 8.9 Run GitNexus `detect_changes` before any commit to verify expected affected symbols and execution flows.
