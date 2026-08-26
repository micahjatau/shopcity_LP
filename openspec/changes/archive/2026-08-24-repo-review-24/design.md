## Context

Repo review 24 is a follow-up hardening change, not a feature expansion. The current system already has the right broad modules for redemption, approval, SMS, migrations, and release evidence, but several cross-layer contracts still disagree at runtime: pending redemptions can return the wrong status, confirmed redemption SMS payloads are incomplete, and shared-environment migration evidence is not strong enough to trust.

The implementation must stay within the existing backend-first Nest/Fastify modular monolith. Money remains integer kobo, confirmed ledger history stays append-only, and shared migrations remain forward-only. This change should close the remaining release blockers before any reversal execution or broader manual adjustment work resumes.

## Goals / Non-Goals

**Goals:**

- Make pending redemption responses truthful at runtime.
- Centralize redemption-confirmed SMS payload creation and validate it before provider dispatch.
- Tighten the financial contract around transaction reads and the public reversal boundary.
- Require deployable migration history, not just schema shape, for shared-environment verification.
- Record current-head release evidence and keep Sprint 3B blocked until the hardening exit gates pass.

**Non-Goals:**

- Do not implement real reversal execution.
- Do not expand manual adjustment behavior beyond the guards needed to preserve financial integrity.
- Do not redesign the module structure or introduce new infrastructure.
- Do not edit already-applied shared migrations in place.

## Decisions

1. Restore HTTP status selection in the redemption controller.

   The controller should set `202` or `201` directly from the service result instead of relying on documentation or response wrappers. That keeps the runtime contract aligned with the OpenAPI declaration and avoids another invisible status-code regression.

   Alternative considered: infer the status in a response interceptor. That is less explicit, harder to test, and too easy to desynchronize from the service state.

2. Use one typed SMS payload builder for both confirmed-redemption paths.

   Immediate redemption and approval execution should share a single builder that computes the complete `redemption-confirmed` payload before an outbox event is created. Worker-side validation should run before provider selection so deterministic, sandbox, and real providers enforce the same payload rules.

   Alternative considered: keep separate payload assembly in each path and patch the worker. That would preserve the current inconsistency and make future regressions likely.

3. Treat migration safety as evidence and history alignment, not schema shape alone.

   Shared-environment migration completion should require deployable migration history plus backup/restore or forward-fix evidence. A schema that looks correct after `db push` is not enough if the migration ledger and operational proof are missing.

   Alternative considered: continue accepting schema-only synchronization. That leaves `_prisma_migrations` history ambiguous and increases the chance of future deploy drift.

4. Keep the new hardening gate explicit and release-evidence driven.

   Sprint 3B should stay blocked until current-head evidence covers the remaining runtime, SMS, migration, and CI gaps. The gate belongs in planning and release evidence, not in a hidden convention.

   Alternative considered: rely on informal team memory about what is still blocked. That is exactly the kind of gap this review is trying to eliminate.

## Risks / Trade-offs

- [Client breakage from status-code fixes] -> Update HTTP tests and generated-client expectations together.
- [Fail-closed SMS validation can dead-letter malformed payloads] -> Keep the failure terminal and traceable so operations can remediate historical rows.
- [Migration verification adds release friction] -> Prefer explicit evidence over risky shared-environment drift.
- [Hardening gates can delay new work] -> That delay is intentional until the remaining blockers are closed.
- [Truthful reversal boundaries may frustrate consumers] -> Better to expose an unavailable boundary than advertise success that cannot happen.

## Migration Plan

1. Update the redemption controller and add HTTP integration coverage for `201` and `202`.
2. Introduce a shared redemption-confirmed SMS payload builder and worker-side validation before provider selection.
3. Reconcile migration tracker entries with deploy evidence, backup/restore evidence, and any forward-fix notes.
4. Add or tighten current-head release evidence checks for the remaining hardening gates.
5. Keep reversal execution and manual adjustment work blocked until the new gate is satisfied.

Rollback should use forward fixes where possible. For shared migrations, if evidence or deploy history is incomplete, do not edit an already-applied migration; record the gap and repair it with a follow-up migration or resolution step.

## Open Questions

- Should the public reversal boundary be fully removed, or retained only as a structured unavailable response?
- Should branch-scoped transaction-read authorization be included in this hardening pass or deferred to the next review?
- Which exact CI, smoke, and migration commands are required for the final current-head evidence checklist?
