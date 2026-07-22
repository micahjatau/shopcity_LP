## 1. Financial Model

- [x] 1.1 Add Prisma models for immutable ledger entries, credit lots, approvals, and outbox events.
- [x] 1.2 Add constraints for append-only financial history, one lot per earn, and tenant-safe relationships.

## 2. Earn Orchestration

- [x] 2.1 Introduce a transaction-oriented earn service and API surface.
- [x] 2.2 Implement atomic confirmed-earn persistence for receipt evidence, ledger entry, credit lot, audit record, and outbox row.
- [x] 2.3 Implement pending-approval handling that creates approval records without financial writes.

## 3. Approval Execution

- [x] 3.1 Centralize approval decision logic on the new approval workflow.
- [x] 3.2 Revalidate eligibility during approval execution and ensure the action executes exactly once.

## 4. Outbox and Worker

- [x] 4.1 Add the outbox publisher and BullMQ-backed worker entry point.
- [x] 4.2 Add SMS delivery status persistence and recovery handling for unpublished or failed outbox work.

## 5. Verification

- [x] 5.1 Add concurrency tests for simultaneous earn requests, idempotent replay, and payload-conflict handling.
- [x] 5.2 Add contract and integration tests for confirmed earns, pending approvals, and one-time approval execution.
- [x] 5.3 Run the targeted tests and confirm the change is ready for `/opsx-apply`.
