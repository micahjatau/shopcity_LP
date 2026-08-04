## 1. Freeze halfway scope and public contracts

- [x] 1.1 Update operator-facing docs and release notes to mark reversal, manual adjustment, and receiptless capabilities as deferred for the halfway release.
- [x] 1.2 Refresh the OpenAPI and generated-client expectations so deferred workflows are not presented as available successes.

## 2. Close the reversal and receiptless boundaries

- [x] 2.1 Change the reversal endpoint to return a truthful unavailable response with no queued work or durable reversal side effects.
- [x] 2.2 Remove any reversal no-op idempotency persistence and update the reversal controller/service tests for the new contract.
- [x] 2.3 Keep receiptless transaction-detail and customer-ledger behaviors unavailable and align the runtime, OpenAPI, and client tests.

## 3. Complete device attestation cutover

- [x] 3.1 Add `DEVICE_ATTESTATION_KEK` validation and inject configuration into the device/branch services that need it.
- [x] 3.2 Add the device attestation metadata migration, schema updates, and one-time backfill command.
- [x] 3.3 Remove the fingerprint-based attestation fallback and stop returning fingerprint material from normal device APIs.
- [x] 3.4 Enforce branch-scoped supervisor device administration and add tests for list, create, and update boundaries.

## 4. Replace validation-scope and CI gates

- [x] 4.1 Split the validation-scope script into release-critical files and separate coverage rules.
- [x] 4.2 Add package-script, CI-command, and `continue-on-error` verification with negative regression tests.
- [x] 4.3 Enforce critical coverage, broad formatting scope, and OpenSpec validation in CI.

## 5. Add protected release evidence

- [x] 5.1 Add the manual protected release-evidence workflow that requires an exact release SHA and approved backup artifact paths.
- [x] 5.2 Make the protected restore test fail when required schema or data dumps are missing, and upload the reconciliation artifacts on success.
- [x] 5.3 Wire the release evidence package and docs to the final immutable SHA and workflow run metadata.

## 6. Finish SMS and quarantine hardening

- [x] 6.1 Fix SMS payload serialization so zero remaining balances are preserved and adjustment messages are directional.
- [x] 6.2 Add the controlled real-provider SMS smoke script and redact provider secrets and phone data from its evidence output.
- [x] 6.3 Update the SMS failure and credential-rotation runbook with deployment order, restart, retry, and rollback guidance.
- [x] 6.4 Add quarantine batch foreign keys, explicit operator identity fields, and concurrent-active-batch checks.
- [x] 6.5 Expand quarantine tests for row ownership, actor identity, re-execution, and rollback on count mismatch.

## 7. Final release validation

- [ ] 7.1 Run the exact-head validation suite, protected restore workflow, and SMS smoke test against one immutable SHA.
- [x] 7.2 Update the migration tracker, release-evidence package, and Issue #1 with the final SHA and evidence links.
