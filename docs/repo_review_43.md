Sprint 4 repository review

Current head: b766d05d43ec10f558b3ca9103ae21975b5a6de6 — fix: await offline sync replays.

Review baseline: bfbd110408c4ffda3483303098dd7d088c3745ab

Verdict

Sprint 3: 98/100 — PASS, remains closed

Sprint 4: 84/100 — NO-GO for Sprint 5

There is genuine progress. The durable report-refresh path is now wired, branch-local fraud windows are substantially fixed, and offline validation coverage is much better. But I would not move to Sprint 5 yet because there are still two correctness blockers plus incomplete final-gate evidence.

Sprint 4 area Previous Now

Offline sync core 27/30 28/30
Offline conflict/concurrency 5/10 7/10
Fraud 19/20 19/20
Reporting/read models 18/20 16/20
Reports/exports 7/10 9/10
Contracts/docs 4/5 3/5
CI/migration/regression 2/5 2/5
Total 82 84/100

The reporting score falls slightly because the new implementation exposes that the attempted historical reconstruction is still incomplete rather than actually closing the problem.

---

P1 — Historical reporting is still incorrect

This is the biggest remaining blocker.

1. Daily financial reporting bypasses the new snapshot logic

buildRedemptionSummaries() correctly calls:

const snapshotStatus = redemptionStatusAt(redemption, asOf);

But buildDailyFinancialSummaries() still does:

if (redemption.status === 'CONFIRMED') {
addBigInt(
creditRedeemedByDate,
reportDate,
redemption.confirmedAmountKobo ?? redemption.requestedAmountKobo,
);
}

That is the current mutable redemption status, not status at the historical watermark.

Concrete failure

Suppose:

redemption requested August 1

confirmed August 1

reversed August 10

report requested asOf = August 5

The redemption report sees:

> CONFIRMED

But the executive/daily financial report sees current:

> REVERSED

and therefore omits the redeemed amount.

So two reports built from the same asOf can disagree.

Required correction

Every report builder must consume the same normalized lifecycle state:

const snapshotStatus = redemptionStatusAt(redemption, asOf);

if (snapshotStatus === 'CONFIRMED') {
...
}

Preferably normalize source data once rather than letting individual report builders decide independently.

---

2. Future rejection can still leak backward

The database already has:

rejectedAt DateTime?

But RedemptionRecord does not contain rejectedAt, and the materializer does not select it. It selects only:

requestedAt
confirmedAt
reversedAt
status

Then redemptionStatusAt() does:

if (input.status === 'REJECTED') {
return 'REJECTED';
}

That means:

requested August 1

rejected August 10

current status = REJECTED

asOf = August 5

can still be reported as REJECTED on August 5, even though rejection had not happened.

This is exactly the mutable-current-state problem we were trying to eliminate.

Fix

Select rejectedAt and construct the lifecycle entirely from timestamps:

requestedAt -> PENDING_APPROVAL
confirmedAt -> CONFIRMED
rejectedAt -> REJECTED
reversedAt -> REVERSED

The current status should not be needed to reconstruct those historical states.

---

P1 — SMS historical state is not actually reconstructable

The SMS snapshot helper is an improvement, but the implementation is still wrong in two ways.

Fixed priority is not lifecycle ordering

Currently:

if (suppressedAt <= asOf) SUPPRESSED
if (deliveredAt <= asOf) DELIVERED
if (failedAt <= asOf) FAILED
if (sentAt <= asOf) SENT

It needs to select the latest transition timestamp <= asOf, not use status priority.

For example:

delivered 11:00

failed 12:00

At 12:30, the helper returns DELIVERED, because delivery is checked before failure.

The existing test actually creates this sequence—deliveredAt=11:00, failedAt=12:00—but never asserts the state after 12:00.

It therefore misses the bug.

Successful retries erase failure history

There is an even deeper issue.

When a subsequent SMS send succeeds, the worker explicitly does:

failedAt: null

for both SENT and DELIVERED.

So consider:

queued 09:00

failed 09:05

retry succeeds 09:15

After success, the authoritative row contains no failedAt.

A report generated later with:

asOf = 09:10

cannot possibly reconstruct that the message was FAILED at 09:10. The historical evidence was destroyed.

Required correction

At minimum:

1. preserve failedAt after a later successful retry;

2. select the latest lifecycle timestamp rather than fixed status precedence.

Better long-term design:

SmsMessage
└── SmsDeliveryAttempt[]

with append-only delivery-attempt history.

For Sprint 4, preserving the last failure timestamp is sufficient if the required reporting model only needs state-at-watermark.

---

P1 — Offline exact replay has a new concurrency race

The latest commit attempts to fix concurrent replay by polling an existing attempt:

const OFFLINE_SYNC_REPLAY_RETRY_ATTEMPTS = 8;
const OFFLINE_SYNC_REPLAY_JITTER_MS = 25;

So the follower waits approximately 200 ms for the original request.

If it still cannot see responseJson, it does this:

return this.persistResult(..., {
status: 'RETRYABLE',
errorCode: 'SYNC_RECORD_PROCESSING',
});

That is dangerous.

Race

Request A:

creates canonical OfflineSyncAttempt
starts earn

Request B:

finds same attempt
waits 200 ms

If A takes >200 ms:

B writes RETRYABLE into canonical row

Now two outcomes are possible.

Outcome A

A subsequently writes CONFIRMED.

B has still returned something different from the canonical original response.

That violates exact replay semantics.

Outcome B

A finishes immediately before B's persistResult().

Then:

