Repository review — latest head

Current head: ac8f1581b2d382c241a0f82faa66a14926b1cbf0, “feat: harden sms delivery reliability.” It is one commit ahead of the previously reviewed worker-shutdown patch.

Verdict

This patch contains several correct design improvements:

SENT messages are no longer automatically resent.

Retry and dead-letter metadata now exists.

Stale dead-lettered messages are excluded from PostgreSQL recovery.

BullMQ retained jobs can be removed before replay.

Completed and failed BullMQ jobs are cleaned up.

The earlier Prisma uniqueness mismatch was corrected.

However, the principal production SMS blocker is not fixed. The provider factory is not connected to the production worker, the environment schema rejects every new provider mode, and the production entrypoint still directly creates the fake provider.

There is also a new retry-budget defect: a recovered BullMQ job can continue sending after the database marks the SMS dead-lettered.

Sprint 2 should remain open, and Sprint 3 redemption should not begin yet.

---

Improvements in this commit

1. SENT is now treated as a non-resend state

The handler now exits for:

SENT

DELIVERED

SUPPRESSED

before calling the provider.

This fixes the previous danger where a provider-accepted SMS could be submitted repeatedly while waiting for delivery confirmation.

2. Retry and dead-letter metadata was added

SmsMessage now includes:

lastAttemptAt

nextAttemptAt

deadLetteredAt

failureCategory

The additive migration creates the corresponding database columns.

3. Dead-lettered messages are excluded from PostgreSQL recovery

The recovery query now excludes any SMS with a non-null deadLetteredAt. It also only reclaims stale published SMS deliveries in QUEUED or FAILED, no longer SENT.

This is the correct broad direction.

4. Retained BullMQ jobs are explicitly handled

Before adding a job, the publisher:

1. Looks for an existing job with the outbox ID.

2. Removes it when it is not active.

3. Adds a new job using the same outbox ID.

4. Configures removal after completion or final failure.

This closes the earlier scenario where a retained completed or failed job could block an executable replay.

5. Prisma uniqueness drift was corrected

outboxEventId no longer carries a separate field-level @unique. The model now relies on the tenant-scoped composite uniqueness constraint.

That better matches the earlier migration SQL and the repository’s tenant-scoped relationship model.

6. The migration tracker is more honest

The new SMS reliability migration is recorded as Not run, rather than being described as verified without evidence.

The OpenSpec implementation checklist is also still unchecked.

---

Critical blockers

P0 — The production provider factory is not wired

A createSmsProvider() factory now exists and contains a rule intended to block deterministic mode in production.

But the actual production worker still imports and constructs DeterministicSmsProvider directly:

new DeterministicSmsProvider()

That means the production guard in createSmsProvider() is never called.

Current production behaviour

If start:worker:prod is launched:

1. The worker ignores createSmsProvider().

2. It creates the deterministic fake.

3. Every SMS is recorded as DELIVERED.

4. No SMS service is contacted.

The fake provider still returns an invented delivery ID and DELIVERED.

Required correction

The production entrypoint should construct the provider through:

const smsProvider = createSmsProvider(process.env);

Provider validation should happen before connecting Prisma, Redis or starting delivery work.

---

P0 — real and sandbox provider modes are rejected by environment validation

The factory supports:

real

sandbox

deterministic

But the shared environment schema still accepts only:

SMS_PROVIDER_MODE: Joi.string().valid('deterministic')

Therefore:

SMS_PROVIDER_MODE=real fails validation.

SMS_PROVIDER_MODE=sandbox fails validation.

The worker cannot use either new implementation.

Even after wiring the factory, loadWorkerConfig() would reject a production real-provider configuration before the factory is reached.

The environment example also contains no SMS_PROVIDER_MODE, SMS_PROVIDER_URL or SMS_PROVIDER_TOKEN.

A newly added unit test should fail

The test expects real mode without a URL to throw:

SMS_PROVIDER_URL is required for real SMS mode

But validation will fail earlier because real is not an allowed mode. Therefore, by source inspection, that test cannot reach the branch it expects. It should instead receive an invalid-environment error from the Joi schema.

This is likely a failing unit-test gate on the latest head.

---

P0 — Dead-lettered messages can continue sending

The handler only short-circuits for SENT, DELIVERED and SUPPRESSED. It does not stop when:

deadLetteredAt is already set, or

attempts has already reached the maximum.

Dead-lettering is calculated only after another provider failure:

resolvedSmsMessage.attempts + 1 >= OUTBOX_RETRY_ATTEMPTS

Failure scenario

1. An SMS has already failed four times.

2. Redis loses the original BullMQ job.

3. PostgreSQL recovery creates a fresh BullMQ job with five queue attempts.

4. The first attempt fails and marks the SMS dead-lettered at database attempt five.

5. BullMQ still has four attempts remaining on this newly created job.

6. The handler does not inspect deadLetteredAt.

