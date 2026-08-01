## 1. Migration safety and evidence

- [x] 1.1 Reconcile the shared Supabase migration ledger against the committed Prisma migrations and capture restore-based verification evidence.
- [x] 1.2 Update the release-evidence and tracker docs so the recorded commit SHA, migration state, and verification commands point at the current verified head.

## 2. Replay and approval expiry

- [x] 2.1 Move completed idempotency replay ahead of timestamp, policy, card, branch, and customer validation in earn and redemption flows.
- [x] 2.2 Introduce one shared `expireApproval` transaction and route both the approval-decision path and the expiry worker through it.
- [x] 2.3 Add the approval expiry index and separate the expiry worker startup path from the outbox/SMS runtime so it can run on Postgres alone.

## 3. Credit-lot invariants

- [x] 3.1 Expand credit-lot source validation to allow earned credits and adjustment credits while rejecting debits and unsupported sources.
- [x] 3.2 Enforce that allocation restorations still point to the original debit that consumed the allocation.
- [x] 3.3 Add integration tests that prove valid earn credits, valid adjustment credits, and invalid foreign restoration attempts behave correctly.

## 4. Branch-scoped authorization

- [x] 4.1 Pass actor context through approval listing and approval decision services so branch scoping happens in the database query.
- [x] 4.2 Apply the same actor-aware scoping to customer-ledger reads for non-admins while preserving tenant-wide access for admins.

## 5. Verification

- [x] 5.1 Add or update unit and integration tests for replay ordering, REDEEM expiry consistency, credit-lot invariants, and authorization scope.
- [x] 5.2 Run the relevant build and test commands, then verify the OpenSpec change is apply-ready.
