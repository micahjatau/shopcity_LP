## 1. Database and migration

- [x] 1.1 Remove global ledger receipt uniqueness from the Prisma model, add the tenant/receipt lookup index, generate a forward-only migration with one-EARN/one-REDEEM partial unique indexes, and update the migration tracker; verify with `npm run prisma:validate` and `npm run prisma:generate`.
- [x] 1.2 Add database integration coverage proving one receipt accepts one EARN plus one REDEEM but rejects a duplicate of either type; verify with the focused Testcontainers spec. The focused suite passed; the full integration runner has unrelated/stale failures recorded in `evidence.md`.

## 2. Settlement engine and approval

- [x] 2.1 Extract/reuse the existing integer-kobo Earn formula and settlement policy-version calculation without changing standalone Earn decisions; verify rate, rounding, zero-earn, and existing Earn/offline-sync regression tests.
- [x] 2.2 Implement one redemption settlement service that allocates prior FIFO lots before adding the new Earn lot, computes net paid and closing balance, and emits one settlement notification; verify positive, zero-earned, insufficient-credit, and transaction-safety cases.
- [x] 2.3 Route immediate redemption confirmation through the settlement service and gate pending status when either redemption or basket-level Earn purchase policy requires approval; verify the 5,000/10,000/3,000 acceptance case and no-effects-pending tests.
- [x] 2.4 Route approved redemptions through the same settlement service, recheck combined current policy, and preserve legacy pending-approval compatibility; verify approval, rejection, expiry, policy-change, and pre-deployment pending unit cases.
- [x] 2.5 Verify same-key idempotent replay, conflicting payload rejection, and concurrent retries create only one receipt, debit, Earn, allocation set, lot, and outbox event.

## 3. Contracts and read models

- [x] 3.1 Extend redemption and approval response contracts with net-paid, earned, Earn transaction, redeemed, and closing-balance values; keep pending values non-confirming and verify controller/OpenAPI contract tests.
- [x] 3.2 Update cashier report and transaction-detail projections to expose both effects under one receipt without exceeding existing scope/limits; verify report and detail service tests.
- [x] 3.3 Regenerate OpenAPI and the generated client, then verify `npm run openapi:lint`, `npm run openapi:diff`, and `npm run client:typecheck`.

## 4. Notifications and reversal safety

- [x] 4.1 Extend the redemption SMS payload/template to report redemption, Earn, and closing balance once while retaining legacy payload rendering; verify SMS template/provider tests. Worker-recovery integration remains covered by the blocked integration gate.
- [x] 4.2 Reject single-leg reversal of a paired settlement with `REVERSAL_REVIEW_REQUIRED` before mutation; verify paired-settlement and ordinary single-effect reversal service tests.

## 5. Cashier experience

- [x] 5.1 Update Redeem success and pending states to display authoritative net-paid, earned, redeemed, and closing-balance values without inferring unavailable effects; verify focused workflow component tests.
- [x] 5.2 Update cashier transaction activity/detail to show both settlement effects under one receipt; verify focused dashboard tests and responsive Playwright coverage.

## 6. Documentation and integrated verification

- [x] 6.1 Clarify the TRD's same-purchase redemption rule and document the settlement/migration invariants; strict OpenSpec validation passed.
- [ ] 6.2 Run focused backend, frontend, database integration, typecheck, lint, architecture, build, OpenAPI, and `git diff --check` gates; verify Graphiti/GitNexus change-scope review and record implementation evidence in this change.
