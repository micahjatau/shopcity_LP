# Outbox Backlog Runbook

## Purpose

Recover from growing outbox backlog or stale event processing without mutating financial truth.

## Triggers

- Pilot operations summary shows backlog or stale outbox counts above threshold.
- SMS or worker queues stop draining.
- Background jobs are healthy at the process level but recoverable work remains stuck.

## Steps

1. Capture the current `RELEASE_SHA`, worker mode, and the pilot operations summary response.
2. Confirm whether the backlog is isolated to one event type or provider dependency.
3. Check worker logs for repeated failures, auth errors, or downstream timeouts.
4. Restart or roll forward the worker only after preserving the current evidence and request IDs.
5. Prefer replaying recoverable outbox work through the existing worker/runtime path; do not mark financial events complete by hand.
6. If provider credentials or network access changed, fix the dependency first and then verify the backlog drains.
7. Recheck pilot operations summary until stale counts and backlog metrics return to acceptable levels.
8. Record the oldest stuck event age, affected event types, remediation steps, and final clearance time.

## Evidence to record

- Pilot operations summary snapshot
- Worker log excerpt with request IDs redacted as needed
- Affected event types and counts
- Recovery action taken
- Post-recovery summary proving the backlog cleared or stabilized
