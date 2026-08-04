## Why

The review gate still has several production-blocking gaps across approval execution, SMS handling, quarantine safety, reversal behavior, and restore verification. This change closes those gaps so the release decision reflects the actual runtime and recovery behavior of the system.

## What Changes

- Harden approval execution so it locks every mutable record that can affect eligibility before re-reading state.
- Fix deadline-driven approval expiry ownership so system-triggered expirations are not attributed to the requesting supervisor.
- Make malformed persisted SMS payloads terminal on first processing attempt.
- Require explicit, immutable batch selection and source-row locking for receipt quarantine execution.
- Disable the reversal endpoint for this release instead of pretending a review request exists.
- Expand protected-restore verification to compare the full migration ledger and historical business data.

## Capabilities

### New Capabilities
- `review-35-blockers`: release-readiness hardening across approval locking, expiry attribution, SMS terminal failure handling, quarantine safety, reversal truthfulness, and restore verification.

### Modified Capabilities

- None.

## Impact

Approval execution, supervisor decision flow, SMS worker processing, quarantine scripts and tests, reversal API behavior, protected restore verification, release evidence, and related regression suites.
