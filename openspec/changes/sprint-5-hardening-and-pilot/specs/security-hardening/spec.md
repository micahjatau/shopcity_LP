## ADDED Requirements

### Requirement: Security certification blocks pilot launch on unresolved severe findings

The system SHALL require automated security evidence before pilot launch.

#### Scenario: High or critical finding blocks readiness

- **WHEN** Gitleaks, CodeQL, Trivy, or approved dynamic security checks report unresolved HIGH or CRITICAL issues for the release artifact
- **THEN** the production-readiness gate fails
- **AND** pilot launch remains blocked unless a documented time-bounded exception policy explicitly allows it

#### Scenario: Secret exposure triggers incident handling

- **WHEN** a secret is detected in repository history, build artifacts, or release inputs
- **THEN** the issue is treated as an incident requiring rotation and review
- **AND** deleting the latest file alone is not accepted as sufficient remediation evidence

### Requirement: The built production image is in security scope

The system SHALL scan the same production image that is intended for deployment.

#### Scenario: Container scan is tied to release artifact

- **GIVEN** a release candidate image has been built from the candidate SHA
- **WHEN** container vulnerability scanning runs
- **THEN** scan results are recorded against that image artifact
- **AND** readiness evidence references the same SHA or image digest

### Requirement: Staging dynamic checks run only against approved targets

The system SHALL constrain dynamic application security testing to approved staging targets.

#### Scenario: ZAP runs against staging only

- **WHEN** the dynamic security baseline runs
- **THEN** it uses the approved staging base URL or equivalent protected target
- **AND** it does not implicitly test localhost or production systems from hosted CI
