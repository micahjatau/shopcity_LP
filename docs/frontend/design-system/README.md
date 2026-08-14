# ShopCity Frontend Design System v1.0

**Status:** Approved design baseline for frontend implementation  
**Working branch:** `frontend-development`  
**Backend source of truth:** existing NestJS application and generated OpenAPI contract  
**Frontend target:** `apps/web`  
**Accessibility target:** WCAG 2.2 AA  
**Primary environments:** ShopCity POS workstations, supervisor tablets/desktops, admin desktops, mobile support

## Purpose

This design system is the product and engineering source of truth for the ShopCity Loyalty Platform frontend. It defines not only visual styling, but also business-state language, money presentation, accessibility, offline behavior, role-specific information architecture, error recovery, component APIs, security/audit UX, API integration rules, testing, performance and governance.

The system deliberately avoids a generic "red admin dashboard." ShopCity's red identity is used for brand, navigation and primary actions while high-frequency working surfaces remain light and neutral. Semantic success/warning/error states retain independent colors and icons so brand red never makes critical operational states ambiguous.

## Design principles

1. **Transaction confidence first.** A cashier must always know whether an operation was saved, pending, rejected, offline, or requires approval.
2. **Speed without ambiguity.** Optimize high-frequency cashier journeys for keyboard, scanner, mouse and touch. Never sacrifice financial clarity for fewer clicks.
3. **Progressive disclosure.** Show the minimum information needed to act; reveal audit, policy and technical details when requested.
4. **Role-shaped experiences.** Cashier, supervisor and admin shells share components but not information density.
5. **Backend contracts are authoritative.** UI states map to OpenAPI responses and domain error codes. Frontend code does not invent financial rules.
6. **Accessible by default.** Keyboard, focus, target size, screen-reader semantics, contrast and reduced motion are component requirements, not later fixes.
7. **Offline is a first-class state.** Offline earns, local persistence, synchronization and conflicts receive explicit UX rather than generic network errors.
8. **Financial actions are auditable.** Consequential actions show context, actor, branch/device, amount, reason and resulting state.
9. **Design tokens before one-off styling.** Primitive values become semantic tokens, then component tokens. Product code consumes semantic/component tokens.
10. **Evidence over assumptions.** Components live in Storybook, critical workflows in Playwright, accessibility in axe, and visual changes in screenshot regression.

## Documentation map

| Document                                                                        | Scope                                                                                                               |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| [01 — Brand & Foundations](./01-brand-and-foundations.md)                       | Brand assets, color, tokens, typography, money, spacing, elevation, motion, icons                                   |
| [02 — Accessibility & Interaction](./02-accessibility-and-interaction.md)       | WCAG 2.2 AA, keyboard/touch, forms, search, errors, async states, notifications, destructive actions, scanner/print |
| [03 — Components & Patterns](./03-components-and-patterns.md)                   | Primitive, ShopCity, workflow and data components; status language; tables; dashboards; charts                      |
| [04 — Workflows & Application Shells](./04-workflows-and-application-shells.md) | Cashier/supervisor/admin IA, earn/redeem/approval/fraud/offline flows, responsive/security/audit UX                 |
| [05 — Engineering & Governance](./05-engineering-and-governance.md)             | Repo structure, API client, state management, Storybook, tests, performance, Figma, governance                      |
| [06 — API to Screen Mapping](./06-api-screen-mapping.md)                        | Backend endpoint → role → screen → component → UX-state mapping                                                     |
| [Release readiness](./release-readiness.md)                                     | Frontend release-gate evidence and validation summary                                                               |
| [tokens.json](./tokens.json)                                                    | Machine-readable v1 token seed                                                                                      |

## Coverage of the agreed design-system scope

This specification covers all agreed areas:

