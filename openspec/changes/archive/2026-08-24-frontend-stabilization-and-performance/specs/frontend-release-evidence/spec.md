## MODIFIED Requirements

### Requirement: Release evidence identifies one exact candidate

Release evidence SHALL identify one exact source commit and SHALL require green CI evidence for that commit before the frontend stabilization program is releasable.

#### Scenario: Exact-head CI is green

- **WHEN** release evidence is assembled
- **THEN** lint, typecheck, build, security, unit/integration, affected browser, and required performance checks refer to the candidate SHA
- **AND** evidence from another head cannot satisfy the gate

### Requirement: Canonical deployment identity is explicit

The release record SHALL identify the canonical frontend deployment/project and distinguish it from stale or duplicate deployment contexts.

#### Scenario: Duplicate deployment is failing

- **WHEN** a non-canonical Vercel project reports a failure
- **THEN** the release record identifies it as excluded, disconnected, or an unresolved blocker
- **AND** the canonical deployment is not represented as globally green without that explanation

### Requirement: Performance evidence is part of release readiness

The release record SHALL include production-build route measurements, request-waterfall counts, Web Vitals, hydration duration, and topology evidence for the agreed route matrix.

#### Scenario: Performance gate is reviewed

- **WHEN** a reviewer assesses frontend readiness
- **THEN** the record shows the observed values against the approved thresholds
- **AND** any exception includes an owner, rationale, and follow-up date

### Requirement: Release artifacts remain consistent with OpenSpec

The review document, OpenSpec artifacts, test output, performance evidence, and deployment record SHALL describe the same implementation state.

#### Scenario: Release artifacts are reconciled

- **WHEN** the stabilization change is verified or archived
- **THEN** all referenced gaps have a status
- **AND** no document claims a gate passed without corresponding evidence
