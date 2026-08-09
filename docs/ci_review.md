CI failure review — current head

Current head: f2153d9ce3c020d5c67bd9319ddc32531b160c7e, “fix: clean loyalty and receipt changes.”

Verdict

The repeated failures have three separate causes:

1. npm run lint still contains real typed-ESLint violations in the worker tests.

2. The newest commit reintroduced Prettier violations after the formatting-only commit.

3. GitNexus is invoked as though it were installed, but it is neither installed by npm ci nor provided through the repository.

The repository has been addressing downstream application issues while the CI infrastructure problems remain unchanged, so every new push reruns the same failures.

I could not retrieve raw push-run logs here: the GitHub connector exposes no PR-triggered run for this head, and the environment does not have authenticated gh available. The causes below are nevertheless directly reproducible from the current source and configuration.

---

1. Why npm run lint is failing

Primary cause: unsafe any usage under type-aware ESLint

Your ESLint configuration enables:

...tseslint.configs.recommendedTypeChecked

with TypeScript project services. It disables only no-explicit-any and downgrades no-unsafe-argument; the other unsafe-value rules remain active.

The current worker test repeatedly does this:

await (runtime as any).handleJob(job);

The same pattern appears several times:

Dead-lettered message test

Exhausted retry-budget test

Already-sent message test

Provider-failure test

Under recommendedTypeChecked, these are expected to produce errors such as:

@typescript-eslint/no-unsafe-call

@typescript-eslint/no-unsafe-member-access

Disabling no-explicit-any does not disable those rules.

The stub itself compounds the problem:

