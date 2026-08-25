## Why

Repo review 45 leaves ShopCity with the full Sprint 5 pilot-certification gap set still open: the credit-expiry reminder flow can publish a stale expiring-total, expiry-versus-redemption acceptance evidence is missing, the readiness verifier can pass example evidence, Sentry is configured but not actually initialized, the observed restore drill and its RPO/RTO record are still missing, and the security/performance/staging/sign-off evidence has not been tied to one immutable release candidate.

Without this change, the system can still look complete on paper while misreporting reminder amounts, certifying fixture data, failing to prove real production security/performance/recovery evidence, or shipping without the operational observability the TRD expects for pilot use.

## What Changes

- Revalidate reminder candidates inside the persistence transaction, lock/reload the eligible lots, and recalculate totals before writing reminder, outbox, and SMS rows.
- Add an adversarial expiry-versus-redemption concurrency test that runs a real redemption against a due lot at the same time as expiry processing.
- Harden the Sprint 5 readiness verifier so it fails closed on example/fixture evidence, dummy release identifiers, and mismatched evidence artifacts; require a real `readiness.json` bundle.
- Initialize Sentry only when configured, without blocking financial writes or worker startup.
- Replace example pilot evidence with a real release-candidate bundle that captures staging, security, performance, restore, training, and sign-off evidence for one immutable SHA/image digest, including the observed restore drill and documented RPO/RTO.

## Out of Scope

- Redesigning the credit-expiry model, report materialization, or ledger history.
- Adding new customer-facing pilot features beyond the existing expiry/reminder and release-readiness surfaces.
- Changing the release-evidence schema shape unless a validator fix requires an additive field.
- Broad observability or security platform replacement outside the Sentry initialization gap.

## Capabilities

### New Capabilities

- `credit-expiry-reminder-revalidation`: reminder totals are recomputed from locked authoritative rows at commit time.
- `expiry-redemption-concurrency-proof`: one real redemption-vs-expiry integration proves the lot math and reconciliation boundary.
- `fail-closed-pilot-readiness-verification`: the readiness gate rejects example evidence and only accepts a real release bundle.
- `nonblocking-sentry-initialization`: Sentry is attached only when configured and does not interfere with financial writes.
- `real-release-candidate-evidence`: one immutable SHA/image digest is backed by observed security, performance, restore, staging, training, and sign-off evidence.
- `pilot-certification-evidence`: the release bundle contains recorded CI or workflow URLs for the gates that were actually executed.

### Modified Capabilities

- `credit-expiry-execution`: expiry/reminder behavior remains server-authoritative, but reminder totals are no longer allowed to age between selection and commit.
- `production-artifact-certification`: readiness validation now fails closed instead of certifying example data.
- `pilot-operations-summary`: observability reporting reflects an actual initialized Sentry runtime when configured.

## Impact

Proposal-time GitNexus analysis found these relevant surfaces:

- `ReportsService`: MEDIUM risk, 8 impacted symbols, 6 direct dependants. The pilot summary already surfaces release metadata and Sentry state, so certification evidence and observability reporting remain coupled.
- `HealthController`: LOW risk, 5 impacted symbols, 3 direct dependants. Readiness behavior is localized, but the overall pilot gate depends on it remaining truthful.
- `AppModule`: LOW risk, 8 impacted symbols, 1 direct dependant. Sentry wiring or bootstrap registration stays localized but affects shared runtime initialization.

The exact reminder and readiness-verifier symbols were not cleanly resolved by GitNexus during proposal-time lookup, so those paths should be treated as high-integrity implementation surfaces and covered with targeted regression tests.

## Rollout / Verification

This change is complete only when one real release candidate proves all of the following:

- reminder revalidation race regression coverage;
- expiry-versus-redemption concurrency coverage;
- readiness verifier rejects example evidence and accepts only real release-candidate evidence;
- Sentry initializes only when configured and remains non-blocking;
- restore, security, performance, staging, training, and sign-off evidence all point to the same SHA/image digest;
- observed restore drill evidence includes the measured RPO/RTO and the policy used to judge it;
- security evidence includes the actual workflow/run artifacts for the required checks;
- performance evidence includes the executed k6 summary and post-load reconciliation result;
- `npm run openspec:validate` passes after the artifact set is written.

## Open Questions

1. Should the reminder revalidation happen by re-locking the exact qualifying lots, or by re-querying the customer/day aggregate and deriving totals from fresh row-level state?
2. Should the readiness verifier keep `readiness.example.json` as a negative fixture only, or should the production command move to a separate `readiness.json` path entirely?
3. Is Sentry initialization expected in both API and worker entrypoints, or only in the API runtime for pilot operations?
4. Should the real pilot evidence bundle live in-repo, or should the repository only reference externally stored release artifacts for the final approval record?
