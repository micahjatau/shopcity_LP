## Why

Repository review 32 shows the release gate is still blocked by a few safety gaps: an applied migration was edited in place, restore verification still does not prove the shared Supabase backup path, Adjustment linking can still be too permissive, and the receipt-quarantine workflow remains destructive.

## What Changes

- Restore forward-only migration discipline by moving the latest repair follow-up into a new migration instead of editing the committed file in place.
- Add stricter Adjustment source validation on insert/update and extend historical preflight checks so only valid Adjustment-to-ledger links are accepted.
- Replace the destructive receipt-quarantine SQL with a report/stage/execute flow that preserves unapproved duplicates.
- Strengthen restore verification so it restores an actual shared backup and asserts checksum, object, and history integrity.
- Align release evidence and operational guidance with the verified migration path.

## Capabilities

### New Capabilities

- `release-hardening-guardrails`: release-readiness safeguards for migration history, adjustment linkage, receipt quarantine, and restore verification.

### Modified Capabilities

## Impact

- Prisma migrations and migration checksum verification
- Adjustment validation functions, triggers, and preflight checks
- Receipt quarantine SQL and integration tests
- Restore verification jobs and migration tracker documentation
- Release guidance in docs and repo review evidence
