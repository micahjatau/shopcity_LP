# 05 — Engineering & Governance

## 1. Proposed frontend repository layout

The frontend lives on `frontend-development` and should be isolated from backend source files.

```text
apps/
└── web/
    ├── app/
    ├── components/
    │   ├── ui/
    │   ├── shopcity/
    │   └── workflows/
    ├── features/
    │   ├── auth/
    │   ├── customers/
    │   ├── cards/
    │   ├── earn/
    │   ├── redemption/
    │   ├── approvals/
    │   ├── offline/
    │   ├── fraud/
    │   ├── reports/
    │   └── operations/
    ├── lib/
    │   ├── api/
    │   ├── auth/
    │   ├── money/
    │   ├── time/
    │   └── accessibility/
    ├── styles/
    └── public/
        └── brand/

packages/
├── ui/
├── design-tokens/
└── api-client/
```

A smaller initial implementation may keep UI/tokens under `apps/web`, but public boundaries should make later extraction straightforward.

## 2. Recommended stack

- Next.js + TypeScript;
- Tailwind CSS using generated semantic tokens;
- owned shadcn/Radix primitives;
- TanStack Query for server state;
- TanStack Table for data-grid behavior;
- React Hook Form + Zod for form state/client validation;
- Lucide for icons;
- Storybook for component workshop;
- Playwright for E2E;
- axe integration for accessibility;
- Vitest/Jest/React Testing Library according to chosen app tooling.

## 3. API contract rule

The backend OpenAPI contract is authoritative.

Existing backend flow:

```text
Nest Swagger decorators
      ↓
npm run openapi:export
      ↓
docs/api/openapi.json
      ↓
npm run client:generate (Orval)
      ↓
generated ShopCity client
```

Frontend code should not hand-maintain duplicate response types.

Rules:

- consume generated types/functions through a small frontend API adapter;
- never edit generated client files by hand;
- contract-breaking backend changes require explicit coordination;
- generated client changes should be reviewed as API changes, not formatting noise;
- map domain error codes to the central UI error dictionary.

The checked-in `openapi.base.json` is a compatibility baseline, not the live frontend contract.

## 4. Authentication and request security

The frontend API layer must centralize authenticated requests and session lifecycle rather than scatter request policy across feature components.

Requirements:

- send credentials according to backend session semantics;
- include required anti-forgery context on protected mutations according to the backend contract;
- call `/auth/me` to establish the active session;
- handle refresh through one coordination path;
- avoid parallel refresh storms;
- clear protected server-state caches on logout/session replacement;
- handle revoked-device/session states distinctly;
- avoid duplicating secure backend session data into unnecessary browser storage.

## 5. TanStack Query policy

Queries:

- cache stable reference/master data appropriately;
- set explicit staleness based on domain volatility;
- invalidate targeted keys after mutations;
- preserve previous data during cursor transitions where useful;
- expose background refresh without blanking the screen.

Financial mutations:

- **no generic invisible mutation retries**;
- create/reuse one idempotency key for one logical operation;
- preserve uncertain outcomes and reconcile rather than assuming failure;
- do not generate a new idempotency key merely because a response was lost;
- offline earning uses the explicit ShopCity offline queue rather than a generic background retry abstraction.

## 6. Local/UI state

Use React-local state for transient component behavior. Introduce a small global client store only for truly cross-cutting browser state such as:

- connection/offline status;
- local offline-earn queue metadata;
- scanner routing;
- non-server UI preferences.

Do not mirror all server entities into a global client store.

## 7. Frontend offline storage

Offline financial records require durable browser storage, normally IndexedDB rather than localStorage.

Store only what is required to sync safely:

- local ID;
- idempotency key;
- required device/actor/branch context;
- customer/card/receipt/purchase fields required by the contract;
- occurred-at;
- sync state/last error;
- server IDs after reconciliation.

Apply the product's privacy and retention rules. Remove local records only after terminal server reconciliation and any required retention window.

## 8. Storybook

Every shared component gets stories for meaningful states:

```text
Default
Focus
Disabled
Loading
Error
Empty
Long content
Narrow viewport
Semantic variants
```

Workflow components include fixtures for confirmed, awaiting approval, offline, rejected and permission-limited states.

