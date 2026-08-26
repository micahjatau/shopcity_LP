## Overview

This change introduces a role-aware frontend shell and dedicated workflow routing for ShopCity. The approved design direction is to move away from a header-dense, page-local navigation model toward a registry-driven shell with role-prefixed workflow routes.

## Goals

- make navigation truthfully reflect role and capability;
- separate cashier Earn/Redeem into dedicated routes;
- keep the cashier shell transaction-first with sync state, branch/device context, and quick links to Earn and Redeem;
- keep supervisor/admin workflow reuse component-based rather than page-based;
- support desktop sidebar, tablet rail, and mobile drawer patterns;
- preserve backend authority for authorization and financial truth.

## Proposed Shape

- `navigation registry` as the single source of truth for route metadata and visibility;
- `AppShell` as the composition point for sidebar, topbar, persistent cashier context, and mobile drawer;
- shared workflow components for cross-role capability reuse;
- identifier-based cross-route handoff with backend rehydration before financial actions.

## Constraints

- do not change backend permissions;
- do not trust client-provided balances or approvals;
- keep the generated API client as the contract boundary;
- preserve accessible focus handling for drawer/rail interactions.
