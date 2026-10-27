## Why

ShopCity needs a selectable Twilio Programmable Messaging option for its existing rendered business-SMS notifications. The provider must preserve the current outbox and truthful delivery-state contract, while avoiding duplicate submissions when Twilio cannot guarantee idempotency for a message-create request.

## What Changes

- Add Twilio as an explicitly selectable `SmsProvider`; preserve eBulkSMS as the default and leave existing providers unchanged.
- Authenticate with the Twilio Account SID plus API Key SID/Secret and require exactly one sender source: a Twilio `From` number or Messaging Service SID.
- Submit the existing fully rendered SMS body; retain the Twilio message SID and record acceptance as `SENT`, never `DELIVERED` without authenticated delivery evidence.
- Add a durable local pre-send reservation for Twilio outbox events. If a prior reservation is stale, mark the outcome unresolved/dead-lettered and require provider-history review instead of replaying it. Retry only an explicit HTTP 429 response.
- Document the provider's no-callback initial scope and the difference between Twilio test credentials and trial sends.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `sms-delivery-truthfulness`: add Twilio provider selection, provider-accepted `SENT` state, and no-replay behavior for ambiguous outcomes.
- `sms-operations`: document credentials, sender selection, local dispatch reservation, error handling, and that Twilio delivery callbacks are not ingested in this change.

## Impact

- Backend: `src/jobs/sms.provider.ts`, `src/jobs/sms.provider.factory.ts`, `src/jobs/outbox-worker.runtime.ts`, `src/config/env.validation.ts`, provider/config/worker tests, and the Twilio SDK dependency.
- Operations: `.env.example`, `docs/runbooks/sms-operations.md`, `docs/architecture/sms-and-otp-flows.md`, and `docs/development/gitnexus-impact-tracker.md`.
- No schema migration, public API, template, OTP, or frontend change; no live/test-credential API request as part of implementation.
