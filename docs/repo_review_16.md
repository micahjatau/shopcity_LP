Repository review — latest head

Current head: 46b75a652e11636769c37a4b1a6a3e0fd61d19f1 — “ci: pin gitnexus and restore release gates.”

Verdict

This is a substantial CI improvement. The GitNexus problem is now properly addressed, several missing release gates have returned, and the committed OpenAPI drift was corrected.

However, Sprint 2 is still not ready to close because:

1. Lint, formatting and full typechecking were accidentally removed from CI.

2. The OpenAPI file is synchronized but several schemas remain materially incomplete.

3. The SMS worker still has terminal-state and poison-event failure loops.

4. The real SMS provider remains production-incomplete.

5. Approval execution still does not reapply current policy.

6. Migrations are not visibly verified on this head.

---

Improvements since the previous review

1. GitNexus is finally deterministic

GitNexus 1.6.9 is pinned as an exact development dependency rather than installed dynamically.

The wrapper now:

Uses the generated local runner when available.

Otherwise uses the pinned node_modules/.bin/gitnexus.

Has a ten-minute timeout.

Treats errors, signals, timeouts and non-zero statuses as failures.

Has no floating npx --yes installation fallback.

This resolves the previous reproducibility and false-success findings.

2. GitNexus now fails closed by default

The emergency bypass is only activated when GITNEXUS_ALLOW_FAILURE is explicitly set to true.

That is a reasonable temporary escape hatch. It is no longer silently enabled by default.

3. Major release gates were restored

CI now explicitly executes:

Build

Prisma generation and validation

Architecture checking

Unit tests

OpenAPI generation/linting/diffing

Generated OpenAPI cleanliness

End-to-end tests

Integration tests

GitNexus analysis

4. The known OpenAPI drift was corrected

transactionId is now present in the committed 201 and 202 earn-response schemas.

The generated-file cleanliness check should prevent this exact form of drift from recurring.

---

Remaining findings

P1 — CI no longer runs formatting, lint or complete typechecking

The previous workflow ran npm run verify:fast. The new workflow replaced it with the release commands rather than retaining it before them. The static job now starts directly with build and contains no formatting, ESLint or explicit typecheck command.

Yet verify:fast still exists and performs:

Prettier checking

Source ESLint

Test ESLint

tsc --noEmit

This is not fully compensated for by npm run build. The build configuration excludes test, dist and all *.spec.ts files.

Therefore, CI can pass while containing:

ESLint violations

Formatting drift

Type errors in unexecuted test/support files

Unsafe TypeScript patterns not caught by compilation

It also directly conflicts with Issue #1’s exit condition that lint and typecheck pass visibly in CI.

Correction

The first static step after npm ci should be:

- run: npm run verify:fast

Then run Prisma generation/validation before build.

---

P1 — The OpenAPI file is synchronized, but the contract remains incomplete

Transaction detail response

The controller documents only:

id

transactionId

for GET /transactions/:id.

The actual service returns a much richer response containing tenant, branch, customer, device, card, receipt, amounts, approval status, balances, expiry, SMS state and a nested ledger/credit-lot object.

The generated OpenAPI therefore correctly reproduces an underspecified controller schema rather than documenting the real response.

Ledger and approval-list responses

The customer ledger endpoint documents its response as only a generic object.

The approval-list endpoint does the same, even though the service returns structured approval and receipt data.

Earn response states

For the 201 confirmed response, transactionId remains nullable even though the implementation always assigns ledgerEntry.id.

For a strong frontend contract, 201 and 202 should be distinct schemas:

State Required state-specific fields

CONFIRMED Non-null transactionId, ledgerEntryId, balance, expiry, SMS status
PENDING_APPROVAL Non-null approvalId, null financial-effect fields

The current shared loose interface does not let generated clients safely narrow by state.

---

P1 — Exhausted SMS records can still cycle forever

The recovery query excludes records with deadLetteredAt, but does not exclude records whose attempts already equal the retry maximum. It also does not constrain recovery to sms.send event types.

When the handler sees an exhausted record without deadLetteredAt, it only calls job.discard() and returns. It does not:

Set deadLetteredAt

Set a terminal failure category

Terminalize the outbox event

The database recovery process can consequently select the same row again and create another no-op Redis job.

Correction

Recovery should require something equivalent to:

sm."attempts" < MAX_RETRY_ATTEMPTS

Any already-exhausted record lacking terminal metadata should be repaired transactionally into a dead-letter state.

---

P1 — Poison events still cannot reach a terminal state

SMS-message reconstruction happens before the handler’s main try/catch.

If an event:

Is not an SMS event

Has an unsupported payload version

Lacks phoneE164

Lacks template

Contains malformed legacy data

then reconstruction throws before an SmsMessage exists.

Because the recovery query explicitly selects published events without an associated SmsMessage, the poison event is repeatedly republished.

Correction

Introduce:

Explicit eventType === 'sms.send' routing

Versioned payload validation

A terminal outbox failure/dead-letter state independent of SmsMessage

Poison-event tests

---

P1 — The production SMS provider is still incomplete

The real provider still:

Has no network timeout or abort controller.

