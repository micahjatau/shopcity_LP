## ADDED Requirements

### Requirement: Deployment readiness is fail-closed on real infrastructure health

The system SHALL report readiness as healthy only when the deployed API can reach both Postgres and Redis.

#### Scenario: Postgres or Redis is unavailable

- **WHEN** the deployed readiness check cannot reach either Postgres or Redis
- **THEN** `/health/ready` returns an error response
- **AND** the certification gate remains blocked

#### Scenario: Dependency-specific failure remains diagnosable

- **WHEN** readiness fails in the deployed environment
- **THEN** the failure path is distinguishable in logs or diagnostics as a Postgres, Redis, or wiring problem

#### Scenario: Both dependencies are reachable

- **WHEN** the deployed readiness check can reach both Postgres and Redis
- **THEN** `/health/ready` returns a healthy response

### Requirement: Release evidence uses one immutable deployment identity

The system SHALL bind security, readiness, and staging evidence to one immutable candidate identifier or deployment artifact.

#### Scenario: Evidence is recorded for a mutable alias

- **WHEN** a staging or security record references only a mutable alias
- **THEN** the record is not sufficient for final certification
- **AND** the evidence must be re-bound to the immutable candidate identity

#### Scenario: Candidate and deployment identifiers disagree

- **WHEN** a recorded candidate SHA does not match the immutable deployment identifier in the evidence trail
- **THEN** final certification fails until the mismatch is corrected

### Requirement: The selected release artifact model is explicit

The system SHALL record which artifact model is being certified and SHALL keep evidence aligned to that model.

#### Scenario: The model is undecided

- **WHEN** review evidence still mixes GHCR/container and Vercel deployment identities
- **THEN** final certification remains blocked until one model is chosen and recorded

### Requirement: The certified release surface includes the worker runtime

The system SHALL treat the worker runtime as part of the certified release surface whenever background processing is required for the product.

#### Scenario: Only the HTTP API is deployed

- **WHEN** the API is deployed without the worker runtime in the certified release path
- **THEN** the release is not considered complete for pilot certification

### Requirement: Release evidence documents agree with the verified candidate

The system SHALL keep release-evidence documents, readiness notes, and candidate mappings consistent with the same immutable release candidate.

#### Scenario: Evidence docs mention a different deployment ID

- **WHEN** a release-evidence document references a deployment ID that does not belong to the recorded candidate
- **THEN** the certification record is incomplete until the document is corrected

#### Scenario: Evidence is refreshed after re-verification

- **WHEN** the candidate is re-verified against the chosen artifact model
- **THEN** the related release-evidence documents are updated to match the same candidate and deployment identity

### Requirement: Staging validation is complete on the certified candidate

The system SHALL run migrations, readiness probes, Bruno smoke checks, and contract tests against the same certified staging candidate.

#### Scenario: A staging gate remains pending

- **WHEN** migrations, readiness, Bruno, or contract validation is pending or targets a different artifact
- **THEN** staging certification remains blocked

### Requirement: Performance evidence comes from final staging

The system SHALL record k6 performance evidence from the final staging environment and certified artifact.

#### Scenario: Only local or synthetic performance evidence exists

- **WHEN** k6 results were produced locally or against a synthetic environment
- **THEN** those results do not satisfy final performance certification

### Requirement: Security evidence records accepted warnings explicitly

The system SHALL record the complete security workflow result and any accepted ZAP warnings for the same immutable candidate.

#### Scenario: ZAP has no new failures but has warnings

- **WHEN** ZAP reports `FAIL-NEW: 0` with documented warning categories
- **THEN** the security gate may pass only when the warnings and acceptance rationale are recorded with the candidate evidence

### Requirement: Disaster recovery is verified with a provider-managed backup

The system SHALL restore a real provider-managed Supabase backup into an isolated target and verify migration history, required objects, financial history, and reconciliation invariants.

#### Scenario: Restore uses only a local or synthetic backup

- **WHEN** the restore drill does not use the provider-managed backup path
- **THEN** disaster-recovery certification remains incomplete

### Requirement: Pilot approval requires operational sign-off

The system SHALL require role-based training, owner/admin approval, a completed production checklist, and a passing final readiness verifier before pilot approval.

#### Scenario: Training or sign-off is missing

- **WHEN** required cashier, supervisor, admin, or owner/operator training or approval is incomplete
- **THEN** the production checklist remains unsigned and pilot approval is blocked

#### Scenario: All certification gates pass

- **WHEN** artifact identity, readiness, staging, security, performance, restore, training, and sign-off evidence all pass for one candidate
- **THEN** the final readiness verifier may pass and the Review 46 tracker can be reconciled as complete
