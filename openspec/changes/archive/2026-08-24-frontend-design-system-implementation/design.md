## Overview

This change implements the approved ShopCity frontend design system as a contract-backed web frontend. The frontend is an operational retail application: cashier flows prioritize speed and certainty, supervisor/admin flows prioritize queue management, auditability and reporting, and all financial behavior remains server-authoritative.

The design-system documents are the source of truth for UI behavior:

- `README.md`: design principles, component layers and done criteria.
- `01-brand-and-foundations.md`: brand assets, tokens, typography, money, spacing, layout, iconography and motion.
- `02-accessibility-and-interaction.md`: WCAG 2.2 AA, forms, search, async, offline, errors, destructive actions, security, scanner and print behavior.
- `03-components-and-patterns.md`: primitives, product components, workflow components, tables, dashboards, alerts, dialogs, audit and operations panels.
- `04-workflows-and-application-shells.md`: cashier/supervisor/admin IA and workflow state requirements.
- `05-engineering-and-governance.md`: repository layout, stack, OpenAPI, query policy, offline storage, Storybook, tests, visual regression and governance.
- `06-api-screen-mapping.md`: domain-to-screen-to-component mapping.
- `tokens.json`: v1 token seed.

## Architecture

### Frontend layout

Target layout follows the design-system recommendation while allowing a smaller first implementation:

```text
apps/web/
  app/
  components/
    ui/
    shopcity/
    workflows/
  features/
    auth/
    customers/
    cards/
    earn/
    redemption/
    approvals/
    offline/
    fraud/
    reports/
    operations/
  lib/
    api/
    auth/
    money/
    time/
    accessibility/
  styles/
  public/brand/
```

Shared package extraction to `packages/ui`, `packages/design-tokens` and `packages/api-client` is optional for the first pass, but public boundaries must not block later extraction.

### Token pipeline

`docs/frontend/design-system/tokens.json` remains the seed. Implementation generates semantic CSS custom properties and framework theme mappings from the seed. Product components consume semantic/component tokens instead of raw color/spacing values.

Required semantic mappings include canvas, surface, surface subtle, primary/secondary/disabled text, borders, primary action, primary hover and focus. Brand red is reserved for navigation, brand moments and primary actions; semantic success/warning/danger/info palettes remain distinct.

### API integration

The backend contract is authoritative:

```text
Nest Swagger decorators
  → npm run openapi:export
  → docs/api/openapi.json
  → npm run client:generate
  → frontend API adapter
  → feature hooks/components
```

Generated client files are never edited by hand. The frontend API adapter centralizes credentials, CSRF/session behavior, error mapping, cache invalidation and idempotency-key preservation. Frontend code does not calculate financial truth beyond presentation formatting of integer kobo.

### State model

- TanStack Query manages server state with explicit staleness per domain.
- React-local state handles transient UI behavior.
- A small client store is allowed only for cross-cutting browser concerns such as connectivity, scanner routing, queue metadata and safe UI preferences.
- Offline financial records use IndexedDB, not localStorage, and retain idempotency and reconciliation context until terminal server outcome.

## Component strategy

### Layer 1 — accessible primitives

Build/own primitives for Button, Input, Textarea, Checkbox, RadioGroup, Select, Combobox, Dialog, Sheet, Popover, DropdownMenu, Tooltip, Tabs, Accordion, Badge, Progress, Skeleton, Separator, Alert, Toast, Table and Pagination.

Primitive APIs use `variant`, `size`, `loading`, `disabled`, forwarded refs and accessible labelling. They do not include domain-specific props.

### Layer 2 — ShopCity product components

Build domain components for Money, MoneyInput, status badges, loyalty balance, identity blocks, branch/device/role badges, metric cards, filters, data tables, empty/error states, offline/sync/connection indicators, page/detail headers and audit timelines.

