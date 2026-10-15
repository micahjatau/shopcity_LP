## Context

The existing `SmsProvider` contract already separates send submission from delivery-report lookup. `createSmsProvider` currently selects deterministic, fake sandbox, or eBulkSMS based on validated configuration, and the worker polls each provider message ID on the existing paced schedule. See `proposal.md` and the delta specs for motivation and observable behavior.

## Goals / Non-Goals

**Goals:**

- Add Arkesel V2 without changing the `SmsProvider` contract or the existing eBulkSMS default.
- Exercise Arkesel request construction against its non-billable sandbox before any live Arkesel traffic.
- Normalize Arkesel's per-message IDs and report states into the existing worker contract.

**Non-Goals:**

- Do not change business SMS templates, outbox/retry semantics, database schema, public APIs, OTP, or frontend code.
- Do not switch the production provider automatically or send a real Arkesel message as part of this change.
- Do not add Arkesel delivery webhooks; use the documented report API with the existing polling worker.

## Decisions

1. **Keep the provider interface and select the vendor in the factory.** Add `SMS_PROVIDER_VENDOR` with `ebulksms` as its default. `SMS_PROVIDER_MODE=real` plus vendor `arkesel` constructs the Arkesel adapter; all existing eBulkSMS settings and selection remain compatible. The existing generic fake `SMS_PROVIDER_MODE=sandbox` stays a fake provider, so it cannot be confused with Arkesel's external sandbox.

2. **Use explicit, provider-specific Arkesel settings.** Use `ARKESEL_API_KEY`, `ARKESEL_SENDER_ID`, optional `ARKESEL_API_URL` (defaulting to Arkesel's documented V2 endpoint), and `ARKESEL_SANDBOX`. Reuse the bounded provider timeout. Do not reuse the eBulkSMS username or API key. Production startup rejects `ARKESEL_SANDBOX=true`.

3. **Use the existing business template renderer and transactional use case.** Send one recipient per worker message, normalize the stored E.164 number to the country-code digits expected by Arkesel, place it in the documented nested `recipients` array (`[[digits]]` for one recipient), send the rendered message with `use_case: "transactional"`, and set `sandbox: true` only when explicitly configured. Authenticate with the `api-key` header; never put the key in the URL or logs.

4. **Use provider IDs for DLR polling.** Extract the recipient's `id` from the successful send response and use it in `POST /api/v2/sms/message-reports`. Read only the report entry keyed by that ID. Map `DELIVERED` to `DELIVERED`, `SUBMITTED`/`QUEUED` to `SENT`, and `NOT_DELIVERED`/`PROHIBITED`/`EXPIRED` to `FAILED`; unknown, absent, or mismatched reports return no update. A successful response without an ID remains `SENT` rather than being retried as a failed send.

5. **Retain the outbox correlation header.** Send the outbox event ID as the stable `Idempotency-Key` request header, matching the existing provider convention. Arkesel's public docs do not promise that it honors this header; production use therefore remains an operator decision after sandbox verification and provider confirmation of duplicate-request behavior.

## Risks / Trade-offs

- **Arkesel's supplied schema describes `recipients` as nested arrays while public quick-start examples show a flat array** → follow the supplied V2 schema (`[[digits]]` for one recipient), assert it in the request-contract test, and require sandbox acceptance before any further live test.
- **Arkesel does not document idempotency guarantees in the supplied API reference** → preserve the stable outbox idempotency header, sandbox first, and do not claim exactly-once delivery; confirm provider behavior before production rollout.
- **A successful send response may omit the message ID** → preserve `SENT` without a DLR reference; never retry a provider-accepted request solely because tracking metadata is absent.
- **Sandbox reports may not reach terminal delivery states because no handset delivery occurs** → treat sandbox submission/history as request-path evidence only, not proof of real carrier delivery.
- **Nigerian sender IDs are use-case-specific** → require an operator-registered transactional sender ID and keep the request use case fixed to `transactional`.

## Migration Plan

1. Add additive environment settings and provider selection; existing deployments without `SMS_PROVIDER_VENDOR` continue using eBulkSMS.
2. Configure an Arkesel API key and approved transactional sender in a non-production secret store; enable `ARKESEL_SANDBOX=true` only there.
3. Run mocked contract tests, then an operator-approved Arkesel sandbox request. Verify the sandbox record and DLR response without treating it as handset delivery.
4. Keep production on eBulkSMS until operators explicitly select Arkesel, disable sandbox, and confirm credentials, sender registration, and duplicate-request behavior.
5. Roll back by selecting `SMS_PROVIDER_VENDOR=ebulksms`; no database migration or historical data rewrite is required.

## Open Questions

- None block implementation. An Arkesel API key and approved sender ID are required before an external sandbox request; they must be provisioned through the secret store, not shared in chat or committed.
