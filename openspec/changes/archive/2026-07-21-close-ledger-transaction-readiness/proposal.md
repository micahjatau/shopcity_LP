## Why

Receipt capture is closer to production-safe, but it still writes against precomputed branch context, has no explicit approval workflow, and does not expire idempotency records. Those gaps are small individually and dangerous together because they block a safe handoff from receipt capture to ledger posting.

## What Changes

- Rework receipt capture so branch and receipt-week values are derived inside the database transaction from authoritative records.
- Add an explicit receipt approval/rejection workflow for pending receipts, including actor validation and audit coverage.
- Make idempotency records expire atomically instead of replaying stale results forever.
- Add focused tests for concurrent receipt capture, approval state transitions, and expired idempotency behavior.

## Capabilities

### New Capabilities

- `receipt-ledger-readiness`: authoritative receipt capture, approval workflow, and idempotency expiry needed before ledger posting can safely build on receipts.

### Modified Capabilities

-

## Impact

Affected areas include receipt capture, receipt approval, idempotency handling, Prisma schema, audit logging, and integration tests. The change also tightens the trust boundary between session/device context and receipt persistence.
