Repository review — latest head

Current head: 113978e1ac8e737f1d8f1b22cbb4a68e81c398cb
Commit: fix: close credit lot lifecycle gaps

Verdict

The latest changes successfully close the financial-integrity gaps from the previous review.

Sprint 2’s core implementation is now complete. Receipt evidence, earn ledger entries and credit lots have meaningful database-level protection. The repository is ready to begin Sprint 3 design.

However, I would not yet call the repository pilot-ready. Before closing Sprint 2 formally, there are four important cleanup items:

1. Obtain visible CI evidence.

2. Fix the probable production worker entrypoint mismatch.

3. Remove the obsolete duplicate receipt service.

4. Address cashier PII exposure and missing earn throttling.

---

Latest changes

Credit-lot lifecycle protection is now strong

The new migration:

Derives expiry from the earn timestamp using the same month-clamping behaviour as the application.

Rejects existing lots with invalid expiry before applying.

Rejects invalid expiry on insert.

Makes expiry immutable.

Temporarily makes the remaining balance immutable.

Prevents credit-lot deletion.

The test suite covers:

Normal dates.

Month-end dates.

Leap-day dates.

Invalid expiry.

Balance mutation.

Lot deletion.

Persistence of the original values after failed writes.

This is the correct temporary state before Sprint 3. Redemption should later replace the balance-freeze trigger with an atomic allocation-controlled mutation path.

Serialization classification is corrected

The canonical earn path now retries only Prisma P2034, rather than all vaguely transaction-related errors.

That resolves the previous risk of retrying programming errors, expired transactions or unrelated failures.

Endpoint-specific error examples were added

The earn operation now documents specific examples for:

Device and validation errors.

Card lookup failure.

Duplicate receipt and idempotency conflicts.

Concurrency and dependency failures.

The OpenAPI integration test also asserts the documented error-code examples.

---

Remaining findings

P0 — Visible CI evidence is still absent

The only unchecked Sprint 2 exit-gate item is:

> Unit, integration, HTTP, migration, contract, lint, typecheck, architecture and build gates pass visibly in CI.

Issue #1 remains open for that reason.

No pull-request workflow run was returned for the current head.

The repository contains strong local evidence, but the migration tracker still records the latest two migrations as locally verified while awaiting remote CI evidence.

Required action

Push or manually dispatch the CI workflow and record:

Commit SHA.

Workflow run.

Static job.

E2E job.

Integration job.

OpenAPI generation result.

Build artifact or build confirmation.

Once green, update the migration tracker and close Issue #1.

---

P0 — Production worker entrypoint appears inconsistent with the build output

package.json starts the production worker with:

node dist/worker

But the repository’s own verification record says the generated worker artifact is:

dist/src/worker.js

Unless that tracker entry is inaccurate, npm run start:worker:prod will fail with a module-not-found error. This would leave committed SMS messages queued without an operating delivery worker.

Required action

Add CI smoke tests after the build:

test -f dist/src/main.js
test -f dist/src/worker.js
node dist/src/worker.js --help

Or change the TypeScript build configuration so the actual output becomes:

dist/main.js
dist/worker.js

Then align both production scripts with the verified output.

The API production entrypoint should be checked at the same time because it currently assumes dist/main.

---

P1 — ReceiptsService is obsolete duplicate financial logic

Issue #1 marks removal of duplicated receipt-review logic as complete.

But ReceiptsService still contains its own:

Receipt capture transaction.

Idempotency implementation.

Duplicate receipt handling.

Review and approval workflow.

It remains registered and exported by ReceiptsModule.

This stale path also still maps P2034 transaction conflicts to “Physical receipt already captured,” which is exactly the semantic error corrected in LoyaltyService.

The public receipt controller no longer needs this implementation; it delegates earning to LoyaltyService and decisions to ApprovalsService.

Required action

Delete ReceiptsService, or reduce it to a thin compatibility adapter around the canonical services.

Also remove it from:

providers: [ReceiptsService]
exports: [ReceiptsService]

This should happen before Sprint 3. Otherwise future developers may accidentally build redemption or reversal behaviour on the wrong orchestration path.

---

P1 — Cashiers can retrieve excessive customer PII

Cashiers can list and retrieve customers.

Those service methods return complete Prisma customer objects, including:

Full phone number.

Email.

Staff flag.

Registration attribution.

Block timestamps.

Internal identifiers.

Card lookup is also available with the nested customer included, and toPublicCard() spreads every field other than the renamed barcode.

Required action

Create role-specific DTOs.

For cashier responses, return only what the sales workflow needs:

customerId
fullName
maskedPhone
card status
available balance

For example:

+234 80* *** 1234

Full phone and email should be limited to supervisors/admins, and sensitive reads should be audited.

