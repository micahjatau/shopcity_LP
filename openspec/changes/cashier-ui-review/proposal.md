## Why

The cashier surfaces are correct but too heavy: `/cashier` still reads like a dashboard, the lookup/earn/redeem pages bury the primary action beneath repeated context, and the sync queue/topbar consume too much vertical space. This change tightens those surfaces so a cashier can scan, act, and sync without wading through admin-style chrome.

## What Changes

- Reduce `/cashier` to a compact operational launcher with one dominant next action and minimal supporting context.
- Rework lookup, earn, and redeem pages into focused task screens with the primary interaction at the top.
- Trim the sync queue into a queue-first page with one primary action and clear record state.
- Compact cashier header and context rendering so branch, device, session, and sync status remain visible without dominating the workflow.
- Keep the existing route split and backend contracts; no new financial behavior or auth rules.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `frontend-shell-routing`: cashier shell requirements now constrain information density and remove duplicated navigation and launcher chrome from cashier content surfaces.

## Impact

Affected code is concentrated in the web cashier surfaces, shell header, and related tests and evidence:

- `apps/web/app/(shell)/cashier/**`
- `apps/web/components/workflows/**`
- `apps/web/components/app-topbar.tsx`
- `apps/web/components/app-shell.tsx`
- `apps/web/tests/**`
- `openspec/changes/cashier-ui-review/**`
