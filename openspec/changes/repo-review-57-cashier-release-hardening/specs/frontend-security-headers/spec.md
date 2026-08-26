## ADDED Requirements

### Requirement: Frontend responses apply a strict CSP

The frontend deployment SHALL emit a documented Content Security Policy that restricts scripts, styles, connections, frames, and other browser resources to approved sources.

#### Scenario: Frontend page is loaded

- **WHEN** a browser loads a production frontend response
- **THEN** the response includes the enforced CSP header
- **AND** required application resources load without unsafe wildcard relaxations

### Requirement: CSP is release-verified

Security-header checks SHALL fail release verification when the expected CSP is absent or materially weaker than the documented policy.

#### Scenario: Header regression occurs

- **WHEN** a release candidate omits or weakens the required CSP
- **THEN** the security-header verification fails
