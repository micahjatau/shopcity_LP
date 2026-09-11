# SMS operations

## Lifecycle semantics

The eBulkSMS integration currently certifies provider submission only. A successful
provider response is recorded as `SENT`; it is not evidence that the handset
received the message. The system has no authenticated delivery-receipt callback
contract yet, so `DELIVERED` is reserved for providers that explicitly return a
trusted delivery result (the deterministic local provider does this for tests).

## Failure triage

1. Inspect the SMS report for retry and dead-letter counts.
2. Use the transaction SMS inspection endpoint for an authorized, masked view.
3. Retry only retryable failures through the outbox worker; do not manually edit
   SMS rows or financial records.
4. Treat terminal failures as operational exceptions and verify the customer’s
   masked contact details before taking action.

Provider payloads, credentials, message bodies, raw phone numbers, and unmasked
errors must not be copied into logs, tickets, or evidence.

## Cost reporting

The provider adapter does not currently return an invoice-accurate per-message
cost. Reports must display cost as unavailable rather than infer a currency
amount from request or response payloads. Any future estimate must use integer
minor units and clearly identify its tariff/source and estimation limits.
