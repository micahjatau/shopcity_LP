# Pilot Monitoring Cadence

## Continuous signals

Monitor throughout pilot hours:

- API health/readiness
- Worker process health
- Pilot operations summary reconciliation status
- Outbox backlog and stale counts
- SMS failure spikes
- Error-rate spikes by release SHA

## Shift cadence

### Opening

- Run the Pilot Day-0/shift-open checks before customer traffic.

### Hourly

- Review pilot operations summary.
- Review worker logs for repeated failures.
- Confirm no unexplained rise in stale outbox or failed SMS counts.

### Midday

- Confirm report freshness remains within threshold.
- Review duplicate-credit, lost-card, and fraud escalations.

### Close of day

- Record final operational status, unresolved incidents, and next-owner handoff.
- Capture any request IDs needed for follow-up the next day.

## Escalation thresholds

Escalate immediately if reconciliation becomes unhealthy, stale outbox work keeps growing for two consecutive reviews, or the running release SHA differs from the approved candidate.
