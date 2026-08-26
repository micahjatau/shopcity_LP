## Context

The remote Sprint 5 plan is broad, but the repository already has most feature foundations from Sprints 0–4. The detailed design goal here is to keep Sprint 5 focused on hardening the existing financial system for pilot use rather than reopening settled domain design. The key invariant is unchanged: the append-only ledger and lot evidence remain the only financial source of truth.

## Goals / Non-Goals

**Goals**

- Add immutable expiry evidence that debits only remaining, spendable credit.
- Run expiry and reminder sweeps in a replay-safe worker flow.
- Keep expiry visible in historical reports, contracts, and operator tooling.
- Provide enough observability, packaging, security, performance, and recovery evidence to make a pilot go/no-go decision on one release artifact.
- Ship executable runbooks and training material that map to real system behavior.

**Non-Goals**

- Changing money representation, receipt identity rules, offline redemption policy, or append-only ledger history.
- Creating manual SQL operational procedures that mutate confirmed ledger evidence.
- Introducing a parallel analytics store as a second financial authority.
- Expanding product scope beyond TRD Sprint 5 readiness.

## Decisions

1. Represent expiry as first-class immutable financial evidence.

- Rationale: expiry is a real financial debit and must reconcile historically the same way earn, redeem, reversal, and adjustment do.
- Decision: add an `EXPIRY` ledger type plus immutable expiry evidence tied uniquely to one lot and one ledger entry.

2. Use a dedicated non-human system actor for background financial mutations.

- Rationale: expiry and reminder work must be attributable without weakening role boundaries or impersonating human users.
- Decision: background financial writes use a tenant-owned `SYSTEM` actor that is not assignable through human-facing APIs.

3. Keep PostgreSQL uniqueness and locking as the expiry idempotency boundary.

- Rationale: queue uniqueness is insufficient under retries, crashes, and concurrent workers.
- Decision: expiry and reminder workflows must rely on database constraints plus transactional writes, with worker retries treated as delivery/recovery concerns only.

4. Make reporting consume expiry evidence, not current mutable balances.

- Rationale: pilot reporting and liability review must be historically correct for any `asOf` watermark.
- Decision: report reconstruction extends current authoritative lot math with expiry evidence and never projects the current lot balance backward in time.

5. Make production readiness machine-checkable.

- Rationale: a pilot go/no-go decision should not depend on an informal narrative alone.
- Decision: add structured evidence plus a verifier script that fails when security, restore, staging, training, or sign-off gates are incomplete.

## Risks / Trade-offs

- Expiry-aware reporting will shift some totals relative to current non-expiry assumptions; this is expected and must be documented as correction, not drift.
- Background reminder persistence adds schema and worker complexity, but it avoids silent duplicate SMS work and improves auditability.
- Sentry, security workflows, and containerization add release friction, but they reduce pilot operational risk.
- The largest technical risk remains expiry-versus-redemption concurrency on the same lot; this must be closed with integration evidence before broader certification.

## Migration Plan

1. Create additive schema support for expiry evidence, reminder evidence if adopted, and any required indexes/immutability triggers.
2. Introduce system-actor lookup/creation and expiry transaction orchestration behind tests.
3. Register expiry/reminder work in the worker lifecycle with shutdown-safe behavior.
4. Extend reporting, contracts, and SMS support to account for expiry semantics.
5. Add observability, packaging, security, performance, backup/restore, and readiness verification artifacts.
6. Certify one release candidate with local, CI, staging, security, performance, and restore evidence.

Rollback remains additive/forward-fix oriented: do not remove confirmed financial evidence. If a Sprint 5 regression is found after deployment, disable or pause expiry/reminder scheduling while preserving already-written immutable records and fix forward with a reviewed change.
