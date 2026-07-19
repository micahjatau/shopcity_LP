# ADR 002: Use PostgreSQL as the Ledger Store

## Status
Accepted

## Context
The ledger needs transactional integrity, constraints, and a reliable audit trail.

## Decision
Use PostgreSQL as the canonical store for customer, ledger, and audit data.

## Consequences
- Strong transactional guarantees.
- Schema-backed constraints for integrity.
- Straightforward support for append-only history.
