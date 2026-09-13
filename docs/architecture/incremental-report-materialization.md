# Incremental report materialization design

## Boundary

Materialization processes one tenant/branch business day at a time. The
`ReportMaterializationState` watermark is the durable cursor; it is advanced in
the same transaction as the rebuilt day’s report rows and audit/outbox evidence.

## Algorithm

1. Select the next unapplied business date at or after the tenant watermark.
2. Resolve the branch timezone and compute a half-open `[start, end)` window.
3. Rebuild only that tenant, branch, and date using authoritative ledger, lot,
   redemption, approval, and SMS status history.
4. Upsert the day’s rows deterministically, then advance the watermark.
5. Repeat with a bounded batch size; retry the same date safely after failure.

Current snapshots remain separate from historical daily rows. Rebuilds therefore
cannot rewrite prior-day stock meaning with a later current balance.

## Operational limits

The initial batch should be bounded by measured pilot volume. Capture duration,
row counts, lock wait, and query timings before changing the batch size. A
future optimization may partition by branch/day, but must preserve tenant scope
and deterministic retries.
