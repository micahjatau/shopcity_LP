## ADDED Requirements

### Requirement: Release certification is bound to one immutable candidate

Release certification MUST independently verify that the candidate SHA, workflow head SHA, successful required-check conclusions, deployment artifact SHA, and evidence bundle all refer to the same intended candidate.

#### Scenario: Candidate provenance is valid

- **GIVEN** a release evidence bundle
- **WHEN** the verifier evaluates candidate, workflow, deployment, and artifact metadata
- **THEN** it accepts only exact matching SHAs and successful required conclusions
- **AND** records the verifier version, environment, timestamp, and artifact hashes

#### Scenario: Candidate provenance is incomplete or mismatched

- **GIVEN** any missing, stale, or mismatched candidate/deployment/workflow evidence
- **WHEN** release verification runs
- **THEN** certification fails with an actionable reason
- **AND** the candidate is not marked release-ready

### Requirement: Exact-head security and protected-branch evidence is required

Release certification MUST include exact-candidate evidence for Gitleaks, CodeQL, Trivy, ZAP, and the protected-master required-check configuration.

#### Scenario: Security workflow runs on the candidate

- **GIVEN** a frozen candidate SHA
- **WHEN** security checks run through a protected-master pull request or explicit candidate dispatch
- **THEN** each required security result is recorded against that exact SHA
- **AND** a successful ordinary frontend-development CI run is not treated as a substitute

#### Scenario: Required `ci` context is verified

- **GIVEN** protected-master branch settings require a `ci` context
- **WHEN** branch protection is inspected and merge gating is tested
- **THEN** the evidence proves that `ci` is a real successful required context
- **AND** stale or unmatched job names are reported as a release blocker

### Requirement: Deployment topology and duplicate projects are reconciled

Release evidence MUST record frontend, backend, database regions and URLs, deployment artifact identities, and the documented disposition of every relevant Vercel project, including the duplicate `shopcity` project.

#### Scenario: Topology is documented

- **GIVEN** the release candidate deployments
- **WHEN** topology evidence is assembled
- **THEN** Frankfurt placement and project ownership/disposition are recorded
- **AND** no project is deleted without explicit approval

### Requirement: Certification uses authenticated business-path benchmarks

Release certification MUST include reproducible authenticated measurements for card lookup, confirmed Earn, pending-approval Earn, confirmed Redeem, and supervisor dashboard/report workflows.

#### Scenario: Business benchmarks are recorded

- **GIVEN** controlled authenticated cashier/supervisor sessions and provisioned devices
- **WHEN** the benchmark executes real client navigation or RSC/proxy workflows
- **THEN** it records raw samples, sample size, P50, P90, environment, exact SHA, route path, and outcome for every required flow
- **AND** compares lookup to <2 seconds, Earn to <3 seconds, Redeem to <3 seconds, and dashboard summary to <5 seconds

#### Scenario: Infrastructure-only probes are attempted

- **GIVEN** benchmark evidence containing only health checks, unauthenticated requests, or repeated page loads
- **WHEN** release certification evaluates the evidence
- **THEN** it rejects that evidence as insufficient business-path proof

### Requirement: Pilot device and restore evidence are complete

Release certification MUST include actual pilot device lifecycle proof and backup/restore evidence for affected operational or database state.

#### Scenario: Pilot devices are certified

- **GIVEN** pilot POS devices
- **WHEN** devices are provisioned or migrated
- **THEN** branch binding, activation, attestation, rotation/revocation, and session invalidation are verified
- **AND** raw attestation secrets are excluded from browser storage and evidence artifacts

#### Scenario: Restore evidence is recorded

- **GIVEN** schema or operational changes requiring recovery proof
- **WHEN** the backup/restore or restore drill executes
- **THEN** the result is retained, the migration tracker is updated, and the evidence identifies the tested backup and candidate

### Requirement: Final review gates certification

Release certification MUST include refreshed release/topology documentation, reconciled OpenSpec status, GitNexus change detection, final diff review, and residual-risk review.

#### Scenario: Final evidence review completes

- **GIVEN** implementation and operational evidence are available
- **WHEN** final verification runs
- **THEN** GitNexus `detect_changes()` is recorded
- **AND** the complete diff and working-tree status are reviewed
- **AND** every required evidence item is either verified or explicitly blocks certification
