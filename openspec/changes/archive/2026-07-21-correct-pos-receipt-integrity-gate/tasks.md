## 1. Receipt Data Model and Contract

- [x] 1.1 Remove the generated business `receiptNumber` and add the POS receipt number, normalized weekly receipt identity, explicit POS occurrence time, safe-money ceiling enforcement, and single authoritative captured-by user reference to the receipt schema and DTOs.
- [x] 1.2 Add tenant-composite branch/device ownership constraints and the weekly uniqueness guard needed to block duplicate physical receipts.
- [x] 1.3 Update OpenAPI, validation, and local setup docs to describe the required POS receipt workflow, timestamp policy, and override expectations.

## 2. Receipt Capture Enforcement

- [x] 2.1 Require an active device for cashier receipt capture and derive the branch from authenticated tenant context instead of trusting arbitrary branch input.
- [x] 2.2 Enforce the POS timestamp tolerance window and reject future or stale receipts unless an explicit audited supervisor override is present.
- [x] 2.3 Normalize receipt numbers before persistence and reject duplicate physical receipts across different idempotency keys, cashiers, or cards.
- [x] 2.4 Enforce safe integer and configured-ceiling validation for purchase amounts.

## 3. Redis Operability Hardening

- [x] 3.1 Replace any host-Redis integration-test assumptions with disposable Redis provisioning in CI or the test harness.
- [x] 3.2 Add bounded reconnect/backoff, cached-client reset on close, and structured logging for Redis connection failures and recovery attempts.
- [x] 3.3 Keep fail-closed coverage for Redis startup failure and transient disconnect recovery.

## 4. Verification and Regression Coverage

- [x] 4.1 Add integration tests for same receipt with different idempotency keys, different cashiers, different cards, and the week-boundary edge case.
- [x] 4.2 Add integration tests for cross-branch submissions, missing/inactive/wrong-branch devices, future or stale transaction timestamps, and legacy migration preservation.
- [x] 4.3 Run the targeted receipt and Redis test suites and fix any validation or migration regressions discovered during verification.
