## 1. Twilio provider and configuration

- [x] 1.1 Add the official `twilio` SDK dependency and implement a `TwilioSmsProvider` that submits the rendered message through API-key authentication, accepts exactly one sender configuration, retains the message SID, maps success only to `SENT`, and never logs raw request/response data.
- [x] 1.2 Add validated `twilio` vendor selection and conditional Account SID/API key/API secret plus `From`/Messaging Service configuration; preserve eBulkSMS as the default and existing provider safeguards.
- [x] 1.3 Add provider tests for sender selection, SDK request payload, accepted SID, terminal non-429 errors, explicit 429 retry, and ambiguous failures without real Twilio calls.

## 2. No-duplicate outbox handling

- [x] 2.1 Add an optional local-reservation capability to `SmsProvider`; before Twilio submission, use a compare-and-set reservation tied to the existing tenant/outbox event state.
- [x] 2.2 Prevent concurrent/recovered jobs from resending a fresh reserved attempt; convert a stale reservation to a terminal outcome-unknown dead letter with a safe diagnostic and no retry.
- [x] 2.3 Test reservation success, reservation contention, stale recovery, and success/429 resolution; verify existing providers retain their behavior.

## 3. Documentation and verification

- [x] 3.1 Update `.env.example`, SMS runbook, SMS/OTP architecture notes, and the delivery-truthfulness/operations specs; state that Twilio DLR callbacks are not ingested and provider acceptance remains `SENT`.
- [x] 3.2 Run focused provider/config/worker Jest tests, targeted ESLint, build, Semgrep on changed backend files, Prettier, strict OpenSpec validation, and `git diff --check`; confirm no Twilio API call or database migration occurred.
