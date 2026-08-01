## Why

Repo review 30 shows the halfway gate is still blocked because shared-database trigger state is not yet proven, release evidence is being marked complete without enough proof, and adjustment records can still drift away from the ledger facts they are supposed to represent.

## What Changes

- Tighten migration safety so restored shared-database verification must prove required SQL objects, triggers, and historical effects exist before release.
- Tighten release evidence handling so repo-review and migration claims stay open unless they are backed by visible workflow, restore, or database-object evidence.
- Add adjustment-to-ledger integrity requirements so adjustment rows must match their source ledger entry and remain immutable after creation.

## Capabilities

### New Capabilities
- `adjustment-evidence-integrity`: adjustment ledger entries must match the corresponding adjustment record and the adjustment evidence fields must be immutable.

### Modified Capabilities
- `migration-safety`: shared-database verification must prove custom SQL objects, triggers, and historical effects on a restored database, not only migration ledger state.
- `sprint-2-release-evidence`: tracker entries and repo-review completion claims must remain unproven until visible evidence exists.

## Impact

Restored-database verification flow, migration-tracker evidence, repo-review closure records, adjustment ledger validation, adjustment immutability rules, and the database integration tests that prove these invariants.
