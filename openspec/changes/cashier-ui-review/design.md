## Context

The cashier experience already has the right route split, but the surfaces still carry too much navigation and explanatory chrome for a POS workflow. Cashiers need one quick launcher on `/cashier`, focused task pages for lookup/earn/redeem, and a sync queue that reads as an operations page instead of a second dashboard.

This change is UI-only. It does not change financial rules, session rules, or backend contracts. The main constraint is to simplify the surfaces without making the cashier lose access to branch/device/session state that is operationally important.

## Goals / Non-Goals

**Goals:**

- Make `/cashier` a compact launcher rather than a dashboard.
- Keep lookup, earn, and redeem pages task-first.
- Make the sync queue operational and easy to scan.
- Keep cashier/session/branch/device context visible in a compact header area.
- Preserve existing route contracts and backend integrations.

**Non-Goals:**

- No backend auth, ledger, or pricing changes.
- No new cash-in/cash-out workflow.
- No redesign of supervisor/admin surfaces.
- No new design system dependency.

## Decisions

### 1. Preserve the route split, simplify the content

Keep the existing `/cashier`, `/cashier/lookup`, `/cashier/earn`, `/cashier/redeem`, and `/cashier/sync` routes. The issue is not route structure; it is density. Reworking the content in place preserves links, tests, and deep links.

Alternatives considered:

- **Merge pages into one long workflow**: rejected because it would reintroduce the megascreen the refactor removed.
- **Create a brand-new cashier shell**: rejected because the current shell already solves the routing problem.

### 2. Put the primary task first on each surface

The first visible content on the overview and workflow pages should be the user’s next job: scan, open lookup, submit earn, or submit redeem. Supporting cards and status can stay, but they must move behind the main action.

Alternatives considered:

- **Keep the current multi-card dashboard layout**: rejected because it dilutes the cashier’s main action.
- **Hide all context**: rejected because branch/device/sync state is operationally important.

### 3. Compact shared status, not repeated navigation

Branch, device, session, and sync information should be rendered once in a compact shell/header region, not repeated inside each cashier page as route grids or explanatory cards.

Alternatives considered:

- **Repeat status on every page**: rejected because it makes the surface feel busy.
- **Push status into the sidebar only**: rejected because the top-level operational context would become harder to see quickly.

### 4. Treat the sync queue as an operations page

The sync queue should prioritize queue size, batch submission, and selected-record recovery. Secondary record details can remain, but they should not dominate the page.

Alternatives considered:

- **Inline sync controls into the overview**: rejected because sync is a separate operational concern.
- **Collapse the sync queue to a modal**: rejected because queue state is too important for a transient surface.

## Risks / Trade-offs

- [Less context] → Mitigate by keeping a compact branch/device/sync summary in the shell.
- [Too much simplification] → Mitigate by preserving deep links and full record detail on the workflow pages.
- [Visual regressions] → Mitigate by updating cashier-specific visual snapshots and route tests together.
- [Selector churn in tests] → Mitigate by favoring stable headings and labels over layout-specific selectors.

## Migration Plan

1. Tighten `/cashier` into a launcher-first layout.
2. Rebalance lookup, earn, redeem, and sync pages so the primary task appears first.
3. Compact the cashier shell/header context.
4. Update Playwright and visual-regression coverage to match the new hierarchy.
5. If the new layout creates unexpected information loss, restore the previous secondary context blocks while keeping the new ordering.

## Open Questions

- Which cashier status items must remain visible in the shell header versus the page body?
- Should the overview show three explicit action cards or a smaller button group?
- Should the sync queue expose selected record details above or below the batch summary on narrow screens?
