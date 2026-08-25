## Context

The review shows Sprint 2 has moved forward on release automation, but the current head still cannot be treated as complete because key verification gates disappeared, the OpenAPI contract still underspecifies real responses, SMS recovery can loop on invalid work, the production SMS provider lacks runtime safeguards, approval execution can drift from current policy, and migration verification is not yet backed by visible evidence.

This change is intentionally broad because the remaining blockers span CI, API contracts, background processing, business rules, and operational verification. The goal is to close Sprint 2 with a single coherent plan rather than a series of disconnected fixes.

## Goals / Non-Goals

**Goals:**

- Restore visible static verification in CI without removing the release gates already added.
- Make the public OpenAPI contract reflect the actual HTTP payloads returned by the system.
- Stop SMS recovery from looping forever on poison or exhausted work.
- Make the production SMS provider runtime-safe and explicitly configured.
- Re-evaluate approval policy at execution time and enforce expiry.
- Require visible migration evidence before the tracker claims verification.

**Non-Goals:**

- Redesign the full approval model or introduce new approval states.
- Replace BullMQ or redesign the entire worker architecture.
- Add new product features beyond the review-driven contract and safety fixes.
- Change financial ledger semantics outside the approval-policy recheck.

## Decisions

- Restore `verify:fast` as the first static CI step before release gates. Alternative: rely on `npm run build` plus later checks. Rejected because build does not cover formatting drift, source ESLint, or type errors in test/support files.
- Model the OpenAPI responses with explicit state-specific schemas instead of generic objects. Alternative: keep the current loose schemas and document the real behavior in prose. Rejected because generated clients need typed responses, especially for confirmed versus pending earn outcomes.
- Treat unsupported SMS event types, malformed payloads, and exhausted retries as terminal work. Alternative: keep republishing until queue-level retries end. Rejected because the review already shows that approach can loop indefinitely without creating a real terminal state.
- Harden the real SMS provider at the boundary with request timeout, response validation, and explicit status classification. Alternative: assume the upstream API is trustworthy and cast the response. Rejected because the review calls out false success and silent failure risk.
- Re-evaluate current approval policy at execution time, not just capture time, and enforce expiry before financial effects are applied. Alternative: snapshot-only approval execution. Rejected because policy drift is exactly the unresolved risk in the review.
- Keep migration verification in the tracker/documentation layer, but require a visible successful clean-database run as the evidence source. Alternative: mark migrations verified when code review lands. Rejected because the review specifically notes operational verification is still missing.

## Risks / Trade-offs

- [CI runtime grows] → Keep the restored static gates compact and fail fast before the heavier release checks.
- [OpenAPI changes may force client regeneration] → Update schemas to match reality in one pass and verify generated output cleanly.
- [Terminal SMS handling can hide recoverable work if the classifier is too strict] → Limit terminalization to clearly invalid or exhausted cases and preserve retryable failure paths separately.
- [Approval rechecks may reject previously accepted receipts] → Make the current-policy rule explicit and cover it with regression tests.
- [Migration verification can lag actual schema work] → Treat the tracker as evidence-based and update it only after the visible run exists.

## Migration Plan

1. Restore the static CI gate and verify it fails on lint, formatting, and typecheck issues.
2. Expand OpenAPI schemas for the transaction, ledger, approval-list, and earn responses.
3. Add terminal SMS states and provider/runtime validation so poison work and exhausted retries stop republishing.
4. Reapply current approval policy and expiry checks in the approval execution path.
5. Record a visible clean-database migration run and update `docs/database/migration-tracker.md` accordingly.
6. Run the relevant unit, integration, and contract checks after each area lands.

## Open Questions

- Should the SMS provider status allowlist live in the provider implementation, or in shared validation helpers?
- Do we want approval execution to reject stale approvals outright, or surface a distinct retry/review-needed state?
- Should the migration tracker reference a single canonical clean-database command, or allow multiple equivalent verification commands?
