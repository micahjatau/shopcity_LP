## Why

Sprint 3 is halfway implemented, but the release is still not trustworthy because several blocker classes remain unresolved: reversal behavior is still misleading, device attestation still needs a clean secret cutover, validation and CI gates are incomplete, and the protected restore and SMS proof points are not yet release-grade. This change freezes the halfway scope and turns the remaining blocker set into explicit contracts so nothing deferred is exposed as completed functionality.

## What Changes

- Freeze the Sprint 3 halfway scope and state clearly that executable reversals, manual balance adjustments, and receiptless financial read models remain deferred.
- Replace any misleading reversal success semantics with an unavailable boundary for the halfway release.
- Complete device attestation hardening with a dedicated KEK, secret migration, fingerprint-data removal from normal APIs, and branch-scoped supervisor administration.
- Replace the current validation-scope gate with a real release-critical scope check that validates actual scripts and CI commands.
- Enforce critical test coverage, formatting scope, OpenSpec validation, and mandatory CI gates.
- Add a protected release-evidence workflow that proves exact-head shared-backup restore behavior and records downloadable evidence.
- Close out SMS payload correctness, add a real-provider smoke path, and update operational runbooks.
- Strengthen receipt quarantine support tables with batch integrity, operator identity, and concurrency protections.
- Keep receiptless product claims out of active runtime, OpenAPI, and generated-client surfaces.

## Capabilities

### New Capabilities

- `reversal-capability-boundary`: Defines the halfway release contract for reversal-related behavior, including the unavailable response and the explicit deferral of executable reversal and manual adjustment flows.
- `device-attestation-cutover`: Covers dedicated attestation secret storage, KEK-based encryption, backfill, rotation, and removal of fingerprint-based signing fallback.
- `branch-scoped-device-administration`: Restricts device listing, creation, and updates to the actor's authorized branch unless the actor has tenant-wide admin access.
- `repository-validation-enforcement`: Replaces the tautological validation-scope check with real release-critical file coverage and CI command verification.
- `protected-release-evidence`: Defines the protected exact-head shared-backup restore workflow and the evidence package required for release proof.
- `sms-delivery-closeout`: Covers truthful SMS payload serialization, directional adjustment messaging, controlled real-provider smoke validation, and the supporting runbook updates.
- `quarantine-operator-integrity`: Adds batch-scoped relational guarantees and explicit operator identity for receipt quarantine execution.
- `receiptless-capability-boundary`: Keeps receiptless transaction details and customer-ledger behavior formally unavailable in the halfway release.

### Modified Capabilities

- None.

## Impact

Affected areas include the reversal HTTP/OpenAPI contract, device authentication and branch authorization code, Prisma schema and migrations, validation scripts, CI workflows, release-evidence artifacts, SMS payload and worker paths, quarantine SQL and tests, operator-facing documentation, OpenAPI/client generation, and the release-validation suite.
