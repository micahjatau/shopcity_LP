# Visual regression strategy

ShopCity frontend visual regression is implemented with Playwright screenshots against the `/visual-regression` gallery route in `apps/web`.

## Baseline strategy

- Snapshot the critical surfaces called out in `05-engineering-and-governance.md`:
  - primitives
  - status badges
  - transaction confirmation
  - approval decision
  - offline queue
  - dialogs
  - table
  - report workspace
  - role shells
- Keep snapshots deterministic by fixing viewport, locale, timezone, color scheme, caret and animations.
- Review visual changes intentionally; update snapshots only when the design change is approved.

## Commands

- `npm --prefix apps/web run visual:test`
- `npm --prefix apps/web run visual:update`

## Notes

The gallery route is not linked from production navigation and is marked `noindex, nofollow`.
