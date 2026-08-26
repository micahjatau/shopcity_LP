## Context

The final-gate plan closes the remaining Sprint 4 correctness and evidence gaps without reopening the settled financial model. The remaining work spans approval-path fraud evidence, exactly-once fraud processing, duplicate-evidence durability, historical as-of reconstruction for all reporting inputs, offline boundary correctness, contract synchronization, and release-evidence alignment.

## Goals

- Emit fraud work for pending-approval earn and redemption flows.
- Make fraud processing terminal, replay-safe, and exactly-once for occurrence history.
- Preserve duplicate-attempt evidence through both the normal pre-check and uniqueness-race paths.
- Keep all six behavioral fraud rules in one deterministic shared runtime and test path.
- Rebuild historical reporting from authoritative evidence for lot, redemption, approval, and SMS state at a watermark.
- Keep customer performance counts confirmed-only and reversal-aware.
- Preserve server-authoritative offline rejection and exactly-one-effect duplicate races.
- Keep OpenAPI, client, Bruno, OpenSpec, and release evidence aligned with runtime behavior.

## Non-Goals

- Redesign the ledger or approval model.
- Introduce a warehouse or analytics pipeline.
- Change money semantics or confirmed financial history rules.
- Add user-facing scope beyond what is needed to make the final gate credible.

## Decisions

1. Use durable outbox/worker handling for `report.refresh`.

- Rationale: refresh requests should survive process restarts and be terminal after success.

2. Add pure snapshot helpers for historical reporting.

- Rationale: report builders should consume state-at-watermark values instead of mutable current rows.

3. Key behavioral fraud to the actual branch-day boundary and keep one runtime path.

- Rationale: daily anomaly grouping should dedupe by branch-local day, and tests must exercise the same runtime as production.

4. Treat fraud evaluation as exactly-once at the logical occurrence level.

- Rationale: retries and recovery must not double-count the same `fraud.evaluate` evidence.

5. Treat offline decisions as server-authoritative.

- Rationale: invalid actors, expiries, and duplicate races must be decided by backend state, not client trust.

6. Keep contract and release evidence synchronized with executable behavior.

- Rationale: OpenAPI/client/Bruno artifacts and the final validation record must match what the runtime actually does.

## Risks / Trade-offs

- Fraud counts and report totals may shift after the corrected paths are enabled; that is expected.
- Branch-day normalization is a HIGH-risk surface because it can regroup findings and alter dedupe counts.
- Durable refresh may require queue/outbox integration work, but should remain idempotent.
- Contract regeneration may ripple into generated artifacts, but should not change behavior.
- Release-evidence tasks are process-heavy but should not change product semantics.

## Migration Plan

1. Add durable refresh recovery and exactly-once fraud completion.
2. Add historical snapshot helpers and wire reporting to them.
3. Normalize fraud windows and keep production/test runtime parity.
4. Expand offline acceptance coverage for all boundary cases.
5. Regenerate and verify contracts, then update OpenSpec artifacts, docs, and tracker evidence after validation.