Trusts arbitrary JSON through a TypeScript cast.

Defaults missing status to SENT.

Accepts unknown runtime status values.

Makes authentication optional.

The factory only requires the URL for real mode; the token remains optional.

The environment schema also defines the token as optional.

Additionally, .env.example still omits all SMS provider and worker recovery variables.

Required production hardening:

1. Abort timeout.

2. Runtime response schema.

3. Explicit allowed-status validation.

4. Permanent versus retryable HTTP failure classification.

5. Authentication requirement or documented unauthenticated-provider policy.

6. Provider idempotency guarantees documented and tested.

7. Full environment-variable documentation.

---

P1 — Approval execution still does not reapply current policy

Approval execution rechecks:

Receipt state

Self-approval

Branch

Device

Card

Customer

Staff eligibility

But after those checks it immediately approves the record and calculates the financial effect.

It still does not visibly reapply:

Current purchase ceiling

Current approval threshold

Approval expiry

Current policy version

A defined snapshot-versus-current earn-rate rule

This means a purchase can be captured under one policy and executed after policy changes without a documented rule governing the result.

---

P1 — Migration verification remains unresolved

The migration tracker still marks both:

Immutable earning ledger foundation

SMS delivery reliability follow-up

as Not run.

A Testcontainers migration test exists and executes the full prisma migrate deploy chain against PostgreSQL.

However, the GitHub connector returned no associated pull-request workflow run for this head, so I cannot verify that the migration suite passed in CI.

The migration tracker should only be changed to verified after a visible successful clean-database run.

---

Secondary findings

P2 — Architecture enforcement was relaxed broadly

To make the architecture check accept existing coupling, the configuration now allows:

Entire approvals module → loyalty

Entire receipts module → approvals and loyalty

The current need is understandable: ApprovalsService is largely a facade over LoyaltyService, while ReceiptsController injects both services for compatibility endpoints.

But the exception applies to every file in those modules. Future accidental cross-module imports will now pass.

A safer approach would be:

Restrict exceptions to named compatibility files, or

Move legacy receipt routes into a dedicated compatibility adapter, or

Extract earn/approval orchestration into a shared application-use-case layer.

P2 — OpenSpec design and implementation diverge

The design says a dedicated verification job should be added so gates fail independently and clearly.

Instead, build, Prisma, architecture, unit and OpenAPI commands are all sequential steps in the existing static job.

One early failure prevents later gates from running, which is the exact drawback the design said it intended to avoid.

P2 — GitNexus guidance still recommends floating installation paths

The hardened wrapper intentionally removed floating installation. Nevertheless, AGENTS.md still tells developers to use npx gitnexus analyze or install GitNexus globally when the generated runner is absent.

Documentation should point to:

npm ci
npm run gitnexus:analyze

P2 — End-to-end business coverage needs strengthening

The verified base e2e specification tests only:

/api/v1

/health/live

Those are useful smoke tests, but they do not by themselves prove the HTTP behaviour of earn capture, pending approval, approval execution, idempotency or transaction retrieval.

P3 — Package hygiene

The unexplained development dependency "install": "^0.13.0" remains present.

Unless deliberately used, it should be removed.

---

Updated maturity assessment

Area Assessment

Immutable financial core 9.1/10
Approval workflow 8.1/10
GitNexus determinism 8.8/10
CI gate structure 7.2/10
CI verification evidence 4.5/10
Generated OpenAPI synchronization 8.5/10
OpenAPI semantic completeness 5.5/10
Outbox recovery 7.2/10
Replay safety 6.0/10
Production SMS readiness 4.5/10
Migration confidence 7.0/10 source, unverified operationally
Pilot readiness 5.8/10

Completion estimate

Sprint 2 source implementation: approximately 93%

Sprint 2 CI gate implementation: approximately 78–82%

Sprint 2 verified exit: approximately 65–70%

Full TRD MVP: approximately 64–67%

Pilot readiness: approximately 55–60%

---

Required sequence before Sprint 2 closes

Gate 1 — Correct CI

1. Restore npm run verify:fast.

2. Run Prisma generation and validation before build.

3. Split verification commands into clearer jobs or named grouped steps.

4. Obtain a visible green run for the exact head.

5. Keep GitNexus bypass disabled.

Gate 2 — Complete the public contract

1. Add full schemas for transaction details, customer ledger and approval lists.

2. Separate confirmed and pending earn response schemas.

3. Make confirmed transactionId non-null.

4. Require approvalId in the 202 response.

5. Add business HTTP e2e tests.

Gate 3 — Terminalize messaging failures

1. Filter recovery by supported event type.

2. Exclude retry-exhausted messages.

3. Dead-letter poison events.

4. Add provider timeout and response validation.

5. Document production SMS environment configuration.

Gate 4 — Close financial-policy gaps

1. Reapply or explicitly snapshot approval policy.

2. Add approval expiry.

3. Verify the entire migration chain.

4. Update Issue #1 and the migration tracker from actual passing evidence.

Do not begin redemption/FIFO work yet. The financial core is strong, but Sprint 2 still lacks trustworthy closure around CI, API contracts and production messaging.

No repository changes were made.