A writes CONFIRMED
B overwrites row with RETRYABLE

Now the financial transaction is confirmed but the offline synchronization record says retryable/processing.

That is worse.

Correct pattern

The follower must never write the canonical result.

After its bounded wait:

return {
localId,
status: 'RETRYABLE',
errorCode: 'SYNC_RECORD_PROCESSING',
...
};

Return that response ephemerally without calling persistResult().

Even better would be claim ownership/row locking, but the minimal correction is simply:

> only the original owner of the offline attempt can finalize the canonical record.

---

Offline coverage is much stronger, but not complete

This part improved significantly.

You now test:

actor mismatch;

expired records;

device mismatch;

branch mismatch;

inactive cards;

staff customers;

no receipt/ledger financial mutation for rejected requests.

You also now test:

Online → offline

Online capture succeeds, then offline replay is rejected as:

RECEIPT_ALREADY_USED

with one receipt and one ledger entry.

Concurrent same-offline replay

Two simultaneous calls using the same offline request are expected to return the same confirmed result.

That's useful, but it is not the complete acceptance matrix.

Still missing

Offline → online

offline succeeds
online submits same canonical receipt
=> online must deterministically lose

Online ↔ offline true race

Both should start concurrently with:

different idempotency keys;

different offline local ID;

same canonical receipt.

Then prove:

receipt count = 1
earn ledger count = 1
credit lot count = 1

Offline ↔ offline receipt race

The current concurrency test submits the exact same localId, so it tests replay contention.

It does not test:

localId A != localId B
idempotency A != idempotency B
receipt == same

which exercises the actual receipt-uniqueness race.

Therefore I would not give the concurrency category full marks yet.

---

Durable report.refresh — source blocker closed

This is a real improvement.

Recovery now explicitly includes:

'payment.send'? no
'sms.send'
'fraud.evaluate'
'report.refresh'

and excludes already processed/dead-lettered work.

Stale PUBLISHED report.refresh work is also recoverable.

And the handler now actually calls the report materializer and marks the event completed after materialization.

The previous source-code blocker here is closed.

However, evidence is weaker than planned.

The new test:

it('includes report.refresh in recovery eligibility')

essentially inspects the generated SQL string for:

'report.refresh'
"processedAt" IS NULL

while the handler test separately mocks ReportMaterializerService.

There is still no full:

PENDING row
→ recovery
→ BullMQ publish
→ worker
→ real materializer
→ report rows
→ COMPLETED outbox

integration test.

This is no longer a source blocker, but remains part of final acceptance evidence.

---

Fraud branch-day handling — essentially closed

The new helper correctly computes Lagos local midnight:

2026-08-10 00:00 Lagos
=

2026-08-09 23:00 UTC

and the test also validates a New York DST transition where the local day is 23 hours.

That closes the previous UTC-midnight defect.

Minor remaining issue

Fraud dedupe still generates the daily key using:

date.toISOString().slice(0, 10)

on windowStart.

For Lagos local August 10:

windowStart = August 9 23:00Z
dayKey = "2026-08-09"

instead of the local business date 2026-08-10.

It will still produce a unique bucket per local day, so I do not consider this a Sprint 4 blocker, but it makes evidence/dedupe labels semantically confusing.

Fraud remains 19/20.

---

Tracking is still inconsistent

The new final-gate tracker marks these as complete:

[x] historical as-of reconstruction
[x] duplicate receipt online/offline race
[x] branch-day normalization

But the historical reconstruction and online/offline race are not fully closed as shown above.

Meanwhile the older Sprint 4 tracker is still entirely unchecked, including several things already implemented.

So the documentation still cannot be treated as the authoritative completion state.

---

Release evidence is not final

There is now a useful evidence document listing local commands that were reportedly run.

But it explicitly says:

Release candidate SHA: _pending final commit_

and:

> the repository currently has no committed release-candidate SHA for this final gate.

The current head is also after that evidence was first written because b766d05 changed offline synchronization behavior.

The GitHub connector currently returns:

no combined statuses for b766d05;

no PR-triggered workflow runs for b766d05.

So remote CI remains unverified, not failed.

The OpenSpec final-gate tracker correctly leaves its final three validation tasks unchecked.

That is appropriate.

---

Exact remaining work

I would stop broad repo reviews now. There are six concrete closure items:

1. Fix redemption historical state

select rejectedAt;

eliminate dependence on current Redemption.status;

use snapshot status in buildDailyFinancialSummaries;

test future rejection and future reversal against earlier asOf.

2. Fix SMS historical reconstruction

do not erase failure history on successful retry;

choose latest lifecycle timestamp <= asOf;

test QUEUED → FAILED → SENT → DELIVERED.

3. Fix offline replay ownership

follower must not call persistResult() after waiting;

add deliberately slow >200-ms owner test proving follower cannot overwrite canonical response.

4. Complete receipt-boundary concurrency

offline → online;

simultaneous online ↔ offline;

simultaneous offline ↔ offline using different local IDs.

5. Add real report-refresh integration evidence

PENDING → publish → materialize → COMPLETED;

stale PUBLISHED recovery.

6. Certify the final SHA

reconcile both trackers;

run full integration/E2E/coverage/architecture/contracts;

record actual final SHA;

get green CI on that same SHA.

Move-on decision

I would not start Sprint 5 yet.

But the repo is now close enough that I would not authorize another broad architectural review either.

Fix those six items, and the expected result is approximately 92–95/100 Sprint 4, which crosses your 90% move-on threshold with the remaining issues being genuinely non-blocking.
