ShopCity repository review — Sprint 5

Current head: 0225eafff3e0e2524311fcca8f586bf6aefa564d — fix: harden credit expiry retries.

Review baseline: Sprint 5 plan commit 4965f81007d38df4e9de22cec978b2687ccecc2c

Delta: 21 commits of substantive Sprint 5 implementation.

Verdict

Sprint Status

Sprint 1 PASS — closed
Sprint 2 PASS — closed
Sprint 3 98/100 — PASS, closed
Sprint 4 95/100 — PASS, closed
Sprint 5 72/100 — NO-GO for pilot/production

The repository has made a very large jump. Most of the Sprint 5 software infrastructure now exists, but I would not mark Sprint 5 complete yet. Two correctness/certification problems need fixing, and the TRD's mandatory real-world launch evidence has not yet been collected.

Sprint 5 score

Area Score

Credit expiry + reminders 21/25
Observability/reconciliation 11/15
Security hardening/scans 11/15
Performance/load 7/10
Backup/restore 8/15
Container/deployment 9/10
Runbooks/training 5/5
Final certification 0/5
Total 72/100

This is not a statement that only 72% of the code was written. Most engineering pieces exist. The score is lower because Sprint 5 is deliberately evidence-heavy: restore, security, load, staging and sign-off are part of the feature definition, not optional polish.

---

What is now strong

1. Credit expiry architecture is fundamentally correct

The most important Sprint 5 design is now real.

Expiry creates:

CreditLot
↓
EXPIRY / DEBIT ledger entry +
immutable CreditExpiry evidence +
remainingAmountKobo decrement +
audit evidence

and does all of that transactionally. The service locks due lots using FOR UPDATE SKIP LOCKED, uses serializable transactions, and has bounded retry handling.

The latest changes also recognize serialization conflict codes and increased expiry retry attempts from three to five.

Most importantly, the database now enforces the lot equation:

remaining =
original

- allocations

* restorations

- expiry

and validates that an expiry ledger entry is:

EXPIRY;

DEBIT;

linked to one immutable expiry row;

for the correct customer;

for exactly the expiry amount;

effective at the lot's expiry instant;

not attached to a receipt.

That is the correct architectural direction.

---

2. Expiry idempotency is strong

The integration suite proves:

full remaining balance expires once;

repeat sweep becomes a no-op;

partially redeemed lots expire only the remainder;

fully consumed lots are skipped;

future lots are skipped;

two concurrent expiry sweeps produce exactly one expiry record.

The database tests also prove:

expiry evidence cannot exist without the corresponding lot decrement;

expiry ledger entries cannot exist without expiry evidence;

expiry evidence is immutable;

one lot cannot be expired twice.

This is one of the strongest parts of Sprint 5.

---

P1 — expiry reminder amount can become stale

This is the largest implementation defect I found.

The OpenSpec explicitly requires:

> if credit is consumed before the reminder transaction commits, the transaction revalidates the source state and the consumed amount contributes nothing.

But the service currently does:

query eligible lots
↓
calculate SUM(remainingAmountKobo)
↓
leave that query
↓
open transaction
↓
create OutboxEvent
↓
create SmsMessage
↓
create CreditExpiryReminder

The candidate calculation happens before the transaction.

So this race is possible:

T1 reminder query:
Customer has ₦5,000 expiring
→ candidate total = ₦5,000

T2 redemption:
Customer spends ₦5,000
→ lot remaining = ₦0

T1 reminder transaction:
uses old candidate
→ sends "₦5,000 expires soon"

Financial truth is not corrupted, but the customer receives an objectively wrong balance warning.

The existing integration test only checks a lot that was consumed before candidate selection. It does not create the required between-selection-and-commit race.

Required fix

Inside the reminder transaction:

1. acquire/determine customer-day dedupe ownership;

2. re-query qualifying positive-balance lots;

3. lock/revalidate the lot rows;

4. recalculate total/min/max;

5. if total is zero, create nothing;

6. only then create reminder + outbox + SMS.

Then add an adversarial test where redemption occurs after candidate discovery but before reminder persistence.

Until this is fixed, I would not call the expiry/reminder workstream complete.

