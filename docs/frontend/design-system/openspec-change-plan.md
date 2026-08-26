# OpenSpec Change Plan — Frontend Design System Implementation

## Intent summary

Create an OpenSpec change that turns the approved ShopCity frontend design-system documents into an implementation-ready frontend scope for `apps/web`, without changing backend financial authority or inventing UI behavior outside the generated OpenAPI contract.

## Source inputs

- `docs/frontend/design-system/README.md`
- `docs/frontend/design-system/01-brand-and-foundations.md`
- `docs/frontend/design-system/02-accessibility-and-interaction.md`
- `docs/frontend/design-system/03-components-and-patterns.md`
- `docs/frontend/design-system/04-workflows-and-application-shells.md`
- `docs/frontend/design-system/05-engineering-and-governance.md`
- `docs/frontend/design-system/06-api-screen-mapping.md`
- `docs/frontend/design-system/tokens.json`

## Change id

`frontend-design-system-implementation`

## Proposal scope

The change should cover:

1. frontend application foundation under `apps/web`;
2. token generation from `tokens.json` into runtime CSS/Tailwind-ready variables;
3. accessible primitive components;
4. ShopCity product components for money, status, identity, tables, alerts, offline/sync and audit surfaces;
5. workflow components for cashier, supervisor and admin experiences;
6. generated OpenAPI client consumption and frontend API adapter rules;
7. role-shaped app shells and critical routes;
8. Storybook, accessibility, interaction, E2E and visual-regression gates.

## Non-goals

- Do not modify backend financial rules unless an explicit API gap is found and approved.
- Do not add GraphQL, microservices or a second financial authority.
- Do not create an incomplete dark mode.
- Do not hand-maintain frontend response types that duplicate generated OpenAPI types.
- Do not use brand red as the default working canvas or as the only danger signal.

## Required OpenSpec artifacts

- `openspec/changes/frontend-design-system-implementation/proposal.md`
- `openspec/changes/frontend-design-system-implementation/design.md`
- `openspec/changes/frontend-design-system-implementation/tasks.md`
- Delta specs:
  - `frontend-foundation`
  - `frontend-accessibility-interaction`
  - `frontend-workflows-shells`
  - `frontend-contract-integration`
  - `frontend-quality-governance`

## Proposal-time impact note

The planned work is primarily a new frontend implementation surface because `apps/web` currently only contains `public/brand/.gitkeep`. A GitNexus proposal-impact command was run against the frontend design-system baseline; no concrete indexed application symbol result was emitted for the documentation-only target. The proposal should record this as an unindexed/new-surface risk and require fresh impact analysis before any later edits to existing backend symbols.

## Acceptance checks for the OpenSpec proposal

- Proposal names the design-system documents as source of truth.
- Specs use Given/When/Then scenarios.
- Tasks remain implementation-oriented and verifiable.
- Verification includes `npm run openspec:validate`, frontend typecheck/lint/tests once frontend scripts exist, Storybook/axe/Playwright/visual regression, OpenAPI export/client generation checks and design-token drift checks.
- Any backend contract gap is documented and coordinated before frontend code invents business behavior.

## Open questions / TODO

- TODO: Confirm the exact frontend framework branch policy before implementation starts; the design-system docs recommend Next.js on `frontend-development`.
- TODO: Decide whether shared packages (`packages/ui`, `packages/design-tokens`, `packages/api-client`) are created immediately or after `apps/web` stabilizes.
- TODO: Confirm which visual-regression tool will be used for the first component baseline.

## Next step

Review the generated OpenSpec change artifacts. If the scope is right, implementation can proceed from `openspec/changes/frontend-design-system-implementation/tasks.md` after `npm run openspec:validate` passes.
