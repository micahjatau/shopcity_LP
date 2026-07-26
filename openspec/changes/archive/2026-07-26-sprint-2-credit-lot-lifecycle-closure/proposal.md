## Why

Repo review 19 found Sprint 2 code-complete but still blocked by credit-lot lifecycle gaps that can alter outstanding customer liability without ledger/audit evidence. The follow-up should close those financial-integrity holes and record visible release evidence before Sprint 2 is formally closed and Sprint 3 redemption work begins.

## What Changes

- Make credit-lot expiry derived from `earnedAt` using the approved twelve-month rule and reject inserts/updates that violate it.
- Prevent direct credit-lot deletion so earned lots remain reconcilable to immutable earn ledger entries.
- Temporarily freeze `remainingAmountKobo` until Sprint 3 introduces controlled redemption, expiry, reversal, and audit workflows.
- Narrow earn transaction retries to confirmed retriable PostgreSQL/Prisma conflicts, currently Prisma `P2034` only.
- Add endpoint-specific OpenAPI error examples for `POST /transactions/earn`, including duplicate receipt, idempotency conflict, policy/approval, validation/device/card, dependency, and transaction conflict cases.
- Record current-head CI/release evidence and reconcile the Sprint 2 issue checklist before closure.

## Capabilities

### New Capabilities

- `credit-lot-lifecycle-integrity`: Defines derived immutable expiry, no-delete behavior, temporary remaining-balance freeze, and regression coverage for credit lots.
- `earn-retry-classification`: Defines the narrow retryable error classifier for earn transaction conflicts.
- `earn-endpoint-error-contract`: Defines endpoint-specific stable error documentation for the canonical earn API.
- `sprint-2-closure-evidence`: Defines the visible current-head evidence and issue checklist reconciliation required for final Sprint 2 closure.

### Modified Capabilities

- None.

## Impact

- Affected schema areas: Prisma model expectations, PostgreSQL migrations/triggers for credit-lot expiry, deletion, and remaining-balance immutability.
- Affected application areas: earn transaction retry classifier/error mapping and public OpenAPI decorators for `POST /transactions/earn`.
- Affected tests: credit-lot database integration tests, earn retry unit tests, OpenAPI generation/lint/diff checks, migration deployment checks, and Sprint 2 release evidence updates.
- Affected docs/process: `docs/database/migration-tracker.md`, Sprint 2 issue checklist/evidence, and generated API artifacts.