---

P2 — tracker says expiry-vs-redemption concurrency is proven, but it isn't

The Sprint 5 tracker says:

[x] 3.4 Prove expiry-versus-redemption races cannot
over-debit or leave invalid lot balances.

But the expiry concurrency test I found runs:

expiry sweep ↔ expiry sweep

not:

actual redemption ↔ expiry sweep

The locking model strongly suggests the implementation should be safe, because both financial paths operate on locked lots and the database validates the final evidence equation. But that's not the same as having the acceptance evidence the tracker claims exists.

Add one real Testcontainers test:

one lot with positive balance and expiry due
↓
Promise.allSettled(
redemption against the lot,
expiry sweep against the lot
)
↓
assert:

- no negative lot
- allocation + expiry never exceeds original
- ledger/evidence reconciliation holds
- final balance = 0
- one deterministic winner or valid split according to ordering

This is an evidence gap rather than evidence of a broken financial implementation, but it should be fixed because this is the highest-risk Sprint 5 concurrency boundary.

---

Reporting integration is good

Expiry has been properly incorporated into historical reporting rather than using today's mutable lot balance.

The materializer now loads expiry evidence up to the asOf watermark.

Historical balance reconstruction applies:

original
− allocations that existed by asOf

- restorations that existed by asOf
  − expiries that existed by asOf

This means:

asOf before expiry → liability survives
asOf after expiry → liability is removed

which is exactly what we wanted.

The operational reconciliation query has also been extended with expiry evidence.

I would consider the expiry-reporting architecture closed unless a regression test exposes something new.

---

Observability has improved substantially

There is now an admin-only pilot operations summary covering:

release SHA/version;

outbox backlog and aged backlog;

failed SMS;

offline-sync failures;

open fraud flags;

stale reports;

financial reconciliation mismatches.

Pino logging now includes release metadata and explicitly redacts:

authorization;

cookies;

CSRF;

passwords;

access/refresh tokens;

Set-Cookie.

That's good production-hardening work.

But Sentry is still not actually implemented

There is a SENTRY_DSN configuration value and the operations endpoint reports whether one was configured, but there is no Sentry package/runtime initialization in the current application.

The Sprint 5 tracker correctly leaves:

[ ] 6.2 Initialize Sentry only when configured...

unchecked.

The TRD calls Sentry required for staging/production, so either:

implement it; or

formally defer it with an explicit approved pilot-risk decision.

For the intended production baseline, I recommend implementing it rather than deferring.

---

Security infrastructure exists, but security is not certified

This is a major improvement.

The new security workflow has:

Gitleaks

CodeQL

Trivy

ZAP baseline

Trivy appropriately fails on HIGH/CRITICAL vulnerabilities.

There are two important caveats.

CodeQL is conditional

if: ${{ vars.CODEQL_SCAN_ENABLED == 'true' }}

So CodeQL being present in the file does not prove that CodeQL actually ran.

ZAP is manual

ZAP only runs on workflow_dispatch with a staging URL.

That's reasonable operationally, but it means the actual staging security assessment remains external certification work.

Current head also has no connector-visible GitHub status or workflow run evidence. I classify that as:

> unverified, not failed

So the security workstream is structurally implemented, but not certified yet.

---

Docker/release packaging is in good shape

A proper multi-stage production image now exists.

It:

uses a pinned Node 22 image;

prunes dev dependencies;

removes npm/npx from the runtime;

injects release SHA/version;

labels the OCI image;

runs either API or worker from the same artifact.

CI now also contains an explicit Docker Build Verification job.

One later security hardening improvement would be running the application as a non-root user, but I would not make that a Sprint 5 P1 unless Trivy/security review surfaces it as required.

---

Performance suite is implemented, not yet proven

The k6 suite covers the correct surfaces:

card lookup;

earn;

redeem;

report traffic alongside checkout;

post-load financial reconciliation.

It has sensible pilot thresholds:

lookup p95 < 500 ms;

earn p95 < 1200 ms;

redeem p95 < 1200 ms;

failure rate < 1%;

reconciliation mismatch 0.

That is good.

