## ADDED Requirements

### Requirement: Production readiness is evidence-backed

The system SHALL NOT be declared pilot-ready without structured evidence tied to one release candidate artifact.

#### Scenario: Release evidence passes

- **WHEN** security, performance, restore, staging, training, and sign-off evidence all pass for one release SHA/image digest
- **THEN** the readiness verifier returns success and the pilot checklist may be signed

#### Scenario: Mandatory gate fails

- **WHEN** any required security, restore, staging, or sign-off gate is missing or failing
- **THEN** the readiness verifier fails and the pilot launch remains blocked

### Requirement: Restore verification is a launch gate

The system SHALL require a measured restore drill before pilot launch.

#### Scenario: Restore drill is acceptable

- **WHEN** restore evidence proves acceptable RPO/RTO and restored invariant checks pass
- **THEN** the pilot readiness gate may treat restore as satisfied

#### Scenario: Restore evidence is missing or out of bounds

- **WHEN** restore proof is absent or exceeds the accepted thresholds
- **THEN** production launch remains blocked regardless of implementation completeness
