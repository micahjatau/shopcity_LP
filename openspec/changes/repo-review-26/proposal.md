## Why

Repo review 26 shows the latest OpenAPI fix is still only partial hardening: the committed contract improved, but the generated client is stale and the remaining release evidence is not yet trustworthy. The next change needs to close the contract drift and prove the hardening gate with current-head evidence.

## What Changes

- Regenerate and typecheck the OpenAPI-generated client when the contract changes.
- Add CI coverage for client-generation cleanliness and the affected release checks.
- Record current-head release evidence for the Sprint 3B hardening gate instead of marking it complete by intent.
- Reconcile shared migration history with deployable evidence and backup/restore or forward-fix proof.
- Keep reversal and manual-adjustment expansion blocked until the hardening gate is satisfied.

## Capabilities

### New Capabilities
- `repo-review-26-hardening`: Tracks the remaining Sprint 3B release gate, current-head evidence, and tracker truthfulness needed to close the hardening gap.
- `openapi-client-consistency`: Keeps the generated TypeScript client aligned with the committed OpenAPI contract and fails CI on drift.

### Modified Capabilities
- `migration-safety`: Shared-environment migration completion must continue to require deployable migration history plus recorded evidence, not schema shape alone.

## Impact

Affected areas include OpenAPI-generated artifacts, CI checks, release evidence tracking, migration verification evidence, and the Sprint 3 planning trackers.
