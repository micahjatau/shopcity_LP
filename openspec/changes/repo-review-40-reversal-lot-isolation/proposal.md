## Why

Review 40 found a P1 financial-integrity defect in reversal accounting: earn and credit-adjustment reversals validate the original credit lot, then still consume debit allocations through the generic FIFO allocator. That can reduce the wrong lot while leaving the intended source lot untouched, which breaks provenance even when the net balance is correct.

## What Changes

- Add an exact-lot debit allocation primitive that targets one credit lot only and records allocation evidence against that source lot.
- Use the exact-lot allocator for unused earn reversals and credit-adjustment reversals.
- Keep ordinary redemption and ordinary debit-adjustment flows on the existing FIFO allocator.
- Add integration coverage using the real PostgreSQL allocator to prove reversal isolation across multiple active lots.

## Capabilities

### New Capabilities

- `reversal-source-lot-isolation`: reversal debit allocation must consume only the original credit lot being reversed.

### Modified Capabilities

- `credit-lot-lifecycle-integrity`
- `transaction-reversal`
- `manual-adjustments`

## Impact

Affected areas include the shared balance/allocation primitive, reversal service paths for earn and credit-adjustment reversals, and the integration test suite that proves lot provenance and restoration evidence remain truthful.
