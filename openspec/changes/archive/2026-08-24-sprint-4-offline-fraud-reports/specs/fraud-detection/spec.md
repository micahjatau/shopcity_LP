## ADDED Requirements

### Requirement: Fraud evidence is separate from financial authority

The system MUST record fraud findings as operational evidence and MUST NOT mutate confirmed financial history as part of fraud evaluation.

#### Scenario: Fraud rule matches a transaction

- **WHEN** a transaction satisfies a fraud rule
- **THEN** the system MUST create or update a fraud flag without editing the underlying receipt or ledger rows

### Requirement: Fraud evaluation is deterministic and replay-safe

The system MUST evaluate fraud rules deterministically so repeated delivery of the same evaluation event does not create duplicate logical cases.

#### Scenario: Same evaluation event is delivered twice

- **WHEN** the same fraud evaluation event is processed more than once
- **THEN** the system MUST deduplicate the resulting fraud flag by rule, subject, and window

### Requirement: Fraud flags preserve operational evidence

The system MUST store fraud flags with a rule code, severity, deduplication key, occurrence count, first and last detection timestamps, and evidence payload.

#### Scenario: Repeated matches occur in the same window

- **WHEN** a second matching event arrives for the same subject and window
- **THEN** the system MUST increment the occurrence count and update the last detected timestamp instead of creating a duplicate case

### Requirement: High-risk financial patterns create evidence

The system MUST create fraud evidence for duplicate receipts, high-value earns, very-high-value earns, and high-value redemptions according to the configured rules.

#### Scenario: Duplicate receipt is detected

- **WHEN** a confirmed transaction matches the duplicate-branch-receipt-week rule
- **THEN** the system MUST record a HIGH-severity fraud flag and preserve the financial outcome that already exists

#### Scenario: Very high earn crosses the approval threshold

- **WHEN** an earn transaction exceeds the configured very-high-value threshold
- **THEN** the system MUST preserve the existing approval workflow and MUST also record fraud evidence for review

### Requirement: Behavioral fraud rules are deterministic

The system MUST evaluate the configured behavioral fraud rules for card reuse frequency, cashier value distribution, rounded-value repetition, reversal frequency, frequent card replacement, and repeated authentication failures using deterministic thresholds and minimum sample sizes.

#### Scenario: Card reuse threshold is crossed

- **WHEN** a card is used more than the configured daily count threshold within a branch-local day
- **THEN** the system MUST record a fraud flag for the card reuse rule

#### Scenario: Cashier sample size is too small

- **WHEN** a cashier has fewer than the configured minimum sample size for the peer comparison window
- **THEN** the system MUST NOT emit a cashier anomaly flag based only on that insufficient sample

#### Scenario: Rounded values recur

- **WHEN** the same cashier repeatedly submits rounded purchase values above the configured minimum sample size
- **THEN** the system MUST record a rounded-value fraud flag

### Requirement: Background evaluation is supported

The system MUST support asynchronous fraud evaluation from the outbox or worker path after the financial transaction commits.

#### Scenario: Financial commit completes

- **WHEN** an earn transaction commits successfully
- **THEN** the system MUST enqueue or dispatch fraud evaluation independently of the financial transaction outcome

### Requirement: Fraud evaluation failure is retryable

The system MUST allow fraud evaluation to retry without rolling back the original financial transaction.

#### Scenario: Fraud worker fails transiently

- **WHEN** the fraud worker fails after the financial transaction has committed
- **THEN** the system MUST preserve the transaction and retry the fraud evaluation independently
