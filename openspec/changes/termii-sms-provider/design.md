## Context

The existing outbox submits one fully rendered message per event through `SmsProvider`. Existing business templates represent completed or upcoming ShopCity transactions and do not provide a promotional campaign path. Termii's documented Messaging API accepts a JSON send request with `api_key`, `to`, `from`, `sms`, `type`, and `channel`; its documentation distinguishes transactional `dnd` from promotional `generic` routing and states that DND activation is an account prerequisite. See [Termii Messaging API](https://developers.termii.com/messaging-api).

## Goals / Non-Goals

**Goals:**

- Add Termii as an explicit adapter and preserve provider-neutral outbox behavior.
- Keep request semantics limited to one transactional SMS per outbox event.
- Preserve truthful submission status and prevent automatic duplicate submission after ambiguous outcomes.

**Non-Goals:**

- Do not change business templates, outbox schema, default provider, OTP, or business transaction behavior.
- Do not add promotional campaigns, generic routing, WhatsApp, voice, bulk sends, DLR callbacks, or provider balance/cost reporting.
- Do not make a live Termii request or add Termii credentials to the repository.

## Decisions

1. **Use the standard single-recipient JSON endpoint.** The adapter POSTs to the configured full HTTPS endpoint (default `https://api.ng.termii.com/api/sms/send`; use `TERMII_API_URL` to override it with the account-specific base URL plus `/api/sms/send`). It sends `api_key` in the JSON body as documented, `from` as the configured sender ID, the rendered message in `sms`, `type: plain`, and the E.164 destination without its leading `+`. No recipient arrays, bulk endpoint, undocumented request fields, or request logging are used.

2. **Fix the route to DND.** All current outbox templates are transactional notifications; therefore the adapter always uses `channel: dnd`. It does not expose a generic route setting and never falls back to `generic`, which Termii documents for promotions and which may not reach DND numbers. Termii account-level DND activation and sender ID registration are prerequisites for live use.

3. **Keep the provider optional and credentials scoped.** Add `termii` as a validated vendor selected only with `SMS_PROVIDER_MODE=real`; retain the `ebulksms` default. Require `TERMII_API_KEY` and a 3–11 character alphanumeric `TERMII_SENDER_ID`. Validate `TERMII_API_URL` as HTTPS and allow an account-specific override. There is no Termii sandbox behavior in the supplied API contract, so do not add one.

4. **Normalize only documented acceptance.** A successful HTTP response with `code: ok` maps to `SENT`; prefer `message_id_str`, then `message_id`, as the provider reference when present. If Termii confirms acceptance but omits an ID, keep `SENT` without a reference so the outbox does not resend an accepted message. Do not infer `DELIVERED` from the send response; the adapter does not poll or ingest delivery evidence.

5. **Avoid unsafe automatic replay.** Only an explicit HTTP 429 is retryable. Other rejections are terminal; HTTP 5xx, timeouts, transport errors, and successful HTTP responses without a valid `code: ok` marker are outcome-unknown/terminal because the supplied API contract documents no idempotency field. Mark these adapter results with `outcomeUnknown: true` so the reserved outbox worker uses its existing `provider-outcome-unknown` dead-letter path rather than treating them as ordinary terminal rejections. Do not add an undocumented correlation key. Enable the existing local submission reservation for Termii, using a window at least `SMS_PROVIDER_TIMEOUT_MS + 5s`, so a concurrent worker or recovery attempt cannot resubmit a live call. Generalize the worker's stale-reservation diagnostic from Twilio-specific wording to provider-neutral wording.

6. **Keep provider responses private.** Do not include API keys, message text, full phone numbers, provider response bodies, or Termii's balance/user fields in errors or logs. Persist only normalized status, a returned message ID, and safe diagnostic text. Cost remains unavailable unless supported by invoice-accurate evidence.

## Risks / Trade-offs

- **DND may not be enabled for the Termii account** → require account activation and a registered sender before production; never fall back to promotional `generic` routing.
- **No provider idempotency field is documented** → use the local submission reservation, make ambiguous outcomes terminal, and require provider-history verification before manual replay.
- **No delivery-evidence integration is included** → accepted messages remain `SENT`; a callback/report integration requires a separately specified authenticated delivery-evidence path.
- **The account may use a region-specific base URL** → provide `TERMII_API_URL` and validate it as HTTPS; operations must use the value shown for the account.
- **No Termii sandbox contract was provided** → do not assume a no-delivery test mode or send a test SMS as part of implementation.

## Migration Plan

1. Add the provider and its validated configuration while leaving `SMS_PROVIDER_VENDOR=ebulksms` as the default.
2. Add contract tests using mocked HTTP responses only; run no external Termii request.
3. Before selecting Termii in production, operators must store the API key in the secret manager, register the sender ID, activate DND routing, and confirm the account-specific API URL.
4. Roll back by selecting the previously configured provider. No database or financial-data migration is required.

## Open Questions

None block the adapter. The operator-specific Termii endpoint and DND/sender activation must be confirmed before any live use; no live send is authorized by this change.