function prismaStub(overrides: any) {
const outboxEvent = overrides.outboxEvent as any;

and later accesses outboxEvent.smsMessage.

That creates likely violations for:

Unsafe assignment

Unsafe member access

Unsafe calls or arguments passed through Jest mocks

This file was introduced with the SMS-delivery reliability work and remains unfixed in the current head.

---

Secondary cause: the latest commit reintroduced Prettier errors

ESLint includes eslint-plugin-prettier/recommended, with formatting differences treated as errors.

The latest loyalty service currently contains long inline union definitions:

smsStatus: 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED' | 'SUPPRESSED' | null;

It appears again in TransactionResponse.

With the repository’s Prettier configuration and default print width, those declarations should be split across multiple lines. Therefore:

npm run format:check is likely to fail first in the monolithic CI workflow.

Running npm run lint independently will also report prettier/prettier errors because Prettier is embedded in ESLint.

The commit sequence explains the repetition:

f118c7f: “style: format repo for ci”

f2153d9: subsequently changed the loyalty files again

The formatting commit did not establish a lasting guard; the next feature/fix commit reintroduced formatting drift.

---

Process cause: repository guidance incorrectly says lint auto-fixes

AGENTS.md says:

> npm run lint runs ESLint with --fix

But package.json defines:

"lint": "eslint \"src/**/\*.ts\" \"test/**/_.ts\"",
"lint:fix": "eslint \"src/\**/_.ts\" \"test/**/*.ts\" --fix"

This documentation mismatch is likely helping the failure recur. An agent or developer can run npm run lint, assume it corrected fixable problems, and commit unchanged files.

It should say:

npm run lint checks only.

npm run lint:fix applies automatic fixes.

---

2. Why GitNexus is failing

GitNexus is not installed by the repository

The scripts call a bare executable:

"gitnexus:analyze": "gitnexus analyze .",
"proposal:impact": "gitnexus impact -r shopcity_LP --summary-only --include-tests"

But gitnexus does not appear in either dependencies or devDependencies.

A clean CI runner performs only:

- run: npm ci

npm ci installs only declared packages. Therefore, any subsequent:

npm run gitnexus:analyze

will normally fail with the equivalent of:

gitnexus: command not found

unless the runner image happens to contain a global GitNexus installation—which should never be relied upon.

The documented repository runner is absent

AGENTS.md recommends:

node .gitnexus/run.cjs analyze

and says to fall back to npx gitnexus analyze if the file is absent. It also explicitly warns about an npm 11 crash.

But .gitnexus/run.cjs is not present in the current repository.

So all three layers disagree:

Layer Current behaviour

package.json Calls globally available gitnexus
AGENTS.md Recommends .gitnexus/run.cjs or npx
Repository Has no runner and no GitNexus dependency

That is why GitNexus can work on a developer machine with a global installation but repeatedly fail on clean CI infrastructure.

Node/npm are not pinned tightly enough for the documented GitNexus limitation

CI pins Node 22, but does not pin npm or declare a packageManager version.

The repository documentation itself warns that GitNexus has an npm 11 crash path.

Therefore, switching blindly to npx gitnexus without pinning a known-compatible npm/tool version may replace “command not found” with intermittent installer failures.

---

3. Why the failures appear repeatedly

Every push runs the complete monolithic workflow

The workflow runs on both:

push:
pull_request:

Every small corrective commit therefore launches the whole verification chain again.

There is also:

No concurrency group

No cancel-in-progress

No separation into lint, build, unit-test and integration-test jobs

All checks are placed in one sequential verify job.

This creates several problems:

Old failing runs continue after a newer commit is pushed.

One early failure hides all later failures.

A formatting-only change launches integration tests again.

On branches with pull requests, both push and pull-request events may run for the same change.

The recent commits did not address both root causes

The recent sequence includes:

ac8f158: SMS delivery reliability

35535aa: worker bootstrap hardening

f118c7f: repository formatting

f2153d9: loyalty/receipt cleanup

But the current head still has:

Unsafe any calls in the worker test

Bare uninstalled GitNexus scripts

Incorrect lint documentation

So the repeated red runs are expected; the fundamental CI causes survived each commit.

---

Additional CI concern

The current main workflow does not contain a GitNexus step.

Therefore, the failing GitNexus job is likely one of:

A separate workflow file

An external GitHub App check

A manually added repository check

A branch-protection status generated outside ci.yml

Regardless of where that check is registered, the repository-side command it invokes is not self-contained because the binary is missing.

---

Root-cause ranking

Severity Cause Confidence

Critical GitNexus binary is not installed in clean CI Very high
Critical Worker runtime test uses unsafe any operations under typed ESLint Very high
High Latest loyalty changes are not Prettier-formatted High
High AGENTS.md falsely claims npm run lint fixes files Very high
Medium Full workflow reruns on every commit with no cancellation Very high
Medium GitNexus/npm versions are not pinned High

---

Focused fix plan

Lint

1. Replace (runtime as any).handleJob(...) with a testable typed interface.

Extract job processing into an injected/publicly testable handler, or

Expose a typed internal method rather than bypassing privacy with any.

2. Replace prismaStub(overrides: any) with typed fixtures and jest.Mocked interfaces.

3. Run npm run format on the current head.

4. Correct AGENTS.md and CLAUDE.md so they distinguish lint from lint:fix.

5. Add a local aggregate command such as:

"verify:fast": "npm run format:check && npm run lint && npm run typecheck"

GitNexus

Use one reproducible method, preferably:

1. Pin GitNexus as a development dependency, or commit the supported .gitnexus/run.cjs wrapper.

2. Change the script to use the repository-owned executable.

3. Pin the compatible GitNexus and npm versions.

4. Add an explicit CI installation/verification step.

5. Do not depend on a global runner installation.

Workflow

Add:

concurrency:
group: ci-${{ github.workflow }}-${{ github.ref }}
cancel-in-progress: true

Split the workflow into at least:

Static checks: format, lint, architecture, typecheck

Unit/contract tests

Integration tests

GitNexus analysis

The static job should fail within a minute, without waiting for database containers or the complete integration suite.

The most immediate blocker is src/jobs/outbox-worker.runtime.spec.ts; the GitNexus check will continue failing until the executable is explicitly installed or repository-wrapped.
