# SMS operations

## Lifecycle semantics

A successful SMS provider submission is recorded as `SENT`; it means the
provider accepted the request, not that a handset received it. eBulkSMS uses
XML delivery reports; Arkesel V2 uses its JSON message-reports endpoint. The
worker changes a still-`SENT` message to `DELIVERED` or `FAILED` only when a
report keyed by the matching provider message ID supplies a recognized terminal
status. For Arkesel, `SUBMITTED` and `QUEUED` remain `SENT`; `NOT_DELIVERED`,
`PROHIBITED`, and `EXPIRED` map to `FAILED`. An absent, unknown, failed, or
mismatched report leaves the message `SENT`; Twilio and Africa's Talking
callbacks are not ingested, so their accepted messages remain `SENT`. Raw
provider responses are not stored or logged.

## Provider selection and Arkesel sandbox

`SMS_PROVIDER_VENDOR` selects `ebulksms`, `arkesel`, `africastalking`, or
`twilio` and defaults to `ebulksms`, preserving existing deployments. Each
vendor has separate credentials; never reuse credentials across providers.

Arkesel real mode uses `ARKESEL_API_KEY`, `ARKESEL_SENDER_ID`, and the optional
`ARKESEL_API_URL` (default `https://sms.arkesel.com/api/v2`). The adapter sends
`use_case: transactional` and authenticates with the `api-key` header. For an
operator-approved non-production check, set `SMS_PROVIDER_MODE=real`,
`SMS_PROVIDER_VENDOR=arkesel`, configure the Arkesel key and registered sender,
and set `ARKESEL_SANDBOX=true`. Production startup rejects this flag. Arkesel
sandbox requests appear in SMS history but are not delivered to mobile networks
or billed. Treat this as request-path evidence only, not proof of handset
delivery. Do not retry unresolved Arkesel failures or send live Arkesel traffic
without explicit approval.

Africa's Talking uses the standard plain-SMS `/version1/messaging` endpoint,
not Premium SMS or a bulk-specific URL. Live mode requires
`AFRICASTALKING_LIVE_USERNAME`, `AFRICASTALKING_LIVE_API_KEY`, and the approved
`AFRICASTALKING_SENDER_ID`; the request uses `apiKey` authentication and
form-encoded fields. Non-production sandbox mode requires the separate
`AFRICASTALKING_SANDBOX_API_KEY` and uses username `sandbox`; production startup
rejects `AFRICASTALKING_SANDBOX=true`. Sandbox simulator acceptance is not
handset delivery. Two ShopCity sandbox attempts returned HTTP 401 without
provider message IDs; do not make further requests until sandbox authorization
is diagnosed with Africa's Talking support. Africa's Talking DLRs arrive through
callbacks, which this integration does not ingest, so accepted messages remain
`SENT`; do not claim
`DELIVERED` from the send response. Only an explicit HTTP 429 is automatically
retryable; treat timeouts, transport errors, HTTP 5xx, and recipient-level
errors as unresolved/terminal and check provider history before any replay. Do
not perform a live send until Nigerian sender approval, destination, exact
neutral message, and explicit operator authorization are confirmed.

Twilio Programmable Messaging is selected only with
`SMS_PROVIDER_VENDOR=twilio` and `SMS_PROVIDER_MODE=real`. Configure
`TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY` (API Key SID), `TWILIO_API_SECRET`, and
exactly one of `TWILIO_FROM_NUMBER` (E.164) or
`TWILIO_MESSAGING_SERVICE_SID`. Use API-key credentials, not an Auth Token. Do
not make a request as part of configuration or testing. Twilio test credentials
simulate supported requests without handset delivery; a trial account's real
Messaging API request can reach its verified recipient and requires explicit
approval of the sender, destination, and exact message. No Twilio status
callback is currently ingested, so provider acceptance remains `SENT`.

Twilio does not document a provider-side idempotency key for message creation.
The worker reserves the tenant/outbox event before submission. A fresh
reservation prevents another job from submitting concurrently. Its freshness
window is at least the worker recovery threshold and extends five seconds past
the Twilio SDK request timeout. A stale reservation is dead-lettered as
outcome-unknown and requires Twilio history verification before any manual
replay. Only an explicit HTTP 429 is automatically
retryable. Treat timeouts, transport failures, malformed success responses, and
HTTP 5xx as terminal/ambiguous; do not replay them until history is checked.

DLR polling has its own timer and does not run on every outbox recovery tick. The
default interval is five minutes (`SMS_DLR_POLL_INTERVAL_MS=300000`) and the
default batch is ten (`SMS_DLR_POLL_BATCH_SIZE=10`). The worker schedules each
attempt's next eligible poll time and prioritizes never-polled/due messages so
an unresolved message cannot occupy every batch. These values are validated at
startup; interval is bounded to 1 second–24 hours and batch size to 1–100.

## Connectivity

eBulkSMS may require outbound TCP access to port `8443` on
`api.ebulksms.com`; Arkesel uses HTTPS at `sms.arkesel.com`; Twilio uses HTTPS
at `api.twilio.com`. On shared hosting,
ask the hosting provider to allow the required destination before diagnosing
provider failures. Do not place API credentials in the support request; identify
only the destination, port, and application environment.

## Failure triage

1. Inspect the SMS report for retry and dead-letter counts.
2. Use the transaction SMS inspection endpoint for an authorized, masked view.
3. Retry only retryable failures through the outbox worker; do not manually edit
   SMS rows or financial records.
4. Treat terminal failures as operational exceptions and verify the customer’s
   masked contact details before taking action.

Provider payloads, credentials, message bodies, raw phone numbers, and unmasked
errors must not be copied into logs, tickets, or evidence.

The eBulkSMS DLR API is XML; Arkesel's report API is JSON. Do not infer one
provider's response contract from another. Adapters authenticate with server-
side credentials and pass the provider message ID. Polling is read-only; the
worker schedules it independently and conditionally updates only a message
still in `SENT` when the report ID matches. Only normalized status/timestamp/
provider ID are retained—not the raw provider response.

## Cost reporting

The provider adapter does not currently return an invoice-accurate per-message
cost. Reports must display cost as unavailable rather than infer a currency
amount from request or response payloads. Any future estimate must use integer
minor units and clearly identify its tariff/source and estimation limits.