Storybook is the component workshop/documentation surface; it is not a second business-rule source.

## 9. Automated testing

### Unit/component

Cover money formatter/parser, status/error mapping, forms, local queue/storage adapters and behavior-rich components.

### Interaction

Cover keyboard navigation, dialog focus, combobox, table filter/pagination and confirmation flows.

### E2E

Critical paths:

1. login/session;
2. customer/card lookup;
3. earn confirmed;
4. earn awaiting approval;
5. duplicate receipt;
6. redeem confirmed;
7. insufficient balance/cap;
8. approval decision;
9. offline earn → sync outcomes;
10. fraud review;
11. CSV export/report freshness;
12. session/device revocation.

Use stable seeded/test data and contract-aware network fixtures only where a full backend integration is impractical.

## 10. Accessibility automation

- Storybook accessibility checks;
- axe in Playwright;
- `eslint-plugin-jsx-a11y`;
- keyboard E2E;
- manual screen-reader release checks.

Automated no-violation output does not replace manual accessibility/usability review.

## 11. Visual regression

Capture critical shared surfaces:

- buttons/inputs;
- status badges;
- transaction confirmation;
- approval decision;
- offline banner/queue;
- consequential dialogs;
- data table;
- report workspace;
- role shells.

Visual changes to these are reviewed intentionally.

## 12. Performance budgets

Initial rules:

- keep cashier shell and Earn/Redeem bundles lean;
- lazy-load charts/report-only libraries;
- never fetch report data from cashier routes unless needed;
- debounce server search;
- cache appropriate reference data;
- avoid unnecessary refetch on every focus event on POS;
- skeletons should not create major layout shift;
- dimension/optimize assets;
- avoid rendering thousands of table rows without measured need.

Web-vitals targets should be set after realistic staging hardware/network measurements exist.

## 13. Telemetry privacy

Frontend telemetry may include route, workflow, sanitized domain error code, release and timing. Do not collect unnecessary customer identifiers or sensitive authentication/session material. Free-text financial/support reasons require deliberate privacy review before telemetry capture.

## 14. Design-token implementation

`tokens.json` is the source seed.

Generate:

- CSS custom properties;
- Tailwind semantic theme mapping;
- optional TypeScript token types.

Example:

```css
:root {
  --sc-color-canvas: #f8f9fa;
  --sc-color-surface: #ffffff;
  --sc-color-text: #111827;
  --sc-color-action-primary: #b10000;
  --sc-color-action-primary-hover: #9f0001;
}
```

Product styles reference semantic variables rather than repeatedly hard-coding core hex values.

## 15. Contribution rules

Before adding a shared component:

1. verify no existing primitive/product component covers it;
2. classify primitive, product or workflow level;
3. define states/accessibility;
4. use semantic tokens;
5. add Storybook;
6. add behavior-appropriate tests;
7. document the public API.

Avoid uncontrolled proliferation of variants.

## 16. Versioning and deprecation

- patch: compatible visual/behavior fix;
- minor: additive token/component/variant;
- major: breaking public component/token behavior.

Deprecated APIs get a replacement path and removal target.

## 17. Governance

Design-system review is required for changes to:

- money presentation;
- financial confirmations;
- status/error mapping;
- offline behavior;
- role navigation;
- destructive-action patterns;
- core tokens;
- brand assets.

Feature work may compose existing patterns freely; changing a foundation requires explicit review.

## 18. Figma parity

Target Figma organization:

```text
Foundations
Components
Patterns
Templates
Screens
```

Figma variables mirror code semantic tokens. Code remains authoritative for runtime behavior/accessibility; Figma remains the collaborative visual design surface. Neither should silently drift.

## 19. Frontend release quality gate

Before release:

- generated API client matches backend contract;
- typecheck/lint/tests pass;
- critical Playwright workflows pass;
- accessibility scan passes with reviewed exceptions;
- visual regression reviewed;
- no unexplained raw core colors in product components;
- offline financial path tested;
- role access tested;
- production build succeeds;
- telemetry/privacy configuration reviewed.

## 20. Master-branch isolation

Frontend development is currently isolated on `frontend-development`.

Do not modify backend `master` for frontend work. Any future integration into master or a different repository is an explicit decision, not an automatic part of frontend implementation.
