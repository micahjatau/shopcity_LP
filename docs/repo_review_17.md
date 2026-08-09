Repository review — latest head

Repository: micahjatau/shopcity_LP
Current head: 2bd94367b238d0529a18257a50578ea4479b9b1b — ci: run gitnexus without project install
Change since the previous review: six commits ahead, covering CI, OpenAPI, SMS delivery, outbox recovery, approval policy, migrations and tests.

Verdict

This is a major improvement over the previous head. Most earlier structural concerns have been addressed:

The full CI matrix has largely been restored.

OpenAPI now describes the principal transaction, ledger and approval payloads.

Poison outbox records and exhausted SMS attempts can be dead-lettered.

The real SMS boundary now has request timeouts, status validation and retry classification.

Approvals now store an expiry time and a policy version.

Production no longer permits the deterministic SMS provider.

However, Sprint 2 is not ready to close. Two release-blocking defects remain:

1. The configured “real” SMS provider does not implement the documented eBulkSMS API.

2. Expired approvals are not actually persisted as expired because their database update is rolled back.

The repository should not start redemption work or a live pilot until these are fixed and a successful current-head CI run is visible.

---

What improved

1. CI coverage is substantially better

The current workflow runs:

formatting, ESLint and TypeScript checks

Nest build

Prisma generation and validation

dependency-cruiser architecture checks

unit tests

OpenAPI export, lint, diff and generated-file cleanliness

end-to-end tests

Redis-backed integration tests

GitNexus analysis

These are now separated into static, GitNexus, end-to-end and integration jobs.

The verify:fast command correctly covers source and test formatting, linting and TypeScript compilation.

2. OpenAPI contract drift was largely corrected

Confirmed earn responses now require a non-null transaction identifier, while pending approvals explicitly expose a nullable transaction identifier and require an approval identifier.

Structured schemas were also added for:

transaction details

nested ledger and credit-lot information

customer ledger results

approval-list results

The previous generated-contract omission around transactionId is therefore closed.

3. Outbox terminal failure handling is much stronger

Recovery now restricts itself to sms.send events and excludes already dead-lettered records. It uses row locking with SKIP LOCKED, which is appropriate for multiple publishers.

The worker now:

rejects unsupported event types

validates SMS payload versions

dead-letters malformed payloads

terminalizes exhausted attempts

distinguishes terminal and retryable provider failures

Unit tests now cover malformed payloads, unsupported events and retry exhaustion.

The integration suite also exercises committed-row publication, Redis outage recovery, missing SMS-row reconstruction and multi-worker behaviour.

4. Approval policy revalidation was implemented

Pending approvals now store:

a policy-version hash

a 24-hour expiry

At execution, the service checks the current:

purchase ceiling

approval threshold

policy version

branch, device, card and customer status

This closes most of the previous stale-policy execution gap.

---

Blocking findings

P0 — The real SMS provider is incompatible with eBulkSMS

The environment file points SMS_PROVIDER_URL to eBulkSMS and provides only a generic token.

But RealSmsProvider currently:

posts ShopCity’s internal SmsSendInput object directly

sends credentials through Authorization: Bearer

expects flat statuses such as SENT, DELIVERED and FAILED

eBulkSMS’s official JSON API requires:

the /sendsms.json endpoint

username and API key inside SMS.auth

sender name and rendered message text inside SMS.message

recipients under SMS.recipients.gsm

responses under response.status, with statuses such as SUCCESS, AUTH_FAILURE and INVALID_RECIPIENT

Therefore, the current production adapter is not capable of sending through the provider named in the repository configuration.

Required correction

Create an explicit EbulkSmsProvider adapter that:

1. Accepts username, API key and sender ID.

2. Renders template + payload into actual SMS text.

3. Converts phoneE164 to the eBulkSMS recipient structure.

4. Uses the outbox ID as the provider msgid where appropriate.

5. Maps eBulkSMS response codes into retryable or terminal ShopCity results.

