## Context

The existing `SmsProvider` interface submits one fully rendered business notification and optionally polls delivery reports. Twilio's Messages API creates messages through `client.messages.create`; the returned message SID is an acceptance reference, not delivery evidence. Twilio status callbacks are not currently ingested by ShopCity.

Twilio's documented Messages create endpoint does not document provider-side idempotency keys. ShopCity's outbox can recover/replay published work after worker interruption, so a normal adapter with no persistent send reservation could duplicate a message if the provider accepted it immediately before the worker lost its result.

The worktree is already dirty with unrelated application and SMS provider changes. All existing changes must be preserved. Twilio credentials are absent from dotenv; implementation and tests must not make API calls.

## Goals / Non-Goals

**Goals:**

- Add Twilio as an explicit provider using the official Node.js SDK and API-key authentication.
- Support a trial `From` number or a Messaging Service SID, requiring exactly one.
- Persist only Twilio's message SID and a truthful `SENT` acceptance state.
- Reserve each Twilio outbox event locally before sending; never automatically replay an interrupted/ambiguous reservation.
- Keep eBulkSMS the default and preserve all existing vendor and fake-provider behavior.

**Non-Goals:**

- Do not add Twilio inbound-message handling or delivery-status callback ingestion. Without callback evidence, messages remain `SENT`.
- Do not send a live, trial, or test-credential message as part of implementation.
- Do not add Twilio test-credential mode or infer that a trial send is non-delivering.
- Do not change OTP, message templates, or public APIs.
- Do not add a database migration or apply any database change.

## Decisions

1. **Use the official Node SDK and API-key authentication.** Add the `twilio` package and initialize its client with `TWILIO_API_KEY`, `TWILIO_API_SECRET`, and `TWILIO_ACCOUNT_SID`. The application, not the CLI, sends messages. Never log credentials, body, or full destination.

2. **Require one sender mechanism.** Validate either `TWILIO_FROM_NUMBER` in E.164 format or `TWILIO_MESSAGING_SERVICE_SID` (an `MG...` SID), but reject both or neither. Trial setup uses the assigned Twilio number and recipient verification requirements are controlled by Twilio.

3. **Map provider creation to `SENT`.** A successful SDK response must include a non-empty message SID; persist it as `providerMessageId` and return `SENT`. Do not map the response's initial status to `DELIVERED`; this change does not ingest authenticated callbacks or poll Twilio status.

4. **Use a local one-shot reservation because provider idempotency is undocumented.** Add an optional `requiresLocalSubmissionReservation` capability to `SmsProvider`, enabled only by Twilio. Before its network call, the worker atomically claims the `SmsMessage` using its existing identity/state/attempt fields and records a private `submission-in-progress` marker plus `lastAttemptAt`. A concurrent/replayed job must not send while the marker is fresh. Its reservation window is the greater of the worker recovery threshold and the Twilio SDK request timeout plus a five-second safety margin. If a later recovery finds the marker stale, it marks the message/outbox dead-lettered with a safe 'outcome unknown; verify Twilio history before manual replay' diagnostic. Existing `failureCategory` and timestamps are reused; no migration is needed. A definitive HTTP 429 response clears the marker through the normal retryable-failure path. Other HTTP errors, transport errors, malformed success responses, and interrupted attempts are terminal until history is checked.

5. **Preserve other providers' retry behavior.** The local reservation capability is opt-in and only enabled for Twilio; eBulkSMS, Arkesel, Africa's Talking, deterministic, and local sandbox paths retain their current dispatch behavior.

6. **Keep the default unchanged.** Add `twilio` to the vendor allow-list but retain `SMS_PROVIDER_VENDOR=ebulksms`. Twilio credentials remain optional unless `SMS_PROVIDER_MODE=real` and the Twilio vendor is explicitly selected. Production never selects fake provider modes.

## Risks / Trade-offs

- **No native idempotency guarantee for Messages create** → local reservation favors no duplicate sends; a crash after reservation but before request can leave a message unresolved and require provider-history review before manual replay.
- **No callback ingestion** → Twilio acceptance remains `SENT`, not `DELIVERED`; a separate authenticated, replay-safe callback change is needed for delivery evidence.
- **Trial restrictions and sender availability vary by account/country** → configuration validates shape only; operators must confirm their sender, verified recipient, geo permissions, and regulatory readiness before any actual send.
- **Credentials absent locally** → provider tests use an injected fake client; no credentials or external requests are needed for implementation.

## Migration Plan

1. Add the SDK, adapter, selection/configuration, local reservation, tests, and operations documentation.
2. Verify provider request construction using a fake client and worker reservation tests; run focused Jest, lint, build, Semgrep, formatting, OpenSpec validation, and `git diff --check`.
3. Keep the provider unselected in dotenv and leave eBulkSMS as default; do not make any Twilio API call.
4. Before a separate operator-approved trial send, configure the Twilio API key and sender locally, use a verified destination and neutral exact content, and obtain explicit per-send authorization. Test credentials may simulate API requests but do not prove handset delivery.

## Open Questions

- Twilio delivery callbacks and signature validation are deferred; add them in a separately scoped change before any Twilio message can become `DELIVERED`.
