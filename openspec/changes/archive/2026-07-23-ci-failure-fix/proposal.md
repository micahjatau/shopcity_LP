## Why

CI is repeatedly failing for unrelated infrastructure reasons rather than product logic: typed ESLint violations in worker tests, Prettier drift, and a GitNexus command path that assumes an unavailable binary. This change makes the verification path reproducible and reduces repeated wasted runs.

## What Changes

- Fix the worker test lint violations by replacing unsafe `any`-based access with typed test seams or helpers.
- Restore repository formatting compliance.
- Make GitNexus execution reproducible in clean environments.
- Split or harden the CI workflow so fast checks fail early and superseded runs are canceled.
- Correct repository guidance where lint docs describe `lint` as auto-fixing.

## Capabilities

### New Capabilities
- `ci-failure-fix`: CI verification should be fast, reproducible, and self-contained.

### Modified Capabilities
- None.

## Impact

`src/jobs/outbox-worker.runtime.spec.ts`, lint and format verification, `package.json` scripts, `AGENTS.md`, `CLAUDE.md`, `.github/workflows/*`, and any repository-owned GitNexus runner or wrapper used in CI.
