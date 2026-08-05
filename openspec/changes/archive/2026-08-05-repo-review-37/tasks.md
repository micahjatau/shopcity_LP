## 1. Contract Truthfulness

- [x] 1.1 Remove the reversal success envelope from the contract and regenerate the OpenAPI/client artifacts.
- [x] 1.2 Add HTTP coverage for the reversal 503 response and the receiptless 422 unsupported response.
- [x] 1.3 Verify the generated client no longer exposes a fabricated reversal success type.

## 2. Device Cutover Safety

- [x] 2.1 Add KEK environment validation for minimum strength, versioning, and secret reuse checks.
- [x] 2.2 Add the database invariant that blocks ACTIVE devices with incomplete attestation secret metadata.
- [x] 2.3 Implement or update the reprovisioning flow so legacy devices become ACTIVE only after acknowledgement.
- [x] 2.4 Add branch-scoped administration tests for cross-branch deny, tenant admin allow, and non-enumerating failures.

## 3. Validation And Evidence

- [x] 3.1 Replace the validation-scope gate with an executable CI test target that inspects mandatory workflows and step-level optionalization.
- [x] 3.2 Update the protected restore workflow to use SHA-scoped output paths and always upload evidence.
- [x] 3.3 Add the release-evidence checks for checksum, migration inventory, Prisma status, object probes, and final outcome.

## 4. Operational Proof

- [x] 4.1 Add the approval-gated production SMS smoke command with redacted JSON evidence.
- [x] 4.2 Implement the quarantine ownership claim mechanism and upgrade-safe support-table migration.
- [x] 4.3 Add concurrency, rollback, and placeholder-validation tests for quarantine execution.
- [x] 4.4 Run the relevant verification commands and record the resulting evidence in the tracker.
