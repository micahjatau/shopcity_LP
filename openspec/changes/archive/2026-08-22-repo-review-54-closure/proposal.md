## Why

`docs/repo_review_54.md` shows the current branch is architecturally better than before, but the sidebar/workspace refactor stopped halfway. The shell now has the right direction, yet several acceptance criteria are still false in practice:

- Admin navigation exposes routes that do not exist.
- Shared workspaces still reuse page files across roles.
- The sidebar collapse state is cosmetic instead of a real rail.
- The mobile drawer is not a complete modal interaction.
- Admin homepage shortcuts duplicate the canonical navigation registry.
- Cashier pages still render oversized shared megascreens.
- Normal POS login does not reliably produce a device-bound session for Offline Earn.
- The login regression test no longer proves the Sign in button routes correctly.
- OpenSpec / CI / deployment evidence is still noisy.

This change closes those gaps using the specific fixes called out in the review, without changing ledger authority or backend product rules.

## What Changes

- Add the missing Admin routes: Transactions, Customers, Approvals, and Fraud.
- Extract real shared workspaces for Customer, Card, Transaction, Approval, and Fraud flows.
- Remove page-level role reuse and pathname-based capability inference.
- Make `shellNavigationByRole` the only source of truth for app navigation.
- Keep Admin homepage cards as deliberate quick actions or derive them from the canonical registry.
- Split the cashier megascreen into focused Lookup / Earn / Redeem route compositions.
- Remove duplicated primary navigation from cashier and admin home surfaces.
- Implement a real collapsed rail with icons, reduced width, and accessible labels/tooltips.
- Make tablet use the rail state instead of a pseudo-expanded sidebar.
- Add a proper mobile drawer focus trap, inert background behavior, and a shell skip link.
- Reduce the topbar to compact operational context.
- Surface the actual device identity in shell/session context and finish device-attested cashier login.
- Restore the login E2E assertion that the Sign in button performs the navigation.
- Add a route-resolution test that iterates every sidebar href and proves it resolves.
- Add visual-regression coverage for expanded sidebar, collapsed rail, tablet rail, and mobile drawer states.
- Reconcile OpenSpec tracking and deployment evidence with the implemented state.

## In Scope

1. **Navigation truthfulness**
   - Missing Admin destinations must exist before the sidebar can link to them.
   - Every sidebar entry should resolve to a real page.
   - The dashboard must not maintain a second, divergent route registry.

2. **Shared workflow extraction**
   - Reuse should come from shared workspaces/components, not cross-role page imports.
   - Capability differences should be explicit, not inferred from the pathname.

3. **Shell and accessibility**
   - Collapsed sidebar must be a real rail, not hidden labels on the same width.
   - Tablet and mobile behavior must match the intended shell layout.
   - Drawer focus management must be keyboard-safe.

4. **Cashier workflow completion**
   - Lookup, Earn, and Redeem should become focused route compositions.
   - Cashier home should stop duplicating primary navigation.
   - Device-bound login must support Offline Earn through the real UI path.

5. **Quality and evidence**
   - Restore the navigation regression test.
   - Add coverage for route resolution and shell states.
   - Keep OpenSpec and deployment evidence aligned with the actual branch.

## Non-goals

- No new backend feature set beyond what the UI needs to consume.
- No GraphQL or alternate shell architecture.
- No redeclaration of balances, roles, or approvals in the frontend trust boundary.
- No reintroduction of page-local navigation grids once the shell owns routing.

## Design Decisions

### 1. Canonical navigation registry

`shellNavigationByRole` remains the single route source of truth. Missing Admin workspaces are added to the registry only after their pages exist, and homepage shortcuts are treated as a smaller quick-action surface rather than a separate routing model.

### 2. Shared workspaces, explicit capabilities

Customer, Card, Transaction, Approval, and Fraud UI should be built from shared workspaces/components. Role-specific pages should wrap those workspaces with explicit permissions instead of importing another role’s page or inferring behavior from the URL.

### 3. Real shell collapse behavior

Collapsed sidebar means a true icon rail with reduced width and accessible labels. Tablet should default to the same rail pattern. Mobile must behave like a modal drawer with focus containment and inert background state.

### 4. Truthful device-bound cashier login

Offline Earn depends on a real device-attested cashier session. The login flow and session/bootstrap path must surface and reuse the authenticated device identity instead of falling back to a browser-local placeholder or null device state.

### 5. Honest evidence

A route that appears in navigation must resolve in tests. Visual baselines must cover expanded, collapsed, tablet, and mobile states. OpenSpec and deployment notes should reflect the same implementation state that the branch actually ships.

## Rollout Strategy

1. Add the missing Admin routes and align the canonical registry.
2. Extract shared workspaces and remove page-level reuse.
3. Finish the real sidebar rail, tablet, and mobile behavior.
4. Split cashier home into focused workflows and wire device-bound login.
5. Restore regression coverage and add route/visual evidence.
6. Reconcile the review tracker and deployment evidence.

## Verification Strategy

- Route-resolution tests for every sidebar href.
- Role-shell tests proving Admin and Supervisor no longer rely on missing pages or cross-role page imports.
- Accessibility tests for collapsed rail, tablet rail, and mobile drawer focus behavior.
- Cashier route tests proving Lookup / Earn / Redeem render focused workspaces.
- Login regression test proving Sign in performs the expected navigation.
- Live-device login test proving Offline Earn can proceed from the real UI path.
- Visual-regression snapshots for expanded, collapsed, tablet, and mobile shell states.
- OpenSpec and deployment evidence review before closure.
