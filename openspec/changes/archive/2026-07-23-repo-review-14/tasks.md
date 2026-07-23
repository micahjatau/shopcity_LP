## 1. Provider wiring

- [x] 1.1 Require the production worker to construct its SMS provider through the environment-aware factory.
- [x] 1.2 Align the worker bootstrap and environment validation with the supported provider modes.

## 2. Bounded retries

- [x] 2.1 Add a terminal-state requirement so dead-lettered SMS messages do not continue sending.
- [x] 2.2 Add a terminal-state requirement for exhausted retry budgets.

## 3. Replay safety

- [x] 3.1 Require replay-safe provider behavior for duplicate BullMQ retries.
- [x] 3.2 Add regression coverage for duplicate-job and retry-exhaustion scenarios.

## 4. Verification

- [x] 4.1 Update verification notes and migration tracking if schema or deployment guidance changes.
