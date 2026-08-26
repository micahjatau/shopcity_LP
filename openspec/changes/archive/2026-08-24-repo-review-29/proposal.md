## Why

Repo review 29 shows the release gate is still blocked by contract drift and unproven database state. The reversal boundary advertises a success path that runtime does not provide, the credit-lot/restoration work is still incomplete, and shared migration evidence may be overstated, so the repo needs a tighter hardening pass before implementation resumes.

## What Changes

- Remove the false public reversal success contract and keep the boundary review-required until real reversal workflow exists.
- Reopen credit-lot lifecycle requirements so adjustment credits and restoration ownership are enforced by the spec, not just by tracker status.
- Strengthen migration safety so custom SQL objects in the restored shared database must be proven present, not merely marked applied in the migration ledger.
- Tighten release evidence tracking so only evidence-backed state is recorded as complete.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `financial-workflow-contracts`: reversal responses and OpenAPI/runtime parity must stop advertising a successful reversal path before implementation exists.
- `credit-lot-lifecycle-integrity`: adjustment-credit ownership and original-debit restoration requirements must be enforced and tested.
- `migration-safety`: shared database verification must prove custom SQL objects and backfill effects exist, not just that migrations are recorded as applied.
- `sprint-2-release-evidence`: tracker and release evidence must only record states backed by visible verification.

## Impact

OpenAPI and generated-client output, reversal controller/service behavior, credit-lot and restoration database constraints, migration verification and backup/restore checks, release evidence docs, and the task tracker entries that summarize repo-review completion.
