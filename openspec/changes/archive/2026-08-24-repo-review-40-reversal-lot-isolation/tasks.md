## 1. Shared exact-lot allocation

- [x] 1.1 Add an exact-lot debit allocation primitive in the shared balance layer that locks a single credit lot, verifies ownership/expiry/balance, and decrements only that lot.
- [x] 1.2 Keep the existing FIFO debit allocator unchanged for redemption and ordinary debit-adjustment flows.

## 2. Reversal service updates

- [x] 2.1 Route unused earn reversals through the exact-lot allocator.
- [x] 2.2 Route credit-adjustment reversals through the exact-lot allocator.
- [x] 2.3 Preserve the current unsafe-reversal failure path when the original lot cannot be proven usable.

## 3. Integration coverage

- [x] 3.1 Add a PostgreSQL-backed integration test that proves an earn reversal reduces only its own lot when an older unrelated lot exists.
- [x] 3.2 Add a PostgreSQL-backed integration test that proves a credit-adjustment reversal reduces only its own lot when an older unrelated lot exists.
- [x] 3.3 Verify the reversal evidence points to the original transaction and the exact lot used for the debit.

## 4. Validation

- [x] 4.1 Run the targeted balance-allocation and reversal tests.
- [x] 4.2 Update any affected OpenSpec artifacts if implementation details shift during validation.
