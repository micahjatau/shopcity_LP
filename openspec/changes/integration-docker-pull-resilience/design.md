## Context

The integration suite depends on Testcontainers and therefore on Docker image availability. In CI, the current failure mode is a Docker Hub timeout while trying to fetch required images, which blocks the `npm run test:integration` gate before the app can be validated.

This change is scoped to test/CI infrastructure. It should not alter application behavior or the semantics of the integration assertions.

## Goals / Non-Goals

**Goals:**
- Make integration test execution resilient to transient Docker Hub availability issues.
- Ensure CI has a deterministic image hydration path before integration tests start.
- Improve diagnostics when required images are unavailable.

**Non-Goals:**
- No product API or database schema changes.
- No change to the developer-facing `npm run test:integration` command.
- No attempt to mask real integration failures unrelated to image retrieval.

## Decisions

- Prime required images before the integration suite runs in CI.
  - Rationale: the failure is happening during image acquisition, so moving hydration earlier isolates the network-sensitive step and makes the actual test phase deterministic.
  - Alternatives considered: rely on implicit Testcontainers pulls at runtime. Rejected because it leaves CI exposed to transient registry timeouts.

- Prefer cached or mirrored images over direct registry access during the test phase.
  - Rationale: local cache or mirror access is faster and more reliable than a live pull from Docker Hub.
  - Alternatives considered: hard-fail if the cache is missing. Rejected because it makes CI brittle whenever the runner cache is cold.

- Add explicit diagnostics around image resolution failures.
  - Rationale: the current timeout is generic and slow to debug; surfacing the missing image or hydration step shortens triage.
  - Alternatives considered: leave the raw Docker error untouched. Rejected because it does not distinguish a network issue from an image-name or cache issue.

- Keep the fix in CI/test harness code, not production code.
  - Rationale: the observed failure is environmental and in the validation path, so production behavior should remain unchanged.
  - Alternatives considered: alter application startup to compensate for CI image pulls. Rejected because it couples product code to test infrastructure.

## Risks / Trade-offs

- [Risk] A cache-prime step can add time to CI runs -> Mitigation: keep the hydration list minimal and only include images used by integration tests.
- [Risk] Mirror or cache configuration could drift from the test harness image list -> Mitigation: derive the prime list from the same source used by the integration setup.
- [Risk] Masking a bad image tag could delay discovery of a real configuration error -> Mitigation: fail fast with the exact image reference when hydration cannot complete.

## Migration Plan

1. Identify the integration images used by Testcontainers and the CI job that executes `npm run test:integration`.
2. Add a preflight hydration step in CI or a shared test bootstrap path so those images are available before the suite starts.
3. Update the integration harness to prefer cached or mirrored sources and to emit actionable errors on resolution failure.
4. Re-run the validation suite and confirm the integration job no longer fails on Docker Hub timeouts.
5. If needed, document the new prerequisite or mirror expectation in the repo CI notes.

## Open Questions

- Whether CI should prime images through an explicit `docker pull` step or via a runner-level cache/mirror policy.
- Whether the repo already has a single source of truth for Testcontainers image names that can be reused for hydration.
