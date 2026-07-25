## Why

Repo review 18 found Sprint 2 functionally complete but not formally closed because database-level financial invariants, transaction conflict handling, API governance, and visible release evidence remain unresolved. These closure items should be sealed before Sprint 3 redemption work begins, because redemption will depend on immutable receipt evidence, trustworthy credit lots, and clear public API contracts.

## What Changes

- Add database safeguards that make receipt purchase evidence immutable after insertion while preserving workflow metadata updates.
- Add a positive purchase amount database constraint for receipts.
- Add database validation tying credit lots tightly to their earn ledger entries and preventing mutation of lot identity/source fields.
- Implement bounded retry handling for known PostgreSQL serialization conflicts, returning a temporary concurrency error only after retries are exhausted.
- Ensure duplicate receipt errors are returned only for actual receipt uniqueness violations, using the stable `RECEIPT_ALREADY_USED` code.
- Record an ADR for the implemented response envelope, canonical error catalogue, canonical earn/approval workflows, and deprecation stance for duplicate public endpoints.
- Update OpenAPI and API docs to reflect canonical workflows, error codes, and any deprecated receipt-specific write/decision endpoints.
- Capture visible release evidence for the final Sprint 2 acceptance suite and update the migration tracker/issue closure evidence.

## Capabilities

### New Capabilities

- `receipt-evidence-integrity`: Defines immutable receipt purchase evidence, mutable workflow metadata, positive purchase amount enforcement, and receipt mutation regression requirements.
- `credit-lot-ledger-integrity`: Defines credit-lot-to-ledger consistency requirements, immutable lot source fields, and redemption-readiness invariants.
- `earn-transaction-concurrency`: Defines bounded serialization retry behavior and distinct duplicate-receipt versus temporary-concurrency error handling.
- `public-api-governance`: Defines the formal envelope/error decision, canonical public earn and approval workflows, endpoint deprecation policy, and generated API artifact updates.
- `sprint-2-release-evidence`: Defines the visible acceptance evidence required before Sprint 2 can be marked closed.

### Modified Capabilities

- None.

## Impact

- Affected schema areas: Prisma schema and migrations for receipt immutability, receipt amount checks, credit-lot consistency, and immutable lot source fields.
- Affected application areas: earn transaction retry wrapper/error mapping, receipt capture duplicate handling, public controllers/OpenAPI decorators, API documentation, ADRs, and migration tracker evidence.
- Affected tests: migration deploy/upgrade checks, immutable ledger integration tests, receipt mutation rejection tests, credit-lot consistency tests, serialization retry tests, OpenAPI checks, and a Sprint 2 acceptance suite.
- External systems: PostgreSQL, Prisma migrations, GitHub Actions release evidence, generated OpenAPI/Orval/Bruno artifacts if present in the repo workflow.
