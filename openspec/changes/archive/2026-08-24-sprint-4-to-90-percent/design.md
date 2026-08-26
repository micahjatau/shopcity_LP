## Context

Sprint 4 now has most of the expected modules, but the remaining work is to close the acceptance gaps without reopening Sprint 3 financial behavior. Fraud must remain operational evidence; reporting must remain rebuildable; offline sync must stay earn-only.

## Goals

- Make fraud evaluation durable, replay-safe, and evidence-driven.
- Make historical reporting reconstruct from immutable source evidence at a watermark.
- Make offline earn sync conflict-safe with stable outcomes and persisted evidence.
- Keep export and contract surfaces aligned with the runtime.

## Non-Goals

- No new financial write path.
- No weakening of receipt uniqueness.
- No offline redemption, approval, card replacement, or manual adjustment.
- No warehouse or float-based reporting model.

## Approach

1. Freeze the remaining Sprint 4 gaps as a single closure change.
2. Add fraud intent emission and terminal processing for qualifying earn/redemption flows.
3. Add behavioral fraud rules over authoritative rows and duplicate-attempt evidence for uniqueness races.
4. Reconstruct reporting snapshots from as-of source state and protect same-tenant materialization.
5. Finish offline conflict coverage and align docs/contracts with the implemented API.

## Risks

- Additional outbox and evidence rows may require migration and worker coverage.
- Historical report totals may shift once they use authoritative inputs; regressions must be covered by tests.
- Concurrency protection may add some operational latency but should remain tenant-scoped.
