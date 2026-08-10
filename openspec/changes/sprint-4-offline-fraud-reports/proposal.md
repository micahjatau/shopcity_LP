## Why

Sprint 4 introduces offline earn synchronization, deterministic fraud evidence and review, rebuildable reporting read models, and controlled exports. These capabilities must extend the existing financial system without creating a second ledger path or weakening immutable financial history.

## What Changes

- Add offline earn-only synchronization that reuses the canonical earn execution path.
- Persist offline sync evidence and per-record conflict outcomes.
- Add fraud flags, deterministic fraud rules, and supervisor/admin review APIs.
- Define reporting metrics and materialized read models for executive, liability, cashier, customer, redemption, SMS, and audit views.
- Add CSV exports with RBAC, masking, audit logging, and row limits.

## Capabilities

### New Capabilities

- `offline-earn-sync`: conflict-safe offline earn batch synchronization that reuses the canonical earn engine.
- `fraud-detection`: deterministic fraud evidence generation and durable asynchronous evaluation.
- `fraud-review`: supervisor/admin fraud flag listing, detail, and decisions.
- `reporting`: rebuildable reporting definitions and materialized read models derived from authoritative financial data.
- `report-export`: controlled CSV export and refresh flows for reporting data.

### Modified Capabilities

- None.

## Impact

Expected impact includes `src/modules/offline-sync/`, `src/modules/fraud/`, `src/modules/reports/`, Prisma schema and migrations, outbox/worker runtime wiring, configuration validation, OpenAPI and generated client artifacts, Bruno journeys, reporting documentation, and offline/fraud/report integration tests.
