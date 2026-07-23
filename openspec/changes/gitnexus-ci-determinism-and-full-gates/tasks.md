## 1. Make GitNexus deterministic

- [x] 1.1 Pin GitNexus in `devDependencies` and keep the repository command path wired to the pinned binary or checked-in runner.
- [x] 1.2 Harden `scripts/gitnexus.cjs` so a killed, timed-out, or signaled child process exits non-zero.
- [x] 1.3 Remove any floating runtime install path from the CI GitNexus execution flow and make the bypass explicitly opt-in.

## 2. Restore the full CI release gates

- [x] 2.1 Expand `.github/workflows/ci.yml` so CI runs build, Prisma generate, Prisma validate, architecture check, unit tests, end-to-end tests, OpenAPI lint, OpenAPI diff, generated-file cleanliness, GitNexus analysis, and integration tests.
- [x] 2.2 Keep the Redis install step for integration tests and ensure the integration job still boots the local Redis-backed harness successfully.
- [x] 2.3 Default the GitNexus bypass setting to fail closed and keep any emergency bypass visibly explicit in the workflow.

## 3. Verify the gate and update guidance

- [x] 3.1 Run the relevant validation commands and fix any contract, generation, or workflow drift surfaced by the new gates.
- [x] 3.2 Update repository guidance that still describes the old fail-open or incomplete CI path.
