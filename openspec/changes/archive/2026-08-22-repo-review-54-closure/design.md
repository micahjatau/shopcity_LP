## Context

`docs/repo_review_54.md` is a navigation-closure review. The branch is no longer missing the shell concept; it is missing faithful completion of the shell, route registry, and role-workspace split.

## Goals

- Make the navigation registry truthful.
- Finish the Admin and Cashier workspace decomposition.
- Make collapse/mobile behavior real and accessible.
- Ensure normal cashier login can support device-bound Offline Earn.
- Restore regression coverage and evidence.

## Non-Goals

- No backend authorization redesign.
- No ledger or financial policy changes.
- No replacement of the generated API contract with hand-written mirrors.

## Design

### 1. Route truth

The canonical navigation registry must only point at existing pages. Admin quick actions may remain smaller than the full registry, but they must not drift into a separate route model.

### 2. Workspace extraction

Shared workspaces should encapsulate the common UI and data loading, while role pages only provide permission/capability wrappers.

### 3. Shell mechanics

Collapsed means a real rail. Mobile means a modal drawer with focus containment and background isolation. The topbar should stay compact.

### 4. Device-bound login

The cashier login path must carry a usable device identity into session/bootstrap state so Offline Earn can build a valid session/device contract through the normal UI.

### 5. Evidence

Every navigation target must have route coverage. The shell should also prove the actual sidebar href list, the login navigation regression, and the shell states through explicit route and visual coverage. The login navigation regression must prove the button routes rather than bypassing it.

## Risks

- Extracting workspaces may reveal route-specific assumptions that need explicit capability props.
- Tightening shell focus behavior may require refinement for keyboard and screen-reader flows.
- Device-binding changes may require fixture updates in e2e tests.

## Validation

- Build and lint the affected frontend surfaces.
- Run targeted route, shell, and login tests.
- Capture visual baselines for the major shell states.
- Confirm OpenSpec and deployment evidence match the implemented branch state.
