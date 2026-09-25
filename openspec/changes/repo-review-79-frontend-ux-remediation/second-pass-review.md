# Independent second-pass review

**Reviewer:** delegated read-only `reviewer` subagent, fresh context<br>
**Scope:** `docs/repo_review_79.md` versus the initial proposal, design, spec and task artifacts
**Initial verdict:** Needs revision before implementation.

## Findings and resolution

1. **Search width was subjective.** Initial artifacts required “usable” or “minimum usable” width but did not define numeric thresholds. **Resolved:** proposal/design/tasks/spec now specify minimum rendered input widths of 180 CSS px at 1440px/920px and 120 CSS px at 390px/375px. The authoritative HTML must be checked before implementation; any larger reference-derived requirement takes precedence. The fallback and actual measured dimensions must be documented in the composition audit.
2. **Composition audit lacked a durable evidence location/schema.** **Resolved:** proposal/design/spec/tasks now require `docs/frontend/repo-review-79-composition-audit.md`, with route, reference-or-derived status, role/state/viewport, composition dimensions, deviations and unresolved mismatches.
3. **Final finding disposition lacked a named handoff artifact.** **Resolved:** tasks require publishing all ten finding dispositions with test/capture references, unavailable or blocked comparisons and residual risks in change evidence/handoff. The final implementation evidence path should be named when implementation begins; this planning proposal does not claim that evidence exists yet.

## Finding traceability

| #   | Review finding                                                 | Covered by                                                                                                                  |
| --- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 1   | Mobile minimum usable width and fallback                       | Proposal criteria 5; design §A; spec stable geometry; tasks 2.3, 2.8. Numeric minima now set; validate against source HTML. |
| 2   | Admin/Supervisor featured-card boolean condition               | Proposal criterion 6; spec role landing cards; tasks 3.1–3.2.                                                               |
| 3   | Desktop search width coupled to category pill                  | Proposal criterion 5; design §A; tasks 2.2, 2.8. Input minimum independently measured.                                      |
| 4   | Raw/untruthful connectivity labels                             | Proposal criteria 11; design §E; spec connectivity labels; tasks 3.3–3.4.                                                   |
| 5   | Stale response on clear/category/ineligible/close              | Proposal criterion 4; design §A; spec request invalidation; tasks 2.6–2.7.                                                  |
| 6   | Search action appears/disappears between categories            | Proposal criterion 1; design §A; spec stable geometry; tasks 2.1–2.2, 2.7. Exact-card verification remains explicit.        |
| 7   | Empty dropdown and no outside-click dismissal                  | Proposal criteria 2–3; design §A; spec meaningful/dismissible results; tasks 2.4–2.7.                                       |
| 8   | Page-level DOM composition and presentation audit              | Proposal criterion 7; design §B; spec composition; tasks 4.1–4.4. Durable artifact now named.                               |
| 9   | Sync Queue copy, action, duplication and diagnostics hierarchy | Proposal criterion 8; design §C; spec Sync Queue scenario; tasks 5.1–5.6.                                                   |
| 10  | Transactions scope, Earn/Redeem terms and detail hierarchy     | Proposal criterion 9; design §D; spec Transactions scenario; tasks 6.1–6.4.                                                 |

## Cross-cutting checks

- Search interaction contract: stable categories/action, exact-card verification, no empty dropdown, meaningful status/results, outside click, Escape/focus, selection, clear/category/close invalidation and responsive width are included.
- Sync Queue: status/header actions, single device/count, cashier-facing copy, subordinate details/expandable diagnostics, and unchanged retry/reconciliation behavior are included.
- Transactions: bounded scope, purchase/Earn plus redemption, and transaction-first detail hierarchy are included.
- Visual evidence: same route/role/state/browser/viewport HTML-versus-React pairs required; React-only snapshots are not parity proof; no silent screenshot rebaseline.
- Preservation: auth/RBAC, verification, kobo-safe money, idempotency, offline Earn, no offline redemption and reconciliation remain protected.

## Residual risks and status

This is a planning proposal, not implementation or visual evidence. The findings refer to reviewed commit `d77a2dbc8223`; current source must be checked before fixes. Numeric input minima are explicit derived acceptance thresholds and remain subject to increase if approved source HTML requires more. Paired authenticated visual comparisons may remain unavailable and must be reported as blocked rather than passed. Final implementation dispositions and test/capture references remain to be produced in the implementation handoff.

**Revised verdict:** Coverage gaps identified in the independent second pass are incorporated into the proposal artifacts. Proposal is ready for implementation planning, conditional on current-source and HTML-reference confirmation of the numeric width thresholds.
