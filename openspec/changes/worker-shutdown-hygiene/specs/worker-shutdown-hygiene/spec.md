## ADDED Requirements

### Requirement: Worker runtime shuts down cleanly

The outbox worker runtime SHALL stop its recovery loop, close the BullMQ worker and queue, and disconnect Prisma when shutdown is requested.

#### Scenario: shutdown releases resources

- **WHEN** the worker runtime receives a shutdown request after starting
- **THEN** it SHALL stop scheduling recovery work and release its Redis and database resources

#### Scenario: repeated shutdown is safe

- **WHEN** shutdown is requested more than once
- **THEN** the runtime SHALL not throw and SHALL not create duplicate cleanup work

### Requirement: Redis test lifecycle is bounded

The worker integration test harness SHALL provide explicit start, stop, and restart control over a test-owned Redis process using a stable connection endpoint.

#### Scenario: outage can be simulated

- **WHEN** a test stops the Redis process
- **THEN** worker recovery checks SHALL observe the outage without forcing the test process to exit

#### Scenario: restart resumes recovery

- **WHEN** the Redis process is started again
- **THEN** the worker recovery path SHALL reconnect and continue processing queued work

### Requirement: Worker tests exit without cleanup noise

The targeted worker recovery tests SHALL complete without requiring force-exit behavior and without leaving repeated background connection retries after teardown.

#### Scenario: teardown completes

- **WHEN** the worker recovery suite finishes
- **THEN** the test process SHALL exit cleanly after teardown

#### Scenario: no repeated retry spam

- **WHEN** Redis is unavailable during the test
- **THEN** teardown SHALL complete without persistent retry spam after the test ends
