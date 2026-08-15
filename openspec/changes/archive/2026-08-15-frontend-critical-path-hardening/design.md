## Overview

This change hardens the ShopCity frontend into a release-safe, contract-backed product surface rather than a mostly decorative shell. It closes the highest-risk gaps first: money parsing, session/role gating, real Earn and Redeem flows, trustworthy offline persistence, and immutable frontend evidence. It also expands the same quality bar to the broader Supervisor/Admin workflow set and the shared component surface needed by those workflows.

The backend remains the source of truth for financial authority, approvals and read-model state. The frontend may present, validate and route user intent, but it must not invent business rules or appear to complete workflows that are still placeholders.

## Design goals

- Prevent financial mis-entry, especially Nigerian currency input with commas, decimals and pasted formats.
- Make authenticated route access explicit so no operational screen renders without session context.
- Turn the Earn path into one real vertical slice, then extend the same pattern to Redeem and the wider workflow set.
- Ensure offline persistence is truly durable before the UI claims that a transaction was saved.
- Replace fixture-only confidence with backend-connected or contract-faithful evidence.
- Fill in the shared component surface required by the approved product workflows.
- Keep accessibility, keyboard behavior, contrast and semantically correct status language first-class.

## Architecture

### Frontend shape

The initial implementation can stay within `apps/web`, but the code should be organized so shared boundaries can be extracted later without rewriting feature code.

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
    audit/
  lib/
    api/
    auth/
    money/
    offline/
    accessibility/
  styles/
  public/brand/
```

Shared packages such as `packages/ui`, `packages/design-tokens` and `packages/api-client` may be added later, but this change must not rely on them being created first.

### Contract pipeline

The backend contract remains authoritative:

```text
Nest/OpenAPI
  → export/openapi generation
  → generated client
  → frontend API adapter
  → feature hooks and components
```

The adapter centralizes credentials, CSRF/session handling, error classification, idempotency propagation and domain-safe response mapping. Generated client code stays unmodified.

### State model

- Server state uses TanStack Query with domain-specific freshness and invalidation.
- Local UI state handles transient interactions only.
- Offline financial state uses IndexedDB, not localStorage.
- Browser state services may track connectivity, scanner routing and queue metadata, but not business truth.

## Money and formatting rules

Money is integer kobo internally. The MoneyInput/parser must:

- accept known Nigerian formats deliberately;
- reject ambiguous separators rather than guessing;
- reject excessive precision rather than silently rounding;
- preserve sign semantics consistently;
- format output without changing the underlying amount;
- remain safe for pasted currency strings.

This is a release blocker because money input is a trust boundary.

## Auth and role boundaries

The shell must gate all operational routes behind session state and role context. The design should make three clear levels:

- session/bootstrap state;
- authenticated role/branch context;
- route availability for cashier, supervisor and admin.

Placeholder pages may remain in the tree, but they must not look operationally complete until they are backed by contract data and access control.

## Workflow coverage

### Critical money flows

1. Earn must be real end-to-end: lookup, amount entry, idempotent submit, API response, confirmed/pending/offline state.
2. Redeem must be real end-to-end: lookup, balance display, policy check, confirm submit, response state.
3. Offline earn must only claim success after browser persistence commits.

### Expanded workflow set

Supervisor and admin surfaces must move beyond placeholders for:

- approvals;
- fraud review;
- reports;
- audit timelines;
- pilot/operations summary;
- user/device administration where backend contracts exist.

These workflows may be implemented incrementally, but the design should make their state model explicit now so UI placeholders do not become accidental product claims.

## Component strategy

### Accessible primitives

Owned primitives should cover the agreed shared surface: Button, Input, Textarea, Checkbox, RadioGroup, Select, Combobox, Dialog, Sheet, Popover, DropdownMenu, Tooltip, Tabs, Accordion, Badge, Progress, Skeleton, Separator, Alert, Toast, Table and Pagination.

Primitive APIs should remain generic: size, variant, loading, disabled, refs and ARIA hooks. They should not encode workflow-specific logic.

### ShopCity product components

Product components should handle money presentation, identity, statuses, summary cards, empty/error states, offline/sync indicators, headers, filters, tables and audit timelines.

These components may understand domain language, but they should still present backend states rather than reconstructing business rules.

### Workflow components

Workflow components may orchestrate forms and sequencing for earn, redeem, approvals, fraud, reports and operations. They can own local validation and UI flow, but the server remains authoritative for final outcome.

## Accessibility and interaction

The frontend must satisfy WCAG 2.2 AA expectations for the shared surface:

- visible focus and correct restoration after dialogs;
- minimum touch target sizing where relevant;
- persistent labels and error summaries;
- keyboard-first support for high-frequency forms;
- scanner-safe lookup behavior;
- truthful loading, processing, offline and uncertain states;
- clear distinction between brand red and semantic error/warning colors;
- correct combobox/listbox semantics for custom input controls.

## Quality gates

A change is not release-safe unless it has:

- lint, typecheck and unit coverage;
- component tests for behavior-rich primitives;
- accessibility coverage for shared and critical route surfaces;
- real E2E for the money core;
- visual-regression evidence for the shared components and role shells;
- frontend build verification;
- token/API drift checks.

## Risks and mitigations

- **Money ambiguity:** keep parser rules explicit and reject unknown formats.
- **Auth gaps:** gate all shell routes before screens render.
- **Placeholder drift:** label placeholders as shells until a real contract-driven flow exists.
- **Offline false positives:** surface storage failures and only claim local save on commit.
- **Workflow scope creep:** expand supervisor/admin coverage iteratively, but keep the same evidence standard.
- **Accessibility regressions:** require keyboard, focus and contrast tests before broad reuse.

## Rollout

1. Fix money parsing and add tests.
2. Add the session-gated shell and role boundaries.
3. Deliver a real Earn slice.
4. Extend to Redeem and the broader workflow set.
5. Replace fixture-only tests with true backend-connected E2E where possible.
6. Make offline persistence durable and explicit.
7. Complete the shared component surface and accessibility gates.
8. Enforce frontend CI and release evidence.