- complete token architecture;
- typography and tabular numerals;
- money formatting/input rules;
- transaction-state language;
- error taxonomy and recovery;
- offline-first UX;
- loading and asynchronous states;
- destructive action risk levels;
- form architecture;
- search/lookup;
- table/data-density standards;
- date/time/timezone display;
- icon vocabulary;
- notification hierarchy;
- role-specific navigation;
- dashboard composition;
- data visualization;
- POS/tablet/mobile responsive strategy;
- keyboard/touch/scanner interaction;
- content design;
- accessibility;
- motion;
- security UX;
- audit timelines;
- performance budgets;
- component API conventions;
- repository structure;
- API/screen/component mapping;
- Storybook;
- visual regression;
- design-system governance;
- Figma/code parity;
- workflow templates;
- device/scanner behavior;
- print/receipt considerations;
- ShopCity color scheme and extracted brand assets.

## Component architecture

### Layer 1 — accessible primitives

`Button`, `Input`, `Textarea`, `Checkbox`, `RadioGroup`, `Select`, `Combobox`, `Dialog`, `Sheet`, `Popover`, `DropdownMenu`, `Tooltip`, `Tabs`, `Accordion`, `Badge`, `Progress`, `Skeleton`, `Separator`, `Toast`, `Alert`, `Table`, `Pagination`.

Use Radix/shadcn patterns where appropriate, but own the component source and ShopCity styling.

### Layer 2 — ShopCity product components

`Money`, `MoneyInput`, `StatusBadge`, `TransactionStateBadge`, `ApprovalBadge`, `FraudSeverityBadge`, `SmsStatusBadge`, `LoyaltyBalance`, `ExpiringCreditNotice`, `CustomerIdentity`, `CardIdentity`, `ReceiptIdentity`, `BranchBadge`, `DeviceStatus`, `RoleBadge`, `MetricCard`, `FilterBar`, `DateRangeFilter`, `CursorPagination`, `DataTable`, `EmptyState`, `ErrorState`, `OfflineIndicator`, `SyncQueueIndicator`, `ConnectionStatus`, `PageHeader`, `DetailHeader`, `AuditTimeline`.

### Layer 3 — workflow components

`CustomerLookup`, `CardScannerLookup`, `EarnTransactionForm`, `EarnConfirmation`, `RedeemTransactionForm`, `RedemptionPreview`, `RedemptionConfirmation`, `PendingApprovalPanel`, `ApprovalDecisionPanel`, `OfflineEarnQueue`, `OfflineSyncResult`, `CardReplacementWizard`, `FraudReviewPanel`, `AdjustmentForm`, `ReversalDialog`, `ReportFilters`, `ReportTable`, `ExportAction`, `PilotHealthPanel`.

### Layer 4 — role shells

Cashier, Supervisor and Admin shells share tokens/primitives but have different navigation and information density.

## Definition of done for a design-system component

A shared component is done when it has:

- semantic tokens only (no unexplained literal colors/spacing);
- keyboard and screen-reader behavior defined;
- touch target and focus state checked;
- loading, disabled, empty and error states where relevant;
- responsive behavior;
- Storybook stories for meaningful variants;
- automated accessibility test where interactive;
- unit/interaction coverage where behavior exists;
- visual regression for critical product components;
- clear public props and no feature-specific business logic unless it is explicitly a workflow component.

## Source references

The implementation should continue to follow primary guidance:

- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- Target size: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- Focus not obscured: https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html
- WAI-ARIA APG: https://www.w3.org/WAI/ARIA/apg/
- Radix accessibility: https://www.radix-ui.com/primitives/docs/overview/accessibility
- TanStack Query: https://tanstack.com/query/latest/docs/framework/react/
- TanStack Table: https://tanstack.com/table/latest/docs/overview
- GOV.UK error summary: https://design-system.service.gov.uk/components/error-summary/
- Storybook accessibility: https://storybook.js.org/docs/writing-tests/accessibility-testing
- Playwright accessibility: https://playwright.dev/docs/accessibility-testing

## Change control

All frontend design-system work remains on `frontend-development` until an explicit integration decision is made. The backend `master` branch is not the workspace for frontend styling, documentation or components.
