## Context

Sprint 4 is the offline/fraud/reporting phase of the ShopCity backend. The repo already has canonical earn and redemption behavior, immutable financial history, transactional outbox processing, SMS delivery, and audit trails. This change must extend those systems without introducing a second financial write path.

## Goals / Non-Goals

**Goals:**

- Support offline earn-only synchronization with per-record conflict handling.
- Reuse the canonical financial execution path for offline and online earns.
- Persist fraud evidence separately from financial authority.
- Define rebuildable reporting metrics and derived read models.
- Provide controlled CSV exports and admin-triggered refresh.

**Non-Goals:**

- Offline redemption, offline approvals, offline card replacement, or offline manual adjustment.
- Editing confirmed ledger history to satisfy reporting needs.
- ML-based fraud detection or data-warehouse infrastructure.
- XLSX/PDF export formats in Sprint 4.

## Decisions

- Use the existing earn execution boundary for both online and offline sources. Offline data changes how the request arrives, not how money is created.
- Treat offline sync payloads as evidence that must be revalidated server-side for cashier, device, branch, week, and card state.
- Keep fraud as operational evidence and dashboard state, not a mutation path for financial history.
- Materialize reporting into derived tables that can be rebuilt safely and deterministically.
- Keep exports CSV-only and enforce masking, rate limits, and audit logging.

## Risks / Trade-offs

- Offline sync is sensitive to concurrency and replay behavior, so the first gate must be the offline conflict suite.
- Fraud evaluation is asynchronous and must not block successful financial commits.
- Reporting materialization can drift if source-vs-read-model reconciliation is not tested continuously.
- CSV exports are operationally useful but increase the risk of accidental data exposure, so RBAC and masking must be strict.

## Migration Plan

1. Add the offline sync, fraud, and reporting spec artifacts.
2. Implement offline sync and confirm canonical earn reuse.
3. Add fraud evidence storage, rules, and background evaluation.
4. Define reporting metrics and materialized read models.
5. Add report APIs, refresh, and export flows.
6. Wire OpenAPI, client generation, Bruno journeys, and integration/concurrency suites.
