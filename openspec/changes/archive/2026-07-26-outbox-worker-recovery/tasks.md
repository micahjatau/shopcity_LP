## 1. Data Model and Scripts

- [x] 1.1 Add the delivery record schema and any required outbox status/index updates in Prisma
- [x] 1.2 Generate the Prisma client and apply the new migration plan for the worker tables/statuses
- [x] 1.3 Add `start:worker` and `start:worker:prod` scripts that launch the standalone worker runtime

## 2. Worker Bootstrap and Shutdown

- [x] 2.1 Create a dedicated worker bootstrap that starts without the HTTP API
- [x] 2.2 Wire graceful shutdown so Prisma and queue resources close cleanly on termination
- [x] 2.3 Add configuration loading for the worker process and verify it uses the shared environment contract

## 3. Outbox Publication, Recovery, and SMS Delivery

- [x] 3.1 Move Redis queue publication out of the financial transaction path and into a committed-row publisher loop
- [x] 3.2 Implement claim-and-retry logic for aged pending and failed outbox rows using PostgreSQL as the source of truth
- [x] 3.3 Add an SMS delivery adapter interface plus a deterministic local/CI implementation
- [x] 3.4 Update worker processing so SMS outcomes persist queued, sent, delivered, failed, or suppressed delivery states

## 4. Verification

- [x] 4.1 Add integration coverage proving rolled-back financial transactions do not enqueue work
- [x] 4.2 Add integration coverage for recovery of pending outbox rows after Redis interruption
- [x] 4.3 Add integration coverage for SMS provider success and failure transitions
- [x] 4.4 Run the relevant build and test commands and confirm the worker path is stable end to end
