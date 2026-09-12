# SMS operations

## Lifecycle semantics

The eBulkSMS integration currently certifies provider submission only. A successful
provider response is recorded as `SENT`; it is not evidence that the handset
received the message. eBulkSMS publishes a delivery-report polling API keyed by
the per-recipient message ID, but its published JSON API does not document an
authenticated callback/webhook contract. `DELIVERED` is therefore reserved for
providers that explicitly return a trusted delivery result (the deterministic
local provider does this for tests) until DLR polling is implemented.

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

The documented follow-up is a bounded polling worker using eBulkSMS `msgid`
values and the documented `getdlr.xml` endpoint. The published JSON API does
not define a JSON DLR response contract. It must authenticate with server-side credentials,
be idempotent, enforce monotonic status transitions, and persist only the
normalized status/timestamp/provider ID—not the raw provider response.

## Cost reporting

The provider adapter does not currently return an invoice-accurate per-message
cost. Reports must display cost as unavailable rather than infer a currency
amount from request or response payloads. Any future estimate must use integer
minor units and clearly identify its tariff/source and estimation limits.
