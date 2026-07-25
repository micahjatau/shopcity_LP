## Why

Repo review 17 found that Sprint 2 is not ready to close because the configured production SMS provider does not match the documented eBulkSMS API and expired approvals are not persisted as expired. These defects can cause unsent customer notifications to be recorded as sent, leave approvals permanently pending, and make the current head appear release-ready without adequate verification evidence.

## What Changes

- Add a provider-specific eBulkSMS adapter that sends the vendor JSON contract, renders real SMS text, maps vendor responses into ShopCity retryable or terminal outcomes, and validates runtime responses.
- Ensure production only permits a real SMS provider by default, blocking fake deterministic and sandbox providers unless an explicit emergency override is enabled.
- Fix approval expiry persistence so expired approvals commit `EXPIRED` and `decidedAt` before returning an expiry error, without creating ledger entries, credit lots, or outbox events.
- Add regression coverage for expired approval persistence and stale-policy rejection.
- Make GitNexus CI execution use the lockfile-backed repository dependency and pin the package manager used by CI.
- Update OpenAPI coverage for approval decision 422 responses and the approval decision `reason` field.
- Tighten SMS reliability edges: timeout response-body parsing, validate provider response shape, require reconstructed SMS receipt IDs, and close the worker startup/shutdown race.
- Correct migration tracker and release evidence language so verification status reflects visible current-head CI results.

## Capabilities

### New Capabilities

- `production-sms-delivery`: Defines production-safe SMS delivery through eBulkSMS, provider selection constraints, vendor request/response mapping, timeout behavior, runtime validation, and invalid payload handling.
- `approval-expiry-and-policy`: Defines durable approval expiry, stale-policy rejection, approval decision error/response contract, and required regression evidence.
- `release-verification-evidence`: Defines deterministic CI verification for GitNexus and migration tracker evidence before declaring Sprint 2 release readiness.

### Modified Capabilities

- None.

## Impact

- Affected application areas: SMS provider configuration and factory, real/eBulkSMS provider implementation, SMS worker and outbox recovery, approval execution and decision handling, OpenAPI decorators/schemas, GitHub Actions CI, package manager configuration, and migration documentation.
- Affected tests: SMS provider contract tests with a mocked HTTP server, SMS worker/recovery regression tests, approval integration tests for expiry and stale policy paths, OpenAPI generated contract checks, and CI verification gates.
- External systems: eBulkSMS JSON API, production environment configuration, GitHub Actions, Prisma migration verification, Redis/BullMQ-backed SMS processing.
