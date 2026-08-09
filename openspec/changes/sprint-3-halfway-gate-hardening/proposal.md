## Why

Repo review 25 shows Sprint 3 is functionally halfway complete, but the release gate is still not trustworthy. The biggest remaining risks are a reversal endpoint that still advertises success, release evidence that does not yet prove deployable migration history, and workflow edge cases that can still drift out of order at runtime.

## What Changes

- Remove the false success contract from the reversal boundary until real reversal execution exists.
- Make completed idempotency responses resolve before mutable eligibility checks on retried financial requests.
- Add bounded retry handling for redemption serialization conflicts.
- Move approval expiry out of request-driven listing behavior and into a bounded scheduled worker with audit events.
- Scope cashier transaction reads to the correct branch or actor boundary.
- Require deployable migration history, recovery evidence, and current-head CI evidence before the halfway gate is marked pass.

## Capabilities

### New Capabilities

- `sprint-3-halfway-gate-hardening`: Hardens the remaining halfway-release blockers around runtime truth, workflow ordering, approval expiry, transaction access scope, and release evidence.

### Modified Capabilities

## Impact

Affected areas include the reversal HTTP/OpenAPI contract, redemption idempotency and conflict handling, approval expiry flow, cashier transaction-read authorization, migration tracking, release evidence records, and the validation suite that proves the halfway gate is still blocked until those checks pass.