But at present I see the test harness and target thresholds, not a real candidate-specific performance result.

So this cannot receive 10/10 until we have:

release SHA +
image digest +
staging environment +
k6 summary +
reconciliation = healthy

---

Backup/restore is the biggest remaining launch gate

There is now a useful restore evidence verifier.

It requires:

release SHA/artifact;

backup timestamp;

restore start/completion;

verification completion;

provider backup control;

actual verification commands;

all commands passing.

This is much better than the old five-line restore runbook.

But there has still been no observed restore drill. The tracker correctly leaves task 8.4 unchecked.

And the TRD is unambiguous:

> Sprint 5 cannot exit without a completed restore test.

So irrespective of percentage, pilot launch remains NO-GO until this happens.

A small policy issue also exists: the verifier defaults to RPO ≤60 minutes and RTO ≤120 minutes, while the TRD only requires pilot RPO ≤24 hours and same-business-day RTO.

Stricter is fine if intentional, but record it as an explicit ShopCity pilot objective; otherwise align defaults with the TRD so a perfectly compliant daily backup does not fail the verifier arbitrarily.

---

P1 release-certification flaw — the readiness verifier can currently certify fake evidence

This needs correction before we rely on the machine gate.

The verifier itself checks useful fields:

40-character SHA;

OCI image digest syntax;

mandatory gates all "passed";

evidence file exists;

approvals;

role training sign-offs.

But the default command is:

npm run verify:sprint-5-readiness

and package.json points that command to:

docs/release-evidence/sprint-5-pilot/readiness.example.json

The example file already contains:

"releaseSha": "0123456789abcdef0123456789abcdef01234567",
"engineeringComplete": true,
"stagingCertified": true,
"productionApproved": true

and marks every gate passed, despite being only demonstration data.

Several evidence references are generic documents such as the performance baseline, rather than proof of an executed run.

So the current machine verifier can answer:

> passed

without an actual release candidate ever having gone through:

staging;

k6;

security;

restore;

training sign-off;

production approval.

That's a serious release-gate integrity defect.

Required correction

The production command should target something like:

docs/release-evidence/sprint-5-pilot/readiness.json

and fail if it doesn't exist.

Also make the verifier reject:

*.example.json;

known fixture/dummy SHA;

known fixture image digest;

evidence paths containing .example;

mismatched release SHA/image digest across evidence;

generic baseline/runbook files being presented as execution evidence where a run artifact is required.

Keep example validation under a different test command.

The repo's own handoff document already recognizes that example evidence must be replaced with real evidence.

So the implementation and the documented intent just need to be aligned.

---

What I would fix next

There are two code/evidence fixes before we spend effort gathering final operational certification:

1. Fix reminder transactional revalidation.

2. Add a real expiry-vs-redemption concurrency integration test.

3. Make Sprint 5 readiness fail closed instead of validating example evidence.

4. Implement Sentry.

After those, stop changing the architecture and move into certification:

5. freeze one release SHA/image digest;

6. get CI + Gitleaks + CodeQL + Trivy green on it;

7. deploy exactly that artifact to staging;

8. run ZAP;

9. run k6 and capture the result;

10. perform the real backup/restore drill;

11. complete training/sign-offs;

12. populate real readiness evidence;

13. run the corrected readiness verifier;

14. sign the production-readiness checklist.

Final decision

Sprint 5 engineering

Substantially implemented, but not yet at our 90% move-on threshold.

The new financial expiry architecture is good enough that I do not recommend redesigning it. The remaining implementation work is narrow.

Pilot/production

NO-GO.

Not because the core platform is in poor shape, but because the exact things Sprint 5 exists to prove—real security, load, restore, staging and sign-off evidence on one immutable candidate—have not happened yet, and the current readiness verifier is not yet trustworthy as a release gate.

Target for the next review

Don't do another broad repo review after random cleanup commits. Close these three internal gates first:

A. reminder revalidation race
B. expiry ↔ redemption concurrency proof
C. fail-closed real readiness verifier

Once those are closed, I expect the engineering Sprint 5 score to move into roughly the mid/high-80s, after which the remaining points should come almost entirely from actual certification evidence, not more architectural work.
