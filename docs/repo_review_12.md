Repository review — latest head

Current head: 09a8601194bf4ee4645c9c7706dca8989bf9de73, “feat: add outbox worker recovery.”

Verdict

This is a meaningful improvement. The repository now has a real PostgreSQL-first outbox publisher, a standalone BullMQ worker, persistent SMS delivery records, retry handling and integration tests with Redis.

The previous architectural flaw—publishing Redis jobs inside the financial database transaction—is fixed.

However, Sprint 2 is still not ready to close. The new worker introduces two serious deployment risks:

1. Production currently uses a fake SMS provider that marks messages delivered without sending anything.

2. Existing outbox rows from earlier versions cannot be processed because they have no associated SmsMessage.

Issue #1 correctly remains open.

---

Improvements since the last review

1. Redis publication has been removed from the financial transaction

Confirmed earning now atomically creates:

Receipt

Ledger entry

Credit lot

Outbox event

SMS delivery record

Idempotency response

Audit record

No Redis operation occurs within this transaction.

Approval execution follows the same corrected pattern.

This properly separates financial durability from messaging availability.

2. Committed-row recovery is now implemented

The worker queries PostgreSQL for:

Due PENDING events

Retryable FAILED events

Stale QUEUED claims

It uses FOR UPDATE SKIP LOCKED, marks claimed rows QUEUED, and publishes them outside the claiming transaction.

This is the right general structure for safely running multiple worker instances.

3. SMS state is now separate from outbox state

The new SmsMessage model records:

QUEUED

SENT

DELIVERED

FAILED

SUPPRESSED

Provider message ID

Attempts

Error information

Delivery timestamps

Transaction reads now return the actual SMS delivery state instead of the outbox publication state.

4. A standalone worker can now be launched

The repository now contains:

npm run start:worker
npm run start:worker:prod

The worker starts separately from the HTTP API and handles shutdown for BullMQ, the queue and Prisma.

5. Provider success and failure are persisted

The handler maps provider outcomes into the SMS record and increments delivery attempts. Provider failures do not affect the already-committed financial transaction.

The integration suite exercises successful delivery and provider failure against real PostgreSQL and Redis test containers.

---

Critical blockers

P0 — The production worker falsely marks unsent SMS as delivered

The production bootstrap explicitly creates:

new DeterministicSmsProvider()

That provider performs no external delivery. It immediately returns:

{
status: 'DELIVERED',
providerMessageId: `sms-${outboxEventId}`
}

The environment contract only permits SMS_PROVIDER_MODE=deterministic, and that setting is not actually used to choose a provider.

Consequence

In staging or production:

1. The worker receives a genuine customer SMS.

2. No SMS provider is contacted.

3. The database records the SMS as DELIVERED.

4. Staff see a false delivery record.

5. The message is never retried because it appears terminal.

This is worse than leaving messages queued because it creates false operational evidence.

Required correction

Permit a real provider mode.

Build a provider factory based on validated configuration.

Refuse to start in production with the deterministic provider.

Prefer the fake provider to return SENT or a clearly test-only state rather than pretending delivery.

Store provider credentials outside the codebase.

---

P0 — Existing outbox rows cannot be recovered

The migration creates the SmsMessage table but does not backfill records for outbox events created before this migration.

The worker assumes every outbox event already has a related SMS record. When one is absent, it throws:

throw new Error(`SmsMessage not found for outbox event ${outboxEvent.id}`);

Upgrade failure scenario

Earlier repository versions created PENDING outbox rows without SmsMessage.

After deployment:

1. Recovery claims an older outbox row.

2. The job enters BullMQ.

3. The worker cannot find an SMS record.

4. The job retries five times.

5. No customer message is sent.

6. The event remains operationally inconsistent.

Required correction

Either:

Add a migration that backfills SmsMessage from existing sms.send outbox payloads, or

Let the worker transactionally create the missing delivery record from the persisted payload before sending.

A migration should also reject or report malformed historical payloads instead of silently abandoning them.

---

High-priority recovery defects

P1 — Redis data loss after publication is not recoverable

The publisher marks an outbox row PUBLISHED immediately after queue.add() succeeds.

The recovery query only selects:

PENDING

FAILED

Stale QUEUED

It never selects PUBLISHED.

Failure scenario

1. An outbox row is enqueued.

2. PostgreSQL records it as PUBLISHED.

3. Redis loses the job before the SMS worker finishes.

4. SmsMessage remains QUEUED.

5. PostgreSQL recovery ignores the event forever because it is already PUBLISHED.

This does not satisfy the TRD requirement that financially relevant queue work be reconstructable from PostgreSQL.

Required correction

Recovery should also consider:

OutboxEvent.status = PUBLISHED
AND SmsMessage.status IN (QUEUED, FAILED)
AND no terminal delivery exists
AND publishedAt is older than a recovery threshold

Re-enqueueing is safe because the outbox ID is already used as the BullMQ job ID.

---

P1 — Prisma schema and migration SQL are not fully aligned

The Prisma model declares:

outboxEventId String @unique

and also defines a tenant-scoped composite unique constraint.

The migration creates only:

CREATE UNIQUE INDEX "SmsMessage_tenantId_outboxEventId_key"
ON "SmsMessage"("tenantId", "outboxEventId");

It does not create the global SmsMessage_outboxEventId_key expected by @unique.

The worker integration suite uses prisma db push, which creates the schema from the Prisma model and therefore hides this migration drift.

Required correction

Choose one consistent model:

Keep outboxEventId @unique and add the corresponding migration index, or

Remove the field-level @unique and rely on the compound tenant constraint if Prisma supports the intended one-to-one relation that way.

Then add a migration test that deploys the migration files and inspects the resulting indexes.

---

