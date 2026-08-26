## Purpose

Close the remaining Sprint 5 release-certification gaps called out in repo review 46.

## ADDED Requirements

### Requirement: One frozen release candidate must own certification

The system SHALL treat Sprint 5 certification as one frozen release candidate backed by one immutable release SHA, one image digest, and one complete evidence bundle.

#### Scenario: Evidence references different candidates

- **WHEN** the readiness bundle references more than one release SHA or image digest
- **THEN** certification fails

#### Scenario: One candidate is fully evidenced

- **WHEN** one release SHA and one image digest are backed by the required restore, security, performance, staging, training, and approval evidence
- **THEN** the candidate is eligible for final certification review

### Requirement: Certification evidence must be observed, not asserted

The system SHALL require observed certification evidence with real timestamps, execution references, and measured values for the required gates.

#### Scenario: Future-dated evidence is supplied

- **WHEN** an evidence file contains timestamps that are in the future relative to the certification record
- **THEN** verification fails

#### Scenario: Narrative-only evidence is supplied

- **WHEN** the bundle contains only a checklist, baseline note, or approval statement without observed execution data
- **THEN** verification fails

#### Scenario: Performance evidence is recorded

- **WHEN** the bundle includes a k6 summary with measured metrics and the post-load reconciliation result for the frozen candidate
- **THEN** the performance gate is satisfied

### Requirement: Readiness verification must fail closed on stale or mismatched artifacts

The readiness verifier SHALL reject example or fixture evidence, stale review-head bundles, mismatched digest references, and mandatory gate artifacts that do not point at the same frozen candidate.

#### Scenario: Example evidence is supplied

- **WHEN** the verifier is pointed at an example readiness bundle or any example/fixture evidence path
- **THEN** verification fails

#### Scenario: Gate artifacts disagree on candidate identity

- **WHEN** one mandatory gate references a different SHA, image digest, or release tag than the readiness bundle
- **THEN** verification fails

#### Scenario: Security or staging evidence lacks execution references

- **WHEN** security or staging evidence does not include an actual workflow/run reference or equivalent execution identifier
- **THEN** verification fails

### Requirement: Sentry initialization must fail open

The application SHALL initialize Sentry only when configured, and any Sentry setup failure SHALL be logged without blocking API or worker startup.

#### Scenario: Sentry is not configured

- **WHEN** the application starts without a Sentry DSN
- **THEN** startup succeeds without initializing Sentry

#### Scenario: Sentry initialization throws

- **WHEN** Sentry setup throws during startup
- **THEN** the failure is logged
- **AND** startup continues

### Requirement: Certification records must stay aligned with the frozen candidate

The release-evidence bundle, approval records, and proposal-time tracker SHALL all name the same frozen release candidate so the certified artifact remains internally consistent.

#### Scenario: Tracker and evidence disagree

- **WHEN** the tracker or approval record names a different commit than the readiness bundle
- **THEN** the certification set is rejected as stale

#### Scenario: All records match the frozen candidate

- **WHEN** the tracker, approval record, and readiness bundle name the same release SHA and image digest
- **THEN** the certification record is internally consistent
