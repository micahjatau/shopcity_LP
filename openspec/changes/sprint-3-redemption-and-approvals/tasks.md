## 1. Planning And Impact Checks

- [x] 1.1 Run GitNexus impact analysis for `LoyaltyLedgerEntry`, `CreditLot`, `Approval`, `ActiveBalanceService`, `LoyaltyService`, outbox dispatch, and SMS intent symbols before editing implementation code.
- [x] 1.2 Record proposal-time GitNexus findings in `docs/development/gitnexus-impact-tracker.md` with direct callers, affected flows, and risk level.
- [x] 1.3 Create or update an ADR for FIFO allocation, restoration, generic approval targets, and transaction identity decisions.
- [x] 1.4 Confirm Sprint 3 policy defaults or document them as configurable assumptions.
- [x] 1.5 Draft OpenAPI request, response, and error examples for redeem, approval decisions, reversal, adjustment, and transaction lookup before controller implementation.

## 2. Schema And Migration Foundation

- [x] 2.1 Expand Prisma enums for debit ledger direction and Sprint 3 ledger, redemption, adjustment, and approval target states.
- [x] 2.2 Add `Redemption`, `RedemptionAllocation`, `AllocationRestoration`, and `Adjustment` models with tenant-safe indexes and relations.
- [x] 2.3 Make ledger `receiptId` nullable where required while preserving non-null receipt uniqueness and type-specific evidence constraints.
- [x] 2.4 Add approval target fields, backfill existing approvals as earn targets, and enforce target exclusivity plus one approval per controlled action.
- [x] 2.5 Replace the temporary credit-lot remaining-balance freeze with controlled allocation/restoration transition rules.
- [x] 2.6 Add allocation/restoration immutability and deferred database invariant checks for totals, ownership, and lot balance bounds.
- [x] 2.7 Verify fresh migration deployment from zero and upgrade migration from realistic Sprint 2 data.
- [x] 2.8 Update `docs/database/migration-tracker.md` with local and remote migration evidence and backup/restore notes.

## 3. Shared Financial Primitives

- [x] 3.1 Add configuration validation for `MIN_REDEMPTION_KOBO`, `MAX_REDEMPTION_BASKET_PERCENT`, `REDEMPTION_APPROVAL_THRESHOLD_KOBO`, and `ADJUSTMENT_CREDIT_EXPIRY_MONTHS`.
- [x] 3.2 Implement shared active-balance helpers that return only positive, unexpired credit lots and JSON-safe integer outputs.
- [x] 3.3 Implement the shared FIFO allocation engine with serializable transaction usage, row locking, eligibility exclusion, conditional lot updates, and allocation persistence.
- [x] 3.4 Implement restoration planning for safe debit reversals without mutating original allocation rows.
- [x] 3.5 Add bounded retry handling for recognized serialization/deadlock conflicts and stable domain failure mapping.

## 4. Redemption Workflow

- [x] 4.1 Add redemptions module, DTOs, policy service, allocation integration, controller, and service boundaries.
- [x] 4.2 Implement `POST /api/v1/transactions/redeem` with authentication, CSRF/session/device validation, explicit rate limiting, and idempotency.
- [x] 4.3 Implement immediate redemption transaction flow with receipt evidence, redemption intent, debit ledger entry, allocations, lot updates, audit, outbox, SMS intent, and idempotency response.
- [x] 4.4 Implement policy failures for minimum redemption, basket cap, insufficient balance, same-purchase redemption, offline redemption, duplicate receipt, and dependency failures.
- [x] 4.5 Implement high-value pending approval flow returning `202` with no ledger, allocation, lot, outbox, or SMS financial effect.

## 5. Approval Execution

- [x] 5.1 Extend approval DTOs, services, queries, and read models to expose typed earn and redemption approval targets.
- [ ] 5.2 Implement redemption approval execution with approval/redemption locking, current-state revalidation, FIFO allocation, debit ledger creation, outbox/SMS, audit, and executed state transition.
- [ ] 5.3 Implement redemption approval rejection with required reason, requester/cashier self-approval protection, audit, and no financial effect.
- [ ] 5.4 Implement approval expiry handling for redemption targets with no financial effect.
- [ ] 5.5 Ensure concurrent approval attempts execute exactly once and return stable already-decided or conflict responses.

