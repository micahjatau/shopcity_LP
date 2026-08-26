## Context

Review 42 found that Sprint 4 still has several correctness blockers: duplicate-receipt fraud evidence is written inside a transaction that is later rolled back, fraud evaluation is no longer driven by the ordinary high-value earn/redemption paths, fraud.evaluate lacks a terminal delivery state, and reporting materialization is using the wrong inputs and an incomplete snapshot boundary.

## Goals / Non-Goals

**Goals:**

- Preserve duplicate-attempt evidence even when the receipt attempt is rejected.
- Ensure ordinary high-value fraud signals are evaluated in production, not only during recovery.
- Prevent fraud.evaluate from being replayed forever by recovery logic.
- Make reporting totals derive from authoritative receipt/ledger state at the requested watermark.
- Restore reversal-aware credit-issued and report-count semantics.

**Non-Goals:**

- Redesign the ledger model.
- Add new financial write flows.
- Introduce a warehouse or asynchronous analytics pipeline.
- Change the public API shape beyond what is needed to correct the report/fraud behavior.

## Decisions

1. Persist duplicate-attempt evidence outside the throwing transaction.

- Rationale: the financial/receipt uniqueness check must still reject the attempt, but the fraud evidence needs to survive that rejection.
- Alternatives considered: relaxing receipt uniqueness or counting impossible committed duplicates. Rejected because both weaken financial integrity.

2. Give fraud.evaluate a terminal lifecycle.

- Rationale: once the event has been evaluated successfully, recovery must not treat it as stale forever. A completed/processed marker keeps the outbox truthful.
- Alternatives considered: leaving the event PUBLISHED and relying on ad hoc recovery filters. Rejected because the event will remain replayable.

3. Derive reporting from authoritative source rows at the requested watermark.

- Rationale: purchase value must come from the source receipt amount, not the earn credit amount, and historical rebuilds must not see future transactions.
- Alternatives considered: patching totals after the fact. Rejected because that leaves the source snapshot unbounded and brittle.

4. Make reversal-aware reporting explicit.

- Rationale: confirmed credits and reversal counts must follow reversesEntryId relationships, not just entry enums.
- Alternatives considered: counting only the current entry type. Rejected because it misclassifies compensation/reversal pairs.

## Risks / Trade-offs

- [Risk] Report totals and fraud occurrence counts will shift once the incorrect paths are fixed. [Mitigation] Treat those shifts as expected correctness corrections and lock them with regression tests.
- [Risk] A terminal fraud lifecycle may require schema or worker changes. [Mitigation] Keep the change additive and preserve the existing SMS outbox behavior.
- [Risk] Watermark enforcement may surface gaps in existing fixtures. [Mitigation] Add targeted integration cases that prove both cutoff and inclusion behavior.

## Migration Plan

1. Move duplicate-attempt evidence to a committed path that survives the receipt-blocking error.
2. Emit fraud.evaluate for ordinary qualifying earn/redemption cases and add a terminal state or processed marker.
3. Fix report materialization to use receipt purchase amounts, respect asOf/watermark, and account for reversal relationships.
4. Add regression tests for duplicate evidence, fraud recovery, watermark cutoff, and reversal-aware reporting.
5. Run the targeted fraud, reporting, and integration suites.

Rollback is to restore the prior fraud/report paths in the same change set; no destructive ledger rollback is expected.
