# Pilot Daily Review

## Objective

Run one short operational review each pilot day using authoritative signals and request-linked evidence.

## Daily checks

1. Review the pilot operations summary for:
   - outbox backlog and stale counts
   - failed SMS counts
   - offline sync failures
   - fraud backlog
   - report staleness
   - reconciliation mismatch count
2. Review support incidents opened since the previous check, including duplicate-credit and lost-card cases.
3. Confirm the worker backlog is stable and no unapproved config drift has occurred.
4. Confirm the release SHA still matches the approved candidate.
5. Record any threshold breach, owner, ETA, and follow-up incident link.

## Exit criteria

- No unresolved critical reconciliation issue
- No unexplained backlog growth
- No unreviewed security or fraud escalation
- Daily review notes stored with date, owner, and linked evidence
