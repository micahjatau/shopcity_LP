## ADDED Requirements

### Requirement: Supabase Cron is the sole background scheduler after cutover

The system SHALL define Supabase Cron as the sole scheduler for flows F0–F10, including report materialization, once a flow is cut over. Each flow SHALL have one declared owner and SHALL NOT be active in both a legacy runtime and Supabase Cron simultaneously.

#### Scenario: schedule ownership is reviewed

- **WHEN** an operator enables a Preview or Production schedule
- **THEN** the schedule inventory identifies its environment, flow ID, cadence, endpoint, owner, and rollback action
- **AND** competing worker, Vercel Cron, or third-party schedules for that flow are disabled before cutover

### Requirement: scheduled endpoints are protected and bounded

The API SHALL expose a POST scheduled-job endpoint protected by a fail-closed, environment-specific secret, checked without timing leaks. Each request SHALL have a validated flow identifier, bounded payload, fixed upper batch limit, and finite execution budget. Redis SHALL remain available for authentication throttling and SHALL NOT be required for job claims or execution.

#### Scenario: invalid or missing scheduler credentials

- **WHEN** a request has missing, invalid, or wrong-environment credentials
- **THEN** it is rejected before job execution and no job/run side effects occur

#### Scenario: duplicate or overlapping invocation

- **WHEN** the same schedule window is invoked repeatedly or concurrently
- **THEN** a durable idempotency key and PostgreSQL row-locked claims prevent completed work from being repeated and live outbox rows from being concurrently claimed
- **AND** cursor leases serialize report/history batches

#### Scenario: transport retries a failed invocation

- **WHEN** the same environment, flow, and idempotency key is submitted after its run failed
- **THEN** the original failed run record is returned without re-executing work or overwriting its failure evidence
- **AND** a later schedule window uses a new idempotency key to retry eligible domain work

### Requirement: transactional and SMS safeguards are preserved

Scheduled work SHALL call existing Nest domain services for financial changes and SHALL preserve transactional outbox, append-only ledger/audit history, tenant scoping, credit/approval locks, SMS consent/suppression/template validation, message reservation CAS, provider status validation, and bounded retries. Scheduled jobs SHALL NOT create a path to replay historical SMS or directly trust client-supplied financial state.

#### Scenario: due credit expiry is scheduled

- **WHEN** F1 processes due lots
- **THEN** it delegates to the existing serializable credit-expiry service and records the same immutable ledger, expiry, and audit rows as the legacy flow

#### Scenario: credit-expiry reminder is due

- **WHEN** F2 processes eligible customers
- **THEN** it creates only the unique reminder and transactional outbox intent; delivery is handled separately by F3 under normal SMS safety rules

#### Scenario: SMS event is retried after timeout

- **WHEN** a send attempt may have reached the provider but the API lacks a definitive response
- **THEN** the system does not silently retry as if no send occurred; the attempt is retained for idempotent reconciliation/operator review

#### Scenario: old SMS intents predate the activation cutoff

- **WHEN** F3 or F10 processes scheduled outbox work
- **THEN** it requires an explicit `SCHEDULED_SMS_NOT_BEFORE` cutoff and claims only `sms.send` intents created at or after that cutoff
- **AND** it fails closed when the cutoff is missing or invalid

#### Scenario: F10 has no valid SMS cutoff

- **WHEN** F10 is invoked without a valid `SCHEDULED_SMS_NOT_BEFORE`
- **THEN** it fails before claiming any event type, including fraud and report events

#### Scenario: Preview SMS provider is disabled

- **WHEN** `SMS_PROVIDER_MODE=disabled` is configured
- **THEN** send attempts return a terminal no-send result without calling an external provider
- **AND** delivery-report polling is disabled

### Requirement: scheduler evidence is backend-only

The `ScheduledJobRun` and `ScheduledJobCursor` tables SHALL have row-level security enabled and SHALL expose no user-facing policies. Scheduler evidence and cursor leases are readable/writable only through the trusted backend database role.

#### Scenario: public database roles access scheduler state

- **WHEN** an `anon` or `authenticated` Supabase role attempts to access scheduler state through PostgREST
- **THEN** row-level security denies access because no public policies exist

### Requirement: each flow emits durable completion evidence

Each scheduled invocation SHALL record an idempotency key, flow, environment, start/end time, status, safe failure class, and bounded-work counters. A `pg_net` dispatch result alone SHALL NOT count as successful job completion. Secrets, personal information, SMS content, and credentials SHALL NOT be written to logs/evidence.

#### Scenario: remote HTTP dispatch is accepted but job does not finish

- **WHEN** `pg_net` reports that an HTTP request was dispatched
- **THEN** operators still use the Nest completion record to determine whether the flow completed

### Requirement: report materialization is fair and incremental

F7 SHALL persist a tenant cursor/watermark, process a bounded tenant batch, advance the cursor only after successful completion, wrap at the end, and prevent concurrent rebuilds. It SHALL not repeatedly rebuild only the first page or require a full tenant rebuild on each scheduled tick.

#### Scenario: tenant batch fails

- **WHEN** any tenant in a batch fails materialization
- **THEN** the failed tenant and safe error are recorded, and the cursor does not skip unfinished tenants

#### Scenario: cursor reaches end

- **WHEN** no tenant follows the persisted cursor
- **THEN** the next successful cycle starts from the first tenant without starvation

### Requirement: migration and cutover are non-destructive and gated

Implementation SHALL use additive, reviewed migrations; any future Supabase schedule setup SHALL be idempotent and Preview-scoped. It SHALL not alter Production configuration, apply destructive migrations, activate live SMS, replay historical SMS, or perform Production cutover without separate explicit approval and recorded Preview evidence.

#### Scenario: implementation is complete but Preview evidence is unavailable

- **WHEN** credentials or deployment access prevents Preview validation
- **THEN** the task reports the blocker and stops before Production changes or claims of successful validation
