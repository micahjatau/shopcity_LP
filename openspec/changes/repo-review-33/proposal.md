## Why

Repository review follow-ups still show several live mismatches between runtime behavior, docs, and release evidence. This change bundles the remaining hardening work into one release-readiness pass so the repo stops carrying known gaps in auth/session safety, loyalty read visibility, migration evidence, API contracts, and SMS payload truthfulness.

## What Changes

- Tighten auth/session handling so refresh and guarded requests re-check device eligibility and device attestations cannot be replayed.
- Fix the loyalty read model so receiptless adjustment and reversal entries are readable through the intended scoped endpoints.
- Correct migration evidence so the tracker matches the actual forward-only migration history and no longer duplicates or omits applied migrations.
- Align OpenAPI and related repo docs with the real error envelope and expand formatting coverage to nested tracked artifacts.
- Validate SMS payloads consistently for all rendered templates so malformed outbox data fails fast instead of producing misleading messages.

## Capabilities

### New Capabilities
- `repo-review-33-hardening-guardrails`: cross-cutting release hardening for auth/session safety, loyalty read visibility, migration evidence, API contract truthfulness, formatting coverage, and SMS payload validation.

### Modified Capabilities

## Impact

- `src/modules/auth/*` and `src/common/auth/*` session, refresh, and device-attestation flows
- `src/modules/loyalty/*` read models for customer transactions and scoped approvals
- `src/jobs/*` SMS payload rendering and outbox recovery behavior
- `docs/api/openapi.json`, `docs/database/migration-tracker.md`, and nested repo docs/artifacts
- `package.json` format and check scripts, plus the OpenSpec change artifacts in `openspec/changes/repo-review-33/`