7. The provider may be called four additional times.

The database recovery loop will not create another job after dead-lettering, but an already-running BullMQ retry sequence can still exceed the budget.

Required correction

Before any send:

if (
resolvedSmsMessage.deadLetteredAt ||
resolvedSmsMessage.attempts >= OUTBOX_RETRY_ATTEMPTS
) {
return;
}

Preferably use BullMQ’s unrecoverable/discard semantics so the current queue job immediately stops retrying.

---

P0/P1 — Provider delivery is still not idempotently claimed

handleJob() reads the SMS record and then calls the provider. It does not atomically transition the message into a processing state or acquire a database-level delivery lease.

Two executions of the same job could therefore both:

1. Read QUEUED or FAILED.

2. Call the provider.

3. Update the same SMS row afterward.

A fixed BullMQ job ID reduces normal duplication, but BullMQ is an at-least-once system and cannot by itself guarantee that provider side effects occur once.

The provider request includes outboxEventId in the JSON body, but the real provider adapter does not send an explicit idempotency header or enforce a provider contract requiring that field to be honoured.

Required correction

Use both:

A database claim or delivery lease before provider invocation.

A provider idempotency key such as Idempotency-Key: <outboxEventId> or the provider’s equivalent external-reference field.

---

High-priority worker defects

P1 — Malformed historical outbox rows can loop forever

SMS reconstruction occurs before the provider-send try/catch.

The reconstruction helper:

Uses the outbox ID as a fallback receipt ID.

Validates only phone and template.

Does not validate the event type.

Can throw before an SmsMessage exists.

Poison-event scenario

1. A stale published event has no SMS row.

2. Its payload lacks a valid receipt ID, phone or template.

3. Reconstruction fails.

4. BullMQ exhausts its attempts and removes the job.

5. The outbox remains PUBLISHED.

6. No SMS exists with deadLetteredAt.

7. The PostgreSQL recovery query sees “published with no SMS.”

8. It republishes the event again indefinitely.

The dead-letter exclusion cannot help because no SMS record was successfully created.

Required correction

Filter the publisher by supported eventType.

Validate a versioned payload schema.

Require a real receipt ID; never substitute the outbox ID.

Catch reconstruction failures.

Persist a terminal outbox failure or separate dead-letter record.

---

P1 — Every outbox event is still treated as SMS

The recovery query does not restrict eventType, and the job handler immediately performs SMS-specific processing.

As the platform later adds fraud, reporting, expiry or redemption events, the SMS worker can attempt to reconstruct an SmsMessage from unrelated payloads.

Use explicit event routing:

switch (outboxEvent.eventType) {
case 'sms.send':
return handleSmsEvent(outboxEvent);
default:
return recordUnsupportedEvent(outboxEvent);
}

---

P1 — The generic real provider has no timeout

RealSmsProvider performs an unbounded fetch() without an abort signal.

A provider connection that never resolves can:

Keep the BullMQ job active indefinitely.

Prevent retry progression.

Cause worker.close() to wait indefinitely.

Block process shutdown.

Add an AbortController timeout and classify timeouts as retryable dependency failures.

---

P1 — Provider response status is not validated

The adapter casts arbitrary JSON to a partial SmsSendResult and accepts body.status directly.

If a provider returns an unexpected status such as accepted, queued or a typo:

1. The handler does not see exact FAILED, so it does not throw.

2. mapSmsDispatchResult() falls into its default FAILED branch.

3. The BullMQ job completes successfully.

4. No dead-letter calculation occurs.

5. Recovery later republishes it as stale FAILED.

This can produce an unbounded slow retry loop outside the intended attempt budget.

Validate the response using a runtime schema and reject all unknown status values as provider-protocol failures.

---

P1 — Two retry schedulers remain inconsistent

Provider failure writes nextAttemptAt to both SmsMessage and OutboxEvent.

However:

PostgreSQL recovery uses OutboxEvent.nextAttemptAt.

It does not use SmsMessage.nextAttemptAt.

BullMQ retries the currently running job using a hard-coded one-second exponential backoff.

Consequently, OUTBOX_RETRY_DELAY_MS does not control BullMQ’s immediate retries. The SMS row may say the next attempt is 30 seconds away while BullMQ retries after one second.

Choose one clear model:

BullMQ owns retries while a job exists; PostgreSQL only recovers lost/exhausted work, or

Every provider attempt is a separate database-scheduled job.

The present hybrid model is harder to reason about and test.

---

P1 — Startup recovery is still not included in shutdown tracking

Startup directly awaits:

await this.runRecoveryCycle();

before setting started.

Only interval-triggered recovery is placed in activeRecovery.

A signal arriving during initial recovery can therefore race with queue and Prisma shutdown. This was identified in the previous review and remains unchanged.

---

P2 — The obsolete worker remains in the repository

src/jobs/worker.ts still contains the pre-runtime implementation that only marks outbox records published or failed.

