## Purpose

Close the remaining Sprint 5 review 45 gaps that block pilot-safe release certification.

## ADDED Requirements

### Requirement: Reminder totals must be revalidated at commit time

The system SHALL re-read and revalidate qualifying credit lots inside the same transaction that writes a credit-expiry reminder so that a stale pre-commit candidate total cannot be persisted.

#### Scenario: A lot is redeemed after candidate discovery but before reminder persistence

- **WHEN** reminder candidates are discovered with a positive expiring total
- **AND** a qualifying lot is redeemed before the reminder transaction commits
- **THEN** the transaction re-queries authoritative lot state
- **AND** the persisted reminder total reflects the post-redemption balance
- **AND** no reminder is written when the authoritative total is zero

### Requirement: Expiry and redemption concurrency must be proven on the same lot

The system SHALL include an integration test that executes a real redemption and a due-credit expiry sweep against the same lot concurrently and verifies the resulting balances remain valid.

#### Scenario: Redemption and expiry race on one due lot

- **WHEN** a lot with spendable remaining balance is both due for expiry and targeted by redemption at the same time
- **THEN** exactly one valid financial outcome is recorded
- **AND** the lot never becomes negative
- **AND** ledger and evidence reconciliation remain consistent

### Requirement: Production readiness verification must fail closed on example evidence

The readiness verifier SHALL reject example or fixture evidence and SHALL require a real release-candidate evidence bundle before certifying pilot readiness.

#### Scenario: Example evidence is supplied to the production verifier

- **WHEN** the verifier is pointed at an example readiness document
- **OR** any referenced evidence path contains an example or fixture placeholder
- **OR** a referenced evidence file is only a generic runbook, checklist, or baseline document where executed evidence is required
- **THEN** verification fails
- **AND** the command does not report readiness as passed

#### Scenario: Real evidence bundle is supplied to the production verifier

- **WHEN** the verifier is pointed at one real readiness document
- **AND** every mandatory gate references evidence for the same release SHA and image digest
- **AND** the bundle contains the observed execution artifacts required by each gate
- **THEN** verification passes

### Requirement: Sentry must initialize only when configured and remain non-blocking

The application SHALL initialize Sentry only when a DSN is configured, and that initialization SHALL not block financial writes or worker startup.

#### Scenario: Sentry is not configured

- **WHEN** the application starts without a Sentry DSN
- **THEN** startup succeeds without Sentry initialization

#### Scenario: Sentry is configured

- **WHEN** the application starts with a valid Sentry DSN
- **THEN** Sentry initializes successfully
- **AND** financial writes continue without waiting on Sentry availability

### Requirement: One immutable release candidate must back all pilot evidence

The system SHALL treat pilot readiness as a single release candidate backed by one immutable SHA, one image digest, and one complete evidence bundle.

#### Scenario: Evidence references different candidates

- **WHEN** release evidence references more than one SHA or image digest
- **THEN** the readiness bundle is rejected

#### Scenario: One candidate has complete evidence

- **WHEN** one SHA and one image digest are backed by the required restore, security, performance, staging, training, and sign-off evidence
- **THEN** the release candidate can be marked ready for final review

### Requirement: Security certification evidence must be recorded for the release candidate

The release bundle SHALL include the executed security workflow evidence for the candidate, including the actual run or workflow reference for the configured Gitleaks, CodeQL, Trivy, and staging ZAP checks.

#### Scenario: Security gates were executed on the candidate

- **WHEN** the release candidate has recorded evidence for the required security checks
- **AND** the workflow/run references point to the same SHA and image digest as the release bundle
- **THEN** the security gate is considered satisfied

#### Scenario: Security evidence is missing or only narrative

- **WHEN** the bundle only cites a policy document or checklist without the actual workflow/run evidence
- **THEN** the security gate fails

### Requirement: Performance certification evidence must be recorded for the release candidate

The release bundle SHALL include executed performance evidence for the candidate, including a k6 summary and post-load financial reconciliation result for the same SHA and image digest.

#### Scenario: k6 ran on the candidate

- **WHEN** the bundle contains the k6 summary for the release candidate
- **AND** the post-load reconciliation result is healthy
- **THEN** the performance gate is satisfied

#### Scenario: Performance evidence is missing

- **WHEN** the bundle only references a baseline document or design note instead of an executed summary
- **THEN** the performance gate fails

### Requirement: Restore drill evidence must record observed RPO and RTO

The release bundle SHALL include an observed restore drill with the measured restore timestamps, the accepted RPO/RTO policy, and the restored-database verification result for the candidate.

#### Scenario: Observed restore drill is recorded

- **WHEN** the bundle includes a completed restore drill for the candidate
- **AND** the drill records the measured RPO and RTO
- **AND** the restored database verification passes
- **THEN** the restore gate is satisfied

#### Scenario: Stricter restore thresholds are used

- **WHEN** the bundle uses restore thresholds stricter than the TRD pilot baseline
- **THEN** the stricter thresholds are documented as an explicit pilot policy
- **AND** the verifier evaluates the candidate against that documented policy

#### Scenario: Restore evidence is only an example file

- **WHEN** the restore evidence path points to an example or fixture document
- **THEN** the restore gate fails