This is a pilot blocker, even though it is not a Sprint 2 ledger blocker.

---

P1 — The earn endpoint is not throttled

The global throttle guard does nothing unless a route or controller provides throttle metadata.

The canonical earn endpoint has roles, idempotency and OpenAPI decorators, but no throttle decorator.

That leaves the most important financial write endpoint without explicit request-rate protection.

Required action

Add a Redis-backed throttle keyed by both:

Authenticated staff user.

Session device.

A reasonable starting point is the TRD’s financial-endpoint rate, with legitimate retries protected through idempotency.

Also add 429 RATE_LIMITED to the OpenAPI response helper. The current shared helper covers 400, 401, 403, 404, 409, 422 and 503, but not 429.

---

P1 — The Sprint 2 error-code checklist overstates implementation

Issue #1 marks these distinct codes as implemented:

CARD_INACTIVE

CUSTOMER_BLOCKED

STAFF_INELIGIBLE

The service intentionally collapses all those conditions into:

404 CARD_NOT_FOUND

That may be a reasonable anti-enumeration decision, but the issue and technical documentation should not claim the separate codes exist.

Required action

Choose one:

Preserve masking and update the TRD/issue to say these conditions intentionally map to CARD_NOT_FOUND.

Return distinct stable errors and accept the additional information disclosure.

For a staff-only operational application, distinct codes may give better cashier guidance. For a public lookup endpoint, masking would be safer.

---

P2 — Some earn OpenAPI examples describe errors the earn endpoint does not emit

The earn endpoint documents:

PURCHASE_REQUIRES_APPROVAL

APPROVAL_POLICY_CHANGED

as 422 earn errors.

In the actual earn flow:

A purchase requiring approval returns 202 PENDING_APPROVAL.

Policy-change validation occurs when an approval is executed, not when the original earn request is captured.

The OpenAPI tests only verify that those codes are present, not that they reflect real runtime behaviour.

Required action

Move approval-policy error examples to:

POST /api/v1/approvals/{id}/decision

Keep the earn endpoint’s documented codes restricted to errors it can actually produce.

---

P2 — List endpoints remain unbounded

Customer search performs an unrestricted findMany().

Customer ledger and approval queue endpoints also return every matching record without pagination.

This will become noticeable once receipt volume grows.

Required action

Add cursor pagination before the frontend starts depending on these response shapes:

limit
cursor
nextCursor
hasMore

Use stable ordering by timestamp plus ID.

---

Overall TRD progress

Sprint 2

Functional implementation: approximately 97% complete
Formal exit gate: approximately 92% complete

The financial engine itself is strong. The main formal blocker is CI evidence, with deployment and maintenance cleanup immediately behind it.

Sprint 3

Sprint 3 has not started materially.

The schema currently supports only:

LedgerEntryType: EARN
LedgerEntryDirection: CREDIT

There are no redemption allocations, debit entries, reversal execution or adjustment models. The active application modules also stop at earning and approval functionality.

Sprint 4 and operational modules

Fraud, reports and notifications remain empty placeholder modules.

They are not wired into AppModule.

The local Compose file only provisions PostgreSQL and Redis; it does not build or run the API and worker.

The CI pipeline is good for current development gates, but still lacks:

Coverage threshold enforcement.

Secret scanning.

SAST/CodeQL.

Container scanning.

Production-image build.

API and worker startup smoke tests.

Deployment or staging promotion.

---

Recommended next steps

Close Sprint 2 cleanly

Do one final maintenance change—not another broad architectural rewrite:

1. Correct and smoke-test production API/worker entrypoints.

2. Remove ReceiptsService.

3. Add earn throttling and 429 documentation.

4. Correct the inaccurate OpenAPI 422 examples.

5. Resolve the stable error-code documentation decision.

6. Run visible GitHub CI.

7. Update the migration tracker.

8. Close Issue #1.

Start Sprint 3 immediately afterward

The first Sprint 3 change should contain only the financial model:

REDEEM, REVERSAL, EXPIRY, ADJUSTMENT.

DEBIT ledger direction.

Redemption transaction/evidence model.

FIFO RedemptionAllocation.

Lot-locking and concurrency design.

Reversal linkage and constraints.

Idempotency contract.

Approval target generalisation.

Do not begin with controllers. First make the database capable of proving:

> Total allocated redemption can never exceed the original credit represented by its lots.

Release decision

Target Decision

Continue backend development Go
Begin Sprint 3 design Go
Close Sprint 2 now Conditional — CI and cleanup first
Connect frontend to canonical earn API Go
Pilot with real customer data No-go until PII and deployment issues are fixed
Production deployment No-go

The repository now has a credible financial foundation. The next risk is no longer the earn transaction itself; it is allowing duplicated code, deployment assumptions and privacy gaps to survive into redemption and pilot operations.
