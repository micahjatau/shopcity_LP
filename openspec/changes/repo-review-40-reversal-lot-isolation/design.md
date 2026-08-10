## Context

Review 40 found that reversal accounting can validate the original credit lot and still consume a different FIFO-selected lot. The relevant implementation lives in `src/common/balance/lot-allocation.service.ts`, `src/modules/reversals/reversals.service.ts`, and the related loyalty/adjustment integration tests.

## Goals / Non-Goals

**Goals:**

- Make earn reversals and credit-adjustment reversals consume only the original credit lot being reversed.
- Add a shared exact-lot debit allocation primitive that records allocation evidence against one source lot.
- Preserve the existing FIFO allocator for ordinary redemption and ordinary debit-adjustment flows.
- Add integration tests that use the real PostgreSQL allocator and prove unrelated lots are not touched.

**Non-Goals:**

- Redesign the reversal domain or ledger model.
- Change redemption FIFO behavior.
- Rework read-model serialization or public transaction contracts beyond what is needed to expose the corrected allocation evidence.

## Decisions

1. Add a dedicated exact-lot debit allocator in the shared balance layer.

- Rationale: the reversal bug is not a validation problem; it is a source-selection problem. The allocator must lock and debit the one approved lot directly instead of discovering a candidate set and picking FIFO.
- Alternatives considered: passing excluded lot IDs into FIFO or filtering the candidate list until only one lot remains. Rejected because those approaches still route through generic selection logic and can silently widen the blast radius.

2. Route only credit-source reversals through the exact-lot path.

- Rationale: an unused earn reversal and a credit-adjustment reversal both have a single authoritative source lot. Redemption and debit adjustments still need the normal FIFO allocator because they intentionally consume any eligible credit.
- Alternatives considered: switching all debits to exact-lot inputs. Rejected because it would complicate the normal customer-spend flow without improving correctness.

3. Fail closed when the source lot is no longer usable.

- Rationale: if the original lot is expired, mismatched, or short on balance, the reversal provenance is no longer safe. The service should return the existing review-required/error path rather than consuming a different lot.
- Alternatives considered: auto-fallback to FIFO or partial allocation against other lots. Rejected because both would preserve the balance but corrupt accounting provenance.

## Risks / Trade-offs

- [Risk] The new exact-lot primitive overlaps conceptually with FIFO allocation. [Mitigation] Keep the primitive narrow and share only the transaction/locking plumbing.
- [Risk] Integration tests will be slower because they must exercise the real database allocator. [Mitigation] Keep them limited to the two adversarial multi-lot scenarios.
- [Risk] A safe failure path may surface more review-required reversals in edge cases. [Mitigation] Preserve the current validation checks and only fail when the original lot cannot be proven.

## Migration Plan

1. Add the exact-lot debit allocator to the shared balance service.
2. Update the reversal service to use it for unused earn reversals and credit-adjustment reversals.
3. Leave redemption and ordinary debit adjustments on the FIFO allocator.
4. Add integration tests that create two active lots and prove the target lot is the only one reduced.
5. Run the targeted reversal and balance-allocation tests.

Rollback is to restore the FIFO call sites and remove the new exact-lot helper in the same change set; no schema rollback is expected.

## Open Questions

- Should exact-lot allocation return the same review-required error shape used by other unsafe reversal branches, or a more specific conflict code?
- Should the shared primitive be named `allocateDebitFromExactLot` or something closer to the existing service naming style?
