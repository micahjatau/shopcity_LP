Repository review — latest head

Current head: 2fd34f16f49d0258b496d701e5810291b59ab16b, “ci: make gitnexus analysis bypass configurable.” Four CI-only commits have landed since the previous review; no application source, schema or product tests changed.

Verdict

The literal missing GitNexus-wrapper problem has been addressed, and the Redis integration environment is more realistic. However, the latest change largely hides GitNexus analysis failures instead of fixing reproducibility.

More importantly, the current workflow still omits most of the repository’s original release gates. A green run on this head would not prove that the application:

Builds

Passes unit or end-to-end tests

Has a valid Prisma schema

Preserves architecture boundaries

Has an up-to-date OpenAPI contract

Sprint 2 should remain open.

---

What improved

1. A checked-in GitNexus wrapper now exists

The npm commands now invoke scripts/gitnexus.cjs rather than the nonexistent .gitnexus/run.cjs.

The wrapper tries, in order:

1. .gitnexus/run.cjs, when present

2. A gitnexus binary on PATH

3. npx --yes gitnexus

This resolves the immediate module-not-found failure from the previous version.

2. Redis is installed for integration tests

The integration workflow now installs redis-server.

That matches the test helper, which explicitly spawns a redis-server child process on a dynamically allocated port.

3. GitHub Actions were upgraded

The workflow now uses actions/checkout@v5 and actions/setup-node@v5.

The project runtime is still Node 22; the commit title referring to Node 24 describes the actions’ internal runtime, not the application’s configured Node version.

4. Superseded runs remain cancellable

Workflow concurrency is still configured to cancel an older run when a newer commit is pushed to the same ref.

---

Critical CI findings

P0 — GitNexus analysis fails open by default

The workflow sets:

GITNEXUS_ALLOW_FAILURE: ${{ vars.GITNEXUS_ALLOW_FAILURE || 'true' }}

and converts any analysis failure into a successful step unless the repository variable is explicitly set to false.

Therefore, by default:

npm run gitnexus:analyze

can fail while the GitNexus job remains green.

This is not a verification gate. It is an advisory log.

The newest commit explicitly introduced this behaviour.

Required correction

Fail closed by default:

GITNEXUS_ALLOW_FAILURE: ${{ vars.GITNEXUS_ALLOW_FAILURE || 'false' }}

A temporary bypass should require an intentional repository setting and should ideally produce a visibly neutral/skipped status rather than a misleading success.

---

P0 — The bypass does not cover the likely installation failure

Before the bypassable analysis step, CI runs:

- run: npm run gitnexus:smoke

The smoke command runs the same wrapper and ultimately invokes unpinned npx gitnexus --help on a clean runner.

If the actual recurring failure is:

npm registry access

Package installation

An incompatible current GitNexus release

The previously documented npm/GitNexus crash

Package resolution

then the smoke step still fails before the fail-open analysis logic is reached.

So the newest commit may not fix the repeated GitNexus job failure at all.

---

P0/P1 — GitNexus remains unpinned and non-reproducible

GitNexus is still absent from devDependencies.

Instead, every clean runner may download whatever version is currently published:

npx --yes gitnexus

This means the same commit can behave differently on different days due to:

New GitNexus releases

Registry availability

Transitive dependency changes

Package compromise or withdrawal

npm-version differences

That contradicts the archived design goal of making verification reproducible after npm ci.

Required correction

Add an exact or tightly pinned development dependency, for example:

"gitnexus": "x.y.z"

Then call the repository-local binary through npm exec -- gitnexus or the normal npm-script PATH.

The wrapper should never download a floating tool version during CI.

---

P1 — The wrapper can falsely return success when the child is killed

The wrapper exits using:

process.exit(result.status ?? 0);

For a child process terminated by a signal, spawnSync() can return:

status: null

A populated signal

No ordinary spawn error

The wrapper then converts the null status into exit code 0.

A killed, timed-out or externally terminated GitNexus process can therefore appear successful.

Handle it explicitly:

if (result.error) process.exit(1);
if (result.signal) process.exit(1);
process.exit(result.status ?? 1);

P1 — GitNexus has no execution timeout

spawnSync() is called without a timeout.

A hung index operation can consume the entire GitHub Actions job timeout. Add an explicit timeout and a clear timeout error.

---

CI coverage is still substantially incomplete

The current workflow runs:

Format check

Source lint

Test lint

Typecheck

GitNexus smoke/analysis

Integration tests

It does not run:

npm run build

npm run prisma:generate

npm run prisma:validate

npm run architecture:check

npm test -- --runInBand

npm run test:e2e

npm run openapi:lint

