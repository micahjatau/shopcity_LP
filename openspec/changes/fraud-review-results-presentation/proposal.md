# Change: Fraud review results presentation

## Why

The Supervisor and Admin fraud pages render fraud flags as a stack of selectable cards, add redundant status badges and route context, and hide all results content when filters match no records. Reviewers need a consistent, scannable results workspace without changing fraud investigation or decision behavior.

## What Changes

- Apply the approvals results presentation pattern to the shared fraud panel on Supervisor and Admin: concise results heading/count, labeled table, plain-language row values, and a visible empty/loading row.
- Replace the selectable card list with table rows and accessible selection actions; show icon-only, right-aligned pagination while retaining existing five-row client-side paging.
- Simplify Supervisor and Admin fraud page headers and remove duplicate route maps/status pills around the fraud workspace.
- Keep fraud status, severity, and branch filters, detail/evidence display, decision controls, API requests, and authorization unchanged.

## Capabilities

### New Capabilities

- `fraud-review-results`: Present fraud review records as an accessible, paginated results table while preserving evidence and decision behavior.

## Impact

- `apps/web/components/workflows/fraud-flags-panel.tsx`
- Supervisor and Admin fraud route pages
- Focused web unit and route coverage
- No API, policy, authorization, or persistence changes.
