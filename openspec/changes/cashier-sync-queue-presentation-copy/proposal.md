# Cashier Sync Queue presentation and copy

## Why

The `/cashier/sync` page exposes raw local queue state names and uses copy that can suggest a narrower sync batch than the existing implementation actually submits. Improve operator comprehension without changing the queue's behavior.

## Scope

Refine visible copy and presentation on the cashier Sync Queue only. Keep the existing ShopCity design system, route information architecture, queue table, filters, status summaries, selected-record details, results, and expandable technical diagnostics. Use plain state labels in presentation while retaining exact internal state values for filters and behavior. Clarify which records are submitted and that confirmation is the boundary for treating a record as synced. Replace em-dash placeholders with neutral text.

## Non-goals and invariants

- No API endpoint/call, generated contract, auth/RBAC, device association, browser persistence, state transition, retry, idempotency, approval, reconciliation, ledger, money, or navigation changes.
- No new theme or marketing/hero/bento/photo patterns, new metrics, animation, fake precision, screenshot-baseline update, or HTML/React parity claim.
- Keep technical diagnostics available behind existing disclosures.

## Acceptance criteria

1. Visible copy identifies locally saved records, accurately describes inclusion of waiting, saved-on-device, and retry-required records, and does not imply every submitted record is confirmed.
2. Visible state labels are human-readable; underlying state/filter values and behavior remain unchanged. No em dash appears in rendered Sync Queue copy.
3. Existing table/details/diagnostic information remains available and usable at narrow viewport widths with accessible labels.
4. Focused tests cover copy, state presentation, responsive layout and accessibility-relevant labeling.
5. Strict OpenSpec validation, focused web tests, affected Playwright tests, web lint, typecheck, and build are run when safe.
