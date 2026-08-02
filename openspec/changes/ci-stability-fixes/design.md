## Context

The repository already has a split CI workflow with static, GitNexus, e2e, and integration jobs, plus repo-local scripts for verification. The remaining risk is drift: tests or docs can still rely on outdated assumptions, and a single typed-lint violation in a helper file can keep the verification gate red.

## Goals / Non-Goals

**Goals:**
- Keep CI verification runnable from a clean checkout without ambient tooling.
- Remove unsafe type escapes from verification-support code.
- Keep repo guidance aligned with the actual scripts and workflow entrypoints.
- Preserve the existing CI job split and concurrency behavior.

**Non-Goals:**
- No product feature work.
- No schema or migration changes.
- No new external CI dependency.

## Decisions

- Keep using repository-owned scripts and binaries for verification. The current workflow already invokes `npm run gitnexus:*`; this change treats that as the contract and aligns docs/tests around it instead of introducing a new package or global dependency.
- Fix lint failures by tightening the worker test fixtures and helpers rather than weakening ESLint rules. This keeps the typed-lint baseline intact for the rest of the repository.
- Treat `AGENTS.md` and `CLAUDE.md` as part of the verification contract. If they describe commands, they must match `package.json` and the GitHub Actions workflow.
- Leave the existing CI topology in place. The current `static` -> `gitnexus` / `e2e` / `integration` structure already provides early failure and isolated signals; the change should improve reliability inside that structure, not replace it.

## Risks / Trade-offs

- [Risk] Tightening test types may require more fixture code. → Mitigation: keep the changes local to test helpers and reuse existing factories where possible.
- [Risk] Documentation updates can lag behind script changes again. → Mitigation: update the docs in the same change and verify with the same command set used in CI.
- [Risk] CI still spends time on the full matrix for every push. → Mitigation: preserve concurrency cancellation and keep the fastest checks at the front of the workflow.

## Migration Plan

1. Update any stale guidance so it matches the current verification scripts.
2. Refactor the worker test support code to remove unsafe `any` escapes.
3. Run the targeted lint/test commands, then the full fast verification gate.
4. If a regression appears, revert only the helper/doc edits; no database rollback is needed.

## Open Questions

- Do any additional helper files outside the worker tests still need typed-lint cleanup, or is the current gap isolated to the review notes?
- Should the workflow continue to run GitNexus as a separate required job, or is the current optional-failure pattern still the desired release gate?
