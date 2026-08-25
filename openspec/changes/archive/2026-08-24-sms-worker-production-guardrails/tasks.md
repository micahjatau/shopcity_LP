## 1. Worker bootstrap guard

- [x] Update the worker entrypoint to create the SMS provider before Prisma or Redis startup.
- [x] Keep the production deterministic-mode failure on the bootstrap path.
- [x] Add a startup test that proves production deterministic mode fails before connections are opened.

## 2. Environment validation

- [x] Confirm the shared env schema accepts `deterministic`, `sandbox`, and `real`.
- [x] Keep real-mode provider URL validation explicit and document the supported provider settings in the env example.
- [x] Add tests for real-mode validation and sandbox/deterministic acceptance.

## 3. Retry-budget enforcement

- [x] Short-circuit SMS handling when the persisted row is dead-lettered or has exhausted the retry budget.
- [x] Stop the current BullMQ job from consuming remaining retries once the message becomes terminal.
- [x] Add regression coverage for replayed jobs and dead-lettered rows.
