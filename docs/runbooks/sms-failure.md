# SMS Failure Runbook

## Purpose

Handle SMS provider outages without breaking financial consistency.

## Steps

1. Confirm the financial transaction completed and record the request ID plus affected outbox event IDs.
2. Check the pilot operations summary plus queue backlog to determine whether the issue is isolated or systemic.
3. Classify the failure as terminal (4xx validation/auth) or retryable (429/5xx/timeouts).
4. Retry or requeue failed jobs only through the worker/runtime recovery path.
5. If rotating credentials, update the `SMS_PROVIDER_*` secrets, confirm real-provider mode remains enabled, and verify the fake-provider override stays off in production.
6. Restart the worker after the secret update only after preserving current evidence.
7. Confirm the outbox queue drains without duplicate sends and record the recovery timestamp.
8. Escalate if delivery remains blocked or if stale outbox counts continue to rise.

## Notes

1. Use the outbox event ID as the provider idempotency key when verifying delivery.
2. Never mutate confirmed financial rows to compensate for notification failure.
3. Rotate provider credentials before sender-ID changes.
4. Keep provider credentials, phone numbers, and message bodies out of evidence artifacts unless they are redacted.
