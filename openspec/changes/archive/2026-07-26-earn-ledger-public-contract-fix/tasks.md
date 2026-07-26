## 1. Public earn contract

- [x] 1.1 Make the authoritative earn workflow the only public path for loyalty-eligible captures.
- [x] 1.2 Remove cashier-facing bypasses from legacy receipt capture or route them into the same earn orchestration.
- [x] 1.3 Update earn and receipt responses to distinguish confirmed and pending approval states with the correct HTTP status.

## 2. Transaction and balance data

- [x] 2.1 Add authoritative transaction identity fields and response shaping for receipt, transaction, and approval references.
- [x] 2.2 Add balance computation from confirmed, unexpired credit lots.
- [x] 2.3 Expose credit expiry data in transaction reads and confirmed earn responses.

## 3. Ledger and schema integrity

- [x] 3.1 Add database-level checks for positive and internally consistent financial amounts.
- [x] 3.2 Add or tighten append-only protections for confirmed ledger history.
- [x] 3.3 Add the missing foreign-key or relational safeguards required for ledger, approval, and lot integrity.

## 4. Outbox and delivery readiness

- [x] 4.1 Persist outbox intent for confirmed earns in the authoritative workflow.
- [x] 4.2 Implement outbox publication and delivery-status updates.
- [x] 4.3 Add retry and failure-state handling for aged outbox events.

## 5. Contract and verification sync

- [x] 5.1 Regenerate the OpenAPI document after contract changes.
- [x] 5.2 Update contract, integration, and regression tests for the new response states and safety gates.
- [x] 5.3 Run the repo verification commands and confirm the change is apply-ready.
