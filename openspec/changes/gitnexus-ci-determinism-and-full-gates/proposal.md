## Why

CI is still not a trustworthy release gate: GitNexus analysis is non-reproducible, can fail open, and the workflow still skips several core validation commands. This change restores a deterministic verification path so a green run proves the repo is actually buildable, testable, and contract-consistent.

## What Changes

- Make GitNexus execution deterministic in CI and fail closed by default.
- Remove unpinned runtime downloads from the GitNexus command path.
- Restore the missing verification gates for build, Prisma validation, architecture checks, unit tests, e2e tests, OpenAPI lint/diff, and generated-file cleanliness.
- Keep Redis-backed integration testing and GitHub Actions runtime upgrades in place.

## Capabilities

### New Capabilities
- `ci-verification-gates`: CI verification must be reproducible, deterministic, and comprehensive enough to prove build health, contract freshness, and test coverage.

### Modified Capabilities
- None.

## Impact

`.github/workflows/ci.yml`, `package.json`, `scripts/gitnexus.cjs`, `docs/api/openapi.json`, Prisma validation/generation commands, architecture checks, unit and e2e test jobs, and any CI guidance that describes the repository's release gates.
