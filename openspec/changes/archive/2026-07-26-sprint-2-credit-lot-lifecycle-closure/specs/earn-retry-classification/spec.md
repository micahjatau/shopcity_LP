## ADDED Requirements

### Requirement: Narrow earn retry classifier
The system SHALL retry earn transaction conflicts only for demonstrated retriable PostgreSQL/Prisma write conflicts.

#### Scenario: Prisma P2034 retried
- **WHEN** the earn transaction path receives a Prisma known request error with code `P2034`
- **THEN** the system MUST treat it as a retryable transaction conflict within the bounded retry budget

#### Scenario: Non-retryable Prisma codes not retried
- **WHEN** the earn transaction path receives Prisma `P2028`, Prisma `P2031`, or another unapproved Prisma error code
- **THEN** the system MUST NOT classify the error as a retryable transaction conflict

#### Scenario: Message matching not retried
- **WHEN** the earn transaction path receives a generic error whose message contains transaction-related text but lacks an approved retryable code
- **THEN** the system MUST NOT classify the error as a retryable transaction conflict

### Requirement: Retry classifier regression coverage
The system SHALL include unit tests proving retry classification is limited to approved conflict cases.

#### Scenario: Exhausted P2034 maps to concurrency code
- **WHEN** approved `P2034` conflicts exhaust the retry budget
- **THEN** the API MUST return the stable `EARN_TRANSACTION_CONFLICT` code

#### Scenario: Unapproved transaction errors surface normally
- **WHEN** an unapproved transaction error occurs
- **THEN** the system MUST surface it through the normal error path rather than converting it to `EARN_TRANSACTION_CONFLICT`
