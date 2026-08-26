## 1. Reminder revalidation

- [ ] 1.1 Re-read qualifying lots inside the reminder transaction before writing reminder evidence.
- [ ] 1.2 Lock or revalidate the rows that contribute to the customer-day aggregate.
- [ ] 1.3 Recompute total/min/max from authoritative state and no-op when the total is zero.
- [ ] 1.4 Add an adversarial test where redemption occurs after candidate discovery but before reminder persistence.

## 2. Expiry vs redemption concurrency

- [ ] 2.1 Add a real Testcontainers integration test for redemption against an expiry-due lot.
- [ ] 2.2 Assert no negative lot balance, no over-consumption, and a reconcilable final state.
- [ ] 2.3 Keep the existing expiry-vs-expiry regression as a supporting coverage case.

## 3. Readiness verifier hardening

- [ ] 3.1 Make the production readiness command point at real release evidence, not the example fixture.
- [ ] 3.2 Reject example/fixture paths, dummy SHAs, dummy image digests, and mismatched evidence references.
- [ ] 3.3 Reject generic runbook or baseline docs when the gate expects executed evidence.
- [ ] 3.4 Keep the example file only as a negative fixture or documentation aid.

## 4. Sentry runtime initialization

- [ ] 4.1 Initialize Sentry only when configured.
- [ ] 4.2 Keep Sentry startup non-blocking for financial writes and worker bootstrap.
- [ ] 4.3 Add regression coverage for configured and unconfigured startup paths.

## 5. Real pilot evidence bundle

- [ ] 5.1 Replace example readiness evidence with one immutable release candidate SHA/image digest.
- [ ] 5.2 Capture real restore, security, performance, staging, training, and sign-off evidence.
- [ ] 5.3 Record the observed restore drill with explicit RPO/RTO values and the acceptance policy used.
- [ ] 5.4 Attach the actual security workflow/run evidence for the required checks.
- [ ] 5.5 Attach the executed k6/performance summary and post-load reconciliation output.
- [ ] 5.6 Ensure the verifier passes only when every mandatory gate points at the same candidate.

## 6. Validation

- [ ] 6.1 Run targeted unit/integration coverage for reminder revalidation and concurrency.
- [ ] 6.2 Run the readiness verifier against the real evidence bundle.
- [ ] 6.3 Confirm the restore evidence reflects the documented policy and the observed drill result.
- [ ] 6.4 Run `npm run openspec:validate` after the proposal artifacts are complete and again if scope changes.
