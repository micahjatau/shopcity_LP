## Context

Review 45 is not asking for broad domain redesign. It is asking for closure on the last correctness and certification gaps before Sprint 5 can be considered pilot-safe. The existing architecture is retained: the ledger stays append-only, expiry remains server-authoritative, and the release gate must be evidence-backed rather than narrative-backed.

## Goals / Non-Goals

**Goals**

- Prevent stale reminder totals by revalidating candidate rows inside the transaction that persists the reminder.
- Prove expiry and redemption remain safe under same-lot concurrency.
- Make readiness verification fail closed on fixture/example evidence.
- Turn Sentry into a real optional runtime integration instead of a dormant config flag.
- Replace example release evidence with a real, single-candidate certification bundle.
- Capture the observed restore drill, security workflow results, performance summary, and final approval evidence for that same candidate.

**Non-Goals**

- Revisiting the expiry math or ledger schema beyond what the reminder race or verifier fix strictly requires.
- Reworking historical reporting or the pilot operations summary unless one of the closure fixes exposes a concrete regression.
- Adding new pilot product capabilities.

## Decisions

1. Revalidate reminders at commit time.

- The reminder query may observe positive balances that disappear before the transaction commits.
- The transaction must therefore reload or lock the authoritative lot rows, recompute the aggregate, and write nothing when the total is zero.

2. Add a real redemption-vs-expiry adversarial test.

- The existing expiry concurrency proof is expiry-vs-expiry, which is not enough for the highest-risk boundary.
- The new test must run a real redemption against the same lot and assert the final state remains valid and reconcilable.

3. Fail closed on release readiness.

- Example evidence remains useful as a template, but it must not satisfy the production verifier.
- The verifier should reject example files, known dummy identifiers, and mismatched evidence references.

4. Initialize Sentry only when configured.

- Sentry should attach during runtime bootstrap only if a DSN is present.
- Initialization must not block financial writes or worker startup.

5. Certify one immutable candidate.

- All mandatory pilot evidence must point at one SHA and one image digest.
- If the evidence does not match, the verifier should fail.
- The bundle must include explicit restore RPO/RTO evidence, security workflow run artifacts, and performance execution output instead of only narrative references.

## Risks / Trade-offs

- Reminder recomputation may cause some candidates to disappear between selection and commit; that is intended and should become a no-op, not a failure.
- The new concurrency test may require careful timing control to make the race deterministic enough for CI.
- Tightening the readiness verifier will invalidate current example-driven workflows until real evidence is captured.
- Sentry initialization can expose packaging or env-validation gaps that were previously hidden behind the config flag.
- Requiring real security/performance/restore artifacts may expose gaps in the current pilot evidence bundle even when the code is otherwise ready.

## Migration Plan

1. Patch reminder persistence to re-query/relock and recalculate authoritative totals inside the transaction.
2. Add the redemption-vs-expiry integration test and keep the existing expiry-vs-expiry test as a supporting regression.
3. Harden the readiness verifier and evidence bundle rules so example files cannot pass production certification.
4. Wire Sentry into the runtime only when configured.
5. Populate the real release-candidate evidence bundle, including observed restore/security/performance/staging/training/sign-off evidence and RPO/RTO notes, then rerun the readiness verifier plus validation commands.