Money components accept integer kobo, display formatted naira and preserve tabular numerals. Status components map backend states to explicit text, icon and semantic color.

### Layer 3 — workflow components

Build workflow components for lookup, earn, redeem, approvals, offline queue/sync result, card replacement, fraud review, adjustments/reversals, report filters/tables/export and pilot health.

Workflow components may contain domain sequencing but must read business outcomes from API responses rather than reimplementing backend rules.

### Layer 4 — role shells

Cashier, supervisor and admin shells share foundations but differ in density and IA:

- Cashier: Home, Earn, Redeem, Customers, Sync.
- Supervisor: Overview, Transactions, Customers, Cards, Approvals, Fraud, Reports.
- Admin: Overview, Transactions, Customers, Cards, Approvals, Fraud, Reports, Operations, Audit, Users & Devices, Settings.

## Interaction and accessibility

- All shared interactive components meet WCAG 2.2 AA baseline.
- Focus is visible, not obscured and restored after dialogs.
- Primary transaction controls are 44–48px minimum where appropriate.
- Forms use persistent labels, hints, field errors and error summaries.
- Combobox/search follows WAI-ARIA APG and supports scanner-safe lookup modes.
- Async financial submits represent ready, processing, confirmed, awaiting approval, domain failure and uncertain/offline outcome.
- Offline state is persistent and queue-linked when unsynced records exist.
- Consequential level-3 actions show actor, branch/device, target, amount, reason and unambiguous action copy.
- Print views hide navigation/actions and preserve transaction-safe references.

## Workflow notes

### Earn

Identify customer/card, verify active state, enter/scan receipt, enter purchase amount, review expected credit, submit with one idempotency key, then render confirmed, awaiting approval, domain failure or offline-capture outcome.

### Redeem

Identify customer/card, show balance, enter basket/requested redemption, display policy/cap context, confirm explicitly, then render confirmed, awaiting approval or rule failure. Offline redemption is not offered.

### Approvals and fraud

Queues prioritize age, amount, customer/branch context, severity/reason and next action. Detail views show request context, audit/fraud evidence and explicit approve/reject/decision controls.

### Reports and operations

Report workspace shows filters, freshness/materialization state, summaries, tables/charts, CSV export and admin refresh where authorized. Pilot health surfaces release/version, outbox, SMS, offline, fraud, report staleness and reconciliation signals.

## Data and content rules

- Backend enum values never leak directly when UX language exists.
- Phone/card identifiers are masked unless full values are required and authorized.
- Dates display in the relevant operational timezone and reports state timezone.
- UUIDs are not primary identities; they belong in technical details/copy controls.
- Financial confirmation remains on-screen and separates transaction state from SMS/communication state.

## Verification strategy

1. OpenSpec validation for planning artifacts.
2. Token generation and drift check.
3. OpenAPI export/lint/diff and generated client drift check.
4. Unit/component coverage for money parsing/formatting, status mapping, forms, local queue adapters and behavior-rich components.
5. Storybook states for default, focus, disabled, loading, error, empty, long content, narrow viewport and semantic variants.
6. axe/Storybook accessibility, `jsx-a11y`, keyboard E2E and manual screen-reader release spot checks.
7. Playwright critical workflows matching the design-system list.
8. Visual-regression baselines for critical shared surfaces.
9. Frontend production build, typecheck, lint and test gates.

## Risks and mitigations

- **Contract drift:** require generated client refresh and adapter-level mapping before UI acceptance.
- **Financial ambiguity:** keep money as integer kobo in API state and show explicit confirmation/result states.
- **Brand misuse:** enforce tokens and component variants, with no raw color proliferation.
- **Accessibility regressions:** make focus, target size, keyboard, dialog and error states acceptance requirements.
- **Offline uncertainty:** preserve idempotency keys and reconcile uncertain outcomes rather than retrying invisibly.
- **Scope expansion:** split backend/API gaps into separate proposals when they change server behavior.
