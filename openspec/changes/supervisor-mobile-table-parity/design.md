## Context

See `proposal.md` for motivation and `specs/supervisor-mobile-table-parity/spec.md` for observable behavior. Existing Supervisor mobile rules turn customer/card and fraud rows into label/value cards and allow the transaction table to overflow visibly. Admin mobile overrides already establish the desired contained-scroll table treatment. Desktop Supervisor styles are the reference and MUST remain unaffected.

## Goals / Non-Goals

**Goals:**

- Override only the Supervisor mobile table transformations for the four list workflows in the spec.
- Preserve table semantics, headers, row/cell styling, status controls, and local horizontal scrolling.
- Keep the existing filter and action layouts unchanged.

**Non-Goals:**

- Change API requests, data, filtering, pagination, permissions, desktop styling, or the report/device table layouts that already use contained scroll regions.
- Convert tables to another component or add dependencies.

## Decisions

- Add a final, max-767px rule block in the existing Supervisor route stylesheet. Scope selectors to `.shell-root--supervisor` and the established table wrappers so Admin and Cashier presentation is unchanged.
- Restore native table display for table, header, body, row, and cell elements; disable the mobile label pseudo-elements; retain special empty-state cell presentation.
- Match the Admin table minimum widths for the shared customer/card and transaction/fraud tables. Set overflow and overscroll containment on the existing wrappers rather than resizing columns or changing table data.
- Validate populated customer, card, transaction, and fraud tables at mobile and desktop widths in Playwright, including document overflow and table-wrapper scrolling.

Alternative considered: change the shared default responsive rules to table scrolling. Rejected because it would affect other roles and route consumers beyond this request.

## Risks / Trade-offs

- [Some table columns will require horizontal scrolling on phones] → Keep scroll local to the table wrapper and preserve the existing desktop column layout.
- [A selector may accidentally affect a non-Supervisor route] → Scope every override to the Supervisor shell and assert Admin/Cashier regressions remain unchanged.

## Migration Plan

No data or deployment migration is required. Rollback by removing the scoped mobile override block; desktop rules and route behavior remain intact.
