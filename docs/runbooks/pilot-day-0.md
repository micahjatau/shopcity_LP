# Pilot Day-0 Checklist

## Objective

Start the pilot on one approved release candidate with a complete evidence bundle and clear operator ownership.

## Before opening

1. Confirm the release SHA and image digest match the approved Sprint 5 evidence bundle.
2. Confirm deployment, rollback, security, performance, and restore evidence are attached.
3. Verify API and worker runtimes expose the same `RELEASE_SHA` and `RELEASE_VERSION`.
4. Review the pilot operations summary and confirm backlog, stale work, reconciliation, and report freshness are healthy.
5. Confirm cashier, supervisor, and owner/admin training has been completed.

## Opening checks

1. Perform one synthetic card lookup.
2. Perform one supervised synthetic earn transaction.
3. Perform one supervised synthetic redeem transaction.
4. Confirm SMS, outbox, and report paths remain healthy after the smoke flow.
5. Record the opening operator, supervising approver, and request IDs.

## Escalation rule

Pause opening if any critical gate is missing, reconciliation is unhealthy, or the release artifact differs from the approved candidate.