npm run openapi:diff

git diff --exit-code -- docs/api/openapi.json

All those commands still exist in package.json, but none is used in the workflow.

Consequence

The worker/provider unit tests under src/**/*.spec.ts are not part of the integration job. A static typecheck cannot replace executing them.

A green workflow can therefore coexist with:

Broken application bootstrap

Failing unit tests

Broken HTTP behaviour

Stale generated API documentation

Prisma drift

Architecture violations

---

Concrete contract failure remains

The current controller declares transactionId as required in both the confirmed and pending earn responses.

The committed OpenAPI document still omits transactionId from:

The required field list

The response properties

for both 201 and 202.

This proves the missing OpenAPI gate is already allowing real drift.

Frontend-generated clients can still use an outdated contract even if CI turns green.

---

Product blockers unchanged

Because the latest four commits changed only CI and related documentation, all application blockers from the previous review remain.

P1 — Retry-exhausted SMS rows can be republished forever

The recovery query excludes dead-lettered rows but does not exclude rows whose attempts already equal the maximum.

The job handler simply discards an exhausted job and returns without writing deadLetteredAt or a terminal outbox state.

That can create repeated no-op Redis jobs for the same exhausted database row.

P1 — Real SMS provider still lacks timeout and response validation

The real provider:

Uses an unbounded fetch()

Casts arbitrary response JSON

Defaults a missing status to SENT

It still needs:

Abort timeout

Runtime schema validation

Unknown-status rejection

Provider-message-ID requirements

Network failure classification

P1 — Malformed and non-SMS events can poison recovery

The outbox recovery query does not filter by eventType.

SMS reconstruction still substitutes the outbox event ID when receiptId is missing and validates only phone/template fields.

Malformed events can fail before a dead-letterable SMS record exists and repeatedly return to recovery.

P1 — Approval execution does not reapply current policy

Approval execution rechecks entity status, then immediately calculates credit and creates the financial effect.

It still does not reapply:

Purchase ceiling

Approval threshold

Approval expiry

Stored policy version

Full current eligibility decision

P1 — Production SMS configuration remains undocumented

.env.example still contains none of the SMS provider or outbox worker settings.

P1 — SMS reliability migration remains unverified

The migration tracker still marks the SMS delivery reliability migration as Not run.

---

Documentation and implementation mismatch

The archived CI tasks claim that .gitnexus/run.cjs was restored and clean-install verification was completed.

But the implementation instead uses scripts/gitnexus.cjs, which downloads an unpinned package when the local runner is absent.

The broader idea is acceptable, but the archived task record should describe what was actually implemented and should not claim reproducibility until a strict clean-run check passes.

---

Updated assessment

Area Previous Current

Financial core 9.1/10 9.1/10
Approval workflow 8.1/10 8.1/10
Outbox/SMS implementation 7/10 7/10
GitNexus command availability 2/10 6/10
GitNexus reproducibility 2/10 3.5/10
CI structure 5.5/10 6.5/10
CI truthfulness 3/10 3/10
Generated API contract 5.5/10 5.5/10
Pilot readiness 6.8/10 6.8/10

Completion estimates

Sprint 2 source implementation: approximately 92–94%

Sprint 2 verified exit gate: approximately 60–65%

Full TRD MVP: approximately 64–67%

Pilot readiness: approximately 52–58%

The source implementation did not change. CI convenience improved, but verified readiness did not because GitNexus is fail-open and most release gates remain absent.

---

Correct next sequence

Gate 1 — Make GitNexus deterministic

1. Pin GitNexus in devDependencies.

2. Remove runtime npx installation.

3. Default GITNEXUS_ALLOW_FAILURE to false.

4. Handle child signals as failures.

5. Add an execution timeout.

6. Keep a temporary bypass only as an explicit emergency setting.

Gate 2 — Restore the full verification matrix

Add jobs for:

1. Prisma generation and validation

2. Build and architecture check

3. Unit tests

4. End-to-end tests

5. Integration tests

6. OpenAPI generation, lint and diff

7. Generated-file cleanliness

Gate 3 — Correct the existing drift

1. Regenerate docs/api/openapi.json.

2. Confirm transactionId appears in both 201 and 202.

3. Re-run contract tests.

4. Do not archive the CI work until the strict workflow is visibly green.

Gate 4 — Return to product hardening

Then address:

Exhausted-row terminalization

Poison-event handling

Provider timeout and response validation

Approval policy revalidation

Production environment documentation

Migration verification

A green run under the current workflow should not be treated as Sprint 2 verification. It can ignore GitNexus analysis failure and does not execute most of the repository’s declared release gates.
