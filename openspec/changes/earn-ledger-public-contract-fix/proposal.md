## Why

The current earn implementation has a parallel legacy receipt path that can reserve physical receipts without creating ledger entries, and the public API still cannot express the TRD-required pending-approval state cleanly. The change is needed now because the ledger core exists, but the public contract and safety gates are still not merge-ready.

## What Changes

- Consolidate public receipt capture behind one authoritative earn workflow.
- Deprecate or internalize legacy receipt review behavior so it cannot bypass ledger creation.
- Make the public earn contract distinguish confirmed earns from pending approvals with correct HTTP status and response fields.
- Add authoritative balance and expiry data to the transaction contract.
- Harden ledger and credit-lot invariants so confirmed financial history stays append-only and consistent.
- Complete outbox and SMS delivery readiness so committed earns have observable notification intent.
- Regenerate OpenAPI so the published contract matches runtime behavior.

## Capabilities

### New Capabilities
- `earn-ledger-public-contract-fix`: authoritative earn routing, public contract completeness, balance visibility, ledger integrity, and outbox readiness.

### Modified Capabilities

- None.

## Impact

Receipts and loyalty controllers/services, approval workflow handling, OpenAPI generation, Prisma schema and migration SQL, outbox worker plumbing, contract and integration tests, and migration-tracker documentation.
