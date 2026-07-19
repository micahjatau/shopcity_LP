# SMS Failure Runbook

## Purpose
Handle SMS provider outages without breaking financial consistency.

## Steps
1. Confirm the financial transaction completed.
2. Check outbox and queue backlog.
3. Retry or requeue failed jobs.
4. Escalate if delivery remains blocked.
5. Record the incident and recovery actions.
