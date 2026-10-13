# SMS operations

## Lifecycle semantics

A successful eBulkSMS submission is recorded as `SENT`; it means the provider
accepted the request, not that a handset received it. The worker polls eBulkSMS
XML delivery reports by provider message ID and changes a still-`SENT` message
to `DELIVERED` or `FAILED` only when a matching provider report supplies that
terminal status. An absent, unknown, failed, or mismatched report leaves the
message `SENT`; raw provider responses are not stored or logged.

DLR polling has its own timer and does not run on every outbox recovery tick. The
default interval is five minutes (`SMS_DLR_POLL_INTERVAL_MS=300000`) and the
default batch is ten (`SMS_DLR_POLL_BATCH_SIZE=10`). The worker schedules each
attempt's next eligible poll time and prioritizes never-polled/due messages so
an unresolved message cannot occupy every batch. These values are validated at
startup; interval is bounded to 1 second–24 hours and batch size to 1–100.

## Connectivity

The eBulkSMS API may require outbound TCP access to port `8443` on
`api.ebulksms.com`. On shared hosting, ask the hosting provider to allow this
destination and port before diagnosing provider failures. Do not place API
credentials in the support request; identify only the destination, port, and
application environment.

## Failure triage

1. Inspect the SMS report for retry and dead-letter counts.
2. Use the transaction SMS inspection endpoint for an authorized, masked view.
3. Retry only retryable failures through the outbox worker; do not manually edit
   SMS rows or financial records.
4. Treat terminal failures as operational exceptions and verify the customer’s
   masked contact details before taking action.

Provider payloads, credentials, message bodies, raw phone numbers, and unmasked
errors must not be copied into logs, tickets, or evidence.

The DLR API is an XML endpoint; do not infer a JSON response contract. The
adapter authenticates with server-side credentials and passes the provider
message ID. Polling is read-only and idempotent; database updates are conditional
on the message still being `SENT` and the report ID matching. Only normalized
status/timestamp/provider ID are retained—not the raw provider response.

## Cost reporting

The provider adapter does not currently return an invoice-accurate per-message
cost. Reports must display cost as unavailable rather than infer a currency
amount from request or response payloads. Any future estimate must use integer
minor units and clearly identify its tariff/source and estimation limits.
