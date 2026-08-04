## Context

The repo already has a functioning backend and a typed bootstrap path, but a subset of integration specs still use unsafe harness patterns that trip ESLint and can keep Jest alive after bootstrap. The change is limited to test infrastructure and validation behavior; runtime API behavior should not change.

## Goals / Non-Goals

**Goals:**

- Make the failing integration harnesses type-safe.
- Ensure integration suites tear down cleanly.
- Restore a reliable validation baseline for CI and local runs.

**Non-Goals:**

- No API contract changes.
- No product feature changes.
- No new dependencies or architectural changes.

## Decisions

- Use the public typed `createApp` bootstrap instead of `require()`-based module loading.
  - Rationale: it matches the application entrypoint and preserves TypeScript inference.
  - Alternative considered: keep dynamic loading and suppress lint/typecheck errors. Rejected because it hides the root cause.
- Keep the fix inside integration specs rather than production code unless the suite proves the bootstrap itself is the source of the hang.
  - Rationale: the current failures are in validation paths, so the smallest safe fix is to harden the harness first.
  - Alternative considered: widen production lifecycle hooks. Rejected until tests show it is necessary.
- Make teardown explicit for app, Prisma, Redis, and container resources.
  - Rationale: Jest hangs are usually open handles, and explicit teardown is easier to reason about than implicit cleanup.

## Risks / Trade-offs

- [Risk] Hiding a production lifecycle issue behind test-only cleanup → Mitigation: keep the harness fix minimal and re-run the integration suite to confirm the hang is removed.
- [Risk] Tightening typings may require small mock-shape updates in multiple specs → Mitigation: update the shared mock contract once and reuse it.
- [Risk] The integration hang may originate from a production resource or open handle outside the test files → Mitigation: if teardown cleanup is not enough, trace the bootstrap and resource lifecycle next.

## Migration Plan

1. Update the failing integration specs to use typed imports and typed mocks.
2. Tighten teardown so every created resource closes in `afterAll`.
3. Re-run `npm run typecheck`, `npm run lint`, and `npm run test:integration`.
4. If the suite still hangs, inspect bootstrap lifecycle and open handles before broadening the scope.

## Open Questions

- Whether the integration hang is solely in the Redis fail-closed harness or shared across multiple specs.
- Whether any production bootstrap code needs a small lifecycle fix after the harness cleanup is applied.
