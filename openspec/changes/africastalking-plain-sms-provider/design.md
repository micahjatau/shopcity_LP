## Context

The existing `SmsProvider` abstraction submits one rendered notification and optionally supports provider-side DLR polling. Africa's Talking's standard `/version1/messaging` endpoint accepts form-encoded plain text, returns per-recipient message references, and its delivery reports use callbacks rather than a polling endpoint. The worktree already contains uncommitted eBulkSMS and Arkesel changes that must be preserved.

## Goals / Non-Goals

**Goals:**

- Add Africa's Talking as an explicitly selected provider while preserving the `SmsProvider` contract and the eBulkSMS default.
- Support a separate Africa's Talking live configuration and non-production sandbox configuration.
- Record only truthful submission acceptance as `SENT` and retain the matching provider message ID.

**Non-Goals:**

- Do not change business templates, outbox/retry semantics, database schema, public APIs, OTP, or frontend behavior.
- Do not add a public DLR callback endpoint in this change; callbacks are not currently part of the SMS provider abstraction.
- Do not change the configured default provider, perform a live SMS test, or claim exactly-once submission.

## Decisions

1. **Select Africa's Talking by vendor without changing the abstraction.** Add `africastalking` to validated vendor selection; keep `ebulksms` as the default, and leave Arkesel's selection and safeguards unchanged.

2. **Use the standard plain-SMS endpoint.** Post one recipient and the existing fully rendered message to `https://api.africastalking.com/version1/messaging` (or `https://api.sandbox.africastalking.com/version1/messaging` in explicit non-production sandbox mode) as `application/x-www-form-urlencoded`. Send the API key in the `apiKey` header and use `username`, `to`, `message`, and `from` fields; never call Premium or bulk-specific endpoints. Sandbox uses username `sandbox` and a distinct sandbox API key; live uses the configured account username and live key. Do not send an undocumented `requestId` field to the standard endpoint.

3. **Require an explicit sender ID for live sends.** Although the API can default the sender, the worker must use ShopCity's configured registered sender instead of silently sending under a provider default. Keep the sender ID within Africa's Talking's country-specific registration requirements; operator confirmation is required before live operation.

4. **Map only recognized recipient acceptance.** Match the single recipient in `SMSMessageData.Recipients`, accept only documented status codes `100`, `101`, and `102` as `SENT`, and retain that same recipient's `messageId`. Treat every other recipient status as terminal; allow only explicit HTTP `429` rate-limit responses to retry. Treat HTTP 5xx responses, transport errors, and timeouts as terminal with an instruction to verify provider history before retry, because the endpoint documents no idempotency guarantee. Never store raw response bodies or infer `DELIVERED` from a send response.

5. **Defer callback ingestion and keep `SENT` honest.** Africa's Talking delivery reports arrive asynchronously by callback; the current backend only polls providers implementing `getDeliveryReport` and has no authenticated Africa's Talking callback route. Omit that optional method and document that messages remain `SENT` until a future, separately specified callback integration is added. Do not send an undocumented correlation or idempotency field and do not claim the provider deduplicates retries.

6. **Keep live and sandbox credentials separate.** Add vendor-specific environment validation for live username/key, sandbox key/username, sender ID, and optional HTTPS endpoint override. Reject sandbox mode in production and reject sandbox configuration when another vendor is selected.

## Risks / Trade-offs

- **DLR callbacks are not consumed in this change** → accepted messages remain `SENT`, not falsely `DELIVERED`; implement callback verification and persistence in a separate OpenSpec change before claiming handset delivery.
- **The standard SMS endpoint does not document client-side idempotency** → do not claim exactly-once submission; classify ambiguous timeouts/5xx as non-retryable until an operator verifies provider history, preventing automatic duplicate sends.
- **Nigerian transactional sender IDs may need approval and DND whitelisting** → require a configured sender ID and operator account approval before selecting the provider for live sends.
- **Provider status/cost responses vary by recipient and region** → match the requested recipient, map only documented statuses, and report cost as unavailable unless an invoice-accurate value is available.

## Migration Plan

1. Add the adapter and provider-specific settings while leaving `SMS_PROVIDER_VENDOR=ebulksms` as the default.
2. Run provider/config contract tests and build checks; do not make an external request as part of implementation.
3. After sender registration and separate sandbox credentials are verified, an operator may select Africa's Talking sandbox in non-production and validate the simulator response.
4. Live use requires a separately approved destination, exact neutral test content, registered Nigerian sender ID, and explicit per-send authorization; configuration can roll back by selecting the existing provider without data migration.

## Open Questions

- Whether Africa's Talking's account-level DLR callback can be safely exposed through an authenticated, replay-protected ShopCity endpoint is deferred; it does not block truthful `SENT`-only provider submission.
