## Why

CI is still fragile because the repository’s verification path depends on inconsistent tooling assumptions: a GitNexus command that may not exist in clean runners, lint coverage that can fail on typed test fixtures, and docs that drift from the actual scripts. This change makes the repo’s verification story self-contained and reproducible so new pushes stop re-triggering the same avoidable failures.

## What Changes

- Make CI-facing verification commands rely on repository-owned tooling instead of ambient binaries.
- Remove unsafe test fixture patterns that violate typed lint rules in worker coverage.
- Align `AGENTS.md` and related repo guidance with the actual `package.json` scripts.
- Tighten the verification pipeline so the fastest checks fail early and repeated pushes do not waste the full test matrix.

## Capabilities

### New Capabilities

- `ci-verification-stability`: deterministic lint, documentation, and GitNexus-backed verification behavior in clean local and CI environments.

### Modified Capabilities

-

## Impact

- `package.json` scripts for lint, GitNexus, and verification.
- Repository guidance in `AGENTS.md` and `CLAUDE.md`.
- Worker test fixtures under `test/`.
- GitHub Actions or equivalent verification workflow files.
- Clean-run CI reliability for lint and proposal-time impact analysis.