6. Tests the exact vendor request and response contract through a mocked HTTP server.

A generic provider interface is still useful, but the HTTP implementation must be provider-specific.

---

P0 — Expired approvals remain PENDING

Inside the approval transaction, the service updates an expired approval to EXPIRED and then throws APPROVAL_EXPIRED.

Because the exception escapes the same interactive Prisma transaction, the status update is rolled back. The observable behaviour will be:

the API returns an expiry error

the approval remains PENDING

every later attempt repeats the same sequence

the approval queue accumulates permanently pending but unusable records

This also prevents an expired approval from being rejected through the decision endpoint because the expiry branch runs first.

Required correction

Persist expiry in a transaction that commits before returning the domain error. Suitable patterns include:

expire first in a separate transaction, then throw

return a structured expired result from the transaction and throw outside it

run a scheduled expiry process and treat non-pending records normally during decision processing

Add an integration assertion that reloads the approval after the failed request and verifies:

status = EXPIRED
decidedAt != null
no ledger entry
no credit lot
no outbox event

---

High-priority findings

P1 — Sandbox SMS is still allowed in production

The factory rejects deterministic mode in production, but it still accepts sandbox.

The sandbox provider returns SENT without contacting an SMS gateway.

That creates nearly the same operational risk as the previous deterministic-production problem: the database can claim a message was sent when no customer received anything.

Production should permit only real, unless a clearly named emergency override such as ALLOW_FAKE_SMS_IN_PRODUCTION=true is deliberately enabled.

P1 — Approval regression tests claimed by OpenSpec do not exist

The repository checklist marks stale-policy rejection and expired-approval testing as complete.

But the current immutable-ledger integration suite covers normal approval execution and concurrency; it ends without stale-policy or persisted-expiry cases.

This mismatch explains why the rollback defect was not detected.

P1 — GitNexus execution is still not truly deterministic

The repository now pins gitnexus to 1.6.9 in devDependencies.

However, GitHub Actions does not use that lockfile-installed copy. It invokes:

pnpm dlx gitnexus@1.6.9

at runtime.

This means:

CI downloads another copy from the registry.

The npm lockfile does not govern the executed dependency graph.

The pnpm/Corepack version is not explicitly pinned.

Native dependency installation still occurs during the workflow.

The hardened repository wrapper is not used.

This contradicts the accepted design, which specifically says to use the pinned repository dependency and rejects runtime installation as unreproducible.

The tasks file also claims the floating runtime-install path was removed, which is no longer accurate.

The wrapper itself is now correctly hardened against timeout, errors and signals; CI simply bypasses it.

P1 — Current-head verification is not visible

The connector returned no pull-request-triggered workflow runs for the current head.

Consequently, I cannot confirm that:

npm ci --ignore-scripts succeeds everywhere

Prisma generation succeeds after ignored installation scripts

GitNexus’s native packages build successfully

the updated integration tests pass

the generated OpenAPI file is clean

all migrations deploy successfully from a fresh database

The code now contains most of the necessary gates, but the current head should not be called verified until the full workflow visibly passes.

P1 — Migration evidence is overstated

The tracker marks the new approval/outbox migration as verified.

Its own specification requires a visible successful current-head clean-database run and an identifiable command chain.

The integration suites do contain prisma migrate deploy against fresh Testcontainers databases.

But with no visible current-head CI result, the tracker should currently say something closer to:

> Verification implemented; current-head CI evidence pending.

Also, the earlier 20260722_sms_delivery_reliability migration is still marked “Not run,” so the complete migration chain is not yet uniformly verified.

---

Medium-priority findings

P2 — OpenAPI does not document real 422 responses

The error-envelope decorator documents 400, 401, 403, 404, 409 and 503, but not 422.

Approval expiry and policy-change paths both return 422.

Generated clients therefore still have an incomplete decision-endpoint contract.

P2 — Approval response schema omits reason

The service’s response interface and execution result include reason.

The controller’s decision response schema does not document it.

P2 — Provider timeout ends before response-body parsing

