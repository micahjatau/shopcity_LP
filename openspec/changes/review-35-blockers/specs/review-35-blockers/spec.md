## ADDED Requirements

### Requirement: Approval execution locks the full mutable eligibility set

The system MUST acquire locks for the approval record and every mutable related record that can affect approval eligibility or allocation before it evaluates execution, including the receipt, redemption when applicable, customer, card, device, relevant credit lots, and relevant allocation rows.

#### Scenario: Related status changes while execution is waiting

- **WHEN** approval execution is blocked waiting for a lock and a customer, card, or device status changes in another transaction
- **THEN** execution MUST re-read the post-lock aggregate and MUST proceed only if the current state still satisfies eligibility

### Requirement: Deadline-driven expiry keeps system ownership

The system MUST attribute deadline-driven approval expiry to a null or system decision actor and MUST record the requesting supervisor or worker only as the detector of the expired approval.

#### Scenario: Supervisor discovers an already expired approval

- **WHEN** a supervisor requests a decision for an approval that has already expired
- **THEN** the expiration MUST be recorded with system ownership
- **AND THEN** the supervisor MUST be recorded only as the detection source

### Requirement: Persisted malformed SMS payloads are terminal immediately

The system MUST treat an existing SMS row with an unsupported version, missing required fields, or otherwise invalid payload as terminal on its first processing attempt and MUST not retry it through normal delivery handling.

#### Scenario: Existing malformed SMS record is processed

- **WHEN** the worker loads a persisted SMS message whose payload cannot be reconstructed into valid delivery work
- **THEN** the message MUST be marked failed and dead-lettered immediately
- **AND THEN** the worker MUST not call the provider or rethrow the error for retry

### Requirement: Receipt quarantine locks the source Receipt rows

The system MUST lock the actual Receipt rows selected for quarantine before duplicate revalidation and MUST keep those locks until snapshot capture and deletion complete.

#### Scenario: A source Receipt changes after staging

- **WHEN** a Receipt no longer matches the staged tenant, branch, week, or normalized identity at execution time
- **THEN** the batch MUST be rejected and no quarantine deletion MUST occur

### Requirement: Quarantine batch selection is explicit and single-use

The system MUST require an explicit batch identifier for report, stage, and execute operations and MUST not implicitly select the latest approved or staged batch.

#### Scenario: Operator omits the batch identifier

- **WHEN** an operator tries to stage or execute quarantine work without a batch ID
- **THEN** the system MUST reject the request instead of choosing a batch automatically

#### Scenario: A batch is already finished

- **WHEN** an operator tries to stage or execute a cancelled, expired, already staged, or already executed batch
- **THEN** the system MUST reject the transition

### Requirement: Quarantine execution is concurrency-safe

The system MUST treat the approved-to-staged and staged-to-executed transitions as conditional state changes and MUST fail closed when the affected row count does not match expectations.

#### Scenario: Two execute requests race for the same batch

- **WHEN** two concurrent executions target the same batch
- **THEN** only one execution MAY succeed
- **AND THEN** the other request MUST fail without duplicating deletes or snapshot writes

### Requirement: Reversal is unavailable for this release

The system MUST return a stable unavailable or deferred response for reversal requests and MUST not create a durable reversal review request, assignment, or operator-facing workflow entry for this release.

#### Scenario: A reversal request is submitted

- **WHEN** a client calls the reversal endpoint
- **THEN** the system MUST return the deferred or unavailable response
- **AND THEN** it MUST not persist a review request that implies reversal execution is ready

### Requirement: Restore verification compares the full migration ledger

The system MUST compare the restored migration history using migration name, checksum, finished_at, rolled_back_at, applied_steps_count, and failure state before any repair or resolve step is allowed.

#### Scenario: Restored history contains an incomplete migration

- **WHEN** a restored database includes a rolled-back, incomplete, or duplicated migration entry
- **THEN** verification MUST fail closed before repair or resolve commands run

### Requirement: Restore verification proves historical data and object integrity

The system MUST verify that the restored database still contains and correctly relates historical Receipts, EARN and REDEEM ledger entries, CreditLots, Redemptions, RedemptionAllocations, AllocationRestorations, and the expected supporting SQL objects required by the release gate.

#### Scenario: A historical record or supporting object is missing

- **WHEN** the restored database is missing a historical business row, a required relationship, or a required function, trigger, index, or auth/schema object
- **THEN** verification MUST fail and report the missing item
