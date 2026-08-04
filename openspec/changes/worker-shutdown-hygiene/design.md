## Context

The outbox worker recovery path is already functionally correct, but the integration harness still leaves behind noisy background activity when Redis or the worker is torn down. That noise makes test exits flaky and obscures genuine failures.

This change targets lifecycle hygiene, not recovery semantics. The main stakeholders are the worker runtime, the Redis test harness, and the integration test suites that exercise recovery behavior.

## Goals / Non-Goals

**Goals:**

- Make worker shutdown deterministic and idempotent.
- Ensure integration tests can simulate Redis outage and restart without leaving orphaned background work.
- Remove the need for force-exit behavior in the targeted worker recovery suite.

**Non-Goals:**

- Change outbox recovery rules or SMS delivery semantics.
- Introduce new queueing infrastructure or external services.
- Rework unrelated integration test suites unless they share the same lifecycle helper.

## Decisions

- Use explicit lifecycle teardown in the worker runtime.
  - Close the recovery timer first, then shut down BullMQ worker/queue resources, then disconnect Prisma.
  - Rationale: this prevents the recovery loop from racing shutdown and keeps connection cleanup ordered.
  - Alternative considered: rely on process exit to clean up open handles. Rejected because it is the source of the current noise.

- Simulate Redis lifecycle with a local test-owned process instead of container-level pause/resume.
  - Rationale: the test needs a stable connection endpoint and deterministic stop/start control.
  - Alternative considered: testcontainers pause/unpause. Rejected because it adds indirection and has proven brittle for this scenario.

- Keep the test harness bounded and explicit.
  - Rationale: outage simulation should fail fast and should not require an unbounded wait for background cleanup.
  - Alternative considered: longer sleeps and retries in the test. Rejected because they hide cleanup bugs rather than fixing them.

- Treat shutdown cleanup as best-effort but bounded.
  - Rationale: test teardown should not hang indefinitely if a dependency is already gone.
  - Alternative considered: strict synchronous teardown with no timeout. Rejected because it can turn cleanup into a new source of flakes.

## Risks / Trade-offs

- [Risk] Redis child processes may still leak if the test is aborted mid-run → Mitigation: ensure `close()` always stops the child process and keep teardown centralized.
- [Risk] Ordering bugs in shutdown could mask real recovery regressions → Mitigation: retain the recovery assertions and keep the shutdown scope narrow.
- [Risk] Other Redis-backed tests may still use older helpers → Mitigation: keep this change local to the worker recovery path and reuse the helper only where needed.

## Migration Plan

No production migration is required. Rollout is limited to test harness and worker lifecycle code.

If the change needs to be rolled back, revert the worker shutdown ordering and restore the prior Redis test helper behavior.

## Open Questions

- Should the same Redis lifecycle helper replace the remaining Redis integration test fixtures after this change lands?
