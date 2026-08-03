# SMS Failure Runbook

## Purpose

Handle SMS provider outages without breaking financial consistency.

## Steps

1. Confirm the financial transaction completed.
2. Check outbox and queue backlog.
3. Retry or requeue failed jobs.
4. Escalate if delivery remains blocked.
5. Record the incident and recovery actions.

## Notes

1. Use the outbox event ID as the provider idempotency key when verifying delivery.
2. Treat 4xx validation and auth failures as terminal; treat 429 and 5xx responses as retryable.
3. If rotating credentials, update the SMS_PROVIDER_* secrets, confirm the real provider mode is still enabled, and verify fake-provider override stays off in production.
