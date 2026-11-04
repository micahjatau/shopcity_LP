## Why

ShopCity's transactional outbox already supports explicitly selected SMS providers, and Termii offers a standard single-recipient messaging endpoint. Adding Termii gives operators another provider choice without changing business templates or the existing eBulkSMS default.

## What Changes

- Add an explicitly selectable Termii provider for the existing transactional SMS outbox.
- Send one fully rendered message through Termii's JSON `/api/sms/send` endpoint using the `dnd` route, a registered sender ID, and the international recipient without the leading `+`.
- Validate Termii-specific credentials and HTTPS endpoint configuration while preserving eBulkSMS as the default.
- Record Termii's accepted response only as `SENT`; retain its provider message ID when present and do not infer handset delivery.
- Use the existing local submission reservation because Termii's supplied API contract does not document an idempotency parameter. Automatically retry only explicit HTTP 429; treat transport, timeout, and HTTP 5xx outcomes as ambiguous and terminal until provider history is checked.
- Document the required Termii account DND-route activation and sender registration. Do not make a live SMS request as part of implementation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `sms-delivery-truthfulness`: define Termii acceptance, delivery-state, retry, and ambiguous-outcome behavior.
- `sms-operations`: define provider selection/configuration, the transactional DND route, and account prerequisites.

## Impact

- Backend: `src/jobs/sms.provider.ts`, `src/jobs/sms.provider.factory.ts`, `src/config/env.validation.ts`, and the outbox worker's provider-neutral ambiguous-outcome diagnostic.
- Tests: SMS provider/factory, environment validation, and outbox reservation behavior.
- Operations: `.env.example`, `docs/runbooks/sms-operations.md`, and `docs/architecture/sms-and-otp-flows.md`.
- No database migration, public API change, dependency, business-template change, OTP change, WhatsApp/voice/bulk support, or live provider request.
