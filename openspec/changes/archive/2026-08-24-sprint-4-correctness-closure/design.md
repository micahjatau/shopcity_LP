## Context

Review 42 identified a narrow set of release blockers in Sprint 4: approval-path fraud work can be skipped, fraud replay is not fully terminal, behavioral fraud logic is split between production and test paths, reporting still has a few mutable-input and concurrency problems, and report refresh is detached instead of durable. The goal is to close those correctness gaps without reopening the broader financial model.

## Goals / Non-Goals

**Goals:**

- Emit fraud evaluation for pending-approval earn/redemption flows.
- Make fraud processing terminal, replay-safe, and backed by one shared runtime.
- Normalize behavioral fraud rule windows and dedupe keys to the actual branch-day boundary.
- Keep duplicate-attempt evidence append-only and durable across uniqueness failures.
- Rebuild reporting from authoritative as-of evidence, including confirmed-only activity and reversal-aware totals.
- Protect same-tenant reporting rebuilds with one lock domain.
- Make report refresh durable instead of best-effort in-memory scheduling.
- Preserve offline accept/reject semantics while expanding duplicate-race coverage.

**Non-Goals:**

- Redesign the ledger model.
- Introduce a warehouse or analytics pipeline.
- Change money semantics or confirmed financial history rules.
- Add new customer-facing endpoints beyond what is needed to make refresh/reporting durable.

## Decisions

1. Use one fraud runtime path for production and regression coverage.

- Rationale: the worker and the tests must exercise the same source-row queries, rule construction, and dedupe behavior.
- Alternative: keep separate service/runtime implementations. Rejected because it keeps the strongest test from validating the production code path.

2. Key behavioral fraud by branch-local day windows.

- Rationale: daily anomaly rules should dedupe across receipts in the same branch-day window, not by receipt-specific timestamps.
- Alternative: keep receipt-timestamp keys. Rejected because it fragments one logical anomaly into multiple findings.

3. Treat report refresh as durable work.

- Rationale: detached promises can disappear on process exit or redeploy; refresh requests should survive process boundaries.
- Alternative: leave refresh as an in-process fire-and-forget promise. Rejected because it is not operationally reliable.

4. Keep reporting lock scope tenant-wide.

- Rationale: tenant rebuilds delete tenant rows, so branch and tenant materializations must not run concurrently for the same tenant.

## Risks / Trade-offs

- Fraud totals and report totals may shift after the incorrect paths are fixed. This is expected.
- Durable refresh may require a small queue/outbox addition or reuse of an existing job channel.
- Shared fraud runtime may require test fixture cleanup, but reduces long-term drift.

## Migration Plan

1. Route pending-approval earn/redemption fraud work into the same durable path as immediate-confirmation flows.
2. Make fraud event completion terminal and preserve duplicate evidence across uniqueness failures.
3. Unify behavioral fraud runtime code and normalize branch-day dedupe keys.
4. Fix reporting inputs, lock scope, and refresh durability.
5. Update offline regression coverage and refresh evidence/docs after validation.

Rollback is to restore the previous fraud/report scheduling behavior inside this change set; no destructive ledger rollback is expected.
