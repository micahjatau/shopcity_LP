# Smoke Certification Security

## ADDED Requirements

### Requirement: Authentication state stays outside evidence

The smoke runner MUST store browser authentication state outside the evidence/output tree and MUST prevent cookies, storage state, session tokens, CSRF tokens, authorization headers, and passwords from entering uploaded artifacts.

#### Scenario: Failed smoke run uploads safe evidence

- **WHEN** a smoke run fails after role authentication
- **THEN** the uploaded artifact contains evidence and diagnostics only
- **AND** no authenticated browser state is present

### Requirement: Smoke sessions are short-lived and revocable

Smoke bootstrap sessions MUST use a short configurable lifetime and MUST be revoked during teardown. Ordinary login sessions MUST retain their existing lifetime.

#### Scenario: Smoke teardown completes

- **WHEN** teardown runs after a successful or failed smoke run
- **THEN** all smoke-created sessions are revoked
- **AND** temporary authentication files are deleted

### Requirement: Bootstrap requests are throttled

The smoke bootstrap endpoint MUST enforce a dedicated IP-based rate limit and MUST not disclose secret or session material in throttle responses.

#### Scenario: Repeated bootstrap attempts exceed the limit

- **WHEN** a client exceeds the smoke bootstrap request limit in the configured window
- **THEN** subsequent attempts are rejected
- **AND** the bootstrap secret remains undisclosed

### Requirement: Privileged workflows trust only approved sources

A staging workflow receiving secrets MUST reject untrusted workflow-run repositories and MUST verify the exact candidate SHA before executing repository code or mutating staging.

#### Scenario: Untrusted workflow-run event arrives

- **WHEN** the upstream run repository differs from the current repository
- **THEN** the job exits before checkout with staging secrets or mutation steps

### Requirement: Staging repair is smoke-scoped

Staging migration preparation MUST modify only the dedicated smoke tenant/device and MUST fail closed if a query would modify unrelated devices.

#### Scenario: Legacy invalid device exists outside the smoke fixture

- **WHEN** staging preparation finds an invalid active device outside the smoke scope
- **THEN** that device is not modified by smoke preparation
- **AND** the workflow reports a safe diagnostic or fails for operator repair

### Requirement: Outbox terminal recovery is complete

SMS recovery MUST reconcile `SENT`, `DELIVERED`, and `SUPPRESSED` messages whose published outbox events were not completed before a worker interruption.

#### Scenario: Worker dies after provider returns SENT

- **WHEN** the worker restarts with a published event linked to a `SENT` SMS message
- **THEN** the event is completed without sending the SMS again

### Requirement: Release dependencies and migration history are secure

The candidate image MUST contain no HIGH or CRITICAL Trivy vulnerabilities, historical migrations MUST remain immutable, and normal staging certification MUST use strict migration deployment after one-time history reconciliation.

#### Scenario: Candidate reaches security gate

- **WHEN** Trivy scans the actual production image
- **THEN** the scan passes without vulnerability allowlisting

#### Scenario: Normal staging certification starts

- **WHEN** staging migration history has been reconciled
- **THEN** certification runs `prisma migrate deploy` without swallowed resolve errors
