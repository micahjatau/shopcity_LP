## Context

Review 37 shows that the halfway release still has a mix of truthful-runtime gaps and release-proof gaps. The implementation must close misleading HTTP contracts, enforce device secret and quarantine invariants at the persistence boundary, and make the protected restore, SMS smoke, and validation gates produce evidence that matches one immutable release SHA.

## Goals / Non-Goals

**Goals:**

- Make deferred or unavailable behavior explicit instead of fabricating success responses.
- Enforce device cutover and quarantine safety at both application and database boundaries.
- Tie release evidence to the exact release SHA and the actual workflow outputs.
- Add a controlled production SMS smoke path with approval and redaction guardrails.
- Make validation-scope checks real enough to catch workflow placement and optionalization bypasses.

**Non-Goals:**

- No product redesign beyond the release-hardening surface.
- No new customer-facing financial workflows.
- No change to the core ledger or allocation model.
- No broad operational automation beyond what is needed for evidence and safety.

## Decisions

- Model the work as one cross-cutting release-hardening change instead of several tiny follow-up changes. The blockers share the same release gate, evidence package, and operational risk surface, so splitting them would create inconsistent partial closure. An alternative is separate changes per area, but that would make the release state harder to reason about.
- Remove the reversal success envelope entirely rather than keeping a fake 2xx response with documentation notes. A truthful 503 boundary is safer for generated clients and callers than a contract that pretends the operation can complete.
- Enforce device KEK validity in environment validation and enforce ACTIVE secret completeness in the database. App-only checks are not enough because activation paths and future migrations can bypass them. A database constraint closes that hole.
- Use a durable quarantine claim mechanism rather than relying on stage-row locking alone. A unique claim record makes ownership explicit, survives batch transitions, and gives concurrency tests a clear invariant to assert.
- Write release evidence to a SHA-scoped directory and upload it with an always-run step. This keeps the artifact path deterministic and avoids the review-37 mismatch between temp paths and upload globs.
- Add a dedicated validation-scope test target and gate CI on it. A shell-only scan is too easy to bypass because it cannot reliably distinguish mandatory jobs, optional workflows, and step-level `continue-on-error`.

## Risks / Trade-offs

- More validation and migration logic can slow local feedback -> keep fixtures narrow and fail fast on invalid config.
- A hard KEK policy can block ad hoc environments -> document the required key format and versioning upfront.
- Durable quarantine claims add schema and operational complexity -> mitigate with explicit lifecycle rules and concurrency tests.
- SHA-scoped evidence artifacts depend on external systems -> keep the restore and smoke jobs approval-gated and write redacted outputs.

## Migration Plan

1. Land contract and validation changes behind the existing release-hardening surface.
2. Add forward-only migrations for the device secret invariant and quarantine ownership model.
3. Update workflows to emit SHA-scoped evidence and run the validation-scope gate in CI.
4. Regenerate OpenAPI and client artifacts after the contract changes.
5. Verify the change with HTTP, migration, workflow, and concurrency tests before treating the release as complete.

Rollback strategy: keep the schema changes forward-only and use release artifact regeneration plus CI gating to prove the new state before the follow-up release is declared complete. If a workflow change fails, the code can be reverted without rewriting applied migrations.

## Open Questions

- Should quarantine claims be released automatically when a batch reaches a terminal failure state, or only through explicit cancellation?
- Should the production SMS smoke command live as `npm run sms:smoke:production` or under a broader operational script namespace?
- Which release evidence artifacts are mandatory on every branch versus only on the immutable release SHA?
