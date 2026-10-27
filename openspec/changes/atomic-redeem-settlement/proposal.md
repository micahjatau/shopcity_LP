## Why

Redeem currently consumes the receipt before a separate Earn can be recorded, while a single ledger `receiptId` uniqueness constraint also prevents a receipt from carrying both effects. This prevents customers from earning loyalty credit on the portion of a purchase they paid after redeeming previously earned credit, contrary to the TRD's earn-on-final-paid-amount rule.

## What Changes

- Add an atomic redemption settlement: validate and allocate only pre-existing FIFO credit, debit the confirmed redemption, then earn on `basketAmountKobo - redeemedAmountKobo` in the same serializable database transaction.
- Preserve one physical Receipt and its tenant/branch/week/POS-receipt uniqueness while allowing at most one EARN and one REDEEM ledger effect for that receipt.
- Keep both effects absent while approval is pending; execute both together after approval and neither on rejection/expiry. Apply existing redemption and Earn policy checks and idempotency guarantees.
- Return the net-paid amount, earned amount/transaction, redeemed amount, and closing balance; expose both effects in cashier activity/detail and send one combined settlement SMS.
- Fail closed on a single-leg reversal of a receipt with both settlement effects until grouped settlement reversal is explicitly designed; do not silently leave an unbalanced partial reversal.
- Keep standalone `POST /transactions/earn` unchanged for purchases with no loyalty credit redemption. Update the TRD's same-purchase wording to clarify that credit earned by a purchase cannot fund that same purchase, while prior credit may be redeemed and the remainder may earn.

## Capabilities

### New Capabilities

- `atomic-redemption-settlement`: One receipt settlement may debit prior eligible lots and earn on the final paid amount atomically, including approval, retry, response, read-model, notification, and partial-reversal safety.

### Modified Capabilities

- `financial-workflow-contracts`: Redeem confirmation/approval return and execute both settlement effects as one financial workflow.
- `credit-lot-lifecycle-integrity`: Redemption allocation must consume only previously available lots before the settlement creates its new earn lot.
- `report-semantics`: Cashier receipt activity and transaction detail represent both effects without treating them as two physical receipts.
- `sms-operations`: New redemption settlements produce one combined customer notification while legacy queued redemption payloads remain processable.

## Impact

- Backend: `RedemptionsService`, redemption approval execution in `LoyaltyService`, approval policy evaluation, transaction detail and cashier report projections, SMS templates/outbox payloads, reversal guard, and their unit/integration tests.
- Data: Prisma ledger receipt uniqueness changes to type-specific partial unique indexes; a forward-only migration and migration-tracker entry are required. Physical receipt uniqueness and append-only ledger constraints remain.
- Contracts/client: redemption and approval response schemas, cashier report/detail schemas, OpenAPI export, and generated web client.
- Frontend: Redeem success/pending presentation and Cashier Transactions effect display.
- No shared database push, production mutation, or unrelated Earn/offline-sync behavior is in scope.
