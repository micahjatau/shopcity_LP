Repository review — latest head

Current head: 7dcb1e6b123239030ef6be3b93c66089e6179e3f, “fix: clean worker shutdown and recovery tests.” It is one commit ahead of the previously reviewed outbox-worker implementation.

Overall verdict

This commit fixes two substantial weaknesses from the previous review:

Stale PUBLISHED events with unfinished SMS delivery can now be rediscovered.

Historical outbox events missing SmsMessage rows can now reconstruct those records from their payload.

Worker shutdown ordering and the Redis test harness are also improved.

However, Sprint 2 still should not be closed. The largest production blocker remains unchanged: the production worker uses a fake provider that records messages as delivered without sending them. The retry model also has a deeper flaw: database recovery selects SENT and FAILED messages, but the queue’s fixed job ID and retained BullMQ jobs may prevent those messages from actually being executed again.

---

What improved

1. Lost published jobs are now eligible for recovery

The PostgreSQL recovery query now includes stale PUBLISHED events when:

The associated SMS is QUEUED, SENT or FAILED, or

No SmsMessage exists at all.

This closes the previous gap where Redis could lose an already-published job and PostgreSQL would ignore it forever.

2. Historical outbox rows can reconstruct SMS records

The worker no longer immediately fails when an outbox event has no SmsMessage. It now attempts to create one from the stored payload using a tenant/outbox upsert.

The new integration test deletes the SMS row, marks the outbox event as stale and published, then verifies that the worker reconstructs and delivers it.

This is a practical runtime backfill for older outbox rows.

3. Worker recovery cycles no longer overlap

The worker now tracks one scheduled recovery promise and prevents a second interval cycle from starting while the first is active.

That reduces duplicate claims and shutdown races during normal operation.

4. Shutdown ordering is more disciplined

Shutdown now:

1. Sets the stopping flag

2. Clears the polling interval

3. Waits for the active scheduled recovery cycle

4. Closes the BullMQ worker

5. Closes the queue

6. Disconnects Prisma

7. Clears internal references

This is materially better than closing resources while an interval-triggered publisher may still be running.

5. Tests now use actual migration deployment

The worker integration suite now runs:

prisma migrate deploy

instead of prisma db push.

This makes the test environment more representative of deployment and exposes migration SQL failures that schema push would hide.

6. The Redis test harness can explicitly stop and restart Redis

The helper now owns a redis-server child process and exposes explicit:

start()

stop()

restart()

close()

operations with bounded readiness checks.

7. Multi-worker recovery has basic coverage

Two worker runtimes are started against the same PostgreSQL and Redis instances, and the test confirms that one SMS row and one outbox row remain.

This provides useful, though incomplete, coverage of SKIP LOCKED.

---

Critical production blockers

P0 — Production still records fake SMS deliveries

The production bootstrap continues to instantiate DeterministicSmsProvider directly.

That provider does not contact any SMS service. It immediately returns:

status: 'DELIVERED'

with an invented provider ID.

Production consequence

A real customer message would be recorded as delivered even though nothing was sent. That would:

Prevent retries

Produce false delivery reports

Mislead supervisors

Conceal provider integration failures

Make SMS reporting financially and operationally unreliable

Required fix

Introduce a provider factory such as:

SMS_PROVIDER_MODE=deterministic | arkseral | ebulksms

Then:

Allow deterministic mode only in development and test

Refuse worker startup in production when deterministic mode is selected

Use a real provider adapter in staging and production

Record SENT only when the provider accepts the request

Record DELIVERED only from actual delivery evidence or a provider callback

---

P0 — SENT messages may be resent

The recovery query treats SENT as unfinished and eligible for republication.

But the job handler only treats DELIVERED and SUPPRESSED as terminal. A recovered SENT record will call smsProvider.send() again.

Consequence

If the provider already accepted the first SMS but delivery confirmation has not arrived, the system can submit the same SMS again. This may:

Send duplicate messages

Charge ShopCity twice

Cause customers to receive repeated balance notifications

Make retry counts inaccurate

Required design

A SENT message should not normally be resent. It should move through one of these paths:

Wait for provider delivery callback

Poll provider delivery status

Reconcile after a long timeout using the provider message ID

Retry only with a provider-level idempotency key

outboxEventId is passed to the provider interface, but the interface does not require the adapter to use it as an idempotency key.

---

P0 — Failed jobs can enter an unbounded recovery cycle

BullMQ provides five attempts with exponential backoff.