## 6. Reversals

- [ ] 6.1 Add reversals module, DTOs, service, controller route `POST /api/v1/transactions/{transactionId}/reverse`, RBAC, reason validation, and idempotency.
- [ ] 6.2 Implement safe earn reversal for fully unconsumed eligible lots using a debit reversal ledger entry and allocation-backed lot consumption.
- [ ] 6.3 Implement safe redemption reversal using a credit reversal ledger entry, immutable restoration rows, original-lot restoration, audit, outbox, and SMS intent.
- [ ] 6.4 Implement adjustment reversal support for safe credit and debit adjustment cases.
- [ ] 6.5 Return `REVERSAL_REVIEW_REQUIRED` for partially consumed, expired, incoherent, or otherwise unsafe reversal cases.
- [ ] 6.6 Enforce one automatic reversal per original transaction.

## 7. Manual Adjustments

- [ ] 7.1 Add adjustments module, DTOs, service, controller route `POST /api/v1/adjustments`, admin-only RBAC, validation, and idempotency.
- [ ] 7.2 Implement credit adjustment flow with adjustment aggregate, credit ledger entry, new expiring credit lot, audit, outbox, SMS intent, and response.
- [ ] 7.3 Implement debit adjustment flow using the shared FIFO allocation engine with no negative balance outcomes.
- [ ] 7.4 Enforce mandatory reason, positive amount, configured adjustment bounds, optional expiry override bounds, and JSON-safe responses.

## 8. Reads, Contracts, And Documentation

- [ ] 8.1 Extend `GET /api/v1/transactions/{transactionId}` to return discriminated earn, redeem, reversal, and adjustment shapes.
- [ ] 8.2 Extend customer ledger responses with direction, allocation/restoration summaries, reversal linkage, and role-safe reasons.
- [ ] 8.3 Extend approval queue/list responses with target type, redemption details, requested amount, policy reason, and safe customer/receipt summary.
- [ ] 8.4 Extend public configuration responses with frontend-safe redemption policy values.
- [ ] 8.5 Update OpenAPI, Bruno collections, generated clients, and docs/api frontend guide for 201/202 redemption, approval polling, policy errors, reversal, adjustment, and idempotent retry behavior.

## 9. Audit, SMS, And Observability

- [ ] 9.1 Add audit events for redemption requested, confirmed, approval required, rejected, expired, timestamp override, transaction reversed, adjustment credit/debit, and redemption approval decisions.
- [ ] 9.2 Add SMS templates and payload validation for redemption confirmed, transaction reversed, and balance adjusted notifications.
- [ ] 9.3 Ensure pending/rejected/expired approvals create no confirmation SMS unless explicitly documented.
- [ ] 9.4 Add structured logs/metrics for transaction type, transaction ID, approval ID, allocation count, retry attempt, conflict category, and duration without logging secrets or unnecessary PII.

## 10. Tests And Release Gates

- [ ] 10.1 Add unit tests for redemption policy, FIFO allocation, reversal planning, and manual adjustment validation.
- [ ] 10.2 Add database integration tests for fresh/upgrade migrations, ledger append-only protection, receipt immutability, allocation/restoration immutability, lot balance bounds, ownership checks, approval target XOR, one ledger effect per redemption, and one reversal per transaction.
- [ ] 10.3 Add concurrency tests for overlapping redemptions, same idempotency key, conflicting idempotency payload, concurrent approval execution, approval racing direct redemption, and reversal racing redemption.
- [ ] 10.4 Add HTTP/e2e tests for confirmed redemption, pending approval, approval execute/reject, self-approval rejection, policy errors, duplicate receipt, offline rejection, rate limiting, reversal, adjustment, and RBAC failures.
- [ ] 10.5 Add outbox/SMS tests for redemption, reversal, adjustment, provider failure, retry, and replay safety.
- [ ] 10.6 Run OpenAPI lint/diff, generated artifact cleanliness, architecture checks, lint, typecheck, build, unit, e2e, integration, and coverage gates.
- [ ] 10.7 Run GitNexus `detect_changes()` before committing or handoff and confirm affected symbols and flows match the planned scope.
- [ ] 10.8 Record visible CI evidence, migration evidence, runbook updates, and Sprint 3 final acceptance checklist status.
