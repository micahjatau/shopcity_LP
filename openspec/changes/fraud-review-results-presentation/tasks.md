## 1. Specify the Supervisor review redesign

- [x] 1.1 Record the non-accusatory review goal, UI mappings, compatibility boundaries, read-model additions, and verification plan.
- [x] 1.2 Record proposal-time GitNexus impact and rule-code canonicalization.

## 2. Enrich the read-only list response

- [x] 2.1 Add tenant/branch-scoped summary counts for open, high-severity, and acknowledged flags.
- [x] 2.2 Add related branch/customer/cashier/receipt display context and safely representable integer-kobo amount to list items.
- [x] 2.3 Update response schema/OpenAPI artifacts and add service tests for scope, enrichment, and counts.

## 3. Implement Supervisor flagged-activity UI

- [x] 3.1 Isolate the existing Admin component path and implement the Supervisor-only neutral title, categories, readable rule mappings, labels, and grouped results.
- [x] 3.2 Add category/status/priority/branch filters and scope summary counts; preserve accessible popover keyboard behavior.
- [x] 3.3 Redesign the case dialog with the four review questions, allowlisted evidence, suggested steps, and collapsed technical references.
- [x] 3.4 Handle successful/failed decisions truthfully; refresh authoritative state and announce successful status changes.
- [x] 3.5 Add focused accessibility, responsiveness, mapping, filtering, summary, decision, and Admin-regression tests.

## 4. Reconcile terminology and verify

- [x] 4.1 Align the TRD redemption rule code with runtime `FR-HV-003`, documenting `FR-RED-001` as a legacy display alias.
- [x] 4.2 Regenerate OpenAPI/client artifacts and run focused server/web tests, lint/format/typecheck/build, and strict OpenSpec validation.
- [x] 4.3 Review the feature diff and run GitNexus `impact`/`detect_changes`. The service symbol impact is LOW; whole-worktree detection reports 54 files, 178 symbols, 33 processes, and CRITICAL aggregate risk because unrelated changes are also present. Do not commit the broad worktree as one change.
- [ ] 4.4 Complete browser visual review after Chromium is restored; current Playwright attempt is blocked because the configured executable is missing.
