# Design: Supervisor flagged-activity review

## Goal

Turn the Supervisor fraud workspace into a calm, useful review queue for store owners. It should explain the activity without implying that a person acted improperly, make the next human step clear, and keep operational decisions authoritative on the server.

## Audience and interaction model

- Primary audience: store owners and Supervisors reviewing activity in their authorized branch.
- Primary job: triage activity, understand the system response, then acknowledge or resolve it with a reason.
- Primary question: “What happened, what did ShopCity do, and what should I check?”
- Visual direction: restrained operational UI; neutral surfaces, clear hierarchy, small summary strip, legible grouped results, and one focused case dialog. Avoid alarmist red styling except for existing global destructive/error affordances.

## Supervisor presentation

- Rename the page to **Flagged activity** and use non-accusatory framing. Use categories (Transactions, Staff activity, Account security, Other), human-readable titles, concise explanations, priority labels, and review-status labels.
- Provide one compact toolbar for category, review status, priority, branch, and refresh. Keep the existing accessible popover behavior; show choices only when a menu opens.
- Provide three concise branch-scoped summaries: need review (`OPEN`), high priority (`HIGH`), and under review (`ACKNOWLEDGED`). These are scope totals, not totals narrowed by the visible client-side filters.
- Group results by human category. Each row/card identifies the activity, who/what it involves using available display data, priority, review status, branch, amount when available, and a short “ShopCity did” sentence.
- Open a case dialog with four plain-language sections: Case summary, Key details, What ShopCity did, and Suggested review. Keep evidence allowlisted and translated to readable labels; never dump the full evidence object or API response.
- Put the technical rule code and full case identifier under a collapsed Technical reference section, with a copy action. Keep identifiers out of the default table, dialog summary, and accessibility name.
- After a successful decision response, update from the server result, close the dialog, refresh the list, and announce the resulting status. Never report success before the server accepts the decision.

## Display mapping

| Runtime rule                                               | Category         | Human title                            | Priority label                         | System-action wording                                       |
| ---------------------------------------------------------- | ---------------- | -------------------------------------- | -------------------------------------- | ----------------------------------------------------------- |
| `FR-DUP-001`                                               | Transactions     | Receipt entered more than once         | High priority                          | Additional credit was not issued; the attempt was recorded. |
| `FR-HV-001`                                                | Transactions     | Purchase above the review threshold    | Needs attention                        | The purchase was accepted and flagged for review.           |
| `FR-HV-002`                                                | Transactions     | High-value purchase awaiting approval  | High priority                          | New loyalty credit is held until approval.                  |
| `FR-HV-003` / legacy `FR-RED-001`                          | Transactions     | Large redemption needing approval      | High priority                          | The redemption is awaiting Supervisor approval.             |
| `FR-CARD-001`                                              | Transactions     | Frequent use of one card               | Needs attention                        | Activity was allowed and the pattern was flagged.           |
| `FR-CASH-001`, `FR-ROUND-001`, `FR-REV-001`, `FR-REPL-001` | Staff activity   | Activity pattern needs a closer look   | Needs attention / Monitor per severity | Existing activity was recorded; the pattern was flagged.    |
| `FR-AUTH-001`                                              | Account security | Repeated unsuccessful sign-in attempts | High priority                          | The failed sign-in attempts were rejected.                  |
| Unrecognized rules                                         | Other            | Activity needs a closer look           | Derived from severity                  | No additional system action is inferred.                    |

The title/explanation and priority are display-only mappings. They must not change rule evaluation, severity, status, financial effects, or access control. Only describe actions supported by the existing rule contract; use cautious fallback copy for unknown codes.

## Read-model additions

- Enrich list items with branch name, customer full name, cashier account username, receipt number, and a safely representable integer-kobo amount when those related records exist.
- Add scope-level counts for total open, high-severity, and acknowledged flags. Count from all records in the resolved tenant/branch scope, independent of list filters and pagination.
- Resolve related names with tenant-scoped queries using IDs from the already-authorized list results. Do not broaden Supervisor scope.
- Do not add staff profile fields, change write models, migrate persisted flags, or change the decision endpoint.
- Keep the raw API model backward-compatible by adding response properties only; continue returning existing IDs to API consumers, but do not render them by default in the Supervisor UI.

## Rule-code reconciliation

Use `FR-HV-003` as the canonical redemption rule code because it is the code currently emitted and persisted by runtime paths. Treat `FR-RED-001` as a legacy documentation alias accepted by the Supervisor presentation. Correct the TRD wording; do not rewrite historical rows, dedupe keys, or runtime behavior as part of this presentation change.

## Compatibility

- The redesigned surface is isolated to `presentation="supervisor"`; Admin keeps its existing presentation, fields, filters, response details, and decisions.
- Keep the current fraud list and decision endpoints, branch/tenant authorization, CSRF behavior, idempotency key, and reason requirement.
- No database schema, fraud-policy, ledger, approval, or SMS changes are in scope.

## Verification

- Extend focused backend tests for tenant/branch-scoped read enrichment and all-scope summary counts.
- Extend focused web tests for non-accusatory labels, category/status/priority/branch filters, summary counts, allowlisted evidence, hidden technical IDs, decision success/error behavior, and Admin regression.
- Run web/server focused tests, format/lint/typecheck/build as relevant, regenerate OpenAPI/client artifacts, validate OpenSpec, and inspect the final diff. Browser visual review remains contingent on the configured browser being available.
