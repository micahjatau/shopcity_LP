## 1. Configuration and Provider Selection

- [x] 1.1 Add validated Africa's Talking live/sandbox settings and enforce that its sandbox cannot be selected in production; verify with `npx jest src/config/env.validation.spec.ts --runInBand`.
- [x] 1.2 Add explicit `africastalking` factory selection while preserving eBulkSMS as the default and all current provider paths; verify factory tests in `src/jobs/sms.provider.spec.ts`.
- [x] 1.3 Document provider selection, distinct live/sandbox credentials, sender-ID requirements, and no live smoke in `.env.example` and the SMS runbook; verify names and defaults match validation.

## 2. Africa's Talking Adapter

- [x] 2.1 Implement the standard form-encoded one-recipient send request, API-key header, timeout, and rendered message; verify the request-contract unit test.
- [x] 2.2 Map accepted recipient status codes and matching `messageId` to truthful `SENT`, classify known rejections, and leave delivery confirmation unavailable; verify response-mapping tests.

## 3. Documentation and Verification

- [x] 3.1 Update SMS delivery-truthfulness and operations artifacts to state that provider acceptance is not handset delivery and callbacks are not yet ingested; validate the OpenSpec change strictly.
- [x] 3.2 Run focused provider/config/worker Jest tests, lint, build, Semgrep on changed backend files, formatting, strict OpenSpec validation, and `git diff --check`; confirm no external SMS request or database migration occurred.