P1 — The claimed rollback and outage tests are not actually present

The OpenSpec task list marks these as complete:

Rolled-back financial transactions do not enqueue work

Pending rows recover after Redis interruption

But the tests do not induce those conditions.

“Rollback” test

The first test performs a successful earn and then checks that a fresh Redis instance is empty before the worker starts. It never forces the financial transaction to roll back.

A proper test should inject a failure after outbox/SMS creation but before transaction completion and assert:

0 receipts
0 ledger entries
0 credit lots
0 outbox rows
0 SMS records
0 BullMQ jobs

“Redis interruption” test

The recovery test starts a functioning worker and functioning Redis, then creates a new earn and waits for the polling interval. It does not simulate Redis being unavailable during a publisher pass or restart Redis after an interruption.

A proper recovery test should:

1. Commit an earn while Redis is unavailable.

2. Confirm the outbox row remains due in PostgreSQL.

3. Restore Redis.

4. Start or continue the publisher.

5. Confirm exactly one SMS delivery.

---

P1 — A second obsolete worker implementation remains

src/jobs/worker.ts still contains the older worker implementation that only marks outbox rows as published.

The new production entrypoint uses OutboxWorkerRuntime, but retaining the old bootstrapWorker() creates:

Two competing worker abstractions

Confusing imports

Risk that future code or tests use the obsolete path

Different status and failure semantics

Delete the obsolete implementation or convert it into a thin re-export of the new runtime.

---

Remaining blockers from previous reviews

Legacy approvals can still bypass financial execution

When a pending receipt has no generic Approval, the compatibility path still directly marks the receipt approved or rejected without creating a ledger entry, credit lot, outbox event or SMS record.

This should be replaced by a migration/backfill or a safe financial execution path.

Transaction identity is still ambiguous

Confirmed earn responses still assign:

id = receipt.id
receiptId = receipt.id
ledgerEntryId = ledgerEntry.id

GET /transactions/:id still looks up the receipt ID rather than an explicit financial transaction ID.

The API should expose a clear transactionId rather than overloading id.

Stable domain errors are still missing

The financial workflow continues to throw generic exceptions such as:

Receipt is no longer eligible

Approval has already been decided

Ledger entry already exists

Physical receipt already captured

The frontend still cannot reliably distinguish receipt duplication, idempotency conflict, inactive card, blocked customer and staff ineligibility from stable codes.

Approval execution still does not rerun current policy

Before executing an approval, the service rechecks branch, device, card and customer state, but it does not rerun:

Current purchase ceiling

Current approval threshold

Current earn-rate policy

Approval expiry

It proceeds directly from entity eligibility to credit calculation and ledger creation.

Leap-day expiry remains unresolved

Expiry still uses JavaScript month rollover:

result.setUTCMonth(result.getUTCMonth() + months);

February 29 needs an explicit policy and regression test.

Same-key concurrency is still not tested

The current tests prove:

Sequential idempotent replay

Concurrent same-receipt requests using different keys

They do not prove that two simultaneous requests using the exact same idempotency key both receive the original successful response rather than one receiving a receipt conflict.

---

Operational and process gaps

Migration tracker is stale

The tracker ends with the immutable-ledger hardening migration and does not record the new outbox worker recovery migration.

No visible CI confirmation

The integration test is included by the existing CI command, but no PR-triggered workflow run is visible for the latest commit.

The connector does not expose enough information to conclude whether a separate push-triggered run passed.

SMS model may be too restrictive for later phases

SmsMessage permits only one message per receipt through @@unique([tenantId, receiptId]).

That works for one earn-confirmation SMS, but it will conflict with later needs such as:

Multiple delivery attempts represented separately

Reversal notifications

Expiry reminders

Other notification types linked to the same receipt

A better uniqueness boundary is usually one delivery record per outbox event, not one per receipt.

---

Updated assessment

Area Previous Current

Financial transaction correctness 8.5/10 8.7/10
After-commit outbox architecture 4/10 8/10
SMS delivery audit 3/10 7/10
Redis recovery 3/10 6/10
Production SMS readiness 1/10 2/10
Migration safety 7/10 6.5/10
Test credibility 7/10 7/10
API contract maturity 7/10 7/10
Pilot readiness 6/10 6.3/10

Overall estimates

Sprint 2 source implementation: approximately 85%

Sprint 2 verified exit-gate completion: approximately 65–70%

Full TRD MVP: approximately 60%

Pilot readiness: approximately 45–50%

---

Required next patch

Gate 1 — Make SMS behavior truthful

1. Add a provider factory.

2. Add a real provider adapter.

3. Refuse deterministic mode in production.

4. Never report DELIVERED without provider delivery evidence.

5. Add provider idempotency using the outbox event ID.

Gate 2 — Complete recovery correctness

1. Backfill SMS records for existing outbox rows.

2. Recover PUBLISHED events whose SMS remains non-terminal.

3. Test actual Redis outage and restart.

4. Test Redis data loss after publication.

5. Test multiple worker instances and SKIP LOCKED.

Gate 3 — Fix schema and migration verification

1. Resolve the missing unique-index mismatch.

2. Use prisma migrate deploy in the worker migration test.

3. Assert indexes, constraints and enum values after migration.

4. Update the migration tracker.

5. Add an upgrade-path test containing pre-migration outbox rows.

Gate 4 — Close inherited Sprint 2 blockers

1. Remove legacy receipt-only approval fallback.

2. Add explicit transactionId.

3. Implement stable financial error codes.

4. Revalidate current policy during approval execution.

5. Add same-key concurrency and leap-day expiry tests.

Redemption should still wait. The outbox architecture is now close, but deploying the current worker would silently record fake SMS deliveries and strand historical or Redis-lost messages.
