## ADDED Requirements

### Requirement: Vercel projects have an explicit disposition

Release operations MUST inventory Vercel projects associated with the repository and record whether each is active, transitional, or obsolete.

#### Scenario: Project inventory is reviewed

- **GIVEN** multiple Vercel projects associated with ShopCity
- **WHEN** deployment topology is reviewed
- **THEN** active aliases and deployment targets are identified
- **AND** obsolete projects are retired or disconnected only after explicit owner approval
- **AND** no active deployment is removed by cleanup automation

### Requirement: Build and dependency warnings are dispositioned

Release readiness MUST either resolve or explicitly document the risk and owner for build-setting overrides and deprecated dependency/allow-scripts warnings.

#### Scenario: Build warnings are present

- **GIVEN** a successful build with configuration or dependency warnings
- **WHEN** release evidence is assembled
- **THEN** each warning is classified as fixed, accepted with rationale, or assigned follow-up work
- **AND** warnings are not represented as runtime health failures without evidence
