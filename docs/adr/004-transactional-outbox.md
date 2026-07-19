# ADR 004: Use a Transactional Outbox

## Status
Accepted

## Context
SMS and other background effects must not break financial consistency.

## Decision
Commit financial state and outbound intents in one transaction, then process async work from an outbox.

## Consequences
- Reliable retries.
- No lost notification intent.
- Background failures do not roll back financial writes.