Although the current production entrypoint does not use it, retaining two worker implementations creates an avoidable maintenance and import hazard.

---

Unchanged financial blockers

Legacy approval still bypasses the ledger

When no generic approval exists, approveReceipt() falls back to reviewLegacyReceipt().

That fallback only updates receipt review fields and audit data. It does not create:

A ledger entry

A credit lot

An outbox event

An SMS delivery record

This remains a financial correctness blocker.

Transaction identity remains ambiguous

The public response still contains id, receiptId and ledgerEntryId, without a clearly defined transactionId.

GET /transactions/:id still interprets its parameter as a receipt ID and returns the receipt ID as the transaction ID.

Stable domain errors remain absent

Receipt and idempotency conflicts are still returned through generic exception messages such as:

Idempotency key reused with different payload

Physical receipt already captured

The frontend still lacks stable codes such as IDEMPOTENCY_CONFLICT and RECEIPT_ALREADY_USED.

Approval execution still does not rerun current policy

Approval execution rechecks branch, device, card and customer status, but then calculates credit without rerunning the current purchase ceiling, approval threshold, expiry or complete policy decision.

Leap-day expiry remains unresolved

Expiry still relies on JavaScript setUTCMonth(), which needs an explicit end-of-month/leap-day rule.

---

Test and verification assessment

Likely failing unit test

The real-provider configuration test expects a missing-URL error, but the shared schema rejects real before that branch.

Dead-letter tests are too narrow

The new unit test checks that the fifth failure writes deadLetteredAt, but it does not verify:

The provider is not called again afterward.

Remaining BullMQ attempts are discarded.

PostgreSQL recovery excludes the row.

A recovered job starting at attempt four cannot exceed five total calls.

Provider tests omit the actual real-provider contract

The provider tests cover deterministic output, sandbox output and factory errors. They do not test:

Real HTTP success

HTTP failure

Timeout

Invalid JSON

Unknown status

Idempotency header

Missing provider message ID

Integration verification is explicitly incomplete

The OpenSpec tasks for integration coverage, migration verification and the full worker test suite remain unchecked.

The migration tracker also lists the migration as not run.

No PR-triggered workflow run is visible for the latest commit through the connector.

Issue #1 remains open with its Sprint 2 exit requirements unchecked.

---

Updated maturity assessment

Area Previous Current

Financial transaction core 8.7/10 8.7/10
PostgreSQL-first outbox 8.5/10 8.5/10
Redis replay handling 7.5/10 8/10
Retry/dead-letter model 4/10 6/10
Provider architecture 2/10 4/10 source, 2/10 operational
Production SMS readiness 2/10 2/10
Test credibility 7.5/10 7/10
API contract maturity 7/10 7/10
Pilot readiness 6.6/10 6.5/10

Completion estimates

Sprint 2 source implementation: approximately 89–90%

Sprint 2 verified exit gate: approximately 68–72%

Full TRD MVP: approximately 61–63%

Pilot readiness: approximately 48–52%

The source percentage rises because the correct concepts now exist. Verified readiness does not rise because the production wiring is absent and at least one new unit test appears internally inconsistent.

---

Required next patch

Gate 1 — Make provider selection real

1. Expand SMS_PROVIDER_MODE validation to deterministic, sandbox and real.

2. Add provider URL/token fields to the environment contract and example file.

3. Replace direct deterministic construction in src/worker.ts with createSmsProvider().

4. Test the real production bootstrap, not only the factory.

5. Refuse deterministic mode before opening Prisma or Redis connections.

Gate 2 — Enforce the retry budget across queue replays

1. Short-circuit when deadLetteredAt is set.

2. Short-circuit when persisted attempts have reached the limit.

3. Discard remaining BullMQ attempts after dead-lettering.

4. Count provider invocations across multiple reconstructed jobs.

5. Test Redis/job loss after four attempts.

Gate 3 — Make delivery idempotent

1. Add an atomic SMS delivery claim or lease.

2. Send a provider idempotency key explicitly.

3. Test concurrent handlers using the same outbox event.

4. Verify exactly one provider-side request, not merely one database row.

Gate 4 — Handle poison and non-SMS events

1. Route by eventType.

2. Validate versioned outbox payloads.

3. Remove the outbox-ID receipt fallback.

4. Persist terminal failures for malformed historical events.

5. Prevent unsupported events from being recovered forever.

Gate 5 — Close the financial Sprint 2 blockers

1. Remove the legacy receipt-only approval path.

2. Revalidate current policy on approval.

3. Add explicit transactionId.

4. Implement stable domain errors.

5. Fix leap-day expiry.

6. Add simultaneous same-key idempotency coverage.

Do not close Sprint 2 yet. The latest patch improves the conceptual retry design, but the actual production worker still uses the fake provider and the persisted retry cap can be bypassed by remaining BullMQ attempts.
