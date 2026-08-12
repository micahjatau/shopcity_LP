# Incident Response Runbook

## Purpose

Respond to production incidents without losing ledger integrity, audit history, or release evidence.

## Steps

1. Identify the incident scope and the exact release SHA/image digest involved.
2. Protect financial data first; never repair confirmed ledger history through ad hoc SQL edits.
3. Gather logs, queue state, pilot operations summary output, and database evidence.
4. If secrets, credentials, or tokens may be exposed, follow `docs/runbooks/security-incident.md` immediately.
5. Apply the smallest safe mitigation and prefer rollback to the last approved artifact over in-place experimentation.
6. Document the incident timeline, customer impact, mitigations, and follow-up actions.
