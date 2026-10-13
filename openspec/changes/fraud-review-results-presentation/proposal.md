# Change: Supervisor flagged-activity review

## Why

Supervisors need an approachable way to understand unusual activity without accusing staff or customers. The current table surfaces backend rule codes, IDs, and raw evidence without explaining the event, the system response, or a useful next review step.

## What Changes

- Redesign only the Supervisor route as **Flagged activity**, with human categories/titles, cautious explanations, priority and status labels, concise scope counts, category/status/priority/branch filters, and grouped responsive results.
- Enrich the fraud list read model with tenant/branch-scoped display context and branch-level counts; this is additive and read-only.
- Replace the Supervisor case dialog's raw response dump with a four-part review: case summary, key details, what ShopCity did, and suggested review. Keep technical rule codes and full identifiers collapsed and copyable.
- Preserve decision endpoint, authorization, CSRF/idempotency protection, decision reason, and backend-authoritative status changes. Keep Admin presentation and behavior unchanged.
- Reconcile the redemption rule documentation to runtime/persisted `FR-HV-003`; accept `FR-RED-001` as a display compatibility alias. No persisted records or rule behavior change.

## Capabilities

### Modified Capabilities

- `fraud-review-results`: Keep the existing Admin results contract while adding the human-centered Supervisor review requirements.

## Impact

- Supervisor Fraud route and Supervisor-only presentation in `apps/web/components/workflows/fraud-flags-panel.tsx` / `apps/web/styles/supervisor-routes.css`
- Read-only enrichment and summary in `src/modules/fraud/fraud-review.service.ts`, its tests, and the list response schema/OpenAPI artifacts
- Focused web/API tests, TRD wording, GitNexus impact tracker, and this OpenSpec change
- No schema migration, fraud-rule evaluation, decision write path, Admin experience, ledger, or SMS changes