The timer is cleared immediately after fetch() returns, before response.json() is read.

A provider that sends headers but stalls the response body can therefore hang beyond SMS_PROVIDER_TIMEOUT_MS. The timeout should cover both network response and body parsing.

P2 — Runtime provider validation is still shallow

The validation checks only the status allowlist. It does not validate the types or combinations of:

providerMessageId

errorMessage

failureCategory

A proper schema validator should reject malformed successful responses and invalid failure categories.

P2 — Initial recovery still has a shutdown race

start() awaits its first recovery cycle directly, but does not assign that promise to activeRecovery. stop() only waits for activeRecovery.

A termination signal during the first recovery cycle can close BullMQ and Prisma resources while recovery is still using them.

P2 — Missing receipt IDs are silently substituted

Legacy SMS reconstruction defaults a missing receiptId to the outbox event ID.

That is not genuine required-field validation. It can transform an invalid payload into a foreign-key failure rather than a clean invalid-payload dead letter. receiptId should be mandatory.

P2 — Approval listing semantics are misleading

The controller describes the endpoint as “Pending approvals,” but the service fetches every approval for the tenant without a status filter or pagination.

As history grows, this will become both a usability and performance problem.

P2 — Purchase ceiling configuration is undocumented

PURCHASE_AMOUNT_CEILING_KOBO is validated and used in capture and approval policy logic.

It is absent from both .env.example and the README environment list.

P2 — Architecture exceptions are becoming permanent coupling

Dependency-cruiser now explicitly allows approvals → loyalty and receipts → approvals/loyalty.

ApprovalsService is mostly a façade over LoyaltyService.

This is acceptable for completing the MVP, but later the approval execution use case should be extracted into a dedicated application/domain service rather than expanding peer-module exceptions.

---

Updated maturity assessment

Area Previous Current Assessment

Financial core 9.1/10 9.2/10 Strong atomicity, idempotency and immutable ledger behaviour
Approval workflow 8.1/10 7.5/10 Better policy model, but expiry persistence is broken
Outbox recovery 7.0/10 8.4/10 Real terminalization and good regression coverage
Production SMS 7.0/10 4.5/10 Safer generic boundary, but configured vendor integration cannot work
CI matrix 6.5/10 8.0/10 Most release gates restored
GitNexus determinism 3.5/10 5.0/10 Exact version, but runtime pnpm dlx remains outside the lockfile
OpenAPI quality 5.5/10 7.9/10 Major schema improvement; remaining error and response omissions
Migration confidence — 6.2/10 Verification code exists, but current-head evidence is not visible
Pilot readiness 6.8/10 5.9/10 Lower because the real SMS path has now been examined against its vendor contract

These scores are engineering estimates based on source inspection, not successful execution results.

Completion estimates

Sprint 2 source implementation: 94–96%

Sprint 2 verified exit criteria: 68–74%

Overall backend MVP: 66–69%

Live-pilot readiness: 55–62%

---

Required order of work

1. Replace the generic HTTP SMS implementation with a real eBulkSMS adapter.

2. Fix approval expiry so the EXPIRED status commits before the error is returned.

3. Block sandbox and deterministic providers in production by default.

4. Add integration tests for persisted expiry and stale-policy rejection.

5. Make GitNexus execution lockfile-backed and pin the package manager used by CI.

6. Obtain a visible green run for static, GitNexus, end-to-end and integration jobs.

7. Correct the migration tracker based on that run.

8. Add 422 and the approval reason field to OpenAPI.

9. Extend the SMS timeout through response-body parsing and strengthen runtime validation.

10. Resolve the worker startup/shutdown race and require an explicit SMS receiptId.

Final recommendation

Keep Sprint 2 open. Do not begin redemption yet.

The financial foundation and outbox architecture are now credible, but live operation would still risk:

recording unsent SMS as sent

being unable to process expired approvals correctly

leaving approvals permanently pending

treating an unverified current head as release-ready

No repository changes were made during this review.
