## 1. CI gates

- [x] 1.1 Restore the static verification stage so `verify:fast` runs before the release gates.
- [x] 1.2 Keep build, Prisma, OpenAPI, unit, e2e, integration, and GitNexus checks after the restored static stage.
- [x] 1.3 Confirm the pipeline fails on formatting drift, ESLint failures, and type errors in test/support sources.

## 2. Public API contract

- [x] 2.1 Expand the transaction detail and customer ledger/approval-list response schemas to match the service payloads.
- [x] 2.2 Split the earn response into confirmed and pending-approval schemas with the correct required fields.
- [x] 2.3 Regenerate and validate OpenAPI output so the committed contract stays aligned with the implemented responses.

## 3. SMS recovery terminalization

- [x] 3.1 Add supported SMS event and payload validation before recovery republishes work.
- [x] 3.2 Mark exhausted retries and poison events as terminal dead-letter work instead of looping them back into recovery.
- [x] 3.3 Add regression coverage for unsupported event types, invalid payloads, and retry exhaustion.

## 4. Production SMS provider hardening

- [x] 4.1 Add a timeout and runtime response validation to the real SMS provider path.
- [x] 4.2 Classify provider failures as retryable or terminal based on the actual HTTP/runtime response.
- [x] 4.3 Require the production provider configuration and environment documentation to include the needed URL, auth, and worker recovery settings.
- [x] 4.4 Add tests for timeout behavior, invalid status handling, and missing production configuration.

## 5. Approval policy reapplication

- [x] 5.1 Re-evaluate current purchase ceiling, approval threshold, and policy version during approval execution.
- [x] 5.2 Enforce approval expiry before applying the financial effect.
- [x] 5.3 Add tests for stale-policy rejection and expired approval rejection.

## 6. Migration verification evidence

- [x] 6.1 Run the visible clean-database migration verification flow for the current head.
- [x] 6.2 Update `docs/database/migration-tracker.md` with the verified status and execution evidence.
- [x] 6.3 Re-run the relevant schema and integration checks to confirm the tracker update matches the observed result.
