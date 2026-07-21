## Why

The repository still has persistent CI pain points: lint fails on the Redis fail-closed integration spec because of unsafe test harness typing, and the integration suite does not complete cleanly after bootstrap. This change fixes the validation path now so future backend work can land against a stable green baseline.

## What Changes

- Remove unsafe `any` and `require()` usage from the failing integration harnesses.
- Standardize integration test bootstrap on the typed `createApp` entrypoint.
- Make resource setup and teardown deterministic so Jest can exit cleanly.
- Keep the application runtime behavior unchanged; this change is limited to validation and test harness stability.

## Capabilities

### New Capabilities
- `ci-validation-stability`: repository validation SHALL complete with typed test harnesses, deterministic bootstrap/teardown, and no unsafe integration-test escape hatches.

### Modified Capabilities

## Impact

- `test/auth-http.int-spec.ts`
- `test/receipts.int-spec.ts`
- `test/redis-throttle-fail-closed.int-spec.ts`
- `src/bootstrap.ts`
- CI-local validation commands: `npm run typecheck`, `npm run lint`, `npm run test:integration`
- Generated docs and snapshots only if the implementation requires them
