## ADDED Requirements

### Requirement: Release evidence is tied to one immutable commit
The production gate SHALL require all mandatory CI, migration, SMS, contract, tracker, and issue evidence to reference the same immutable release-candidate SHA.

#### Scenario: Evidence comes from multiple commits
- **WHEN** local results, CI runs, migration evidence, or SMS evidence reference different commits
- **THEN** the production gate MUST remain no-go.

### Requirement: Mandatory CI gates are visible and green
The release evidence SHALL include visible green results for npm install, Prisma generation, formatting, source lint, complete test lint, type-check, production build, production entrypoint verification, Prisma validation, architecture check, unit tests, OpenAPI export/lint/diff, client generation/type-check, generated clean-diff checks, GitNexus analysis, E2E tests, integration tests, synthetic migration upgrade test, protected shared-backup restore verification, receipt-quarantine integration tests, and auth replay/device-revocation integration tests.

#### Scenario: Required CI job is missing or continue-on-error
- **WHEN** a mandatory release job is absent, failing, not visible, or allowed to pass through `continue-on-error`
- **THEN** release evidence MUST be rejected.

### Requirement: Migration tracker and review tasks reflect actual evidence
The migration tracker and review task states SHALL describe synthetic upgrade testing separately from actual shared-backup verification and mark tasks complete only when the stated evidence exists.

#### Scenario: Shared restore task lacks actual backup evidence
- **WHEN** only synthetic restore evidence exists
- **THEN** shared-backup restore and checksum/history tasks MUST remain open.

### Requirement: Release issue separates implementation completion from production approval
The project SHALL maintain an authoritative production gate issue or reopen the existing release issue until exact-head CI and migration evidence are attached.

#### Scenario: Implementation issue is closed without production evidence
- **WHEN** implementation work is complete but production gate evidence is missing
- **THEN** production approval MUST remain tracked in an open authoritative issue.

### Requirement: Final release-evidence package is complete
The production gate SHALL require a package containing final SHA, review record, green workflow URL/run ID, mandatory job results, shared backup source/timestamp, restore record, migration inventory/checksum report, SQL object inventories, financial probes, receipt-quarantine dry run, device security tests, real SMS smoke evidence, deployment checklist, rollback/restore procedure, updated tracker, and release issue state.

#### Scenario: Evidence package is incomplete
- **WHEN** any required release-evidence artifact is missing
- **THEN** the halfway production gate MUST remain no-go.
