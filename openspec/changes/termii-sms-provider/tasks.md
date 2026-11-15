## 1. Provider and configuration

- [x] 1.1 Implement the single-recipient Termii SMS adapter using the JSON DND contract, truthful acceptance mapping, timeout handling, and local submission reservation; verify with focused contract/error tests in `src/jobs/sms.provider.spec.ts`.
- [x] 1.2 Add explicit `termii` provider selection, HTTPS endpoint validation, required API-key/sender validation, and default-preserving factory configuration; verify with `src/config/env.validation.spec.ts` and provider-factory tests.
- [x] 1.3 Generalize stale local-reservation diagnostics for providers without idempotency and cover outcome-unknown behavior; verify with `src/jobs/outbox-worker.runtime.spec.ts`.

## 2. Operations and documentation

- [x] 2.1 Document Termii configuration, DND account activation, sender registration, no-delivery-evidence behavior, and safe rollback in `.env.example`, `docs/runbooks/sms-operations.md`, and `docs/architecture/sms-and-otp-flows.md`; verify the docs match the OpenSpec requirements.

## 3. Verification

- [x] 3.1 Run focused SMS provider, environment-validation, and outbox-worker tests plus lint/typecheck; record results and fix failures.
- [x] 3.2 Run strict OpenSpec validation and GitNexus change detection; verify eBulkSMS remains the default and no live Termii request or secret was used.
