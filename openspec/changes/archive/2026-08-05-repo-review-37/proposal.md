## Why

Repository review 37 shows the halfway release still has misleading contracts, incomplete device cutover safety, and missing proof for protected restore, SMS smoke, validation gates, and quarantine ownership. This follow-up change makes those release boundaries truthful and enforceable so the remaining sprint work can be completed without shipping fiction.

## What Changes

- **BREAKING** Remove the fabricated reversal success envelope and align the contract, OpenAPI, and generated client with an explicit unavailable boundary.
- Add a truthful receiptless read contract for unsupported transaction details.
- Harden device attestation with KEK validation, versioned cutover behavior, and a database-enforced active-secret invariant.
- Add resumable device reprovisioning and acknowledgement so legacy devices only become active after a fresh secret is issued and confirmed.
- Make validation-scope, protected restore, and release-evidence checks enforce the actual mandatory jobs and exact-head artifacts.
- Add a controlled production SMS smoke command with approval, destination, and redaction guardrails.
- Replace quarantine’s implicit batch ownership with durable claims plus operator validation and upgrade-safe migrations.

## Capabilities

### New Capabilities

- `release-hardening-guardrails`: release-contract truthfulness, device cutover safety, evidence-proof enforcement, SMS smoke guardrails, and quarantine integrity for the halfway release.

### Modified Capabilities

- None.

## Impact

- Reversal and receiptless HTTP handlers, OpenAPI generation, and client artifacts
- Device authentication, provisioning, and branch authorization code
- Environment validation, Prisma schema, and migrations
- Validation-scope scripts, CI workflows, and OpenSpec/ release validation
- Protected restore workflow, release evidence layout, and checksum reporting
- SMS smoke execution paths and operational logs
- Quarantine SQL, migrations, and concurrency tests
