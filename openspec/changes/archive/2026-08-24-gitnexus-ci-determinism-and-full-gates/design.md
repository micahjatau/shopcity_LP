## Context

The current CI path is not a reliable release gate. GitNexus can succeed or fail depending on how it is installed, the workflow can ignore analysis failures, and the workflow still omits several core validation commands that already exist in `package.json`. Integration tests also require a real `redis-server` binary because the test harness spawns it locally.

## Goals / Non-Goals

**Goals:**

- Make GitNexus execution deterministic in CI.
- Fail GitNexus closed by default, with only an explicit emergency bypass.
- Restore the full repository verification matrix in GitHub Actions.
- Keep Redis-backed integration tests runnable in CI.
- Catch generated-file and contract drift before merge.

**Non-Goals:**

- Change product behavior or business rules.
- Rework the integration test harness beyond what CI setup requires.
- Introduce new application features.
- Preserve a floating, unpinned GitNexus install path.

## Decisions

1. Pin GitNexus as a development dependency and invoke it through the repository's normal npm execution path.
   - Rationale: CI must not download a floating tool version at runtime.
   - Alternatives considered: keep `npx --yes gitnexus` as the fallback. Rejected because it is not reproducible.

2. Keep the repository-owned wrapper, but harden it so child failures are not reported as successes.
   - Rationale: the wrapper remains a useful compatibility layer for local `.gitnexus/run.cjs` indexes, while the CI path becomes explicit and safe.
   - Alternatives considered: remove the wrapper entirely and call `gitnexus` directly. Rejected because the repo already supports a local generated runner path.

3. Make the GitNexus job fail closed by default and allow bypass only through an explicit repository setting.
   - Rationale: a green job must represent a passed check, not a suppressed failure.
   - Alternatives considered: unconditional `|| true` or always-on `continue-on-error`. Rejected because they hide regressions.

4. Add a dedicated verification job for the missing release gates instead of relying on the current partial coverage.
   - Rationale: build, Prisma, architecture, test, and OpenAPI gates need to fail independently and clearly.
   - Alternatives considered: one monolithic job. Rejected because one failure masks the rest and slows diagnosis.

5. Install `redis-server` in CI for integration tests.
   - Rationale: the test helper expects to spawn a local Redis process, so the host runner must provide that binary.
   - Alternatives considered: swap to a hosted Redis service container. Rejected because it does not match the current harness contract.

6. Keep contract and generated-file checks in CI.
   - Rationale: the repo already treats OpenAPI and generated artifacts as source-of-truth outputs, so CI should verify they remain synchronized.

## Risks / Trade-offs

- [Risk] Pinned GitNexus versions can lag behind upstream fixes or features. → Mitigation: update the pinned version through an explicit dependency bump PR.
- [Risk] More verification jobs increase CI runtime. → Mitigation: keep fast checks separate from integration work so failures surface early.
- [Risk] The emergency bypass can hide a broken GitNexus run if misused. → Mitigation: default it to off and document it as temporary only.
- [Risk] Wrapper hardening may expose previously hidden exit conditions. → Mitigation: that is intentional; CI should fail loudly on hung or killed processes.

## Migration Plan

1. Pin GitNexus in `devDependencies` and update the wrapper to use the pinned path first.
2. Update the GitHub Actions workflow so GitNexus fails closed by default.
3. Add the missing verification steps: build, Prisma generate/validate, architecture check, unit tests, e2e tests, OpenAPI lint/diff, and generated-file cleanliness.
4. Keep the Redis install step for integration tests.
5. Run the full validation suite locally or in CI order and regenerate any contract artifacts if the checks surface drift.

Rollback: revert the workflow and dependency pinning changes together if the new gate sequence blocks unrelated release work, then reintroduce them after the underlying issue is fixed.

## Open Questions

- What exact GitNexus version should be pinned?
- Should the emergency bypass remain after the workflow is stable, or be removed once deterministic execution is verified?
