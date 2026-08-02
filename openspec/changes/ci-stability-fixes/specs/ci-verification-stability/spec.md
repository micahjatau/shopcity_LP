## ADDED Requirements

### Requirement: Verification commands work in clean environments
The repository SHALL provide verification commands that run from a clean checkout after `npm ci` without depending on globally installed tools or undocumented runner state.

#### Scenario: Clean CI runner executes repository verification
- **WHEN** a CI runner installs dependencies with `npm ci`
- **THEN** the documented verification commands execute using repository-declared tooling and complete without requiring a global GitNexus installation

### Requirement: Lintable tests avoid unsafe type escapes
Worker and integration test support code SHALL avoid unsafe type escapes that violate the configured typed ESLint rules.

#### Scenario: Worker test fixtures satisfy typed lint
- **WHEN** the worker runtime test suite is linted under the repository ESLint configuration
- **THEN** the test helpers and stubs do not require `any`-based casts to exercise the runtime path

### Requirement: Repository guidance matches verification scripts
Repository guidance SHALL describe the current verification commands accurately, including the difference between check-only and auto-fix lint paths.

#### Scenario: Documentation reflects script behavior
- **WHEN** a contributor follows `AGENTS.md` or related repo guidance
- **THEN** the documented lint and verification commands match the behavior of `package.json` scripts