After those attempts fail:

SmsMessage remains FAILED

OutboxEvent remains PUBLISHED

The PostgreSQL recovery query selects it again after the threshold

OutboxEvent.attempts increments again

There is no maximum database recovery count or permanent dead-letter state

This contradicts the TRD requirement for bounded retries and permanent failure visibility.

Required fix

Add explicit operational states or fields such as:

maxAttempts
deadLetteredAt
lastAttemptAt
nextAttemptAt
failureCategory

After the configured maximum:

Stop republishing

Leave SMS as permanently FAILED

Alert a supervisor

Require an explicit manual retry

---

P0/P1 — Re-adding a retained BullMQ job may not execute it

Every outbox job uses the outbox event ID as its fixed BullMQ job ID.

Neither the queue job options nor the worker configuration specify removeOnComplete or removeOnFail.

This creates a likely failure mode:

1. A job completes with SMS status SENT, or fails after all retries.

2. The job remains in BullMQ’s completed or failed set.

3. PostgreSQL recovery later calls queue.add() with the same job ID.

4. BullMQ may resolve that as the existing job rather than creating a fresh runnable job.

5. The publisher marks the outbox row as published again, but no new delivery occurs.

This is an inference from the current queue configuration and fixed job ID design, but it needs an explicit regression test.

Required fix

Use one controlled approach:

Remove completed and failed jobs after retaining required operational history in PostgreSQL, or

Explicitly locate and retry/remove the existing BullMQ job, or

Use a separate attempt-specific queue ID while preserving provider idempotency using the outbox ID

Do not assume that calling queue.add() with an existing ID causes the job to execute again.

---

Shutdown still has an unhandled race

P1 — The initial recovery cycle is not tracked

During startup, the runtime calls:

await this.runRecoveryCycle();

before assigning the interval and before setting started = true.

However, only interval-triggered cycles are stored in activeRecovery.

Race scenario

If a shutdown signal arrives while the initial recovery cycle is running:

1. stop() sets stopping = true.

2. activeRecovery is undefined, so shutdown does not wait for the initial cycle.

3. The queue, worker and Prisma connection are closed.

4. The startup recovery may still be publishing or updating PostgreSQL.

5. start() may continue afterward and create the interval even though shutdown has completed.

The current tests do not explicitly exercise shutdown during initial startup recovery.

Required fix

Track the initial recovery using the same activeRecovery mechanism, or make startup and shutdown share a lifecycle mutex/promise.

---

Test coverage is improved, but several claims remain overstated

The Redis outage test still does not test publisher failure

The new test:

1. Commits an earn while no worker is running

2. Confirms the row is still PENDING

3. Restarts an otherwise unused Redis process

4. Starts the worker

5. Confirms delivery

This proves that a committed database row survives until a later worker start. It does not prove recovery after Redis fails while a publisher is actively attempting to enqueue a row.

A stronger test should:

1. Start the worker

2. Stop Redis

3. Create or expose a due outbox event

4. Let a publisher attempt fail

5. Assert FAILED plus nextAttemptAt

6. Restart Redis

7. Assert exactly one eventual provider call

The rollback test is still absent

The test named around keeping Redis empty performs a successful financial transaction and verifies that no job appears before the worker starts.

It does not inject a transaction failure.

A proper rollback test should force failure after receipt, ledger, credit lot, outbox and SMS creation but before transaction completion, then verify that none of those rows exists and no queue job is present.

Multi-worker test does not prove one provider call

The test verifies one database SMS row and one outbox row.

It does not count provider invocations. Two workers could theoretically both call the provider while updating the same single database row.

Use a shared scripted provider with an invocation counter and assert exactly one call.

Shutdown requirements have no direct regression test

The OpenSpec tasks claim repeated shutdown calls and clean handle closure are verified.

The worker integration tests call stop() in cleanup, but there is no dedicated test for:

Two concurrent stop() calls

Shutdown during active recovery

Shutdown during provider send

Shutdown during initial startup recovery

Restarting the same runtime after stop

---

Historical reconstruction needs stronger validation

P1 — The worker handles every outbox event as an SMS

The recovery query does not filter by eventType. It claims any due outbox event.

The handler then assumes it can find or create an SmsMessage.

As the platform adds events such as:

Fraud evaluation

Reports materialization

Expiry processing

Other notifications

this worker will attempt to interpret them as SMS jobs.

Required fix

Add explicit routing:

switch (outboxEvent.eventType) {
case 'sms.send':
return handleSms(...);
default:
return handleUnsupportedEvent(...);
}

Unsupported events should not enter endless SMS retries.

P1 — Missing receipt IDs are handled unsafely

Reconstruction uses:

const receiptId = String(payload.receiptId ?? outboxEvent.id);

An outbox ID is not a valid substitute for a receipt ID. The subsequent foreign key insert will fail unless the IDs coincidentally match.

The code validates only phoneE164 and template, not:

Event type

Receipt existence

Phone format

Tenant/receipt ownership

Expected payload version

Malformed historical rows can therefore enter repeated failure cycles.

---

Schema concerns remain

Prisma and SQL migration drift remains unresolved

The Prisma model declares a field-level global uniqueness constraint:

outboxEventId String @unique

and also a tenant-scoped composite unique constraint.

The migration creates the composite tenant/outbox unique index but not the separate global index implied by @unique.

Switching the test to prisma migrate deploy is good, but it does not automatically compare the resulting database schema against schema.prisma.

Resolve the model so the Prisma declaration and migration SQL describe exactly the same constraints.

One SMS per receipt is too restrictive

The schema enforces:

@@unique([tenantId, receiptId])

That prevents more than one notification associated with a receipt. Later workflows may need:

Earn confirmation

Reversal notification

Approval outcome

Expiry warning

Manual resend

The durable uniqueness boundary should normally be one SMS record per outbox event, not one per receipt.

---

Unchanged Sprint 2 blockers

The latest commit intentionally changed only worker shutdown and recovery files, so several earlier issues remain.

Legacy receipt approval can still bypass the ledger

When no generic approval exists, the legacy path changes receipt review fields without creating a ledger entry, credit lot, outbox event or SMS delivery record.

Transaction identity remains overloaded

Confirmed earn responses still use the receipt ID as both id and receiptId, while the ledger ID appears separately.

GET /transactions/:id still interprets the parameter as a receipt ID.

Stable financial error codes remain absent

The service still uses generic Nest exceptions and message strings rather than deterministic codes for receipt duplication, idempotency conflict, staff exclusion and inactive cards.

Approval execution still does not rerun current policy

Approval execution revalidates entity statuses but does not rerun current ceiling, threshold, approval expiry or policy resolution before creating financial effects.

Leap-day expiry is still unresolved

The expiry helper still relies on JavaScript month rollover.

Same-key concurrent idempotency remains untested

The existing immutable-ledger test covers sequential replay, not two simultaneous requests with the same key.

---

CI status

No pull-request workflow run or combined status is visible for the latest commit through the connector, so I cannot independently confirm the completed verification claims.

---

Updated assessment

Area Previous Current

After-commit outbox architecture 8/10 8.5/10
Historical outbox recovery 5/10 8/10
Redis-loss recovery 6/10 7.5/10
Worker lifecycle 6/10 7.5/10
Retry boundedness 4/10 4/10
Real SMS readiness 2/10 2/10
Test credibility 7/10 7.5/10
Financial/API contract 7/10 7/10
Pilot readiness 6.3/10 6.6/10

Estimated completion

Sprint 2 source implementation: approximately 88%

Sprint 2 verified exit gate: approximately 70–75%

Full TRD MVP: approximately 60–62%

Pilot readiness: approximately 48–52%

---

Recommended next patch

Gate 1 — Real and safe SMS provider behavior

Add a real provider adapter and provider factory

Block deterministic mode in production

Add provider idempotency

Separate SENT reconciliation from resend

Never claim delivery without provider evidence

Gate 2 — Make retries truly bounded and executable

Define permanent failure/dead-letter behavior

Resolve retained BullMQ job-ID replay semantics

Add maximum recovery attempts

Test recovery after BullMQ exhaustion

Assert provider invocation count

Gate 3 — Complete lifecycle verification

Track initial recovery during shutdown

Test concurrent/repeated shutdown

Test shutdown during active provider work

Test restart of the same runtime instance

Simulate actual Redis failure during publication

Gate 4 — Finish inherited Sprint 2 work

Remove the legacy approval bypass

Add explicit transactionId

Implement stable domain error codes

Revalidate policy during approval execution

Fix leap-day expiry

Add same-key concurrency tests

Align Prisma schema and migration SQL

Redemption should remain blocked until Gates 1, 2 and the legacy approval issue are resolved. The earn ledger is now strong, but messaging can still produce false delivery records, duplicate sends or permanently stuck retries.
