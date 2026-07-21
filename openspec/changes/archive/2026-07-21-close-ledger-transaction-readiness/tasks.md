## 1. Receipt transaction authority

- [x] 1.1 Update the receipt persistence path so branch, receipt-week, and duplicate-scope values are derived inside the write transaction.
- [x] 1.2 Add the transaction-level consistency checks needed to prevent stale device or branch context from reaching the insert.
- [x] 1.3 Add or update tests that simulate branch reassignment and duplicate capture races.

## 2. Approval workflow

- [x] 2.1 Add explicit approve and reject operations for receipts that require review.
- [x] 2.2 Enforce actor validation so the capturing cashier cannot approve the same receipt.
- [x] 2.3 Record approval audit events and cover the new state transitions with tests.

## 3. Idempotency expiry

- [x] 3.1 Make idempotency lookup ignore expired records and allow a fresh request to proceed.
- [x] 3.2 Add cleanup or retention handling for expired idempotency rows.
- [x] 3.3 Add tests for expired completed records, expired pending records, and unexpired replays.
