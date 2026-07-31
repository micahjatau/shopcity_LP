## 1. Release evidence and migration safety

- [x] 1.1 Update the release-evidence and tracker docs so recorded commands and file references are reproducible.
- [x] 1.2 Reconcile shared Prisma migration history against the committed migration set and capture restore-based verification evidence.

## 2. Redemption hardening

- [x] 2.1 Resolve completed idempotency replays before mutable redemption eligibility checks.
- [x] 2.2 Add bounded jittered retry handling for redemption serialization conflicts.
- [x] 2.3 Keep conflict-time duplicate receipt lookup scoped to the original tenant, branch, receipt week, and normalized receipt number.

## 3. Ledger invariant enforcement

- [x] 3.1 Generalize credit-lot source validation so adjustment credit entries can source credit lots.
- [x] 3.2 Enforce original-debit linkage for reversal restoration allocations.
- [x] 3.3 Reject unsupported ledger type and direction combinations before commit.

## 4. Approval expiry worker

- [x] 4.1 Implement bounded overdue-approval selection with lock-safe batching.
- [x] 4.2 Move approval, redemption, receipt, and audit expiry writes into one atomic worker flow.

## 5. Transaction read authorization

- [x] 5.1 Pass `AuthContext` into the transaction read service and enforce cashier branch scope.
- [x] 5.2 Preserve supervisor branch scope and admin tenant scope without exposing cross-branch cashier reads.

## 6. Verification

- [x] 6.1 Add or update unit and integration tests for replay ordering, retry handling, ledger validation, approval expiry, and transaction access control.
- [x] 6.2 Run the relevant build and test commands and record the results in the release evidence tracker.
