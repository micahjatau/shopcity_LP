## Why

CI is repeatedly failing for reasons that are not addressed by the current product changes: type-aware lint violations in worker tests, formatting drift, and GitNexus commands that assume an unavailable binary. This change restores a reliable verification path so future commits stop rerunning the same avoidable failures.

## What Changes

- Fix the worker test lint violations by replacing unsafe `any`-based access with typed test helpers or typed runtime seams.
- Restore repository formatting compliance after the recent cleanup commits.
- Make GitNexus execution reproducible in clean environments instead of relying on a globally installed binary.
- Split or harden the CI workflow so fast checks fail early and redundant runs can be canceled.
- Correct developer guidance where repository docs describe `lint` as auto-fixing when it only checks.

## Capabilities

### New Capabilities
- `ci-stability-hardening`: CI, lint, and repository verification must be reproducible, fast to fail, and free of avoidable environment assumptions.

### Modified Capabilities

- None.

## Impact

`src/jobs/outbox-worker.runtime.spec.ts`, lint and format verification, `package.json` scripts, `AGENTS.md`, `CLAUDE.md`, `.github/workflows/*`, and any repository-owned GitNexus runner or wrapper used in CI.
