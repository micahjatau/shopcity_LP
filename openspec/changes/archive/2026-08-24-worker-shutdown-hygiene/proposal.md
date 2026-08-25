## Why

The worker recovery tests still leave noisy background activity behind when Redis or the worker shuts down, which makes the suite harder to trust and can hide real failures. We need a deterministic shutdown path so worker tests and local runs exit cleanly without lingering retries, open handles, or log spam.

## What Changes

- Make worker shutdown fully deterministic, including BullMQ queue/worker teardown and interval cleanup.
- Remove test-only reliance on long-lived background Redis processes or hanging cleanup races.
- Tighten integration test harnesses so Redis lifecycle and worker lifecycle are explicit and bounded.
- Preserve existing outbox recovery behavior while improving process cleanup and test exit reliability.

## Capabilities

### New Capabilities

- `worker-shutdown-hygiene`: deterministic worker teardown, bounded Redis test lifecycle, and clean test-process exit for worker recovery coverage.

### Modified Capabilities

-

## Impact

Affected areas include the outbox worker runtime, Redis test harness utilities, worker integration specs, and test execution behavior in local and CI environments.
